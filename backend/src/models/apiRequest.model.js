import { query } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * API Request Log Model
 * Tracks all outbound cross-departmental integration calls, responses, and network telemetry.
 */
export const ApiRequestModel = {
  /**
   * Record an integration API request/response
   * @param {Object} reqData
   */
  log: async ({
    requestId,
    applicationId = null,
    serviceCode = 'SRV-INTEROP',
    endpoint,
    httpMethod = 'POST',
    requestHeaders = {},
    requestBody = {},
    responseStatusCode = 200,
    responseBody = {},
    latencyMs = 0,
    status = 'SUCCESS',
  }) => {
    try {
      const text = `
        INSERT INTO api_requests (
          request_id, application_id, service_code, endpoint, http_method,
          request_headers, request_body, response_status_code, response_body,
          latency_ms, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (request_id) DO UPDATE SET
          response_status_code = EXCLUDED.response_status_code,
          response_body = EXCLUDED.response_body,
          latency_ms = EXCLUDED.latency_ms,
          status = EXCLUDED.status
        RETURNING id, request_id, status, created_at
      `;
      const values = [
        requestId,
        applicationId,
        serviceCode,
        endpoint,
        httpMethod,
        JSON.stringify(requestHeaders || {}),
        JSON.stringify(requestBody || {}),
        responseStatusCode,
        JSON.stringify(responseBody || {}),
        latencyMs,
        status,
      ];
      const result = await query(text, values);
      return result.rows[0];
    } catch (err) {
      logger.error('Failed to persist API request record:', err.message);
      return null;
    }
  },

  /**
   * Find API requests by application ID
   * @param {string} applicationId
   */
  findByApplicationId: async (applicationId) => {
    const text = 'SELECT * FROM api_requests WHERE application_id = $1 ORDER BY timestamp DESC';
    const result = await query(text, [applicationId]);
    return result.rows;
  },

  /**
   * Find API request by request ID
   * @param {string} requestId
   */
  findByRequestId: async (requestId) => {
    const text = 'SELECT * FROM api_requests WHERE request_id = $1';
    const result = await query(text, [requestId]);
    return result.rows[0] || null;
  },
};

export default ApiRequestModel;
