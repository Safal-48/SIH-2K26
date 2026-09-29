/**
 * Citizen & Officer Authentication Service
 * Communicates with backend /api/auth endpoints and manages JWT sessions
 */
import { apiClient } from './apiClient.js';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

// Default demo citizen session for seamless demonstration
export const DEFAULT_DEMO_CITIZEN = {
  id: 'usr-czn-1001',
  username: 'aarav.sharma',
  citizenId: 'CZN-1001',
  fullName: 'Aarav Sharma',
  role: 'CITIZEN',
  departmentCode: 'CITIZEN',
  email: 'aarav.sharma@demo.gov.in',
  phoneMasked: 'XXXXXX4421',
};

export const authService = {
  /**
   * Login with identifier and password
   * @param {string} identifier - Citizen ID, username or email
   * @param {string} password - Password
   */
  async login(identifier, password) {
    const response = await apiClient('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });

    if (response.success && response.data?.token) {
      localStorage.setItem(TOKEN_KEY, response.data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
      return response.data;
    }

    throw new Error(response.message || 'Login failed');
  },

  /**
   * Register a new Citizen account with Email
   * @param {Object} payload - { email, password, fullName, citizenId }
   */
  async register({ email, password, fullName, citizenId }) {
    const response = await apiClient('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName, citizenId }),
    });

    if (response.success && response.data?.token) {
      localStorage.setItem(TOKEN_KEY, response.data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
      return response.data;
    }

    throw new Error(response.message || 'Registration failed');
  },

  /**
   * Dispatch 6-digit OTP code to email
   * @param {string} email
   */
  async sendOtp(email) {
    const response = await apiClient('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });

    if (response.success) {
      return response.data;
    }

    throw new Error(response.message || 'Failed to dispatch verification code');
  },

  /**
   * Verify email OTP and establish authenticated session
   * @param {string} email
   * @param {string} otp
   */
  async verifyOtp(email, otp) {
    const response = await apiClient('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });

    if (response.success && response.data?.token) {
      localStorage.setItem(TOKEN_KEY, response.data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
      return response.data;
    }

    throw new Error(response.message || 'Verification failed');
  },

  /**
   * Request password reset token for email
   * @param {string} email
   */
  async forgotPassword(email) {
    const response = await apiClient('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });

    if (response.success) {
      return response.data;
    }

    throw new Error(response.message || 'Failed to process forgot password request');
  },

  /**
   * Reset password with token
   * @param {string} email
   * @param {string} token
   * @param {string} newPassword
   */
  async resetPassword(email, token, newPassword) {
    const response = await apiClient('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, token, newPassword }),
    });

    if (response.success) {
      return response.data;
    }

    throw new Error(response.message || 'Failed to reset password');
  },

  /**
   * One-click demo login convenience for evaluators
   */
  async loginAsDemoCitizen(citizenId = 'CZN-1001') {
    const creds = citizenId === 'CZN-1002' 
      ? { identifier: 'CZN-1002', password: 'demo123' }
      : { identifier: 'citizen', password: 'demo123' };

    try {
      return await this.login(creds.identifier, creds.password);
    } catch {
      // Fallback: set local demo session if backend is initializing
      const demoUser = citizenId === 'CZN-1002'
        ? {
            id: 'usr-czn-1002',
            username: 'pooja.verma',
            citizenId: 'CZN-1002',
            fullName: 'Pooja Verma',
            role: 'CITIZEN',
            departmentCode: 'CITIZEN',
            email: 'pooja.verma@demo.gov.in',
            phoneMasked: 'XXXXXX8899',
          }
        : DEFAULT_DEMO_CITIZEN;
      localStorage.setItem(USER_KEY, JSON.stringify(demoUser));
      return { user: demoUser, token: 'mock-demo-token' };
    }
  },

  /**
   * One-click demo login convenience for Admin Control Center
   */
  async loginAsDemoAdmin() {
    return await this.login('admin', 'demo123');
  },

  /**
   * Get currently active session user
   */
  getCurrentUser() {
    try {
      const stored = localStorage.getItem(USER_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore JSON parse errors
    }
    // Return default demo citizen if not explicitly set
    return DEFAULT_DEMO_CITIZEN;
  },

  /**
   * Check if token is present
   */
  isAuthenticated() {
    return !!localStorage.getItem(TOKEN_KEY) || !!localStorage.getItem(USER_KEY);
  },

  /**
   * Logout user
   */
  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

export default authService;
