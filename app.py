#!/usr/bin/env python3
import os
import sys
import subprocess

def install_requirements():
    """
    Vérifie si le fichier requirements.txt existe et lance pip pour installer les dépendances.
    """
    requirements_file = os.path.join(os.path.dirname(__file__), 'requirements.txt')
    if os.path.exists(requirements_file):
        try:
            print("Installation des dépendances depuis requirements.txt…")
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-r', requirements_file])
        except subprocess.CalledProcessError as e:
            print("Erreur lors de l'installation des dépendances :", e)
    else:
        print("Fichier requirements.txt non trouvé.")

# Installation des dépendances avant d'importer les modules requis
install_requirements()

import time
import configparser
import requests
import json
import threading
import pytz
import re
from datetime import datetime, timedelta, timezone
from dateutil import parser  # Nécessite python-dateutil
from flask import Flask, render_template, jsonify, request, send_from_directory, abort, Response
from werkzeug.middleware.proxy_fix import ProxyFix

# Pour forcer l'utilisation du fuseau horaire de Paris (si supporté)
os.environ['TZ'] = 'Europe/Paris'
try:
    time.tzset()
except AttributeError:
    pass  # time.tzset() n'est pas disponible sous Windows

# Création de l'application Flask et configuration de ProxyFix
app = Flask(__name__, 
    static_folder='static',
    template_folder='templates')
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=2, x_proto=1, x_host=1, x_prefix=1)

# Configuration
MEETINGS_FILE = 'meetings.json'
SALLES = {}
config = configparser.ConfigParser()
config.read('config.ini')

# Chargement de la configuration des salles
if config.has_section('SALLES'):
    SALLES = dict(config.items('SALLES'))

# --- FILTRAGE PAR ADRESSE IP ---
ALLOWED_IPS = []
if config.has_section('ALLOWED_IPS'):
    # On récupère toutes les valeurs et on enlève les espaces superflus
    ALLOWED_IPS = [ip.strip() for key, ip in config.items('ALLOWED_IPS') if ip.strip()]

# Définition du fuseau horaire de Paris
PARIS_TZ = pytz.timezone('Europe/Paris')

# Variables d'état et verrou pour les mises à jour
last_modified_check = {}
update_lock = threading.Lock()

# Mode debug pour les logs
DEBUG_MODE = True

def get_token():
    """Récupère le token Azure AD avec gestion d'erreur améliorée."""
    try:
        tenant_id = config['AZURE']['TenantID']
        client_id = config['AZURE']['ClientID']
        client_secret = config['AZURE']['ClientSecret']
        url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
        data = {
            'grant_type': 'client_credentials',
            'client_id': client_id,
            'client_secret': client_secret,
            'scope': 'https://graph.microsoft.com/.default'
        }
        response = requests.post(url, data=data, timeout=15)
        response.raise_for_status()
        token = response.json().get('access_token')
        if token:
            return token
        else:
            print("Erreur: token non récupéré dans la réponse")
            return None
    except Exception as e:
        print(f"Erreur d'authentification: {str(e)}")
        return None

def convert_to_paris_time(iso_str):
    """
    Convertit une chaîne ISO en heure de Paris.
    Exemple : "2025-02-10T00:30:00Z" devient "2025-02-10T01:30:00+01:00".
    """
    try:
        dt = parser.isoparse(iso_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        dt_paris = dt.astimezone(PARIS_TZ)
        return dt_paris.isoformat(timespec='seconds')
    except Exception as e:
        print(f"Erreur conversion date {iso_str}: {str(e)}")
        return iso_str

def extract_join_url(meeting):
    """
    Extrait l'URL de réunion Teams depuis 'onlineMeeting.joinUrl'.
    Sinon, cherche dans le corps (body.content) une URL Teams avec une recherche plus robuste.
    """
    # Essai 1: Récupérer depuis onlineMeeting
    join_url = (meeting.get('onlineMeeting') or {}).get('joinUrl', '')
    if join_url:
        if DEBUG_MODE:
            print(f"URL de jointure trouvée dans onlineMeeting: {join_url[:30]}...")
        return join_url
    
    # Essai 2: Recherche dans le corps avec des patterns améliorés
    body_content = meeting.get('body', {}).get('content', '')
    patterns = [
        r'https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s\'"\<\>]+',
        r'https:\/\/teams\.microsoft\.com\/l\/meeting\/[^\s\'"\<\>]+',
        r'https:\/\/teams\.live\.com\/meet\/[^\s\'"\<\>]+'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, body_content)
        if match:
            url = match.group(0)
            if DEBUG_MODE:
                print(f"URL de jointure extraite du corps: {url[:30]}...")
            return url
    
    # Essai 3: Si aucune URL n'est trouvée, utiliser l'ID de la réunion comme fallback
    meeting_id = meeting.get('id', '')
    if meeting_id:
        # Nettoyer l'ID pour ne garder que les caractères pertinents
        clean_id = ''.join(c for c in meeting_id if c.isalnum())
        fallback_url = f"https://teams.microsoft.com/l/meetup-join/19%3Ameeting_{clean_id}%40thread.v2/0"
        if DEBUG_MODE:
            print(f"URL de jointure fallback créée: {fallback_url[:30]}...")
        return fallback_url
    
    # Aucune option n'a fonctionné
    return ''

def update_meetings(salle_email, salle_name):
    """
    Récupère les réunions pour une salle donnée via l'API Graph.
    La plage horaire est calculée en fonction de l'heure de Paris.
    """
    token = get_token()
    if not token:
        print(f"Impossible de récupérer le token pour {salle_name}")
        return []
    
    headers = {'Authorization': f'Bearer {token}'}
    now_utc = datetime.now(timezone.utc)
    now_paris = now_utc.astimezone(PARIS_TZ)
    
    # Élargir la plage de récupération : 6h avant jusqu'à 36h après
    start = (now_paris - timedelta(hours=6)).isoformat()
    end = (now_paris + timedelta(hours=36)).isoformat()
    
    try:
        if DEBUG_MODE:
            print(f"Récupération des réunions pour {salle_name} de {start} à {end}")
        
        response = requests.get(
            f"https://graph.microsoft.com/v1.0/users/{salle_email}/calendarview",
            headers=headers,
            params={
                'startDateTime': start,
                'endDateTime': end,
                '$orderby': 'start/dateTime',
                '$select': 'id,subject,start,end,isOnlineMeeting,onlineMeeting,attendees,isCancelled,body',
                '$top': 100  # Augmenter le nombre maximum de réunions récupérées
            },
            timeout=15
        )
        
        response.raise_for_status()
        results = response.json().get('value', [])
        
        if DEBUG_MODE:
            print(f"Réunions récupérées pour {salle_name}: {len(results)}")
        
        processed_meetings = process_meetings(results, salle_name)
        return processed_meetings
    except requests.exceptions.RequestException as e:
        print(f"Erreur de requête API pour {salle_name}: {str(e)}")
        return []
    except Exception as e:
        print(f"Erreur inattendue API pour {salle_name}: {str(e)}")
        return []

def process_meetings(meetings, salle_name):
    """
    Filtre les réunions annulées et convertit les dates en heure de Paris.
    Améliore l'extraction d'URL Teams.
    """
    processed = []
    for m in meetings:
        # Ignorer les réunions annulées
        if m.get('isCancelled'):
            continue
        
        # Extraire l'URL de jointure avec robustesse
        join_url = extract_join_url(m)
        is_online = m.get('isOnlineMeeting', False) or bool(join_url)
        
        # Convertir les dates en heure de Paris avec robustesse
        try:
            start_time = convert_to_paris_time(m.get('start', {}).get('dateTime', ''))
            end_time = convert_to_paris_time(m.get('end', {}).get('dateTime', ''))
        except Exception as e:
            print(f"Erreur de conversion de date pour {m.get('subject')}: {str(e)}")
            continue
        
        # Extraction des participants
        attendees = []
        for a in m.get('attendees', []):
            email = a.get('emailAddress', {}).get('address', '')
            if email:
                attendees.append(email)
        
        # Créer l'objet réunion
        meeting = {
            'id': f"{salle_name}_{m.get('id', '')}",
            'subject': m.get('subject', 'Sans titre'),
            'start': start_time,
            'end': end_time,
            'isOnline': is_online,
            'joinUrl': join_url,
            'attendees': attendees,
            'salle': salle_name,
            'lastUpdated': datetime.now(timezone.utc).astimezone(PARIS_TZ).isoformat(timespec='seconds')
        }
        
        processed.append(meeting)
    
    if DEBUG_MODE:
        print(f"Réunions traitées pour {salle_name}: {len(processed)}")
    
    return processed

def check_for_changes():
    """
    Détecte les changements via une requête delta sur l'API Graph.
    Amélioré pour détecter plus de changements.
    """
    global last_modified_check
    changes = False
    token = get_token()
    
    if not token:
        print("Impossible de vérifier les changements: pas de token")
        return False
    
    for salle, email in SALLES.items():
        try:
            # Utiliser une requête delta plus efficace
            response = requests.get(
                f"https://graph.microsoft.com/v1.0/users/{email}/calendarView/delta",
                headers={'Authorization': f'Bearer {token}'},
                params={
                    '$select': 'lastModifiedDateTime',
                    '$top': 5,
                    '$orderby': 'lastModifiedDateTime desc'
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                values = data.get('value', [])
                
                if values:
                    current_last_modified = values[0].get('lastModifiedDateTime')
                    previous_last_modified = last_modified_check.get(email)
                    
                    if current_last_modified != previous_last_modified:
                        changes = True
                        if DEBUG_MODE:
                            print(f"Changement détecté pour {salle}: {previous_last_modified} -> {current_last_modified}")
                        last_modified_check[email] = current_last_modified
            else:
                print(f"Erreur lors de la vérification des changements pour {salle}: {response.status_code}")
        except Exception as e:
            print(f"Erreur lors de la vérification des changements pour {salle}: {str(e)}")
    
    return changes

def update_all_meetings():
    """
    Récupère toutes les réunions et recrée le fichier JSON.
    """
    all_meetings = []
    
    # Liste pour suivre les salles avec des erreurs
    failed_rooms = []
    
    for salle, email in SALLES.items():
        try:
            meetings = update_meetings(email, salle)
            all_meetings.extend(meetings)
        except Exception as e:
            print(f"Erreur lors de la récupération des réunions pour {salle}: {str(e)}")
            failed_rooms.append(salle)
    
    if failed_rooms:
        print(f"Échec de récupération pour les salles: {', '.join(failed_rooms)}")
    
    try:
        # Créer une sauvegarde du fichier existant
        if os.path.exists(MEETINGS_FILE):
            backup_file = f"{MEETINGS_FILE}.bak"
            try:
                with open(MEETINGS_FILE, 'r', encoding='utf-8') as src:
                    with open(backup_file, 'w', encoding='utf-8') as dst:
                        dst.write(src.read())
            except Exception as e:
                print(f"Erreur lors de la création de la sauvegarde: {str(e)}")
        
        # Écrire les nouvelles réunions
        with open(MEETINGS_FILE, 'w', encoding='utf-8') as f:
            json.dump(all_meetings, f, ensure_ascii=False)
        
        now_paris = datetime.now(timezone.utc).astimezone(PARIS_TZ).isoformat(timespec='seconds')
        print(f"Mise à jour réussie à {now_paris} ({len(all_meetings)} réunions)")
    except Exception as e:
        print(f"Erreur d'écriture du fichier meetings.json: {str(e)}")

def background_updater():
    """
    Le thread d'arrière-plan effectue :
      - Une mise à jour complète toutes les 15 secondes.
      - Une vérification des changements toutes les 3 secondes.
    """
    last_full_update = datetime.now(timezone.utc)
    while True:
        try:
            now = datetime.now(timezone.utc)
            
            # Mise à jour complète toutes les 15 secondes
            if (now - last_full_update).total_seconds() > 15:
                with update_lock:
                    update_all_meetings()
                    last_full_update = now
                    if DEBUG_MODE:
                        print(f"Mise à jour complète effectuée à {now.astimezone(PARIS_TZ).isoformat(timespec='seconds')}")
            
            # Vérification des changements toutes les 3 secondes
            elif check_for_changes():
                with update_lock:
                    update_all_meetings()
                    if DEBUG_MODE:
                        print(f"Mise à jour partielle déclenchée à {now.astimezone(PARIS_TZ).isoformat(timespec='seconds')}")
            
            # Pause courte pour ne pas surcharger le CPU
            time.sleep(3)
        except Exception as e:
            print(f"Erreur critique du thread d'arrière-plan: {str(e)}")
            time.sleep(5)

# --- Filtrage par adresse IP ---
@app.before_request
def limit_remote_addr():
    """
    Filtre les requêtes selon l'adresse IP du client avec une meilleure détection pour Render.
    """
    # Toujours autoriser l'accès à la page de diagnostic
    if request.path == '/ip-check':
        return None
    
    # Amélioration de la détection d'IP pour Render
    # Vérifier plusieurs en-têtes dans l'ordre de priorité
    ip = None
    
    # 1. X-Forwarded-For (standard pour les proxies)
    forwarded_for = request.headers.get('X-Forwarded-For')
    if forwarded_for:
        # Prendre la première IP (celle du client d'origine)
        ip = forwarded_for.split(',')[0].strip()
    
    # 2. Si pas trouvé, essayer X-Real-IP (utilisé par nginx)
    if not ip:
        ip = request.headers.get('X-Real-IP')
    
    # 3. Enfin, utiliser l'IP distante directe
    if not ip:
        ip = request.remote_addr
    
    # Si nous avons une IP et que ALLOWED_IPS n'est pas vide
    if ip and ALLOWED_IPS:
        # Vérifier si 'ALL' est dans la liste des IPs autorisées
        if 'ALL' in ALLOWED_IPS:
            return None
        
        # Vérifier si l'IP est dans la liste
        if ip in ALLOWED_IPS:
            return None
        
        # Pour le débogage, enregistrer l'IP bloquée
        print(f"IP bloquée: {ip}, Headers: {dict(request.headers)}")
        return jsonify({"error": "Accès refusé depuis cette adresse IP."}), 403
    
    # Si ALLOWED_IPS est vide ou pas d'IP détectée, autoriser l'accès
    return None

@app.route('/lookupMeeting')
def lookup_meeting():
    """
    Interroge Microsoft Graph pour récupérer l'URL de connexion (joinUrl)
    d'une réunion Teams à partir de son identifiant.
    Version améliorée avec plusieurs méthodes de recherche.
    """
    meeting_id = request.args.get('meetingId', '').strip()
    if not meeting_id:
        return jsonify({'error': "Le paramètre 'meetingId' est requis."}), 400
    
    # Journalisation pour débogage
    if DEBUG_MODE:
        print(f"Recherche de la réunion avec ID: {meeting_id}")
    
    # AMÉLIORATION 1: Nettoyer l'ID (enlever espaces, tirets, etc.)
    cleaned_id = ''.join(c for c in meeting_id if c.isalnum())
    
    # AMÉLIORATION 2: Chercher d'abord dans les réunions locales
    try:
        if os.path.exists(MEETINGS_FILE):
            with open(MEETINGS_FILE, 'r', encoding='utf-8') as f:
                all_meetings = json.load(f)
                
            # Chercher par ID ou par contenus de l'ID
            for meeting in all_meetings:
                # Vérifier si l'ID de la réunion contient l'ID recherché
                if (meeting.get('id') and (meeting_id in meeting['id'] or cleaned_id in meeting['id'])) and meeting.get('joinUrl'):
                    if DEBUG_MODE:
                        print(f"Réunion trouvée localement: {meeting['subject']}")
                    return jsonify({"joinUrl": meeting['joinUrl']})
                    
                # Chercher dans les attendees (peut aider si on cherche par email)
                if meeting.get('attendees') and meeting.get('joinUrl'):
                    if any(meeting_id in attendee for attendee in meeting['attendees']):
                        if DEBUG_MODE:
                            print(f"Réunion trouvée via participant: {meeting['subject']}")
                        return jsonify({"joinUrl": meeting['joinUrl']})
    except Exception as e:
        print(f"Erreur lors de la recherche locale: {str(e)}")
    
    # AMÉLIORATION 3: Essayer différentes API Graph
    token = get_token()
    if not token:
        return jsonify({'error': "Erreur d'authentification avec Microsoft Graph."}), 500
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Méthode 1: API standard pour les réunions
    try:
        url1 = f"https://graph.microsoft.com/v1.0/communications/onlineMeetings/{cleaned_id}"
        response1 = requests.get(url1, headers=headers, timeout=15)
        if response1.status_code == 200:
            data = response1.json()
            if data.get("joinUrl"):
                if DEBUG_MODE:
                    print(f"Réunion trouvée via API v1.0: {cleaned_id}")
                return jsonify({"joinUrl": data["joinUrl"]})
    except Exception as e:
        print(f"Erreur API v1.0: {str(e)}")
    
    # Méthode 2: API beta
    try:
        url2 = f"https://graph.microsoft.com/beta/communications/onlineMeetings/{cleaned_id}"
        response2 = requests.get(url2, headers=headers, timeout=15)
        if response2.status_code == 200:
            data = response2.json()
            if data.get("joinUrl"):
                if DEBUG_MODE:
                    print(f"Réunion trouvée via API beta: {cleaned_id}")
                return jsonify({"joinUrl": data["joinUrl"]})
    except Exception as e:
        print(f"Erreur API beta: {str(e)}")
    
    # Méthode 3: Recherche par ID dans tous les calendriers des salles
    try:
        for salle, email in SALLES.items():
            # Obtenir les réunions du jour
            now_utc = datetime.now(timezone.utc)
            now_paris = now_utc.astimezone(PARIS_TZ)
            start = (now_paris - timedelta(hours=24)).isoformat()
            end = (now_paris + timedelta(hours=48)).isoformat()
            
            search_url = f"https://graph.microsoft.com/v1.0/users/{email}/calendarview"
            params = {
                'startDateTime': start,
                'endDateTime': end,
                '$select': 'id,subject,onlineMeeting,body'
            }
            
            response = requests.get(search_url, headers=headers, params=params, timeout=15)
            if response.status_code == 200:
                calendar_data = response.json().get('value', [])
                for event in calendar_data:
                    event_id = event.get('id', '')
                    if cleaned_id in event_id or meeting_id in event_id:
                        # Trouver joinUrl dans onlineMeeting ou body
                        join_url = extract_join_url(event)
                        if join_url:
                            if DEBUG_MODE:
                                print(f"Réunion trouvée via calendrier de {salle}")
                            return jsonify({"joinUrl": join_url})
    except Exception as e:
        print(f"Erreur lors de la recherche dans les calendriers: {str(e)}")
    
    # Méthode 4: Fallback - Construire une URL générique
    fallback_url = f"https://teams.microsoft.com/l/meetup-join/19%3Ameeting_{cleaned_id}%40thread.v2/0"
    if DEBUG_MODE:
        print(f"Utilisation de l'URL fallback: {fallback_url}")
    return jsonify({"joinUrl": fallback_url})

# --- Route pour servir le fichier meetings.json ---
@app.route('/meetings.json')
def get_meetings():
    """
    Avant de servir le fichier, vérifie si sa dernière mise à jour date de plus de 5 secondes.
    Si c'est le cas, force une mise à jour immédiate.
    """
    if not os.path.exists(MEETINGS_FILE):
        return jsonify({"error": "Aucune réunion disponible"}), 404
    
    # Réduire le délai à 5 secondes
    if time.time() - os.path.getmtime(MEETINGS_FILE) > 5:
        with update_lock:
            update_all_meetings()
    
    # Cache-busting header pour éviter la mise en cache par le navigateur
    response = send_from_directory('.', MEETINGS_FILE)
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

# --- Route locale pour afficher les réunions d'une salle ---
@app.route('/local/<salle_name>')
def salle_local(salle_name):
    salle_name = salle_name.lower()
    if salle_name not in [key.lower() for key in SALLES.keys()]:
        return f"Salle '{salle_name}' non trouvée", 404

    if not os.path.exists(MEETINGS_FILE):
        return jsonify({"error": "Aucune réunion disponible"}), 404

    try:
        with open(MEETINGS_FILE, 'r', encoding='utf-8') as f:
            all_meetings = json.load(f)
    except Exception as e:
        return jsonify({"error": f"Erreur de lecture du fichier JSON: {str(e)}"}), 500

    salle_meetings = [meeting for meeting in all_meetings if meeting.get('salle', '').lower() == salle_name]
    return render_template('index.html', salle_name=salle_name, meetings=salle_meetings)

# --- Route pour afficher les réunions d'une salle directement via /<salle> ---
@app.route('/<salle>')
def salle_redirect(salle):
    # Redirige vers la vue locale (les URL seront de type https://salle.anecoop-france.com/tramontane)
    return salle_local(salle)

# --- Route d'accueil ---
@app.route('/')
def index():
    return render_template('index.html')

# --- Route de diagnostic pour l'IP ---
@app.route('/ip-check', methods=['GET'])
def ip_check():
    """
    Affiche les informations de connexion pour diagnostiquer les problèmes d'IP.
    Cette route ignore intentionnellement les restrictions d'IP.
    """
    # Collecter toutes les IP possibles
    forwarded_for = request.headers.get('X-Forwarded-For', '')
    cf_ip = request.headers.get('CF-Connecting-IP', '')
    true_client_ip = request.headers.get('True-Client-IP', '')
    remote_addr = request.remote_addr or ''
    
    # Collecter tous les en-têtes pour diagnostic
    headers = dict(request.headers)
    
    # Préparer les données à afficher
    ip_data = {
        'votre_ip_probable': forwarded_for.split(',')[0].strip() if forwarded_for else remote_addr,
        'remote_addr': remote_addr,
        'x_forwarded_for': forwarded_for,
        'cf_connecting_ip': cf_ip,
        'true_client_ip': true_client_ip,
        'tous_les_headers': headers,
        'allowed_ips_config': ALLOWED_IPS,
        'instructions': "Ajoutez votre IP dans le fichier config.ini sous [ALLOWED_IPS]"
    }
    
    # Retourner en format JSON et en page HTML
    if request.headers.get('Accept', '').find('application/json') >= 0:
        return jsonify(ip_data)
    
    # Sinon, retourner une page HTML
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Diagnostic IP</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body {{ font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }}
            h1 {{ color: #333; }}
            .data-box {{ background: #f8f9fa; border: 1px solid #ddd; padding: 15px; border-radius: 4px; margin: 15px 0; }}
            .important {{ font-weight: bold; color: #d9534f; }}
            pre {{ background: #eee; padding: 10px; overflow-x: auto; }}
        </style>
    </head>
    <body>
        <h1>Diagnostic d'IP pour l'application de salles</h1>
        
        <div class="data-box">
            <h2>Votre adresse IP</h2>
            <p class="important">Votre IP probable: {ip_data['votre_ip_probable']}</p>
            <p>C'est cette adresse que vous devez ajouter à votre configuration.</p>
        </div>
        
        <div class="data-box">
            <h2>Instructions</h2>
            <p>Pour autoriser votre IP, ajoutez la ligne suivante dans votre fichier config.ini:</p>
            <pre>[ALLOWED_IPS]
...
ip_new = {ip_data['votre_ip_probable']}</pre>
        </div>
        
        <div class="data-box">
            <h2>Configuration actuelle</h2>
            <p>IPs actuellement autorisées:</p>
            <pre>{', '.join(ALLOWED_IPS) if ALLOWED_IPS else 'Aucune'}</pre>
        </div>
        
        <div class="data-box">
            <h2>Détails techniques</h2>
            <p>Remote Address: {ip_data['remote_addr']}</p>
            <p>X-Forwarded-For: {ip_data['x_forwarded_for']}</p>
            <p>CF-Connecting-IP: {ip_data['cf_connecting_ip']}</p>
            <p>True-Client-IP: {ip_data['true_client_ip']}</p>
        </div>
        
        <details>
            <summary>Tous les en-têtes HTTP</summary>
            <pre>{json.dumps(ip_data['tous_les_headers'], indent=2)}</pre>
        </details>
    </body>
    </html>
    """
    return html

# --- Endpoint pour créer des réunions Teams ---
@app.route('/api/create-meeting', methods=['POST'])
def create_meeting():
    # Récupérer les données envoyées depuis le front-end
    data = request.json
    
    if not data:
        return jsonify({'error': "Données manquantes"}), 400
    
    # Validation des données requises
    required_fields = ['title', 'start', 'end', 'roomEmail']
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({'error': f"Le champ '{field}' est requis"}), 400
    
    # Obtenir un token d'accès
    token = get_token()
    if not token:
        return jsonify({'error': "Erreur d'authentification avec Microsoft Graph."}), 500
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Créer la liste des participants
    room_email = data.get('roomEmail')
    participants = data.get('participants', [])
    
    # Convertir les participants en format attendees de Graph API
    attendees_list = []
    
    # Ajouter la salle comme ressource (uniquement la salle sélectionnée)
    if room_email:
        attendees_list.append({
            "emailAddress": {
                "address": room_email
            },
            "type": "resource"
        })
    
    # Ajouter les autres participants (en excluant les emails de salles)
    salle_emails = [email.lower() for email in SALLES.values()]
    for email in participants:
        if email and '@' in email:  # Validation basique d'email
            # Vérifier que l'email n'est pas celui d'une salle
            if email.lower() not in salle_emails:
                attendees_list.append({
                    "emailAddress": {
                        "address": email
                    },
                    "type": "required"
                })
    
    # Construire le corps de la requête
    event_data = {
        "subject": data.get('title'),
        "start": {
            "dateTime": data.get('start'),
            "timeZone": "Europe/Paris"
        },
        "end": {
            "dateTime": data.get('end'),
            "timeZone": "Europe/Paris"
        },
        "location": {
            "displayName": data.get('room', '')
        },
        "attendees": attendees_list,
        "isOnlineMeeting": True,
        "onlineMeetingProvider": "teamsForBusiness"
    }
    
    # Journalisation pour débogage
    if DEBUG_MODE:
        print(f"Création de réunion: {json.dumps(event_data, indent=2)}")
    
    try:
        # Utiliser l'email de la première salle comme organisateur (ou un compte dédié si disponible)
        organizer_email = next(iter(SALLES.values())) if SALLES else None
        
        if not organizer_email:
            return jsonify({'error': "Aucune salle configurée pour créer des réunions."}), 500
        
        # Créer l'événement dans le calendrier
        url = f"https://graph.microsoft.com/v1.0/users/{organizer_email}/calendar/events"
        response = requests.post(url, headers=headers, json=event_data, timeout=15)
        
        if response.status_code >= 400:
            print(f"Erreur Graph API: {response.status_code} - {response.text}")
            return jsonify({'error': f"Erreur lors de la création de la réunion: {response.text}"}), response.status_code
        
        # Récupérer les données de la réunion créée
        meeting_data = response.json()
        
        # Récupérer le lien de la réunion
        join_url = meeting_data.get('onlineMeeting', {}).get('joinUrl', '')
        
        # Si pas de lien direct, chercher dans le body
        if not join_url and 'body' in meeting_data:
            join_url = extract_join_url(meeting_data)
        
        # Forcer une mise à jour immédiate des données
        update_all_meetings()
        
        return jsonify({
            'success': True,
            'meetingId': meeting_data.get('id'),
            'joinUrl': join_url,
            'subject': meeting_data.get('subject'),
            'start': meeting_data.get('start', {}).get('dateTime'),
            'end': meeting_data.get('end', {}).get('dateTime'),
            'room': data.get('room')
        })
    
    except Exception as e:
        print(f"Erreur lors de la création de la réunion: {str(e)}")
        return jsonify({'error': f"Erreur lors de la création de la réunion: {str(e)}"}), 500

# --- Exécution principale ---
if __name__ == '__main__':
    # Lancement du thread d'arrière-plan pour mettre à jour les réunions
    updater_thread = threading.Thread(target=background_updater, daemon=True)
    updater_thread.start()
    # Récupérer le port depuis la variable d'environnement (par défaut 5000)
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
