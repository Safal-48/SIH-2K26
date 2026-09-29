import { query } from '../config/database.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ROLES } from '../services/auth.service.js';
import { validateApplicationInput } from '../validators/application.validator.js';
import ConsentModel from '../models/consent.model.js';
import WorkflowModel from '../models/workflow.model.js';
import AuditLogModel from '../models/auditLog.model.js';
import logger from '../utils/logger.js';
import timelineService from '../services/timeline.service.js';

/**
 * Generate Next Unique Application Identifier in SCH-2026-XXX sequence
 */
async function generateUniqueApplicationId() {
  const countRes = await query(`SELECT count(*) as count FROM applications`);
  let seq = parseInt(countRes.rows[0].count, 10) + 1;
  let candidate = `SCH-2026-${String(seq).padStart(3, '0')}`;

  while (true) {
    const existing = await query(`SELECT 1 FROM applications WHERE application_id = $1`, [candidate]);
    if (existing.rows.length === 0) {
      break;
    }
    seq++;
    candidate = `SCH-2026-${String(seq).padStart(3, '0')}`;
  }

  return candidate;
}

/**
 * 1. Submit New Scholarship Application
 * Full server-side validation, duplicate detection, citizen check, consent requirement & workflow initialization.
 */
export const createApplication = async (req, res, next) => {
  try {
    // 1. Server-side validation
    const validation = validateApplicationInput(req.body);
    if (!validation.isValid) {
      return ApiResponse.error(res, {
        message: validation.message,
        statusCode: validation.statusCode,
        errorCode: validation.errorCode,
        details: validation.details,
      });
    }

    const { normalized } = validation;

    // 2. Check citizen exists in Master Registry
    const citizenRes = await query(
      `SELECT citizen_id, full_name, status FROM citizens WHERE citizen_id = $1 LIMIT 1`,
      [normalized.citizen_id]
    );

    if (citizenRes.rows.length === 0) {
      return ApiResponse.error(res, {
        message: `Citizen '${normalized.citizen_id}' is not registered in the Master Citizen Registry`,
        statusCode: 404,
        errorCode: 'CITIZEN_NOT_FOUND',
        details: { citizenId: normalized.citizen_id },
      });
    }

    // 3. Check for Duplicate Application
    const duplicateRes = await query(
      `SELECT application_id, status, academic_year, submission_date 
       FROM applications 
       WHERE (citizen_id = $1 AND academic_year = $2 AND status NOT IN ('REJECTED', 'CANCELLED'))
          OR (student_id = $3 AND academic_year = $2 AND status NOT IN ('REJECTED', 'CANCELLED'))
       LIMIT 1`,
      [normalized.citizen_id, normalized.academic_year, normalized.student_id]
    );

    if (duplicateRes.rows.length > 0) {
      const existing = duplicateRes.rows[0];
      try {
        await AuditLogModel.log({
          requestId: `REQ-DUP-${Date.now().toString().slice(-6)}`,
          actorType: req.user?.role || 'CITIZEN',
          actorId: req.user?.username || normalized.citizen_id,
          departmentCode: 'INTEROP',
          action: 'APPLICATION_DUPLICATE_BLOCKED',
          entityType: 'APPLICATION',
          entityId: existing.application_id,
          status: 'BLOCKED',
          ipAddress: req.ip || '127.0.0.1',
          metadata: {
            existingApplicationId: existing.application_id,
            citizenId: normalized.citizen_id,
            studentId: normalized.student_id,
            academicYear: normalized.academic_year,
          },
        });
      } catch (e) {
        logger.warn(`Could not log duplicate application audit: ${e.message}`);
      }

      return ApiResponse.error(res, {
        message: `Duplicate application detected: Active application '${existing.application_id}' already exists for citizen '${normalized.citizen_id}' in academic year '${normalized.academic_year}'`,
        statusCode: 409,
        errorCode: 'DUPLICATE_APPLICATION',
        details: {
          existingApplicationId: existing.application_id,
          status: existing.status,
          academicYear: existing.academic_year,
          submissionDate: existing.submission_date,
        },
      });
    }

    // 4. Generate unique application ID
    const applicationId = await generateUniqueApplicationId();

    // Query active workflow definition from PostgreSQL so active version is used
    const activeDef = await WorkflowModel.getActiveDefinition('WF-SCHOLARSHIP-V1');
    const activeVersion = activeDef?.version || '1.0.0';

    // 5. Persist application to PostgreSQL
    await query(
      `INSERT INTO applications (
        application_id, citizen_id, service_code, workflow_code, workflow_version,
        scheme_name, status, academic_year, declared_income, student_id,
        institution_code, income_certificate_no, account_reference, current_step,
        submission_date, benefit_amount, remarks
      ) VALUES (
        $1, $2, 'HIGHER_EDU_SCHOLARSHIP', 'WF-SCHOLARSHIP-V1', $12,
        $3, 'SUBMITTED', $4, $5, $6,
        $7, $8, $9, 'APPLICATION_RECEIVED',
        CURRENT_TIMESTAMP, $10, $11
      )`,
      [
        applicationId,
        normalized.citizen_id,
        normalized.scheme_name,
        normalized.academic_year,
        normalized.declared_income,
        normalized.student_id,
        normalized.institution_code,
        normalized.income_certificate_no,
        normalized.account_reference,
        normalized.benefit_amount,
        'Application registered in orchestration grid and scheduled for verification.',
        activeVersion,
      ]
    );

    // Record Audit Log
    await AuditLogModel.log({
      requestId: `REQ-SUBMIT-${Date.now().toString().slice(-6)}`,
      actorType: req.user?.role || 'CITIZEN',
      actorId: req.user?.username || normalized.citizen_id,
      departmentCode: 'INTEROP',
      action: 'APPLICATION_SUBMITTED',
      entityType: 'APPLICATION',
      entityId: applicationId,
      status: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
      metadata: {
        citizenId: normalized.citizen_id,
        studentId: normalized.student_id,
        institutionCode: normalized.institution_code,
      },
    });

    // Create Citizen Notification
    await query(
      `INSERT INTO notifications (citizen_id, application_id, type, channel, title, message, status)
       VALUES ($1, $2, 'APPLICATION_SUBMITTED', 'IN_APP', 'Scholarship Application Registered', $3, 'UNREAD')`,
      [
        normalized.citizen_id,
        applicationId,
        `Your scholarship application ${applicationId} has been successfully submitted and registered.`,
      ]
    );

    // 6. Create workflow instance/state in workflow_steps
    await WorkflowModel.upsertStepInstance({
      applicationId,
      stepNumber: 1,
      stepIdentifier: 'APPLICATION_RECEIVED',
      stepName: 'Application Received',
      departmentCode: 'INTEROP',
      status: 'SUCCESS',
      requestPayload: {
        citizenId: normalized.citizen_id,
        studentId: normalized.student_id,
        institutionCode: normalized.institution_code,
        incomeCert: normalized.income_certificate_no,
        accountRef: normalized.account_reference,
      },
      responsePayload: {
        verified: true,
        status: 'APPLICATION_RECEIVED',
        receivedAt: new Date().toISOString(),
      },
      errorDetails: null,
      executionTimeMs: 12,
      retryCount: 0,
      attempts: 1,
      startedAt: new Date(),
      completedAt: new Date(),
    });

    // 7. Check or require consent
    let consentRecord = null;
    if (normalized.consent_granted) {
      consentRecord = await ConsentModel.grantConsent({
        applicationId,
        citizenId: normalized.citizen_id,
        purpose: 'Scholarship eligibility verification',
        allowedDepartments: ['EDU', 'REV', 'DBT'],
        dataScopes: ['Education verification', 'Income verification', 'Bank verification status'],
        ipAddress: req.ip || '127.0.0.1',
      });
    }

    // 8. Start workflow only when consent requirements are satisfied
    let workflowExecution = null;
    if (consentRecord && consentRecord.status === 'GRANTED') {
      const { workflowEngine } = await import('../workflow/workflowEngine.js');
      workflowExecution = await workflowEngine.executeWorkflow(applicationId, {
        mockMode: true,
      });
    }

    return ApiResponse.success(res, {
      message: consentRecord
        ? `Application ${applicationId} submitted and workflow completed with verified consent`
        : `Application ${applicationId} registered successfully. Citizen consent is required before cross-departmental verification can commence.`,
      statusCode: 201,
      data: {
        applicationId,
        citizenId: normalized.citizen_id,
        status: workflowExecution ? workflowExecution.status : 'SUBMITTED',
        currentStep: workflowExecution ? workflowExecution.currentStep : 'APPLICATION_RECEIVED',
        identifiers: {
          citizenId: normalized.citizen_id,
          studentId: normalized.student_id,
          institutionCode: normalized.institution_code,
          incomeCertificateNo: normalized.income_certificate_no,
          accountReference: normalized.account_reference,
        },
        consentRequired: !consentRecord,
        consentStatus: consentRecord ? consentRecord.status : 'PENDING_CONSENT',
        consent: consentRecord || null,
        workflow: workflowExecution || {
          status: 'PENDING_CONSENT',
          currentStep: 'Application Received',
          totalStepsExecuted: 1,
        },
      },
    });
  } catch (error) {
    logger.error('Error creating application:', error);
    next(error);
  }
};

/**
 * 2. Get Application Details by ID
 */
export const getById = async (req, res, next) => {
  try {
    const applicationId = req.params.id;
    const result = await query(
      `SELECT a.*, c.full_name as citizen_name, c.email as citizen_email, c.phone_masked
       FROM applications a
       JOIN citizens c ON a.citizen_id = c.citizen_id
       WHERE a.application_id = $1
       LIMIT 1`,
      [applicationId]
    );

    if (result.rows.length === 0) {
      return ApiResponse.error(res, {
        message: `Application '${applicationId}' not found`,
        statusCode: 404,
        errorCode: 'APPLICATION_NOT_FOUND',
      });
    }

    const application = result.rows[0];

    // Enforce Citizen Resource Ownership RBAC
    if (req.user && req.user.role === 'CITIZEN' && req.user.citizenId && req.user.citizenId !== application.citizen_id) {
      return ApiResponse.error(res, {
        message: 'Access forbidden: You cannot access or manage another citizen\'s application or records',
        statusCode: 403,
        errorCode: 'FORBIDDEN_OWNERSHIP',
        details: {
          applicationId,
          requesterCitizenId: req.user.citizenId,
        },
      });
    }

    // Fetch associated steps
    const stepsResult = await query(
      `SELECT step_number, step_identifier, step_name, department_code, status, execution_time_ms, started_at, completed_at, error_details
       FROM workflow_steps
       WHERE application_id = $1
       ORDER BY step_number ASC`,
      [applicationId]
    );

    // Fetch active consent
    const consentResult = await query(
      `SELECT consent_id, purpose, allowed_departments, data_scopes, status, granted_at, valid_until, revoked_at
       FROM consents
       WHERE application_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [applicationId]
    );

    // Build authoritative 7-stage unified timeline
    const timelineData = await timelineService.getUnifiedTimeline(applicationId);

    return ApiResponse.success(res, {
      message: 'Application retrieved successfully',
      data: {
        application,
        steps: stepsResult.rows,
        timeline: timelineData ? timelineData.timeline : stepsResult.rows,
        consent: consentResult.rows[0] || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Get Application Workflow Timeline
 */
export const getTimeline = async (req, res, next) => {
  try {
    const applicationId = req.params.id;

    // Check application exists
    const appCheck = await query(
      `SELECT application_id, citizen_id, status, current_step FROM applications WHERE application_id = $1 LIMIT 1`,
      [applicationId]
    );

    if (appCheck.rows.length === 0) {
      return ApiResponse.error(res, {
        message: `Application '${applicationId}' not found`,
        statusCode: 404,
        errorCode: 'APPLICATION_NOT_FOUND',
      });
    }

    // Enforce Citizen Resource Ownership RBAC
    if (req.user && req.user.role === 'CITIZEN' && req.user.citizenId && req.user.citizenId !== appCheck.rows[0].citizen_id) {
      return ApiResponse.error(res, {
        message: 'Access forbidden: You cannot access or manage another citizen\'s application timeline',
        statusCode: 403,
        errorCode: 'FORBIDDEN_OWNERSHIP',
        details: {
          applicationId,
          requesterCitizenId: req.user.citizenId,
        },
      });
    }

    const timelineData = await timelineService.getUnifiedTimeline(applicationId);

    return ApiResponse.success(res, {
      message: `Workflow timeline retrieved for application ${applicationId}`,
      data: timelineData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. List Applications
 */
export const list = async (req, res, next) => {
  try {
    let sql = `SELECT a.*, c.full_name as citizen_name 
               FROM applications a 
               JOIN citizens c ON a.citizen_id = c.citizen_id`;
    const params = [];

    // Enforce Citizen RBAC scope if logged in
    if (req.user?.role === ROLES.CITIZEN) {
      sql += ` WHERE a.citizen_id = $1`;
      params.push(req.user.citizenId);
    } else if (req.query.citizen_id) {
      sql += ` WHERE a.citizen_id = $1`;
      params.push(req.query.citizen_id);
    } else if (req.user?.role === ROLES.EDUCATION_OFFICER) {
      sql += ` WHERE a.current_step = 'EDUCATION_VERIFICATION'`;
    } else if (req.user?.role === ROLES.REVENUE_OFFICER) {
      sql += ` WHERE a.current_step = 'INCOME_VERIFICATION'`;
    } else if (req.user?.role === ROLES.BANK_DBT_OFFICER) {
      sql += ` WHERE a.current_step = 'BANK_VERIFICATION'`;
    }

    sql += ` ORDER BY a.submission_date DESC LIMIT 50`;

    const result = await query(sql, params);

    return ApiResponse.success(res, {
      message: `Retrieved ${result.rows.length} applications`,
      data: {
        count: result.rows.length,
        applications: result.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createApplication,
  getById,
  getTimeline,
  list,
};
