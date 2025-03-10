// permissionManager.js - Système de gestion des permissions pour TeamRooms

/**
 * Service de gestion des permissions et des rôles pour l'application TeamRooms
 * Permet de définir, modifier et vérifier les permissions des utilisateurs
 */
class PermissionManager {
  constructor() {
    this.roles = [
      {
        id: 'admin',
        name: 'Administrateur',
        description: 'Accès complet à toutes les fonctionnalités du système'
      },
      {
        id: 'manager',
        name: 'Gestionnaire',
        description: 'Gestion des réservations et des utilisateurs'
      },
      {
        id: 'user',
        name: 'Utilisateur',
        description: 'Réservation des salles et ressources'
      },
      {
        id: 'room',
        name: 'Salle de Réunion',
        description: 'Affichage des réunions du jour uniquement'
      }
    ];
    
    this.resources = [
      {
        id: 'users',
        name: 'Utilisateurs',
        actions: [
          { id: 'view', name: 'Voir' },
          { id: 'create', name: 'Créer' },
          { id: 'edit', name: 'Modifier' },
          { id: 'delete', name: 'Supprimer' }
        ]
      },
      {
        id: 'rooms',
        name: 'Salles de Réunion',
        actions: [
          { id: 'view', name: 'Voir' },
          { id: 'book', name: 'Réserver' },
          { id: 'edit', name: 'Modifier' },
          { id: 'delete', name: 'Supprimer' },
          { id: 'manage', name: 'Gérer' }
        ]
      },
      {
        id: 'vehicles',
        name: 'Véhicules',
        actions: [
          { id: 'view', name: 'Voir' },
          { id: 'book', name: 'Réserver' },
          { id: 'edit', name: 'Modifier' },
          { id: 'delete', name: 'Supprimer' },
          { id: 'manage', name: 'Gérer' }
        ]
      },
      {
        id: 'equipment',
        name: 'Matériel',
        actions: [
          { id: 'view', name: 'Voir' },
          { id: 'loan', name: 'Emprunter' },
          { id: 'edit', name: 'Modifier' },
          { id: 'delete', name: 'Supprimer' },
          { id: 'manage', name: 'Gérer' }
        ]
      },
      {
        id: 'reports',
        name: 'Rapports',
        actions: [
          { id: 'view', name: 'Voir' },
          { id: 'create', name: 'Créer' },
          { id: 'export', name: 'Exporter' }
        ]
      },
      {
        id: 'settings',
        name: 'Paramètres',
        actions: [
          { id: 'view', name: 'Voir' },
          { id: 'edit', name: 'Modifier' }
        ]
      }
    ];
    
    this.menuItems = [
      { id: 'dashboard', name: 'Tableau de Bord', icon: 'home' },
      { id: 'administration', name: 'Administration', icon: 'cog' },
      { id: 'rooms', name: 'Salles de Réunion', icon: 'door-open' },
      { id: 'vehicles', name: 'Réservation Véhicules', icon: 'car' },
      { id: 'equipment', name: 'Prêt de Matériel', icon: 'laptop' },
      { id: 'teams', name: 'Teams', icon: 'users' },
      { id: 'sage', name: 'SAGE', icon: 'calculator' },
      { id: 'cx3', name: '3CX', icon: 'phone' },
      { id: 'pulse', name: 'AnecoopPulse', icon: 'chart-line' },
      { id: 'reports', name: 'Rapports', icon: 'file-alt' },
      { id: 'settings', name: 'Paramètres', icon: 'cog' }
    ];
    
    // Définir les permissions par défaut pour chaque rôle
    this.defaultPermissions = {
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
    
    // Définir l'accès au menu par défaut pour chaque rôle
    this.defaultMenuAccess = {
      admin: ['dashboard', 'administration', 'rooms', 'vehicles', 'equipment', 'teams', 'sage', 'cx3', 'pulse', 'reports', 'settings'],
      manager: ['dashboard', 'rooms', 'vehicles', 'equipment', 'teams', 'sage', 'cx3', 'pulse', 'reports'],
      user: ['dashboard', 'rooms', 'vehicles', 'equipment', 'teams', 'sage', 'cx3', 'pulse'],
      room: ['dashboard', 'rooms'],
      guest: ['dashboard', 'rooms']
    };
    
    // Charger les configurations depuis le stockage si elles existent
    this.loadConfiguration();
  }
  
  /**
   * Charger la configuration des permissions depuis le stockage
   */
  loadConfiguration() {
    try {
      const storedPermissions = localStorage.getItem('teamrooms_permissions');
      const storedMenuAccess = localStorage.getItem('teamrooms_menu_access');
      
      if (storedPermissions) {
        this.permissions = JSON.parse(storedPermissions);
      } else {
        this.permissions = JSON.parse(JSON.stringify(this.defaultPermissions));
      }
      
      if (storedMenuAccess) {
        this.menuAccess = JSON.parse(storedMenuAccess);
      } else {
        this.menuAccess = JSON.parse(JSON.stringify(this.defaultMenuAccess));
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la configuration:', error);
      // Utiliser les valeurs par défaut en cas d'erreur
      this.permissions = JSON.parse(JSON.stringify(this.defaultPermissions));
      this.menuAccess = JSON.parse(JSON.stringify(this.defaultMenuAccess));
    }
  }
  
  /**
   * Sauvegarder la configuration des permissions dans le stockage
   */
  saveConfiguration() {
    try {
      localStorage.setItem('teamrooms_permissions', JSON.stringify(this.permissions));
      localStorage.setItem('teamrooms_menu_access', JSON.stringify(this.menuAccess));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la configuration:', error);
    }
  }
  
  /**
   * Obtenir tous les rôles disponibles
   * @returns {Array} Liste des rôles
   */
  getRoles() {
    return this.roles;
  }
  
  /**
   * Obtenir toutes les ressources disponibles
   * @returns {Array} Liste des ressources
   */
  getResources() {
    return this.resources;
  }
  
  /**
   * Obtenir tous les éléments de menu disponibles
   * @returns {Array} Liste des éléments de menu
   */
  getMenuItems() {
    return this.menuItems;
  }
  
  /**
   * Obtenir les permissions pour un rôle spécifique
   * @param {string} roleId - ID du rôle
   * @returns {Object} Permissions du rôle
   */
  getRolePermissions(roleId) {
    return this.permissions[roleId] || {};
  }
  
  /**
   * Obtenir les éléments de menu accessibles pour un rôle spécifique
   * @param {string} roleId - ID du rôle
   * @returns {Array} Liste des IDs des éléments de menu accessibles
   */
  getRoleMenuAccess(roleId) {
    return this.menuAccess[roleId] || [];
  }
  
  /**
   * Définir les permissions pour un rôle spécifique
   * @param {string} roleId - ID du rôle
   * @param {Object} permissions - Nouvelles permissions du rôle
   */
  setRolePermissions(roleId, permissions) {
    this.permissions[roleId] = permissions;
    this.saveConfiguration();
  }
  
  /**
   * Définir l'accès au menu pour un rôle spécifique
   * @param {string} roleId - ID du rôle
   * @param {Array} menuItems - Nouveaux éléments de menu accessibles
   */
  setRoleMenuAccess(roleId, menuItems) {
    this.menuAccess[roleId] = menuItems;
    this.saveConfiguration();
  }
  
  /**
   * Vérifier si un rôle a une permission spécifique
   * @param {string} roleId - ID du rôle
   * @param {string} resourceId - ID de la ressource
   * @param {string} actionId - ID de l'action
   * @returns {boolean} Si le rôle a la permission
   */
  hasPermission(roleId, resourceId, actionId) {
    if (roleId === 'admin') {
      // Les administrateurs ont toutes les permissions
      return true;
    }
    
    const rolePermissions = this.permissions[roleId];
    if (!rolePermissions) {
      return false;
    }
    
    const resourcePermissions = rolePermissions[resourceId];
    if (!resourcePermissions) {
      return false;
    }
    
    return resourcePermissions.includes(actionId);
  }
  
  /**
   * Vérifier si un rôle a accès à un élément de menu spécifique
   * @param {string} roleId - ID du rôle
   * @param {string} menuItemId - ID de l'élément de menu
   * @returns {boolean} Si le rôle a accès
   */
  hasMenuAccess(roleId, menuItemId) {
    const menuAccess = this.menuAccess[roleId];
    if (!menuAccess) {
      return roleId === 'admin'; // Les administrateurs ont accès à tout
    }
    
    return menuAccess.includes(menuItemId);
  }
  
  /**
   * Réinitialiser les permissions aux valeurs par défaut
   */
  resetToDefaults() {
    this.permissions = JSON.parse(JSON.stringify(this.defaultPermissions));
    this.menuAccess = JSON.parse(JSON.stringify(this.defaultMenuAccess));
    this.saveConfiguration();
  }
  
  /**
   * Ajouter une permission à un rôle
   * @param {string} roleId - ID du rôle
   * @param {string} resourceId - ID de la ressource
   * @param {string} actionId - ID de l'action
   */
  addPermission(roleId, resourceId, actionId) {
    if (!this.permissions[roleId]) {
      this.permissions[roleId] = {};
    }
    
    if (!this.permissions[roleId][resourceId]) {
      this.permissions[roleId][resourceId] = [];
    }
    
    if (!this.permissions[roleId][resourceId].includes(actionId)) {
      this.permissions[roleId][resourceId].push(actionId);
      this.saveConfiguration();
    }
  }
  
  /**
   * Supprimer une permission d'un rôle
   * @param {string} roleId - ID du rôle
   * @param {string} resourceId - ID de la ressource
   * @param {string} actionId - ID de l'action
   */
  removePermission(roleId, resourceId, actionId) {
    if (!this.permissions[roleId] || !this.permissions[roleId][resourceId]) {
      return;
    }
    
    const index = this.permissions[roleId][resourceId].indexOf(actionId);
    if (index !== -1) {
      this.permissions[roleId][resourceId].splice(index, 1);
      this.saveConfiguration();
    }
  }
  
  /**
   * Ajouter un accès à un élément de menu pour un rôle
   * @param {string} roleId - ID du rôle
   * @param {string} menuItemId - ID de l'élément de menu
   */
  addMenuAccess(roleId, menuItemId) {
    if (!this.menuAccess[roleId]) {
      this.menuAccess[roleId] = [];
    }
    
    if (!this.menuAccess[roleId].includes(menuItemId)) {
      this.menuAccess[roleId].push(menuItemId);
      this.saveConfiguration();
    }
  }
  
  /**
   * Supprimer un accès à un élément de menu pour un rôle
   * @param {string} roleId - ID du rôle
   * @param {string} menuItemId - ID de l'élément de menu
   */
  removeMenuAccess(roleId, menuItemId) {
    if (!this.menuAccess[roleId]) {
      return;
    }
    
    const index = this.menuAccess[roleId].indexOf(menuItemId);
    if (index !== -1) {
      this.menuAccess[roleId].splice(index, 1);
      this.saveConfiguration();
    }
  }
}

// Créer et exporter une instance singleton
const permissionManager = new PermissionManager();
export default permissionManager;
