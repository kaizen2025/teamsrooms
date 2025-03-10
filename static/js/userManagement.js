// userManagement.js - User Management Module for TeamRooms

import authService from './auth.js';

/**
 * User Management service for the TeamRooms application
 * Handles user CRUD operations and permission management
 */
class UserManagementService {
  constructor() {
    this.users = [];
    this.roles = [
      { id: 'admin', name: 'Administrateur', description: 'Accès complet au système' },
      { id: 'manager', name: 'Gestionnaire', description: 'Gestion des réservations et rapports' },
      { id: 'user', name: 'Utilisateur', description: 'Réservation de salles uniquement' }
    ];
    
    // Department options
    this.departments = [
      'Direction',
      'Ressources Humaines',
      'IT',
      'Marketing',
      'Finance',
      'Ventes',
      'Production',
      'Logistique',
      'R&D'
    ];
  }
  
  /**
   * Load all users from the system
   * @returns {Promise} - Promise resolving to list of users
   */
  async loadUsers() {
    try {
      // In production, implement actual API call
      // const response = await fetch('/api/users');
      // const data = await response.json();
      // this.users = data.users;
      // return this.users;
      
      // Mock implementation
      return new Promise(resolve => {
        setTimeout(() => {
          this.users = [
            {
              id: 1,
              username: 'admin',
              email: 'admin@anecoop.com',
              fullName: 'Admin System',
              roles: ['admin'],
              department: 'IT',
              lastLogin: '2025-03-10T10:30:45',
              status: 'active'
            },
            {
              id: 2,
              username: 'martin',
              email: 'martin.dupont@anecoop.com',
              fullName: 'Martin Dupont',
              roles: ['manager'],
              department: 'Ventes',
              lastLogin: '2025-03-09T16:22:10',
              status: 'active'
            },
            {
              id: 3,
              username: 'sophie',
              email: 'sophie.laurent@anecoop.com',
              fullName: 'Sophie Laurent',
              roles: ['user'],
              department: 'Marketing',
              lastLogin: '2025-03-10T09:15:33',
              status: 'active'
            },
            {
              id: 4,
              username: 'jean',
              email: 'jean.martin@anecoop.com',
              fullName: 'Jean Martin',
              roles: ['user'],
              department: 'Finance',
              lastLogin: '2025-03-08T14:05:20',
              status: 'inactive'
            }
          ];
          resolve(this.users);
        }, 500);
      });
    } catch (error) {
      console.error('Error loading users:', error);
      return [];
    }
  }
  
  /**
   * Create a new user
   * @param {Object} userData - User data to create
   * @returns {Promise} - Promise resolving to create result
   */
  async createUser(userData) {
    try {
      // Check if current user has permission
      if (!authService.hasPermission('users', 'create')) {
        throw new Error('Permissions insuffisantes pour créer un utilisateur');
      }
      
      // Validate required fields
      const requiredFields = ['username', 'email', 'fullName', 'roles', 'department'];
      for (const field of requiredFields) {
        if (!userData[field]) {
          throw new Error(`Champ requis manquant: ${field}`);
        }
      }
      
      // In production, implement actual API call
      // const response = await fetch('/api/users', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${localStorage.getItem('teamrooms_token')}`
      //   },
      //   body: JSON.stringify(userData)
      // });
      // return await response.json();
      
      // Mock implementation
      return new Promise(resolve => {
        setTimeout(() => {
          // Generate new ID (would be done by backend)
          const newId = this.users.length > 0 
            ? Math.max(...this.users.map(u => u.id)) + 1 
            : 1;
            
          const newUser = {
            id: newId,
            ...userData,
            lastLogin: null,
            status: 'active',
            createdAt: new Date().toISOString()
          };
          
          this.users.push(newUser);
          
          resolve({
            success: true,
            message: 'Utilisateur créé avec succès',
            user: newUser
          });
        }, 800);
      });
    } catch (error) {
      console.error('Error creating user:', error);
      return {
        success: false,
        message: error.message || 'Erreur lors de la création de l\'utilisateur'
      };
    }
  }
  
  /**
   * Update an existing user
   * @param {number} userId - ID of user to update
   * @param {Object} userData - Updated user data
   * @returns {Promise} - Promise resolving to update result
   */
  async updateUser(userId, userData) {
    try {
      // Check if current user has permission
      if (!authService.hasPermission('users', 'edit')) {
        throw new Error('Permissions insuffisantes pour modifier un utilisateur');
      }
      
      // In production, implement actual API call
      // const response = await fetch(`/api/users/${userId}`, {
      //   method: 'PUT',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${localStorage.getItem('teamrooms_token')}`
      //   },
      //   body: JSON.stringify(userData)
      // });
      // return await response.json();
      
      // Mock implementation
      return new Promise(resolve => {
        setTimeout(() => {
          const userIndex = this.users.findIndex(u => u.id === userId);
          
          if (userIndex === -1) {
            resolve({
              success: false,
              message: 'Utilisateur introuvable'
            });
            return;
          }
          
          // Update user data
          this.users[userIndex] = {
            ...this.users[userIndex],
            ...userData,
            updatedAt: new Date().toISOString()
          };
          
          resolve({
            success: true,
            message: 'Utilisateur mis à jour avec succès',
            user: this.users[userIndex]
          });
        }, 800);
      });
    } catch (error) {
      console.error('Error updating user:', error);
      return {
        success: false,
        message: error.message || 'Erreur lors de la mise à jour de l\'utilisateur'
      };
    }
  }
  
  /**
   * Delete a user
   * @param {number} userId - ID of user to delete
   * @returns {Promise} - Promise resolving to delete result
   */
  async deleteUser(userId) {
    try {
      // Check if current user has permission
      if (!authService.hasPermission('users', 'delete')) {
        throw new Error('Permissions insuffisantes pour supprimer un utilisateur');
      }
      
      // In production, implement actual API call
      // const response = await fetch(`/api/users/${userId}`, {
      //   method: 'DELETE',
      //   headers: {
      //     'Authorization': `Bearer ${localStorage.getItem('teamrooms_token')}`
      //   }
      // });
      // return await response.json();
      
      // Mock implementation
      return new Promise(resolve => {
        setTimeout(() => {
          const userIndex = this.users.findIndex(u => u.id === userId);
          
          if (userIndex === -1) {
            resolve({
              success: false,
              message: 'Utilisateur introuvable'
            });
            return;
          }
          
          // Remove user
          this.users.splice(userIndex, 1);
          
          resolve({
            success: true,
            message: 'Utilisateur supprimé avec succès'
          });
        }, 800);
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      return {
        success: false,
        message: error.message || 'Erreur lors de la suppression de l\'utilisateur'
      };
    }
  }
  
  /**
   * Get available roles
   * @returns {Array} List of available roles
   */
  getRoles() {
    return this.roles;
  }
  
  /**
   * Get available departments
   * @returns {Array} List of departments
   */
  getDepartments() {
    return this.departments;
  }
  
  /**
   * Set user status (active/inactive)
   * @param {number} userId - User ID
   * @param {string} status - New status ('active' or 'inactive')
   * @returns {Promise} - Promise resolving to update result
   */
  async setUserStatus(userId, status) {
    if (status !== 'active' && status !== 'inactive') {
      return {
        success: false,
        message: 'Statut invalide. Utilisez "active" ou "inactive".'
      };
    }
    
    return this.updateUser(userId, { status });
  }
  
  /**
   * Reset user password
   * @param {number} userId - User ID
   * @returns {Promise} - Promise resolving to password reset result
   */
  async resetUserPassword(userId) {
    try {
      // Check if current user has permission
      if (!authService.hasPermission('users', 'edit')) {
        throw new Error('Permissions insuffisantes pour réinitialiser le mot de passe');
      }
      
      // In production, implement actual API call
      // const response = await fetch(`/api/users/${userId}/reset-password`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${localStorage.getItem('teamrooms_token')}`
      //   }
      // });
      // return await response.json();
      
      // Mock implementation
      return new Promise(resolve => {
        setTimeout(() => {
          const user = this.users.find(u => u.id === userId);
          
          if (!user) {
            resolve({
              success: false,
              message: 'Utilisateur introuvable'
            });
            return;
          }
          
          resolve({
            success: true,
            message: 'Mot de passe réinitialisé avec succès. Un email a été envoyé à l\'utilisateur.',
            tempPassword: 'ChangeMe123!' // In real implementation, this would be sent via email
          });
        }, 800);
      });
    } catch (error) {
      console.error('Error resetting password:', error);
      return {
        success: false,
        message: error.message || 'Erreur lors de la réinitialisation du mot de passe'
      };
    }
  }
}

// Create and export a singleton instance
const userManagementService = new UserManagementService();
export default userManagementService;
