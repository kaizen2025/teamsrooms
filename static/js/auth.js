// auth.js - Système d'authentification amélioré pour TeamRooms

/**
 * Service d'authentification complet pour l'application TeamRooms
 * Gère la connexion, l'enregistrement, la gestion des sessions et les permissions utilisateur
 */
class AuthService {
  constructor() {
    this.currentUser = null;
    this.isAuthenticated = false;
    this.userRole = null;
    this.permissions = {};
    this.menuAccess = {};
    
    // Vérifier s'il existe une session lors de l'initialisation
    this.checkExistingSession();
    
    // Définir les permissions par défaut pour chaque rôle
    this._initializeRolePermissions();
    
    // Définir l'accès au menu pour chaque rôle
    this._initializeMenuAccess();
  }

  /**
   * Vérifier si l'utilisateur a une session existante stockée dans localStorage
   */
  checkExistingSession() {
    const storedUser = localStorage.getItem('teamrooms_user');
    const storedToken = localStorage.getItem('teamrooms_token');
    
    if (storedUser && storedToken) {
      try {
        this.currentUser = JSON.parse(storedUser);
        this.isAuthenticated = true;
        this.userRole = this.currentUser.role;
        return true;
      } catch (error) {
        console.error('Erreur lors de la restauration de la session:', error);
        this.logout(); // Effacer les données de session invalides
      }
    }
    return false;
  }

  /**
   * Authentifier l'utilisateur avec ses identifiants
   * @param {string} username - Email ou nom d'utilisateur
   * @param {string} password - Mot de passe
   * @returns {Promise} - Promise résolvant les données utilisateur ou erreur
   */
  async login(username, password) {
    try {
      // Dans un environnement de production, vous feriez un appel API à votre backend
      // Pour la démonstration, nous utilisons une authentification simulée
      
      // À REMPLACER PAR UN APPEL API RÉEL:
      // const response = await fetch('/api/auth/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ username, password })
      // });
      // const data = await response.json();
      
      // Simulation d'authentification réussie
      const mockResponse = await this._mockAuthRequest(username, password);
      
      if (mockResponse.success) {
        this.currentUser = mockResponse.user;
        this.isAuthenticated = true;
        this.userRole = mockResponse.user.role;
        
        // Stocker les données d'authentification
        localStorage.setItem('teamrooms_user', JSON.stringify(this.currentUser));
        localStorage.setItem('teamrooms_token', mockResponse.token);
        
        // Mettre à jour l'interface utilisateur
        this._updateUIAfterLogin();
        
        return {
          success: true,
          user: this.currentUser
        };
      } else {
        return {
          success: false,
          message: mockResponse.message
        };
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
      return {
        success: false,
        message: 'Erreur de connexion. Veuillez réessayer.'
      };
    }
  }

  /**
   * Simuler une requête d'authentification (à remplacer par des appels API réels)
   * @param {string} username 
   * @param {string} password 
   * @returns {Promise}
   */
  async _mockAuthRequest(username, password) {
    // Ceci serait remplacé par une authentification backend réelle
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulation de validation serveur
        if (username === 'admin@anecoop.com' && password === 'admin123') {
          resolve({
            success: true,
            user: {
              id: 1,
              username: 'admin',
              email: 'admin@anecoop.com',
              fullName: 'Administrateur Système',
              role: 'admin',
              department: 'IT',
              lastLogin: new Date().toISOString()
            },
            token: 'mock-jwt-token-xyz-123'
          });
        } else if (username === 'manager@anecoop.com' && password === 'manager123') {
          resolve({
            success: true,
            user: {
              id: 2,
              username: 'manager',
              email: 'manager@anecoop.com',
              fullName: 'Manager',
              role: 'manager',
              department: 'Ressources Humaines',
              lastLogin: new Date().toISOString()
            },
            token: 'mock-jwt-token-abc-456'
          });
        } else if (username === 'user@anecoop.com' && password === 'user123') {
          resolve({
            success: true,
            user: {
              id: 3,
              username: 'user',
              email: 'user@anecoop.com',
              fullName: 'Utilisateur Standard',
              role: 'user',
              department: 'Marketing',
              lastLogin: new Date().toISOString()
            },
            token: 'mock-jwt-token-def-789'
          });
        } else if (username === 'room@anecoop.com' && password === 'room123') {
          resolve({
            success: true,
            user: {
              id: 4,
              username: 'room',
              email: 'room@anecoop.com',
              fullName: 'Écran Salle de Réunion',
              role: 'room',
              department: 'Général',
              lastLogin: new Date().toISOString()
            },
            token: 'mock-jwt-token-ghi-012'
          });
        } else {
          resolve({
            success: false,
            message: 'Identifiants invalides. Veuillez réessayer.'
          });
        }
      }, 800); // Simuler un délai réseau
    });
  }

  /**
   * Initialiser les permissions basées sur les rôles
   */
  _initializeRolePermissions() {
    this.rolePermissions = {
      admin: {
        users: ['view', 'create', 'edit', 'delete'],
        rooms: ['view', 'book', 'edit', 'delete', 'manage'],
        vehicles: ['view', 'book', 'edit', 'delete', 'manage'],
        equipment: ['view', 'loan', 'edit', 'delete', 'manage'],
        reports: ['view', 'create', 'export'],
        settings: ['view', 'edit']
      },
      manager: {
        users: ['view'],
        rooms: ['view', 'book', 'edit'],
        vehicles: ['view', 'book', 'edit'],
        equipment: ['view', 'loan', 'edit'],
        reports: ['view', 'export'],
        settings: ['view']
      },
      user: {
        rooms: ['view', 'book'],
        vehicles: ['view', 'book'],
        equipment: ['view', 'loan'],
        reports: ['view']
      },
      room: {
        rooms: ['view']
      }
    };
  }

  /**
   * Initialiser l'accès au menu pour chaque rôle
   */
  _initializeMenuAccess() {
    this.menuAccess = {
      admin: {
        dashboard: true,
        administration: true,
        rooms: true,
        vehicles: true,
        equipment: true,
        teams: true,
        sage: true,
        cx3: true,
        pulse: true,
        reports: true,
        settings: true
      },
      manager: {
        dashboard: true,
        administration: false,
        rooms: true,
        vehicles: true, 
        equipment: true,
        teams: true,
        sage: true,
        cx3: true,
        pulse: true,
        reports: true,
        settings: false
      },
      user: {
        dashboard: true,
        administration: false,
        rooms: true,
        vehicles: true,
        equipment: true,
        teams: true,
        sage: true,
        cx3: true,
        pulse: true,
        reports: false,
        settings: false
      },
      room: {
        dashboard: true,
        administration: false,
        rooms: true,
        vehicles: false,
        equipment: false,
        teams: false,
        sage: false,
        cx3: false,
        pulse: false,
        reports: false,
        settings: false
      },
      guest: {
        dashboard: true,
        administration: false,
        rooms: true,
        vehicles: false,
        equipment: false,
        teams: false,
        sage: false,
        cx3: false,
        pulse: false,
        reports: false,
        settings: false
      }
    };
  }

  /**
   * Mettre à jour l'interface utilisateur après la connexion
   */
  _updateUIAfterLogin() {
    // Mettre à jour l'état de connexion dans l'UI
    const userDisplay = document.getElementById('user-display');
    const loginStatus = document.getElementById('login-status');
    const loginButton = document.getElementById('login-button');
    
    if (userDisplay && this.currentUser) {
      userDisplay.textContent = this.currentUser.fullName;
    }
    
    if (loginStatus) {
      loginStatus.textContent = 'Connecté';
      loginStatus.classList.remove('non-connecte');
      loginStatus.classList.add('connecte');
    }
    
    if (loginButton) {
      loginButton.textContent = 'Déconnexion';
      loginButton.onclick = () => this.logout();
    }
    
    // Mettre à jour la visibilité du menu selon le rôle
    this.updateMenuVisibility();
  }

  /**
   * Mettre à jour la visibilité du menu en fonction du rôle de l'utilisateur
   */
  updateMenuVisibility() {
    const role = this.isAuthenticated ? this.userRole : 'guest';
    const menuItems = document.querySelectorAll('[data-menu-item]');
    
    menuItems.forEach(item => {
      const menuKey = item.getAttribute('data-menu-item');
      if (this.menuAccess[role] && this.menuAccess[role][menuKey] !== undefined) {
        item.style.display = this.menuAccess[role][menuKey] ? 'block' : 'none';
      }
    });
    
    // Mettre à jour le profil utilisateur dans la barre supérieure
    const userProfileContainer = document.getElementById('user-profile-container');
    if (userProfileContainer) {
      if (this.isAuthenticated) {
        userProfileContainer.innerHTML = `
          <div class="user-info">
            <span class="user-name">${this.currentUser.fullName}</span>
            <span class="user-role">${this.getRoleDisplayName(this.userRole)}</span>
          </div>
        `;
      } else {
        userProfileContainer.innerHTML = `
          <div class="user-info">
            <span class="user-name">Invité</span>
            <span class="user-role">Non connecté</span>
          </div>
        `;
      }
    }
  }

  /**
   * Obtenir le nom d'affichage d'un rôle
   * @param {string} role - Identifiant du rôle
   * @returns {string} - Nom d'affichage du rôle
   */
  getRoleDisplayName(role) {
    const roleNames = {
      admin: 'Administrateur',
      manager: 'Gestionnaire',
      user: 'Utilisateur',
      room: 'Salle de réunion',
      guest: 'Invité'
    };
    
    return roleNames[role] || role;
  }

  /**
   * Vérifier si l'utilisateur a la permission pour une action spécifique
   * @param {string} resource - Type de ressource (ex: 'rooms', 'users')
   * @param {string} action - Action à effectuer (ex: 'view', 'edit')
   * @returns {boolean} - Si l'utilisateur a la permission
   */
  hasPermission(resource, action) {
    if (!this.isAuthenticated) return false;
    
    // Les administrateurs ont toutes les permissions
    if (this.userRole === 'admin') return true;
    
    // Vérifier la permission spécifique
    const rolePerms = this.rolePermissions[this.userRole];
    return rolePerms && 
           rolePerms[resource] && 
           rolePerms[resource].includes(action);
  }

  /**
   * Vérifier si l'utilisateur a accès à un élément de menu
   * @param {string} menuItem - Clé de l'élément de menu
   * @returns {boolean} - Si l'utilisateur a accès
   */
  hasMenuAccess(menuItem) {
    const role = this.isAuthenticated ? this.userRole : 'guest';
    return this.menuAccess[role] && this.menuAccess[role][menuItem] === true;
  }

  /**
   * Déconnecter l'utilisateur actuel
   */
  logout() {
    // Effacer l'état d'authentification
    this.currentUser = null;
    this.isAuthenticated = false;
    this.userRole = null;
    
    // Effacer les données de session stockées
    localStorage.removeItem('teamrooms_user');
    localStorage.removeItem('teamrooms_token');
    
    // Mettre à jour l'interface utilisateur
    this._updateUIAfterLogout();
    
    // Rediriger vers la page d'accueil
    window.location.href = 'index.html';
  }

  /**
   * Mettre à jour l'interface utilisateur après la déconnexion
   */
  _updateUIAfterLogout() {
    // Mettre à jour l'état de connexion dans l'UI
    const userDisplay = document.getElementById('user-display');
    const loginStatus = document.getElementById('login-status');
    const loginButton = document.getElementById('login-button');
    
    if (userDisplay) {
      userDisplay.textContent = 'Invité';
    }
    
    if (loginStatus) {
      loginStatus.textContent = 'Non connecté';
      loginStatus.classList.remove('connecte');
      loginStatus.classList.add('non-connecte');
    }
    
    if (loginButton) {
      loginButton.textContent = 'Connexion';
      loginButton.onclick = () => this.showLoginModal();
    }
    
    // Mettre à jour la visibilité du menu
    this.updateMenuVisibility();
  }

  /**
   * Afficher la modal de connexion
   */
  showLoginModal() {
    const loginModal = document.getElementById('login-modal');
    if (loginModal) {
      loginModal.classList.add('active');
    } else {
      // Créer la modal de connexion si elle n'existe pas
      this._createLoginModal();
    }
  }

  /**
   * Créer dynamiquement la modal de connexion
   */
  _createLoginModal() {
    const modalHTML = `
      <div id="login-modal" class="modal active">
        <div class="modal-content">
          <div class="modal-header">
            <h4>Connexion</h4>
            <button class="modal-close" id="login-modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <div id="login-error" class="alert alert-danger" style="display: none;"></div>
            <form id="login-form">
              <div class="form-group">
                <label for="login-username">Nom d'utilisateur</label>
                <input type="text" id="login-username" name="username" required>
              </div>
              <div class="form-group">
                <label for="login-password">Mot de passe</label>
                <input type="password" id="login-password" name="password" required>
              </div>
              <div class="form-check">
                <input type="checkbox" id="remember-me" name="remember">
                <label for="remember-me">Se souvenir de moi</label>
              </div>
            </form>
            <p><a href="#" id="forgot-password-link">Mot de passe oublié?</a></p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="login-cancel-btn">Annuler</button>
            <button class="btn btn-primary" id="login-submit-btn">Se connecter</button>
          </div>
        </div>
      </div>
    `;
    
    // Ajouter la modal au document
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer.firstChild);
    
    // Ajouter les gestionnaires d'événements
    document.getElementById('login-modal-close').addEventListener('click', () => {
      document.getElementById('login-modal').classList.remove('active');
    });
    
    document.getElementById('login-cancel-btn').addEventListener('click', () => {
      document.getElementById('login-modal').classList.remove('active');
    });
    
    document.getElementById('login-submit-btn').addEventListener('click', async () => {
      const username = document.getElementById('login-username').value;
      const password = document.getElementById('login-password').value;
      
      if (!username || !password) {
        const errorElem = document.getElementById('login-error');
        errorElem.textContent = 'Veuillez saisir votre nom d\'utilisateur et votre mot de passe.';
        errorElem.style.display = 'block';
        return;
      }
      
      const result = await this.login(username, password);
      
      if (result.success) {
        document.getElementById('login-modal').classList.remove('active');
      } else {
        const errorElem = document.getElementById('login-error');
        errorElem.textContent = result.message;
        errorElem.style.display = 'block';
      }
    });
    
    document.getElementById('forgot-password-link').addEventListener('click', (e) => {
      e.preventDefault();
      alert('Veuillez contacter votre administrateur système pour réinitialiser votre mot de passe.');
    });
  }

  /**
   * Obtenir l'utilisateur actuellement authentifié
   * @returns {Object|null} Utilisateur actuel ou null si non authentifié
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Vérifier si l'utilisateur est authentifié
   * @returns {boolean} Statut d'authentification
   */
  isUserAuthenticated() {
    return this.isAuthenticated;
  }

  /**
   * Obtenir le rôle de l'utilisateur actuel
   * @returns {string|null} Rôle de l'utilisateur ou null si non authentifié
   */
  getUserRole() {
    return this.userRole;
  }
}

// Créer et exporter une instance singleton
const authService = new AuthService();
export default authService;
