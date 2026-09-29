import { query } from '../config/database.js';
import logger from '../utils/logger.js';

export const ServiceRegistryModel = {
  /**
   * List all registered departmental services with persisted telemetry
   */
  listAll: async () => {
    try {
      const text = `
        SELECT 
          s.id,
          s.service_code,
          s.department_code,
          s.service_name,
          s.protocol,
          COALESCE(s.connector_type, 'REST') as connector_type,
          COALESCE(s.endpoint, s.health_endpoint, '/verify') as endpoint,
          s.base_url,
          s.health_endpoint,
          COALESCE(s.health_status, 'HEALTHY') as health_status,
          COALESCE(s.response_time_ms, 25) as response_time_ms,
          COALESCE(s.last_checked_at, s.created_at) as last_checked_at,
          s.last_test_result,
          s.timeout_ms,
          s.retry_limit,
          s.status,
          s.created_at
        FROM api_services s
        ORDER BY s.department_code ASC, s.service_code ASC
      `;
      const res = await query(text);
      return res.rows;
    } catch (err) {
      logger.error('ServiceRegistryModel.listAll error:', err.message);
      throw err;
    }
  },

  /**
   * Find a service by UUID or service_code (e.g. 'SRV-EDU-01')
   */
  findByIdOrCode: async (idOrCode) => {
    try {
      const text = `
        SELECT 
          s.id,
          s.service_code,
          s.department_code,
          s.service_name,
          s.protocol,
          COALESCE(s.connector_type, 'REST') as connector_type,
          COALESCE(s.endpoint, s.health_endpoint, '/verify') as endpoint,
          s.base_url,
          s.health_endpoint,
          COALESCE(s.health_status, 'HEALTHY') as health_status,
          COALESCE(s.response_time_ms, 25) as response_time_ms,
          COALESCE(s.last_checked_at, s.created_at) as last_checked_at,
          s.last_test_result,
          s.timeout_ms,
          s.retry_limit,
          s.status,
          s.created_at
        FROM api_services s
        WHERE s.id::text = $1 OR s.service_code = $1
        LIMIT 1
      `;
      const res = await query(text, [String(idOrCode).trim()]);
      return res.rows[0] || null;
    } catch (err) {
      logger.error(`ServiceRegistryModel.findByIdOrCode error for "${idOrCode}":`, err.message);
      throw err;
    }
  },

  /**
   * Persist service health check results directly into PostgreSQL
   */
  updateHealthTelemetry: async (idOrCode, { healthStatus, responseTimeMs, testResult = {} }) => {
    try {
      const text = `
        UPDATE api_services 
        SET 
          health_status = $1,
          response_time_ms = $2,
          last_checked_at = NOW(),
          last_test_result = $3
        WHERE id::text = $4 OR service_code = $4
        RETURNING 
          id,
          service_code,
          department_code,
          service_name,
          protocol,
          connector_type,
          endpoint,
          base_url,
          health_endpoint,
          health_status,
          response_time_ms,
          last_checked_at,
          last_test_result,
          timeout_ms,
          retry_limit,
          status
      `;
      const values = [
        healthStatus,
        Math.round(responseTimeMs),
        JSON.stringify(testResult),
        String(idOrCode).trim(),
      ];
      const res = await query(text, values);
      return res.rows[0] || null;
    } catch (err) {
      logger.error(`ServiceRegistryModel.updateHealthTelemetry error for "${idOrCode}":`, err.message);
      throw err;
    }
  },

  /**
   * Update service connector configuration
   */
  updateConfig: async (idOrCode, { connectorType, endpoint, timeoutMs, retryLimit, status }) => {
    try {
      const text = `
        UPDATE api_services
        SET 
          connector_type = COALESCE($1, connector_type),
          endpoint = COALESCE($2, endpoint),
          timeout_ms = COALESCE($3, timeout_ms),
          retry_limit = COALESCE($4, retry_limit),
          status = COALESCE($5, status)
        WHERE id::text = $6 OR service_code = $6
        RETURNING *
      `;
      const res = await query(text, [
        connectorType || null,
        endpoint || null,
        timeoutMs ? parseInt(timeoutMs, 10) : null,
        retryLimit ? parseInt(retryLimit, 10) : null,
        status || null,
        String(idOrCode).trim(),
      ]);
      return res.rows[0] || null;
    } catch (err) {
      logger.error(`ServiceRegistryModel.updateConfig error for "${idOrCode}":`, err.message);
      throw err;
    }
  },
};

export default ServiceRegistryModel;
