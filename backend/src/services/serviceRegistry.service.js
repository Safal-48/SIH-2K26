import ServiceRegistryModel from '../models/serviceRegistry.model.js';
import connectorRegistry from '../connectors/index.js';
import mockDepartmentService from './mockDepartment.service.js';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';
import crypto from 'crypto';

export class ServiceRegistryService {
  /**
   * Get all registered services with persisted telemetry and real-time status
   */
  static async getAllServices() {
    const services = await ServiceRegistryModel.listAll();
    const mockState = mockDepartmentService.getStateSummary();

    return services.map((srv) => {
      // Reconcile real-time mock simulation states
      let health = srv.health_status || 'HEALTHY';
      if (srv.department_code === 'DBT' && mockState.bank && !mockState.bank.healthy) {
        health = 'DOWN';
      } else if (srv.department_code === 'REV' && mockState.income && mockState.income.delayMs > 2000) {
        health = 'DEGRADED';
      }

      return {
        id: srv.id,
        service: srv.service_name,
        serviceName: srv.service_name,
        serviceCode: srv.service_code,
        department: srv.department_code,
        departmentCode: srv.department_code,
        connectorType: srv.connector_type || 'REST',
        endpoint: srv.endpoint || srv.health_endpoint || '/verify',
        health,
        healthStatus: health,
        responseTime: Math.round(srv.response_time_ms || 25),
        responseTimeMs: Math.round(srv.response_time_ms || 25),
        lastChecked: srv.last_checked_at || srv.created_at,
        lastCheckedAt: srv.last_checked_at || srv.created_at,
        protocol: srv.protocol,
        baseUrl: srv.base_url,
        healthEndpoint: srv.health_endpoint,
        timeoutMs: srv.timeout_ms,
        retryLimit: srv.retry_limit,
        status: srv.status || 'ACTIVE',
        lastTestResult: srv.last_test_result || null,
      };
    });
  }

  /**
   * Get a single service by ID or code
   */
  static async getServiceById(idOrCode) {
    const srv = await ServiceRegistryModel.findByIdOrCode(idOrCode);
    if (!srv) return null;

    const mockState = mockDepartmentService.getStateSummary();
    let health = srv.health_status || 'HEALTHY';
    if (srv.department_code === 'DBT' && mockState.bank && !mockState.bank.healthy) {
      health = 'DOWN';
    } else if (srv.department_code === 'REV' && mockState.income && mockState.income.delayMs > 2000) {
      health = 'DEGRADED';
    }

    return {
      id: srv.id,
      service: srv.service_name,
      serviceName: srv.service_name,
      serviceCode: srv.service_code,
      department: srv.department_code,
      departmentCode: srv.department_code,
      connectorType: srv.connector_type || 'REST',
      endpoint: srv.endpoint || srv.health_endpoint || '/verify',
      health,
      healthStatus: health,
      responseTime: Math.round(srv.response_time_ms || 25),
      responseTimeMs: Math.round(srv.response_time_ms || 25),
      lastChecked: srv.last_checked_at || srv.created_at,
      lastCheckedAt: srv.last_checked_at || srv.created_at,
      protocol: srv.protocol,
      baseUrl: srv.base_url,
      healthEndpoint: srv.health_endpoint,
      timeoutMs: srv.timeout_ms,
      retryLimit: srv.retry_limit,
      status: srv.status || 'ACTIVE',
      lastTestResult: srv.last_test_result || null,
    };
  }

  /**
   * Execute real backend health/connector test probe for a service
   * Persists health and latency into PostgreSQL.
   */
  static async testService(idOrCode, userContext = {}) {
    const srv = await ServiceRegistryModel.findByIdOrCode(idOrCode);
    if (!srv) {
      const err = new Error(`Service "${idOrCode}" not found in registry`);
      err.status = 404;
      throw err;
    }

    logger.info(`Initiating backend connector test probe for service [${srv.service_code}] via [${srv.connector_type}]`);

    const startTime = Date.now();
    let probeSuccess = true;
    let probeResponse = null;
    let errorMessage = null;
    let statusCode = 200;

    const correlationId = `TEST-${srv.department_code}-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    try {
      const connector = connectorRegistry.getByDepartmentCode(srv.department_code);

      if (srv.connector_type === 'LEGACY') {
        const legConnector = connectorRegistry.legacy;
        probeResponse = await legConnector.execute(
          { recordKey: 'LEG-ARCHIVE-9001', citizenId: 'CZN-1001' },
          { connectorType: 'LEGACY', correlationId }
        );
        probeSuccess = probeResponse?.success !== false && probeResponse?.status !== 'FAILED';
      } else if (connector) {
        // Build representative test payload
        let testPayload = { citizen_id: 'CZN-1001', citizenId: 'CZN-1001' };
        if (srv.department_code === 'EDU') {
          testPayload = {
            citizen_id: 'CZN-1001',
            citizenId: 'CZN-1001',
            student_id: 'STU-1001',
            studentId: 'STU-1001',
            institution_code: 'COL-001',
            institutionCode: 'COL-001',
          };
        } else if (srv.department_code === 'REV') {
          testPayload = {
            citizen_id: 'CZN-1001',
            citizenId: 'CZN-1001',
            income_certificate_no: 'INC-5001',
            certificateNumber: 'INC-5001',
          };
        } else if (srv.department_code === 'DBT') {
          testPayload = {
            citizen_id: 'CZN-1001',
            citizenId: 'CZN-1001',
            account_reference: 'BANK-7001',
            accountReference: 'BANK-7001',
          };
        }

        probeResponse = await connector.execute(testPayload, {
          connectorType: srv.connector_type,
          correlationId,
          timeoutMs: srv.timeout_ms || 5000,
        });

        probeSuccess = probeResponse?.success !== false && probeResponse?.status !== 'FAILED';
        if (!probeSuccess) {
          errorMessage = probeResponse?.message || 'Connector verification returned failure';
          statusCode = 503;
        }
      } else {
        // Generic or mock service probe (e.g. SRV-MCK-01)
        await new Promise((r) => setTimeout(r, 20));
        probeResponse = {
          success: true,
          status: 'HEALTHY',
          message: 'Generic connector heartbeat acknowledged',
          timestamp: new Date().toISOString(),
        };
      }
    } catch (testErr) {
      probeSuccess = false;
      errorMessage = testErr.message;
      statusCode = testErr.httpStatus || 503;
      probeResponse = {
        success: false,
        error: testErr.message,
        code: testErr.error_code || 'PROBE_FAILED',
      };
      logger.warn(`Connector probe test for [${srv.service_code}] failed: ${testErr.message}`);
    }

    const latencyMs = Math.max(1, Date.now() - startTime);

    // Determine health status
    let healthStatus = 'HEALTHY';
    if (!probeSuccess) {
      healthStatus = 'DOWN';
    } else if (latencyMs > 2000) {
      healthStatus = 'DEGRADED';
    }

    const testResult = {
      testedAt: new Date().toISOString(),
      correlationId,
      statusCode,
      success: probeSuccess,
      latencyMs,
      healthStatus,
      errorMessage,
      details: probeResponse,
    };

    // 1. Persist to PostgreSQL api_services
    const updatedSrv = await ServiceRegistryModel.updateHealthTelemetry(srv.id, {
      healthStatus,
      responseTimeMs: latencyMs,
      testResult,
    });

    // 2. Persist to api_requests telemetry log
    try {
      const requestId = `REQ-PROBE-${srv.department_code}-${Date.now().toString().slice(-6)}`;
      await query(
        `
        INSERT INTO api_requests (
          request_id, service_code, endpoint, http_method, 
          latency_ms, status, response_status_code, response_body
        ) VALUES ($1, $2, $3, 'POST', $4, $5, $6, $7)
      `,
        [
          requestId,
          srv.service_code,
          srv.endpoint || '/verify',
          latencyMs,
          probeSuccess ? 'SUCCESS' : 'FAILED',
          statusCode,
          JSON.stringify(testResult),
        ]
      );
    } catch (telemetryErr) {
      logger.warn(`Could not persist test telemetry to api_requests: ${telemetryErr.message}`);
    }

    // 3. Write immutable audit log
    try {
      await query(
        `
        INSERT INTO audit_logs (
          actor_type, actor_id, department_code, action, 
          entity_type, entity_id, status, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
        [
          'ADMIN',
          userContext.username || 'admin',
          srv.department_code,
          'TEST_SERVICE_CONNECTOR',
          'SERVICE',
          srv.service_code,
          healthStatus,
          JSON.stringify({ latencyMs, connectorType: srv.connector_type, probeSuccess }),
        ]
      );
    } catch (auditErr) {
      logger.warn(`Could not log service test audit event: ${auditErr.message}`);
    }

    return {
      service: {
        id: updatedSrv.id,
        service: updatedSrv.service_name,
        serviceName: updatedSrv.service_name,
        serviceCode: updatedSrv.service_code,
        department: updatedSrv.department_code,
        departmentCode: updatedSrv.department_code,
        connectorType: updatedSrv.connector_type,
        endpoint: updatedSrv.endpoint,
        health: updatedSrv.health_status,
        healthStatus: updatedSrv.health_status,
        responseTime: updatedSrv.response_time_ms,
        responseTimeMs: updatedSrv.response_time_ms,
        lastChecked: updatedSrv.last_checked_at,
        lastCheckedAt: updatedSrv.last_checked_at,
        status: updatedSrv.status,
      },
      testResult,
    };
  }

  /**
   * Update service connector configuration
   */
  static async updateServiceConfig(idOrCode, config = {}, userContext = {}) {
    const updated = await ServiceRegistryModel.updateConfig(idOrCode, config);
    if (!updated) {
      const err = new Error(`Service "${idOrCode}" not found`);
      err.status = 404;
      throw err;
    }

    // Write audit log
    try {
      await query(
        `
        INSERT INTO audit_logs (
          actor_type, actor_id, department_code, action, 
          entity_type, entity_id, status, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
        [
          'ADMIN',
          userContext.username || 'admin',
          updated.department_code,
          'UPDATE_SERVICE_CONFIG',
          'SERVICE',
          updated.service_code,
          'SUCCESS',
          JSON.stringify(config),
        ]
      );
    } catch (err) {
      logger.warn(`Audit log failed: ${err.message}`);
    }

    return updated;
  }
}

export default ServiceRegistryService;
