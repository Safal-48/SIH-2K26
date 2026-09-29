/**
 * Exception & Recovery API Client (Step 12)
 * Connects frontend directly to /api/exceptions & /api/admin/exceptions
 */
import { apiClient } from './apiClient.js';

export const exceptionService = {
  /**
   * Fetch all exceptions with optional filters
   * @param {Object} [params={}] - { status, department, retryable, search, limit }
   */
  async getExceptions(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.append('status', params.status);
    if (params.department) searchParams.append('department', params.department);
    if (params.retryable !== undefined && params.retryable !== '') searchParams.append('retryable', params.retryable);
    if (params.search) searchParams.append('search', params.search);
    if (params.limit) searchParams.append('limit', params.limit);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const res = await apiClient(`/exceptions${query}`);
    return res.data;
  },

  /**
   * Get single exception details
   * @param {string} id - Exception UUID or Application ID
   */
  async getExceptionById(id) {
    const res = await apiClient(`/exceptions/${encodeURIComponent(id)}`);
    return res.data;
  },

  /**
   * Trigger retry for an exception
   * @param {string} id - Exception UUID or Application ID
   */
  async retryException(id) {
    const res = await apiClient(`/exceptions/${encodeURIComponent(id)}/retry`, {
      method: 'POST',
    });
    return res.data;
  },

  /**
   * Get queue summary metrics
   */
  async getQueueSummary() {
    const res = await apiClient('/exceptions/queue/summary');
    return res.data;
  },

  /**
   * Trigger local deterministic batch queue processor
   */
  async processQueue() {
    const res = await apiClient('/exceptions/queue/process', {
      method: 'POST',
    });
    return res.data;
  },
};

export default exceptionService;
