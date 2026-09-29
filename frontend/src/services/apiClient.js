/**
 * Centralized API Client Foundation
 * Provides standard request dispatching, authentication token injection,
 * and unified error extraction for all client-side network calls.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

class ApiError extends Error {
  constructor(message, statusCode, errorCode, details = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
  }
}

/**
 * Universal request wrapper
 * @param {string} endpoint - API path (relative to BASE_URL)
 * @param {RequestInit} [options={}] - Fetch configuration options
 */
export async function apiClient(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...options.headers,
  };

  // Optional: inject stored token if available in future auth steps
  const token = localStorage.getItem('auth_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new ApiError(
        data?.error?.message || data?.message || `HTTP ${response.status}: Request failed`,
        response.status,
        data?.error?.code || 'API_ERROR',
        data?.error?.details || null
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error.message || 'Network request failed. Ensure backend server is running.',
      0,
      'NETWORK_ERROR'
    );
  }
}

export default apiClient;
