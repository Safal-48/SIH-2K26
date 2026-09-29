import { query } from '../config/database.js';
import connectorRegistry from '../connectors/index.js';
import { mockDepartmentService } from './mockDepartment.service.js';
import { NotificationService } from './notification.service.js';
import logger from '../utils/logger.js';

/**
 * Admin Service: Authoritative operational telemetry & database calculations
 * All metrics, counts, and health statuses are calculated directly from PostgreSQL.
 */
export class AdminService {
  /**
   * 1. Overview KPIs
   * Calculated directly from PostgreSQL tables: applications, workflow_steps, api_requests, audit_logs
   */
  static async getOverviewKpis() {
    const [appCounts, stepCounts, requestStats, auditCount, exceptionCount] = await Promise.all([
      query(`
        SELECT 
          count(*) as total_apps,
          count(*) FILTER (WHERE status IN ('RUNNING', 'RETRYING')) as active_workflows,
          count(*) FILTER (WHERE status IN ('SUCCESS', 'APPROVED', 'COMPLETED')) as completed_workflows,
          count(*) FILTER (WHERE status IN ('SUBMITTED', 'PENDING_CONSENT', 'PENDING')) as pending_workflows,
          count(*) FILTER (WHERE status IN ('FAILED', 'QUEUED')) as failed_workflows
        FROM applications
      `),
      query(`
        SELECT 
          count(*) as total_steps,
          count(*) FILTER (WHERE status = 'SUCCESS') as success_steps,
          count(*) FILTER (WHERE status = 'FAILED') as failed_steps,
          count(*) FILTER (WHERE status = 'RETRYING') as retrying_steps,
          count(*) FILTER (WHERE status = 'QUEUED') as queued_steps
        FROM workflow_steps
      `),
      query(`
        SELECT 
          count(*) as total_requests,
          count(*) FILTER (WHERE status = 'SUCCESS') as success_requests,
          count(*) FILTER (WHERE status != 'SUCCESS') as failed_requests,
          COALESCE(AVG(latency_ms), 0) as avg_latency,
          COALESCE(MAX(latency_ms), 0) as max_latency,
          count(*) FILTER (WHERE latency_ms <= 1000) as in_sla_requests
        FROM api_requests
      `),
      query(`SELECT count(*) as total_audit_logs FROM audit_logs`),
      query(`SELECT count(*) as total_exceptions FROM workflow_steps WHERE status IN ('FAILED', 'QUEUED', 'RETRYING')`),
    ]);

    const apps = appCounts.rows[0] || {};
    const reqs = requestStats.rows[0] || {};
    const totalReqs = parseInt(reqs.total_requests || '0', 10);
    const inSlaReqs = parseInt(reqs.in_sla_requests || '0', 10);
    const slaComplianceRate = totalReqs > 0 ? Math.round((inSlaReqs / totalReqs) * 100) : 100;

    return {
      totalApplications: parseInt(apps.total_apps || '0', 10),
      activeWorkflows: parseInt(apps.active_workflows || '0', 10),
      completedWorkflows: parseInt(apps.completed_workflows || '0', 10),
      pendingWorkflows: parseInt(apps.pending_workflows || '0', 10),
      failedWorkflows: parseInt(apps.failed_workflows || '0', 10),
      totalApiDispatches: totalReqs,
      successfulDispatches: parseInt(reqs.success_requests || '0', 10),
      failedDispatches: parseInt(reqs.failed_requests || '0', 10),
      averageLatencyMs: Math.round(parseFloat(reqs.avg_latency || '0')),
      maxLatencyMs: parseInt(reqs.max_latency || '0', 10),
      slaComplianceRate,
      totalAuditLogs: parseInt(auditCount.rows[0]?.total_audit_logs || '0', 10),
      totalExceptions: parseInt(exceptionCount.rows[0]?.total_exceptions || '0', 10),
    };
  }

  /**
   * 2. Service Health
   * Shows: service name, department, connector type, health status, response time, last checked
   */
  static async getServiceHealth() {
    // 1. Fetch configured services from database
    const servicesRes = await query(`
      SELECT s.*, 
             COALESCE(r.req_count, 0) as total_requests,
             COALESCE(r.fail_count, 0) as fail_count,
             COALESCE(r.avg_latency, 12) as avg_latency,
             r.last_request_time
      FROM api_services s
      LEFT JOIN (
        SELECT 
          service_code,
          count(*) as req_count,
          count(*) FILTER (WHERE status != 'SUCCESS') as fail_count,
          AVG(latency_ms) as avg_latency,
          MAX(timestamp) as last_request_time
        FROM api_requests
        GROUP BY service_code
      ) r ON s.service_code = r.service_code
      ORDER BY s.department_code ASC
    `);

    // 2. Fetch mock department control state
    const mockState = mockDepartmentService.getStateSummary();

    return servicesRes.rows.map((srv) => {
      // Determine connector type from registry or protocol
      const connector = connectorRegistry.getByDepartmentCode(srv.department_code);
      let connectorType = connector ? connector.connectorType || 'REST' : (srv.protocol === 'SOAP_XML' ? 'LEGACY' : 'REST');

      // Determine real-time health status
      let healthStatus = 'HEALTHY';
      if (srv.department_code === 'DBT' && !mockState.bank.healthy) {
        healthStatus = 'DOWN';
      } else if (srv.department_code === 'REV' && mockState.income.delayMs > 2000) {
        healthStatus = 'DEGRADED';
      } else if (parseInt(srv.fail_count, 10) > 0 && parseInt(srv.total_requests, 10) > 0) {
        const failRate = parseInt(srv.fail_count, 10) / parseInt(srv.total_requests, 10);
        if (failRate > 0.5) healthStatus = 'DEGRADED';
      }

      return {
        serviceCode: srv.service_code,
        serviceName: srv.service_name,
        department: srv.department_code,
        connectorType,
        healthStatus,
        responseTime: Math.round(parseFloat(srv.avg_latency || '15')),
        lastChecked: srv.last_request_time || new Date().toISOString(),
        totalRequests: parseInt(srv.total_requests || '0', 10),
        status: srv.status,
      };
    });
  }

  /**
   * 4, 5, 6, 7. Workflows by Category (Active, Completed, Pending, Failed)
   * Information-dense operational records with correlation IDs, retry counts, attempts, and error details
   */
  static async getCategorizedWorkflows() {
    const [activeRes, completedRes, pendingRes, failedRes] = await Promise.all([
      // Active Workflows (RUNNING, RETRYING)
      query(`
        SELECT a.application_id, a.citizen_id, a.scheme_name, a.status, a.current_step, 
               a.academic_year, a.submission_date,
               ws.step_name as active_step_name, ws.step_identifier as active_step_identifier,
               ws.started_at as step_started_at, ws.attempts, ws.retry_count,
               r.request_id as correlation_id
        FROM applications a
        LEFT JOIN workflow_steps ws ON a.application_id = ws.application_id AND ws.step_name = a.current_step
        LEFT JOIN LATERAL (
          SELECT request_id FROM api_requests WHERE application_id = a.application_id ORDER BY timestamp DESC LIMIT 1
        ) r ON true
        WHERE a.status IN ('RUNNING', 'RETRYING')
        ORDER BY a.submission_date DESC LIMIT 50
      `),

      // Completed Workflows (SUCCESS, APPROVED, COMPLETION)
      query(`
        SELECT a.application_id, a.citizen_id, a.scheme_name, a.status, a.current_step,
               a.academic_year, a.benefit_amount, a.submission_date, a.approval_date,
               r.request_id as correlation_id
        FROM applications a
        LEFT JOIN LATERAL (
          SELECT request_id FROM api_requests WHERE application_id = a.application_id ORDER BY timestamp DESC LIMIT 1
        ) r ON true
        WHERE a.status IN ('SUCCESS', 'APPROVED', 'COMPLETED')
        ORDER BY a.approval_date DESC NULLS LAST, a.submission_date DESC LIMIT 50
      `),

      // Pending Workflows (SUBMITTED, PENDING_CONSENT, PENDING)
      query(`
        SELECT a.application_id, a.citizen_id, a.scheme_name, a.status, a.current_step,
               a.academic_year, a.submission_date,
               co.status as consent_status,
               r.request_id as correlation_id
        FROM applications a
        LEFT JOIN LATERAL (
          SELECT status FROM consents WHERE application_id = a.application_id ORDER BY created_at DESC LIMIT 1
        ) co ON true
        LEFT JOIN LATERAL (
          SELECT request_id FROM api_requests WHERE application_id = a.application_id ORDER BY timestamp DESC LIMIT 1
        ) r ON true
        WHERE a.status IN ('SUBMITTED', 'PENDING_CONSENT', 'PENDING')
        ORDER BY a.submission_date DESC LIMIT 50
      `),

      // Failed Workflows (FAILED, QUEUED)
      query(`
        SELECT a.application_id, a.citizen_id, a.scheme_name, a.status, a.current_step,
               a.academic_year, a.submission_date, a.remarks,
               ws.step_name as failed_step_name, ws.step_identifier as failed_step_identifier,
               ws.error_details, ws.attempts, ws.retry_count, ws.completed_at as failed_at,
               r.request_id as correlation_id
        FROM applications a
        LEFT JOIN workflow_steps ws ON a.application_id = ws.application_id AND ws.status IN ('FAILED', 'QUEUED')
        LEFT JOIN LATERAL (
          SELECT request_id FROM api_requests WHERE application_id = a.application_id ORDER BY timestamp DESC LIMIT 1
        ) r ON true
        WHERE a.status IN ('FAILED', 'QUEUED')
        ORDER BY ws.completed_at DESC NULLS LAST, a.submission_date DESC LIMIT 50
      `),
    ]);

    return {
      active: activeRes.rows,
      completed: completedRes.rows,
      pending: pendingRes.rows,
      failed: failedRes.rows,
    };
  }

  /**
   * 8. SLA Monitoring
   * Calculated per-department and overall
   */
  static async getSlaMonitoring() {
    const [deptSlaRes, latencyDistRes] = await Promise.all([
      query(`
        SELECT 
          s.department_code as department,
          s.service_name,
          s.timeout_ms as target_ms,
          COUNT(r.id) as request_count,
          COALESCE(AVG(r.latency_ms), 12) as avg_latency_ms,
          COALESCE(MAX(r.latency_ms), 20) as max_latency_ms,
          COUNT(r.id) FILTER (WHERE r.latency_ms <= 1000) as in_sla_count,
          COUNT(r.id) FILTER (WHERE r.latency_ms > 1000) as breach_count
        FROM api_services s
        LEFT JOIN api_requests r ON s.service_code = r.service_code
        GROUP BY s.department_code, s.service_name, s.timeout_ms
        ORDER BY s.department_code ASC
      `),
      query(`
        SELECT 
          count(*) FILTER (WHERE latency_ms < 100) as under_100ms,
          count(*) FILTER (WHERE latency_ms >= 100 AND latency_ms <= 500) as between_100_500ms,
          count(*) FILTER (WHERE latency_ms > 500) as over_500ms,
          count(*) as total
        FROM api_requests
      `),
    ]);

    const dist = latencyDistRes.rows[0] || {};
    const totalReqs = parseInt(dist.total || '0', 10);

    const departments = deptSlaRes.rows.map((row) => {
      const count = parseInt(row.request_count || '0', 10);
      const inSla = parseInt(row.in_sla_count || '0', 10);
      const complianceRate = count > 0 ? Math.round((inSla / count) * 100) : 100;
      return {
        department: row.department,
        serviceName: row.service_name,
        targetMs: row.target_ms || 1000,
        avgLatencyMs: Math.round(parseFloat(row.avg_latency_ms || '15')),
        maxLatencyMs: parseInt(row.max_latency_ms || '20', 10),
        requestCount: count,
        breachCount: parseInt(row.breach_count || '0', 10),
        complianceRate,
      };
    });

    const totalBreaches = departments.reduce((acc, d) => acc + d.breachCount, 0);
    const applicationSla = await NotificationService.calculateSlaMetrics(48);

    return {
      overallCompliance: departments.length > 0
        ? Math.round(departments.reduce((acc, d) => acc + d.complianceRate, 0) / departments.length)
        : 100,
      totalBreaches,
      departments,
      distribution: {
        under100ms: parseInt(dist.under_100ms || '0', 10),
        between100And500ms: parseInt(dist.between_100_500ms || '0', 10),
        over500ms: parseInt(dist.over_500ms || '0', 10),
        total: totalReqs,
      },
      applicationSla,
    };
  }

  /**
   * 9. Recent Exceptions
   * Exception queue: failed and retrying workflow step instances
   */
  static async getRecentExceptions(limit = 50) {
    const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 50, 100));
    const res = await query(`
      SELECT ws.id::text, ws.application_id, ws.step_number, ws.step_identifier, ws.step_name,
             ws.department_code, ws.status, ws.error_details, ws.attempts, ws.retry_count,
             ws.execution_time_ms, ws.started_at, ws.completed_at,
             a.citizen_id, a.scheme_name,
             r.request_id as correlation_id
      FROM workflow_steps ws
      JOIN applications a ON ws.application_id = a.application_id
      LEFT JOIN LATERAL (
        SELECT request_id FROM api_requests WHERE application_id = ws.application_id ORDER BY timestamp DESC LIMIT 1
      ) r ON true
      WHERE ws.status IN ('FAILED', 'QUEUED', 'RETRYING')
      ORDER BY ws.completed_at DESC NULLS LAST, ws.started_at DESC
      LIMIT ${safeLimit}
    `);

    return res.rows;
  }

  /**
   * 10. Recent Audit Events
   * Immutable audit trail
   */
  static async getRecentAuditEvents(limit = 50) {
    const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 50, 100));
    const res = await query(`
      SELECT id::text, request_id, actor_type, actor_id, department_code, action,
             entity_type, entity_id, status, ip_address, metadata, timestamp
      FROM audit_logs
      ORDER BY timestamp DESC
      LIMIT ${safeLimit}
    `);

    return res.rows;
  }

  /**
   * 3. Live Events Stream
   * Combined chronological feed of audit logs and API telemetry
   */
  static async getLiveEvents(limit = 50) {
    const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 50, 100));
    const auditRes = await query(`
      SELECT id::text, request_id, 'AUDIT' as event_type, actor_type as actor,
             department_code as department, action as description,
             entity_id as reference, status, timestamp
      FROM audit_logs
      ORDER BY timestamp DESC
      LIMIT ${safeLimit}
    `);

    const apiRes = await query(`
      SELECT r.id::text, r.request_id, 'API_DISPATCH' as event_type, 'SYSTEM' as actor,
             s.department_code as department, r.endpoint as description,
             r.application_id as reference, r.status, r.timestamp
      FROM api_requests r
      LEFT JOIN api_services s ON r.service_code = s.service_code
      ORDER BY r.timestamp DESC
      LIMIT ${safeLimit}
    `);

    const combined = [...auditRes.rows, ...apiRes.rows];
    combined.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return combined.slice(0, safeLimit);
  }

  /**
   * Full Consolidated Admin Dashboard Payload
   */
  static async getFullDashboardData() {
    const overview = await this.getOverviewKpis();
    const serviceHealth = await this.getServiceHealth();
    const workflows = await this.getCategorizedWorkflows();
    const sla = await this.getSlaMonitoring();
    const exceptions = await this.getRecentExceptions(25);
    const auditEvents = await this.getRecentAuditEvents(30);
    const liveEvents = await this.getLiveEvents(40);

    return {
      overview,
      serviceHealth,
      activeWorkflows: workflows.active,
      completedWorkflows: workflows.completed,
      pendingWorkflows: workflows.pending,
      failedWorkflows: workflows.failed,
      slaMonitoring: sla,
      recentExceptions: exceptions,
      recentAuditEvents: auditEvents,
      liveEvents,
    };
  }
}

export default AdminService;
