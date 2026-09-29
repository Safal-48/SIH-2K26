/**
 * Admin Service API Client
 * Connects Admin Control Center frontend directly to backend /api/v1/admin endpoints
 */
import { apiClient } from './apiClient.js';

export const adminService = {
  /**
   * Fetch full consolidated Admin Control Center telemetry
   */
  async getDashboard() {
    const res = await apiClient('/admin/dashboard');
    return res.data;
  },

  /**
   * Fetch Overview KPIs
   */
  async getOverview() {
    const res = await apiClient('/admin/overview');
    return res.data;
  },

  /**
   * Fetch Departmental Service Health statuses
   */
  async getServiceHealth() {
    const res = await apiClient('/admin/services');
    return res.data;
  },

  /**
   * Fetch filterable workflows
   * @param {Object} [params={}] - { status, search, department }
   */
  async getWorkflows(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.append('status', params.status);
    if (params.search) searchParams.append('search', params.search);
    if (params.department) searchParams.append('department', params.department);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const res = await apiClient(`/admin/workflows${query}`);
    return res.data;
  },

  /**
   * Resume/Re-run a workflow as Admin
   * @param {string} applicationId
   */
  async resumeWorkflow(applicationId) {
    const res = await apiClient(`/admin/workflows/${encodeURIComponent(applicationId)}/resume`, {
      method: 'POST',
    });
    return res.data;
  },

  /**
   * Fetch SLA telemetry and monitoring metrics
   */
  async getSla() {
    const res = await apiClient('/admin/sla');
    return res.data;
  },

  /**
   * Fetch exception queue (failed and retrying step instances)
   */
  async getExceptions(limit = 50) {
    const res = await apiClient(`/admin/exceptions?limit=${limit}`);
    return res.data?.exceptions || [];
  },

  /**
   * Fetch system audit trail
   */
  async getAuditLogs(limit = 50) {
    const res = await apiClient(`/admin/audit-logs?limit=${limit}`);
    return res.data?.logs || [];
  },

  /**
   * Fetch live operational events stream
   */
  async getLiveEvents(limit = 50) {
    const res = await apiClient(`/admin/live-events?limit=${limit}`);
    return res.data?.events || [];
  },

  /**
   * Fetch operational notifications from PostgreSQL
   */
  async getNotifications(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await apiClient(`/notifications${query ? `?${query}` : ''}`);
    return res.data?.notifications || [];
  },

  /**
   * Trigger SLA evaluation and automated alert dispatching
   */
  async evaluateSla(targetHours = 48) {
    const res = await apiClient('/sla/evaluate', {
      method: 'POST',
      body: JSON.stringify({ targetHours }),
    });
    return res.data;
  },

  /**
   * List all workflow definitions
   */
  async getWorkflowDefinitions() {
    const res = await apiClient('/admin/workflow-builder/definitions');
    return res.data?.definitions || [];
  },

  /**
   * Get specific workflow definition with steps
   */
  async getWorkflowDefinition(code, version = null) {
    const query = version ? `?version=${encodeURIComponent(version)}` : '';
    const res = await apiClient(`/admin/workflow-builder/definitions/${encodeURIComponent(code)}${query}`);
    return res.data;
  },

  /**
   * Create a new workflow definition version
   */
  async createWorkflowVersion(data) {
    const res = await apiClient('/admin/workflow-builder/definitions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  /**
   * Activate a specific workflow version
   */
  async activateWorkflowVersion(code, version) {
    const res = await apiClient(`/admin/workflow-builder/definitions/${encodeURIComponent(code)}/versions/${encodeURIComponent(version)}/activate`, {
      method: 'POST',
    });
    return res.data;
  },

  /**
   * Add a step to a workflow version
   */
  async addWorkflowStep(code, version, stepData) {
    const res = await apiClient(`/admin/workflow-builder/definitions/${encodeURIComponent(code)}/versions/${encodeURIComponent(version)}/steps`, {
      method: 'POST',
      body: JSON.stringify(stepData),
    });
    return res.data;
  },

  /**
   * Update a step in a workflow version
   */
  async updateWorkflowStep(code, version, stepId, stepData) {
    const res = await apiClient(`/admin/workflow-builder/definitions/${encodeURIComponent(code)}/versions/${encodeURIComponent(version)}/steps/${encodeURIComponent(stepId)}`, {
      method: 'PUT',
      body: JSON.stringify(stepData),
    });
    return res.data;
  },

  /**
   * Delete a step from a workflow version
   */
  async deleteWorkflowStep(code, version, stepId) {
    const res = await apiClient(`/admin/workflow-builder/definitions/${encodeURIComponent(code)}/versions/${encodeURIComponent(version)}/steps/${encodeURIComponent(stepId)}`, {
      method: 'DELETE',
    });
    return res.data;
  },

  /**
   * Toggle a step's enabled state
   */
  async toggleWorkflowStep(code, version, stepId, isEnabled) {
    const res = await apiClient(`/admin/workflow-builder/definitions/${encodeURIComponent(code)}/versions/${encodeURIComponent(version)}/steps/${encodeURIComponent(stepId)}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ isEnabled }),
    });
    return res.data;
  },

  /**
   * Reorder steps in a workflow version
   */
  async reorderWorkflowSteps(code, version, stepIds) {
    const res = await apiClient(`/admin/workflow-builder/definitions/${encodeURIComponent(code)}/versions/${encodeURIComponent(version)}/reorder`, {
      method: 'POST',
      body: JSON.stringify({ stepIds }),
    });
    return res.data;
  },

  /**
   * Save all steps in a workflow version
   */
  async saveWorkflowSteps(code, version, steps) {
    const res = await apiClient(`/admin/workflow-builder/definitions/${encodeURIComponent(code)}/versions/${encodeURIComponent(version)}/steps`, {
      method: 'PUT',
      body: JSON.stringify({ steps }),
    });
    return res.data;
  },

  // ==============================================================================
  // STEP 15: DATA MAPPING & SERVICE REGISTRY APIs
  // ==============================================================================

  /**
   * Get all canonical data mappings
   */
  async getMappings(filters = {}) {
    const params = new URLSearchParams();
    if (filters.sourceSystem) params.set('sourceSystem', filters.sourceSystem);
    if (filters.departmentCode) params.set('departmentCode', filters.departmentCode);
    if (filters.search) params.set('search', filters.search);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient(`/mappings${queryString}`);
    return res.data || [];
  },

  /**
   * Create a new field data mapping
   */
  async createMapping(mappingData) {
    const res = await apiClient('/mappings', {
      method: 'POST',
      body: JSON.stringify(mappingData),
    });
    return res.data;
  },

  /**
   * Update a field data mapping
   */
  async updateMapping(id, mappingData) {
    const res = await apiClient(`/mappings/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(mappingData),
    });
    return res.data;
  },

  /**
   * Delete a field data mapping
   */
  async deleteMapping(id) {
    const res = await apiClient(`/mappings/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.data;
  },

  /**
   * Test a transformation rule interactively
   */
  async testMappingRule(value, rule) {
    const res = await apiClient('/mappings/test', {
      method: 'POST',
      body: JSON.stringify({ value, rule }),
    });
    return res.data;
  },

  /**
   * Get all registered services with health, connector type, response time, and last checked
   */
  async getServices() {
    const res = await apiClient('/services');
    return res.data || [];
  },

  /**
   * Test a service connector via backend probe (persists health and latency)
   */
  async testService(idOrCode) {
    const res = await apiClient(`/services/${encodeURIComponent(idOrCode)}/test`, {
      method: 'POST',
    });
    return res;
  },

  /**
   * Update service configuration
   */
  async updateServiceConfig(idOrCode, config) {
    const res = await apiClient(`/services/${encodeURIComponent(idOrCode)}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
    return res.data;
  },

  // ==============================================================================
  // STEP 16: DEMO SCENARIO CONTROLS APIs
  // ==============================================================================

  /**
   * 1. Run Full Success (Golden Path)
   */
  async runFullSuccess() {
    const res = await apiClient('/admin/demo/full-success', { method: 'POST' });
    return res.data;
  },

  /**
   * 2. Fail Bank API (503 / Timeout, Queue state)
   */
  async failBankApi() {
    const res = await apiClient('/admin/demo/fail-bank', { method: 'POST' });
    return res.data;
  },

  /**
   * 3. Recover Bank API (Resume queued workflow)
   */
  async recoverBankApi() {
    const res = await apiClient('/admin/demo/recover-bank', { method: 'POST' });
    return res.data;
  },

  /**
   * 4. Slow Income API (Inject latency & persist)
   */
  async slowIncomeApi(delayMs = 2500) {
    const res = await apiClient('/admin/demo/slow-income', {
      method: 'POST',
      body: JSON.stringify({ delayMs }),
    });
    return res.data;
  },

  /**
   * 5. Invalid Income (Route to rejection)
   */
  async invalidIncome() {
    const res = await apiClient('/admin/demo/invalid-income', { method: 'POST' });
    return res.data;
  },

  /**
   * 6. Duplicate Application (HTTP 409 detection)
   */
  async triggerDuplicate() {
    try {
      const res = await apiClient('/admin/demo/duplicate', { method: 'POST' });
      return res.data;
    } catch (err) {
      // Return error payload directly so UI can display 409 details
      if (err.data) return err.data;
      throw err;
    }
  },

  /**
   * 7. Reset Demo (Restore deterministic state)
   */
  async resetDemo() {
    const res = await apiClient('/admin/demo/reset', { method: 'POST' });
    return res.data;
  },

  /**
   * Get Demo Status
   */
  async getDemoStatus() {
    const res = await apiClient('/admin/demo/status');
    return res.data;
  },
};

export default adminService;
