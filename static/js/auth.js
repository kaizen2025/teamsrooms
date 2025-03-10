// auth.js - Authentication Module for TeamRooms

/**
 * Authentication service for the TeamRooms application
 * Handles login, registration, session management and user permissions
 */
class AuthService {
  constructor() {
    this.currentUser = null;
    this.isAuthenticated = false;
    this.userRoles = [];
    this.permissions = {};
    
    // Check if a session exists on initialization
    this.checkExistingSession();
  }

  /**
   * Check if user has an existing session stored in localStorage
   */
  checkExistingSession() {
    const storedUser = localStorage.getItem('teamrooms_user');
    const storedToken = localStorage.getItem('teamrooms_token');
    
    if (storedUser && storedToken) {
      try {
        this.currentUser = JSON.parse(storedUser);
        this.isAuthenticated = true;
        this.userRoles = this.currentUser.roles || [];
        this.loadUserPermissions();
        return true;
      } catch (error) {
        console.error('Error restoring session:', error);
        this.logout(); // Clear invalid session data
      }
    }
    return false;
  }

  /**
   * Authenticate user with credentials
   * @param {string} username - User's email or username
   * @param {string} password - User's password
   * @returns {Promise} - Promise resolving to user data or error
   */
  async login(username, password) {
    try {
      // In production, you would make an API call to your backend
      // For demonstration, we're using mock authentication
      
      // REPLACE THIS WITH ACTUAL API CALL:
      // const response = await fetch('/api/auth/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ username, password })
      // });
      // const data = await response.json();
      
      // Mock successful authentication
      const mockResponse = await this.mockAuthRequest(username, password);
      
      if (mockResponse.success) {
        this.currentUser = mockResponse.user;
        this.isAuthenticated = true;
        this.userRoles = mockResponse.user.roles;
        
        // Store authentication data
        localStorage.setItem('teamrooms_user', JSON.stringify(this.currentUser));
        localStorage.setItem('teamrooms_token', mockResponse.token);
        
        // Load user-specific permissions
        this.loadUserPermissions();
        
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
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Erreur de connexion. Veuillez réessayer.'
      };
    }
  }

  /**
   * Mock authentication request (replace with actual API calls)
   * @param {string} username 
   * @param {string} password 
   * @returns {Promise}
   */
  async mockAuthRequest(username, password) {
    // This would be replaced by actual backend authentication
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate server validation
        if (username === 'admin@anecoop.com' && password === 'admin123') {
          resolve({
            success: true,
            user: {
              id: 1,
              username: 'admin',
              email: 'admin@anecoop.com',
              fullName: 'Administrateur',
              roles: ['admin'],
              department: 'IT'
            },
            token: 'mock-jwt-token-xyz-123'
          });
        } else if (username === 'user@anecoop.com' && password === 'user123') {
          resolve({
            success: true,
            user: {
              id: 2,
              username: 'user',
              email: 'user@anecoop.com',
              fullName: 'Utilisateur Standard',
              roles: ['user'],
              department: 'Marketing'
            },
            token: 'mock-jwt-token-abc-456'
          });
        } else {
          resolve({
            success: false,
            message: 'Identifiants invalides. Veuillez réessayer.'
          });
        }
      }, 800); // Simulate network delay
    });
  }

  /**
   * Load permissions based on user roles
   */
  loadUserPermissions() {
    // Define permissions for different roles
    const rolePermissions = {
      admin: {
        rooms: ['view', 'book', 'edit', 'delete', 'manage'],
        users: ['view', 'create', 'edit', 'delete'],
        reports: ['view', 'create', 'export'],
        settings: ['view', 'edit']
      },
      manager: {
        rooms: ['view', 'book', 'edit'],
        users: ['view'],
        reports: ['view', 'export'],
        settings: ['view']
      },
      user: {
        rooms: ['view', 'book'],
        reports: ['view']
      }
    };

    // Combine permissions from all user roles
    this.permissions = {};
    this.userRoles.forEach(role => {
      if (rolePermissions[role]) {
        Object.keys(rolePermissions[role]).forEach(resource => {
          if (!this.permissions[resource]) {
            this.permissions[resource] = [];
          }
          
          // Add permissions without duplicates
          rolePermissions[role][resource].forEach(permission => {
            if (!this.permissions[resource].includes(permission)) {
              this.permissions[resource].push(permission);
            }
          });
        });
      }
    });
  }

  /**
   * Check if user has permission for a specific action
   * @param {string} resource - Resource type (e.g., 'rooms', 'users')
   * @param {string} action - Action to perform (e.g., 'view', 'edit')
   * @returns {boolean} - Whether user has permission
   */
  hasPermission(resource, action) {
    if (!this.isAuthenticated) return false;
    
    // Admins have all permissions
    if (this.userRoles.includes('admin')) return true;
    
    // Check specific permission
    return this.permissions[resource] && 
           this.permissions[resource].includes(action);
  }

  /**
   * Log out current user
   */
  logout() {
    // Clear authentication state
    this.currentUser = null;
    this.isAuthenticated = false;
    this.userRoles = [];
    this.permissions = {};
    
    // Clear stored session data
    localStorage.removeItem('teamrooms_user');
    localStorage.removeItem('teamrooms_token');
    
    // In production, you might want to notify your backend
    // fetch('/api/auth/logout', { method: 'POST' });
    
    // Redirect to login page
    window.location.href = 'login.html';
  }

  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise} - Promise resolving to registration result
   */
  async register(userData) {
    try {
      // In production, implement actual API call to backend
      // const response = await fetch('/api/auth/register', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(userData)
      // });
      // return await response.json();
      
      // Mock implementation
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            success: true,
            message: 'Compte créé avec succès. Vous pouvez maintenant vous connecter.'
          });
        }, 1000);
      });
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: 'Erreur lors de l\'inscription. Veuillez réessayer.'
      };
    }
  }

  /**
   * Get current authenticated user
   * @returns {Object|null} Current user or null if not authenticated
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} Authentication status
   */
  isUserAuthenticated() {
    return this.isAuthenticated;
  }
}

// Create and export a singleton instance
const authService = new AuthService();
export default authService;
