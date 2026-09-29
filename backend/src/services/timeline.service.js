import { query } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * 7 Standard Sequential Timeline Stages
 */
export const TIMELINE_STAGES = [
  {
    step_number: 1,
    step_identifier: 'APPLICATION_RECEIVED',
    step_name: 'Application Submitted',
    department_code: 'INTEROP',
  },
  {
    step_number: 2,
    step_identifier: 'EDUCATION_VERIFICATION',
    step_name: 'Education Verification',
    department_code: 'EDU',
  },
  {
    step_number: 3,
    step_identifier: 'INCOME_VERIFICATION',
    step_name: 'Income Verification',
    department_code: 'REV',
  },
  {
    step_number: 4,
    step_identifier: 'BANK_VERIFICATION',
    step_name: 'Bank Verification',
    department_code: 'DBT',
  },
  {
    step_number: 5,
    step_identifier: 'ELIGIBILITY_CHECK',
    step_name: 'Eligibility Check',
    department_code: 'INTEROP',
  },
  {
    step_number: 6,
    step_identifier: 'OFFICER_APPROVAL',
    step_name: 'Officer Approval',
    department_code: 'INTEROP',
  },
  {
    step_number: 7,
    step_identifier: 'COMPLETION',
    step_name: 'Completion',
    department_code: 'INTEROP',
  },
];

/**
 * Standard Citizen-Friendly Basic Messages
 * Absolute zero technical leakage (no correlation IDs, error codes, retry counts or stack traces).
 */
const CITIZEN_MESSAGES = {
  APPLICATION_RECEIVED: {
    SUCCESS: 'Application details recorded and verified in the National Service Grid.',
    COMPLETED: 'Application details recorded and verified in the National Service Grid.',
    RUNNING: 'Application details are being recorded in the registry...',
    RETRYING: 'Re-checking application submission records...',
    QUEUED: 'Application submission queued.',
    FAILED: 'Application submission requires correction. Please verify your details.',
    PENDING: 'Application awaiting submission.',
  },
  EDUCATION_VERIFICATION: {
    SUCCESS: 'Academic enrollment and student credentials verified with the State Higher Education Council.',
    COMPLETED: 'Academic enrollment and student credentials verified.',
    RUNNING: 'Verifying student enrollment and course credentials with higher education authorities...',
    RETRYING: 'Re-checking academic credentials with education authorities...',
    QUEUED: 'Education verification queued for verification.',
    FAILED: 'Academic credentials could not be verified. Please check your student identifier.',
    PENDING: 'Scheduled to verify student enrollment records.',
  },
  INCOME_VERIFICATION: {
    SUCCESS: 'Annual family income certificate authenticated with the Revenue Department.',
    COMPLETED: 'Annual family income certificate authenticated.',
    RUNNING: 'Authenticating income certificate with the Revenue & Land Administration Department...',
    RETRYING: 'Re-connecting to Revenue Department registry to authenticate certificate...',
    QUEUED: 'Income verification queued with the Revenue Department.',
    FAILED: 'Income certificate could not be authenticated. Please check your certificate number.',
    PENDING: 'Scheduled to verify family income certificate.',
  },
  BANK_VERIFICATION: {
    SUCCESS: 'Bank account verified and active for Direct Benefit Transfer (DBT).',
    COMPLETED: 'Bank account verified and active for Direct Benefit Transfer (DBT).',
    RUNNING: 'Verifying bank account status and Direct Benefit Transfer (DBT) mandate...',
    RETRYING: 'Re-connecting to banking network to confirm account readiness...',
    QUEUED: 'Bank verification encountered a temporary network delay. You can retry verification now without resubmitting.',
    FAILED: 'Bank verification encountered a temporary network delay. You can retry verification now without resubmitting.',
    PENDING: 'Scheduled to verify Direct Benefit Transfer (DBT) bank account.',
  },
  ELIGIBILITY_CHECK: {
    SUCCESS: 'Composite scheme eligibility criteria evaluated and confirmed.',
    COMPLETED: 'Composite scheme eligibility criteria evaluated and confirmed.',
    RUNNING: 'Evaluating composite criteria across academic, income, and banking credentials...',
    RETRYING: 'Re-evaluating eligibility criteria against scheme guidelines...',
    QUEUED: 'Eligibility evaluation queued.',
    FAILED: 'Application does not currently meet scheme eligibility requirements.',
    PENDING: 'Scheduled to evaluate scheme eligibility criteria.',
  },
  OFFICER_APPROVAL: {
    SUCCESS: 'Welfare sanction review completed and approved by the sanction authority.',
    COMPLETED: 'Welfare sanction review completed and approved by the sanction authority.',
    RUNNING: 'Under administrative review by the scholarship sanction authority...',
    RETRYING: 'Sanction review in progress...',
    QUEUED: 'Awaiting sanction officer queue.',
    FAILED: 'Sanction review requires administrative clarification.',
    PENDING: 'Scheduled for sanction officer review.',
  },
  COMPLETION: {
    SUCCESS: 'Scholarship sanctioned and approved for electronic benefit transfer.',
    COMPLETED: 'Scholarship sanctioned and approved for electronic benefit transfer.',
    RUNNING: 'Finalizing electronic sanction order and disbursal mandate...',
    RETRYING: 'Finalizing electronic sanction mandate...',
    QUEUED: 'Disbursement mandate queued.',
    FAILED: 'Disbursement mandate processing paused.',
    PENDING: 'Scheduled for final disbursement.',
  },
};

/**
 * Map raw step status to citizen-friendly label
 * Supported labels:
 * - Submitted
 * - Verification in progress
 * - Verified
 * - Pending
 * - Action required
 * - Completed
 */
export function getCitizenStatus(stepIdentifier, rawStatus) {
  const statusUpper = (rawStatus || 'PENDING').toUpperCase();

  if (statusUpper === 'PENDING') {
    return 'Pending';
  }

  if (statusUpper === 'RUNNING' || statusUpper === 'RETRYING') {
    return 'Verification in progress';
  }

  if (statusUpper === 'FAILED' || statusUpper === 'QUEUED') {
    return 'Action required';
  }

  if (statusUpper === 'SUCCESS') {
    if (stepIdentifier === 'APPLICATION_RECEIVED') {
      return 'Submitted';
    }
    if (stepIdentifier === 'COMPLETION') {
      return 'Completed';
    }
    return 'Verified';
  }

  if (statusUpper === 'COMPLETED') {
    return 'Completed';
  }

  return 'Pending';
}

/**
 * Map raw step status to citizen-friendly basic message
 */
export function getCitizenMessage(stepIdentifier, rawStatus) {
  const statusUpper = (rawStatus || 'PENDING').toUpperCase();
  const stepMsgs = CITIZEN_MESSAGES[stepIdentifier] || {};
  return stepMsgs[statusUpper] || stepMsgs.PENDING || 'Step scheduled for processing.';
}

/**
 * Build the full 7-stage unified service timeline for an application
 * Driven directly by PostgreSQL persisted workflow_steps and application record.
 * 
 * @param {string} applicationId
 * @returns {Promise<Object>}
 */
export async function getUnifiedTimeline(applicationId) {
  // 1. Fetch application record
  const appRes = await query(
    `SELECT application_id, citizen_id, scheme_name, status, current_step, submission_date, approval_date
     FROM applications
     WHERE application_id = $1
     LIMIT 1`,
    [applicationId]
  );

  if (appRes.rows.length === 0) {
    return null;
  }

  const app = appRes.rows[0];

  // 2. Fetch all persisted step records from workflow_steps
  const stepsRes = await query(
    `SELECT step_number, step_identifier, step_name, department_code, status,
            execution_time_ms, retry_count, attempts, started_at, completed_at
     FROM workflow_steps
     WHERE application_id = $1
     ORDER BY step_number ASC`,
    [applicationId]
  );

  const stepMap = new Map();
  stepsRes.rows.forEach((s) => {
    // Map both by step_number and step_identifier for reliable lookup
    stepMap.set(s.step_number, s);
    if (s.step_identifier) {
      stepMap.set(s.step_identifier, s);
    }
  });

  // 3. Assemble full 7-stage sequence
  const isAppCompleted = app.status === 'SUCCESS' || app.status === 'APPROVED' || app.status === 'COMPLETED';

  const timeline = TIMELINE_STAGES.map((stage) => {
    const instance = stepMap.get(stage.step_number) || stepMap.get(stage.step_identifier);

    let rawStatus = instance ? instance.status : 'PENDING';
    
    // Normalize final completion step if application is overall completed
    if (stage.step_identifier === 'COMPLETION' && isAppCompleted && rawStatus === 'PENDING') {
      rawStatus = 'COMPLETED';
    }

    const citizenStatus = getCitizenStatus(stage.step_identifier, rawStatus);
    const basicMessage = getCitizenMessage(stage.step_identifier, rawStatus);

    return {
      step_number: stage.step_number,
      step_identifier: stage.step_identifier,
      step_name: stage.step_name,
      department_code: stage.department_code,
      status: rawStatus,
      citizen_status: citizenStatus,
      basic_message: basicMessage,
      started_at: instance ? instance.started_at : null,
      completed_at: instance ? instance.completed_at : (stage.step_identifier === 'COMPLETION' && isAppCompleted ? app.approval_date : null),
    };
  });

  const completedSteps = timeline.filter((s) => s.status === 'SUCCESS' || s.status === 'COMPLETED').length;
  const progressPercentage = Math.round((completedSteps / 7) * 100);

  return {
    applicationId: app.application_id,
    citizenId: app.citizen_id,
    schemeName: app.scheme_name,
    status: app.status,
    currentStep: app.current_step,
    totalSteps: 7,
    completedSteps,
    progressPercentage,
    timeline,
  };
}

export default {
  TIMELINE_STAGES,
  getCitizenStatus,
  getCitizenMessage,
  getUnifiedTimeline,
};
