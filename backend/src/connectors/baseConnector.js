import crypto from 'crypto';
import logger from '../utils/logger.js';
import config from '../config/env.js';

export const CONNECTOR_TYPES = {
  REST: 'REST',
  MOCK: 'MOCK',
  LEGACY: 'LEGACY',
  SANDBOX: 'SANDBOX',
};

/**
 * BaseConnector
 * Abstract foundation for all departmental connectors.
 * Enforces unified conceptual interface:
 *   execute(canonicalRequest) -> normalizedResult OR standardizedError
 */
export class BaseConnector {
  /**
   * @param {string} departmentCode - Unique code (EDU, REV, DBT, LEG)
   * @param {string} departmentName - Department description
   * @param {Object} [options={}] - Configuration options
   */
  constructor(departmentCode, departmentName, options = {}) {
    if (new.target === BaseConnector) {
      throw new TypeError('Cannot construct BaseConnector instances directly. Inherit from it instead.');
    }

    this.departmentCode = departmentCode;
    this.departmentName = departmentName;
    this.connectorType = options.connectorType || CONNECTOR_TYPES.REST;
    this.baseUrl = options.baseUrl || `http://localhost:${config.port || 5000}/api`;
    this.endpoint = options.endpoint || '';
    this.timeoutMs = options.timeoutMs || 8000;
  }

  /**
   * Propagate existing correlation_id or generate a new one
   */
  generateCorrelationId(providedId) {
    if (providedId && typeof providedId === 'string' && providedId.trim()) {
      return providedId.trim();
    }
    return `REQ-${this.departmentCode}-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  }

  /**
   * Build departmental request payload from canonical model
   * (Must be implemented by subclasses)
   */
  buildPayload(canonicalRequest) {
    return canonicalRequest;
  }

  /**
   * Transform raw departmental response to canonical platform model
   * (Must be implemented by subclasses)
   */
  normalizeResponse(rawResponse, canonicalRequest) {
    return rawResponse;
  }

  /**
   * Conceptual unified execution interface
   * @param {Object} canonicalRequest - Canonical workflow request parameters
   * @param {Object} [options={}] - Per-execution overrides (e.g., connectorType, timeoutMs, mockMode)
   * @returns {Promise<Object>} Normalized result object OR standardized error object
   */
  async execute(canonicalRequest = {}, options = {}) {
    const startTime = Date.now();
    const correlationId = this.generateCorrelationId(
      options.correlationId || options.correlation_id || canonicalRequest.correlation_id || canonicalRequest.correlationId
    );
    const connectorType = options.connectorType || this.connectorType;

    logger.info(`[${correlationId}] Connector [${this.departmentCode}] executing via type [${connectorType}]`);

    try {
      let rawResult;

      switch (connectorType) {
        case CONNECTOR_TYPES.REST:
          rawResult = await this.executeRest(canonicalRequest, correlationId, options);
          break;
        case CONNECTOR_TYPES.MOCK:
          rawResult = await this.executeMock(canonicalRequest, correlationId, options);
          break;
        case CONNECTOR_TYPES.LEGACY:
          rawResult = await this.executeLegacy(canonicalRequest, correlationId, options);
          break;
        case CONNECTOR_TYPES.SANDBOX:
          rawResult = await this.executeSandbox(canonicalRequest, correlationId, options);
          break;
        default:
          throw new Error(`Unsupported connector type: ${connectorType}`);
      }

      // Check if rawResult is an error response from the department
      if (rawResult && (rawResult.status === 'FAILED' || rawResult.error_code)) {
        return this.formatStandardizedError(rawResult, correlationId, startTime, connectorType);
      }

      const latencyMs = Date.now() - startTime;
      const normalizedData = this.normalizeResponse(rawResult, canonicalRequest);

      const result = {
        success: true,
        status: normalizedData.status || rawResult.status || 'VERIFIED',
        department_code: this.departmentCode,
        department_name: this.departmentName,
        correlation_id: correlationId,
        latency_ms: latencyMs,
        connector_type: connectorType,
        data: normalizedData,
        raw: rawResult,
      };

      logger.info(`[${correlationId}] Connector [${this.departmentCode}] succeeded in ${latencyMs}ms`);
      return result;
    } catch (err) {
      return this.formatStandardizedError(err, correlationId, startTime, connectorType);
    }
  }

  /**
   * Default REST execution over HTTP using standard fetch
   */
  async executeRest(canonicalRequest, correlationId, options) {
    const url = options.url || `${this.baseUrl}${this.endpoint}`;
    const payload = this.buildPayload(canonicalRequest);
    const timeout = options.timeoutMs || this.timeoutMs;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const headers = {
      'Content-Type': 'application/json',
      'X-Correlation-ID': correlationId,
      ...(options.headers || {}),
    };

    if (options.mockMode) {
      headers['X-Mock-Mode'] = options.mockMode;
    }
    if (options.mockDelay) {
      headers['X-Mock-Delay'] = String(options.mockDelay);
    }

    try {
      const response = await fetch(url, {
        method: options.method || 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Wrap response error with HTTP metadata
        const error = new Error(body.message || `Department HTTP ${response.status}`);
        error.status = body.status || 'FAILED';
        error.error_code = body.error_code || `HTTP_${response.status}`;
        error.retryable = body.retryable ?? (response.status >= 500 || response.status === 429);
        error.httpStatus = response.status;
        error.correlation_id = body.correlation_id || correlationId;
        error.details = body;
        throw error;
      }

      return body;
    } catch (fetchErr) {
      if (fetchErr.name === 'AbortError') {
        const timeoutError = new Error(`Department gateway request timed out after ${timeout}ms`);
        timeoutError.status = 'FAILED';
        timeoutError.error_code = 'GATEWAY_TIMEOUT';
        timeoutError.retryable = true;
        timeoutError.correlation_id = correlationId;
        throw timeoutError;
      }
      throw fetchErr;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Direct MOCK execution fallback (subclasses can override for direct service call)
   */
  async executeMock(canonicalRequest, correlationId, options) {
    // Falls back to REST against local mock service
    return this.executeRest(canonicalRequest, correlationId, options);
  }

  /**
   * Simulated LEGACY protocol adapter execution
   */
  async executeLegacy(canonicalRequest, correlationId, options) {
    throw new Error(`Legacy execution not implemented for ${this.departmentCode}`);
  }

  /**
   * Deterministic SANDBOX execution fallback
   */
  async executeSandbox(canonicalRequest, correlationId, options) {
    return this.executeRest(canonicalRequest, correlationId, options);
  }

  /**
   * Normalize any error into the uniform standardized error contract
   */
  formatStandardizedError(err, correlationId, startTime, connectorType) {
    const latencyMs = Date.now() - startTime;

    const standardizedError = {
      success: false,
      status: 'FAILED',
      department_code: this.departmentCode,
      department_name: this.departmentName,
      correlation_id: err.correlation_id || correlationId,
      latency_ms: latencyMs,
      connector_type: connectorType,
      error_code: err.error_code || 'SERVICE_UNAVAILABLE',
      message: err.message || 'Department service temporarily unavailable',
      retryable: err.retryable !== undefined ? Boolean(err.retryable) : true,
      details: err.details || null,
    };

    logger.warn(`[${correlationId}] Connector [${this.departmentCode}] failed in ${latencyMs}ms: [${standardizedError.error_code}] ${standardizedError.message}`);
    return standardizedError;
  }
}

export default BaseConnector;
