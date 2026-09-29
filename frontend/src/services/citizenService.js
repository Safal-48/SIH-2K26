/**
 * Citizen Service API Client
 * Connects frontend portal directly to authoritative backend REST endpoints
 */
import { apiClient } from './apiClient.js';

export const citizenService = {
  /**
   * Fetch applications for a citizen
   * @param {string} citizenId - e.g. 'CZN-1001'
   */
  async getApplications(citizenId) {
    const queryParam = citizenId ? `?citizen_id=${encodeURIComponent(citizenId)}` : '';
    const res = await apiClient(`/applications${queryParam}`);
    return res.data?.applications || [];
  },

  /**
   * Fetch complete application details by application ID
   * @param {string} applicationId - e.g. 'SCH-2026-001'
   */
  async getApplicationById(applicationId) {
    const res = await apiClient(`/applications/${encodeURIComponent(applicationId)}`);
    return res.data;
  },

  /**
   * Fetch execution timeline for an application
   * @param {string} applicationId - e.g. 'SCH-2026-001'
   */
  async getTimeline(applicationId) {
    const res = await apiClient(`/applications/${encodeURIComponent(applicationId)}/timeline`);
    return res.data;
  },

  /**
   * Submit new scholarship application
   * Requires 5 core identifiers: citizen_id, student_id, institution_code, income_certificate_no, account_reference
   */
  async submitApplication(payload) {
    const res = await apiClient('/applications', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  /**
   * Grant legal citizen consent for cross-department data verification
   * @param {string} applicationId
   * @param {object} consentData - { purpose, scope }
   */
  async grantConsent(applicationId, consentData) {
    const res = await apiClient(`/applications/${encodeURIComponent(applicationId)}/consent`, {
      method: 'POST',
      body: JSON.stringify(consentData),
    });
    return res.data;
  },

  /**
   * Start or resume workflow verification pipeline after consent
   * @param {string} applicationId
   */
  async runWorkflow(applicationId) {
    const res = await apiClient(`/workflows/${encodeURIComponent(applicationId)}/run`, {
      method: 'POST',
      body: JSON.stringify({ applicationId }),
    });
    return res.data;
  },

  /**
   * Get live workflow status and progress percentage
   * @param {string} applicationId
   */
  async getWorkflowStatus(applicationId) {
    const res = await apiClient(`/workflows/${encodeURIComponent(applicationId)}/status`);
    return res.data;
  },

  /**
   * Get notifications stream for a citizen
   * @param {string} citizenId
   */
  async getNotifications(citizenId) {
    const queryParam = citizenId ? `?citizen_id=${encodeURIComponent(citizenId)}` : '';
    const res = await apiClient(`/notifications${queryParam}`);
    return res.data?.notifications || [];
  },

  /**
   * Mark a single notification as read
   * @param {string|number} id
   */
  async markNotificationAsRead(id) {
    const res = await apiClient(`/notifications/${encodeURIComponent(id)}/read`, {
      method: 'POST',
    });
    return res.data;
  },

  /**
   * Mark all notifications as read for current user
   */
  async markAllNotificationsAsRead() {
    const res = await apiClient('/notifications/mark-all-read', {
      method: 'POST',
    });
    return res.data;
  },
};

export default citizenService;
