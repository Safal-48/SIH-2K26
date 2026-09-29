import { query } from '../config/database.js';
import workflowEngine from '../workflow/workflowEngine.js';
import AuditLogModel from '../models/auditLog.model.js';
import { AppError } from '../utils/appError.js';
import logger from '../utils/logger.js';

/**
 * Exception & Recovery Service (Step 12)
 * 
 * Manages operational workflow exceptions, local deterministic queue states,
 * and automated or administrative retry execution.
 */
export class ExceptionService {
  /**
   * Determine if an exception record is retryable
   */
  static isRetryable(row) {
    if (row.status === 'NON_RETRYABLE') return false;
    if (row.response_payload?.retryable !== undefined) {
      return Boolean(row.response_payload.retryable);
    }
    const err = (row.error_details || '').toUpperCase();
    if (
      err.includes('RECORD_NOT_FOUND') ||
      err.includes('MISMATCH') ||
      err.includes('NON_RETRYABLE') ||
      err.includes('INVALID_CERTIFICATE') ||
      err.includes('UNAUTHORIZED') ||
      err.includes('CRITERIA_FAILED')
    ) {
      return false;
    }
    return true;
  }

  /**
   * 1. Get All Exceptions with Multi-Dimensional Filtering
   * GET /api/exceptions
   * 
   * @param {Object} filters
   * @param {string} [filters.status] - 'ALL', 'QUEUED', 'FAILED', 'RETRYING', 'NON_RETRYABLE'
   * @param {string} [filters.department] - 'DBT', 'EDU', 'REV', etc.
   * @param {string} [filters.retryable] - 'true' or 'false'
   * @param {string} [filters.search] - search string for appId, citizenId, or error
   * @param {number} [filters.limit=50]
   */
  static async getExceptions(filters = {}) {
    const {
      status = 'ALL',
      department,
      retryable,
      search,
      limit = 50,
    } = filters;

    const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 50, 100));

    let sql = `
      SELECT 
        ws.id::text,
        ws.application_id,
        ws.step_number,
        ws.step_identifier,
        ws.step_name,
        ws.department_code,
        ws.status,
        ws.error_details,
        ws.attempts,
        ws.retry_count,
        ws.execution_time_ms,
        ws.response_payload,
        ws.started_at,
        ws.completed_at,
        a.citizen_id,
        a.scheme_name,
        a.status as application_status,
        a.submission_date,
        r.request_id as correlation_id,
        r.response_status_code as http_status_code
      FROM workflow_steps ws
      JOIN applications a ON ws.application_id = a.application_id
      LEFT JOIN LATERAL (
        SELECT request_id, response_status_code 
        FROM api_requests 
        WHERE application_id = ws.application_id 
        ORDER BY timestamp DESC LIMIT 1
      ) r ON true
      WHERE ws.status IN ('QUEUED', 'FAILED', 'RETRYING', 'NON_RETRYABLE')
    `;

    const params = [];
    let paramIndex = 1;

    if (status && status !== 'ALL') {
      sql += ` AND ws.status = $${paramIndex++}`;
      params.push(status.toUpperCase());
    }

    if (department && department !== 'ALL') {
      sql += ` AND ws.department_code = $${paramIndex++}`;
      params.push(department.toUpperCase());
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      sql += ` AND (ws.application_id ILIKE $${paramIndex} OR a.citizen_id ILIKE $${paramIndex} OR ws.error_details ILIKE $${paramIndex})`;
      paramIndex++;
      params.push(term);
    }

    sql += ` ORDER BY ws.completed_at DESC NULLS LAST, ws.started_at DESC LIMIT ${safeLimit}`;

    const res = await query(sql, params);

    const exceptions = res.rows.map((row) => {
      const isRet = ExceptionService.isRetryable(row);
      return {
        id: row.id,
        applicationId: row.application_id,
        citizenId: row.citizen_id,
        schemeName: row.scheme_name,
        stepNumber: row.step_number,
        stepIdentifier: row.step_identifier,
        stepName: row.step_name,
        departmentCode: row.department_code,
        status: row.status,
        retryable: isRet,
        canRetry: isRet && row.status !== 'SUCCESS',
        attempts: row.attempts || 1,
        retryCount: row.retry_count || 0,
        errorDetails: row.error_details || 'Service unavailable',
        correlationId: row.correlation_id || `CORR-${row.application_id}`,
        httpStatusCode: row.http_status_code || (row.status === 'QUEUED' ? 503 : 422),
        startedAt: row.started_at,
        failedAt: row.completed_at,
        queuedAt: row.completed_at || row.started_at,
      };
    });

    // Optional post-query filter by retryable if requested
    let filtered = exceptions;
    if (retryable !== undefined && retryable !== '') {
      const isRetryableExpected = String(retryable).toLowerCase() === 'true';
      filtered = filtered.filter((ex) => ex.retryable === isRetryableExpected);
    }

    return {
      count: filtered.length,
      total: filtered.length,
      exceptions: filtered,
    };
  }

  /**
   * 2. Get Single Exception by ID or Application ID
   */
  static async getExceptionById(idOrAppId) {
    const res = await query(`
      SELECT 
        ws.id::text,
        ws.application_id,
        ws.step_number,
        ws.step_identifier,
        ws.step_name,
        ws.department_code,
        ws.status,
        ws.error_details,
        ws.attempts,
        ws.retry_count,
        ws.execution_time_ms,
        ws.response_payload,
        ws.started_at,
        ws.completed_at,
        a.citizen_id,
        a.scheme_name,
        a.status as application_status,
        r.request_id as correlation_id,
        r.response_status_code as http_status_code
      FROM workflow_steps ws
      JOIN applications a ON ws.application_id = a.application_id
      LEFT JOIN LATERAL (
        SELECT request_id, response_status_code 
        FROM api_requests 
        WHERE application_id = ws.application_id 
        ORDER BY timestamp DESC LIMIT 1
      ) r ON true
      WHERE (ws.id::text = $1 OR ws.application_id = $1)
        AND ws.status IN ('QUEUED', 'FAILED', 'RETRYING', 'NON_RETRYABLE')
      ORDER BY ws.completed_at DESC NULLS LAST, ws.started_at DESC
      LIMIT 1
    `, [idOrAppId]);

    if (!res.rows || res.rows.length === 0) {
      return null;
    }

    const row = res.rows[0];
    const isRet = ExceptionService.isRetryable(row);

    return {
      id: row.id,
      applicationId: row.application_id,
      citizenId: row.citizen_id,
      schemeName: row.scheme_name,
      stepNumber: row.step_number,
      stepIdentifier: row.step_identifier,
      stepName: row.step_name,
      departmentCode: row.department_code,
      status: row.status,
      retryable: isRet,
      canRetry: isRet && row.status !== 'SUCCESS',
      attempts: row.attempts || 1,
      retryCount: row.retry_count || 0,
      errorDetails: row.error_details || 'Service unavailable',
      correlationId: row.correlation_id || `CORR-${row.application_id}`,
      httpStatusCode: row.http_status_code || 503,
      startedAt: row.started_at,
      failedAt: row.completed_at,
      queuedAt: row.completed_at || row.started_at,
    };
  }

  /**
   * 3. Retry an Exception
   * POST /api/exceptions/:id/retry
   * 
   * Strict Rules:
   * - Retries ONLY retryable failures.
   * - Rejects NON_RETRYABLE with 400 Bad Request.
   * - Persists attempts count.
   * - Avoids duplicating successful calls.
   * - Resumes from the failed step.
   * - Does NOT require citizen resubmission.
   */
  static async retryException(idOrAppId, options = {}) {
    logger.info(`ExceptionService: Initiating retry for exception reference [${idOrAppId}]`);

    const exception = await this.getExceptionById(idOrAppId);

    if (!exception) {
      throw AppError.notFound(
        `Exception record [${idOrAppId}] not found in queue or pipeline history`,
        'EXCEPTION_NOT_FOUND'
      );
    }

    // 1. Enforce: Retry ONLY retryable failures
    if (!exception.retryable || exception.status === 'NON_RETRYABLE') {
      logger.warn(`ExceptionService: Refusing retry for non-retryable exception [${idOrAppId}] (${exception.errorDetails})`);
      throw AppError.badRequest(
        `This exception is marked as NON_RETRYABLE (${exception.errorDetails}). Automated retry is prohibited. Manual verification required.`,
        'NON_RETRYABLE_EXCEPTION',
        {
          applicationId: exception.applicationId,
          stepName: exception.stepName,
          status: exception.status,
          retryable: false,
        }
      );
    }

    const { applicationId, stepNumber, stepName } = exception;

    // 2. Persist attempts & transition to RETRYING
    const nextAttempts = (exception.attempts || 0) + 1;
    const nextRetryCount = (exception.retryCount || 0) + 1;

    await query(`
      UPDATE workflow_steps
      SET status = 'RETRYING',
          attempts = $1,
          retry_count = $2,
          started_at = CURRENT_TIMESTAMP
      WHERE application_id = $3 AND step_number = $4
    `, [nextAttempts, nextRetryCount, applicationId, stepNumber]);

    await query(`
      UPDATE applications
      SET status = 'RETRYING',
          remarks = $1
      WHERE application_id = $2
    `, [`Admin retry attempt ${nextAttempts} initiated for ${stepName}`, applicationId]);

    // 3. Immutable Audit Logging
    await AuditLogModel.log({
      requestId: `REQ-RETRY-${Date.now().toString().slice(-6)}`,
      actorType: options.actorType || 'ADMIN',
      actorId: options.actorId || 'ADMIN-CONSOLE',
      departmentCode: exception.departmentCode,
      action: 'EXCEPTION_RETRY_INITIATED',
      entityType: 'APPLICATION',
      entityId: applicationId,
      status: 'RETRYING',
      metadata: {
        stepNumber,
        stepName,
        attempt: nextAttempts,
        retryCount: nextRetryCount,
        previousError: exception.errorDetails,
      },
    });

    // 4. Resume Workflow execution from the failed step
    // Previously successful steps are naturally skipped by workflowEngine!
    const resumeResult = await workflowEngine.resumeWorkflow(applicationId, {
      mockMode: options.mockMode !== undefined ? options.mockMode : true,
      connectorType: options.connectorType,
      isRetry: true,
    });

    logger.info(`ExceptionService: Resume execution outcome for [${applicationId}]: status=${resumeResult.status}, success=${resumeResult.success}`);

    // 5. Handle Outcome
    if (resumeResult.success || resumeResult.status === 'SUCCESS') {
      // 5a. Succeeded: Department recovered, subsequent steps completed
      await AuditLogModel.log({
        requestId: `REQ-RECOVERED-${Date.now().toString().slice(-6)}`,
        actorType: 'SYSTEM',
        actorId: 'EXCEPTION_SERVICE',
        departmentCode: exception.departmentCode,
        action: 'EXCEPTION_RETRY_SUCCEEDED',
        entityType: 'APPLICATION',
        entityId: applicationId,
        status: 'SUCCESS',
        metadata: {
          stepName,
          attempts: nextAttempts,
          resumedAt: new Date().toISOString(),
        },
      });

      // Citizen notification: Verified without resubmission
      await query(`
        INSERT INTO notifications (citizen_id, application_id, type, channel, title, message, status)
        VALUES ($1, $2, 'RETRY_SUCCEEDED', 'IN_APP', 'Retry Succeeded', $3, 'UNREAD')
      `, [
        exception.citizenId,
        applicationId,
        `Verification for ${stepName} has succeeded upon automated recovery. Your application has proceeded to final completion without requiring resubmission.`,
      ]);

      await query(`
        INSERT INTO notifications (citizen_id, application_id, type, channel, title, message, status)
        VALUES ($1, $2, 'WORKFLOW_RECOVERED', 'IN_APP', 'Verification Recovered', $3, 'UNREAD')
      `, [
        exception.citizenId,
        applicationId,
        `Verification for ${stepName} has succeeded upon automated recovery. Your application has proceeded to final completion without requiring resubmission.`,
      ]);

      return {
        success: true,
        recovered: true,
        message: `Exception retry succeeded. ${stepName} verified and workflow completed without citizen resubmission.`,
        data: {
          applicationId,
          status: 'SUCCESS',
          recoveredStep: stepName,
          attempts: nextAttempts,
          workflowResult: resumeResult,
        },
      };
    } else {
      // 5b. Department still unavailable: Stays in QUEUED state
      await AuditLogModel.log({
        requestId: `REQ-RETRY-HALT-${Date.now().toString().slice(-6)}`,
        actorType: 'SYSTEM',
        actorId: 'EXCEPTION_SERVICE',
        departmentCode: exception.departmentCode,
        action: 'EXCEPTION_RETRY_FAILED',
        entityType: 'APPLICATION',
        entityId: applicationId,
        status: resumeResult.status || 'QUEUED',
        metadata: {
          stepName,
          attempts: nextAttempts,
          error: resumeResult.error,
        },
      });

      return {
        success: false,
        recovered: false,
        message: `Retry attempted for ${stepName} but department remains unreachable (${resumeResult.error}). Maintained in QUEUED state.`,
        data: {
          applicationId,
          status: resumeResult.status || 'QUEUED',
          failedStepName: stepName,
          attempts: nextAttempts,
          error: resumeResult.error,
        },
      };
    }
  }

  /**
   * 4. Queue Summary & Aggregated Metrics
   * GET /api/exceptions/queue/summary
   */
  static async getQueueSummary() {
    const res = await query(`
      SELECT 
        count(*) FILTER (WHERE status = 'QUEUED') as queued_count,
        count(*) FILTER (WHERE status = 'RETRYING') as retrying_count,
        count(*) FILTER (WHERE status = 'FAILED') as failed_count,
        count(*) FILTER (WHERE status = 'NON_RETRYABLE') as non_retryable_count,
        count(*) as total_exceptions
      FROM workflow_steps
      WHERE status IN ('QUEUED', 'RETRYING', 'FAILED', 'NON_RETRYABLE')
    `);

    const deptRes = await query(`
      SELECT department_code, count(*) as count
      FROM workflow_steps
      WHERE status IN ('QUEUED', 'RETRYING')
      GROUP BY department_code
      ORDER BY count DESC
    `);

    const summary = res.rows[0] || {};

    return {
      totalQueued: parseInt(summary.queued_count || '0', 10),
      totalRetrying: parseInt(summary.retrying_count || '0', 10),
      totalFailed: parseInt(summary.failed_count || '0', 10),
      totalNonRetryable: parseInt(summary.non_retryable_count || '0', 10),
      totalExceptions: parseInt(summary.total_exceptions || '0', 10),
      departments: deptRes.rows.map((r) => ({
        department: r.department_code,
        count: parseInt(r.count, 10),
      })),
    };
  }

  /**
   * 5. Local Deterministic Queue Batch Processor (Prototype Simulation)
   * POST /api/exceptions/queue/process
   */
  static async processQueue(options = {}) {
    logger.info('ExceptionService: Running local deterministic queue processor...');

    const queuedRes = await query(`
      SELECT DISTINCT application_id
      FROM workflow_steps
      WHERE status = 'QUEUED'
      ORDER BY application_id ASC
      LIMIT 20
    `);

    const results = [];
    for (const row of queuedRes.rows) {
      try {
        const result = await this.retryException(row.application_id, options);
        results.push({
          applicationId: row.application_id,
          success: result.success,
          status: result.data.status,
          message: result.message,
        });
      } catch (err) {
        results.push({
          applicationId: row.application_id,
          success: false,
          error: err.message,
        });
      }
    }

    return {
      processedCount: results.length,
      successCount: results.filter((r) => r.success).length,
      failedCount: results.filter((r) => !r.success).length,
      results,
    };
  }
}

export default ExceptionService;
