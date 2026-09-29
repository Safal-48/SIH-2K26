import { apiClient } from './apiClient.js';

/**
 * System Health Service
 * Interacts with Backend Health and Monitoring endpoints.
 */
export const healthService = {
  /**
   * Fetch current backend and database health status
   */
  getHealth: async () => {
    return await apiClient('/health');
  },

  /**
   * Fetch readiness probe
   */
  getReadiness: async () => {
    return await apiClient('/health/ready');
  },
};

export default healthService;
