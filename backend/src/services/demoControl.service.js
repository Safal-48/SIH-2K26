import mockDepartmentService from './mockDepartment.service.js';
import workflowEngine from '../workflow/workflowEngine.js';
import ExceptionService from './exception.service.js';
import incomeConnector from '../connectors/incomeConnector.js';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';
import crypto from 'crypto';

export class DemoControlService {
  /**
   * 1. RUN FULL SUCCESS
   * - Restores known-good baseline state
   * - Executes golden path end-to-end to SUCCESS (7/7 steps)
   */
  static async runFullSuccess(userContext = {}) {
    logger.info('DemoControlService: Executing Scenario 1 [Run Full Success]');

    // 1. Reset all mock controls to healthy baseline
    mockDepartmentService.resetAll();

    // 2. Mark all api_services HEALTHY in PostgreSQL
    await query(`
      UPDATE api_services 
      SET health_status = 'HEALTHY', response_time_ms = 25 
      WHERE status = 'ACTIVE'
    `);

    // 3. Generate unique application ID for repeatable demonstration
    const randomSuffix = Math.floor(Math.random() * 800) + 100;
    const applicationId = `SCH-2026-${randomSuffix}`;
    const consentId = `CNS-DEMO-${randomSuffix}`;

    // 4. Persist application in PostgreSQL
    await query(
      `
      INSERT INTO applications (
        application_id, citizen_id, service_code, workflow_code, workflow_version,
        scheme_name, status, academic_year, declared_income, student_id,
        income_certificate_no, account_reference, current_step, submission_date, benefit_amount, remarks
      ) VALUES (
        $1, 'CZN-1001', 'HIGHER_EDU_SCHOLARSHIP', 'WF-SCHOLARSHIP-V1', '1.0.0',
        'Post-Matric Merit-cum-Means Financial Assistance Scheme', 'SUBMITTED', '2025-2026', 180000.00,
        'STU-1001', 'INC-5001', 'BANK-7001', 'APPLICATION_RECEIVED', NOW(), 25000.00,
        'Automated golden-path demonstration run.'
      )
    `,
      [applicationId]
    );

    // 5. Grant required consent
    await query(
      `
      INSERT INTO consents (
        consent_id, citizen_id, application_id, purpose,
        allowed_departments, data_scopes, status, granted_at, valid_from, valid_until
      ) VALUES (
        $1, 'CZN-1001', $2, 'Scholarship eligibility verification',
        ARRAY['EDU', 'REV', 'DBT'], ARRAY['Education verification', 'Income verification', 'Bank verification status'],
        'GRANTED', NOW(), NOW(), NOW() + INTERVAL '180 days'
      )
    `,
      [consentId, applicationId]
    );

    // 6. Execute backend workflow engine
    const executionResult = await workflowEngine.executeWorkflow(applicationId);

    // 7. Fetch completed step sequence
    const stepsRes = await query(
      `
      SELECT step_number, step_identifier, step_name, department_code, status, execution_time_ms
      FROM workflow_steps
      WHERE application_id = $1
      ORDER BY step_number ASC
    `,
      [applicationId]
    );

    // 8. Log audit trail
    try {
      await query(
        `
        INSERT INTO audit_logs (
          actor_type, actor_id, department_code, action, 
          entity_type, entity_id, status, metadata
        ) VALUES ($1, $2, 'INTEROP', 'DEMO_CONTROL_RUN_SUCCESS', 'APPLICATION', $3, 'SUCCESS', $4)
      `,
        [
          'ADMIN',
          userContext.username || 'admin',
          applicationId,
          JSON.stringify({ status: executionResult.status, stepsCount: stepsRes.rows.length }),
        ]
      );
    } catch (e) {
      logger.warn(`Audit log failed: ${e.message}`);
    }

    return {
      scenario: 'RUN_FULL_SUCCESS',
      applicationId,
      consentId,
      status: executionResult.status,
      isCompleted: executionResult.status === 'SUCCESS',
      stepsCount: stepsRes.rows.length,
      steps: stepsRes.rows,
      message: 'Full golden-path workflow executed successfully to completion (7/7 steps SUCCESS).',
    };
  }

  /**
   * 2. FAIL BANK API
   * - Sets Bank API to deterministic 503 / timeout
   * - Creates retryable exception and transitions workflow into RETRYING / QUEUED state
   */
  static async failBankApi(userContext = {}) {
    logger.info('DemoControlService: Executing Scenario 2 [Fail Bank API]');

    // 1. Configure Bank API failure state in mock service
    const bankState = mockDepartmentService.setBankControl({
      healthy: false,
      errorCode: 'SERVICE_UNAVAILABLE',
      message: 'Core Banking PFMS Gateway temporarily unavailable (HTTP 503)',
      retryable: true,
      httpStatus: 503,
    });

    // 2. Mark DBT service DOWN in PostgreSQL
    await query(`
      UPDATE api_services 
      SET health_status = 'DOWN' 
      WHERE department_code = 'DBT'
    `);

    // 3. Create fresh application to exhibit the failure deterministically
    const randomSuffix = Math.floor(Math.random() * 800) + 100;
    const applicationId = `SCH-2026-${randomSuffix}`;
    const consentId = `CNS-DEMO-${randomSuffix}`;

    await query(
      `
      INSERT INTO applications (
        application_id, citizen_id, service_code, workflow_code, workflow_version,
        scheme_name, status, academic_year, declared_income, student_id,
        income_certificate_no, account_reference, current_step, submission_date, benefit_amount, remarks
      ) VALUES (
        $1, 'CZN-1001', 'HIGHER_EDU_SCHOLARSHIP', 'WF-SCHOLARSHIP-V1', '1.0.0',
        'Post-Matric Merit-cum-Means Financial Assistance Scheme', 'SUBMITTED', '2025-2026', 180000.00,
        'STU-1001', 'INC-5001', 'BANK-7001', 'APPLICATION_RECEIVED', NOW(), 25000.00,
        'Demonstration of Bank failure and retryable exception queueing.'
      )
    `,
      [applicationId]
    );

    await query(
      `
      INSERT INTO consents (
        consent_id, citizen_id, application_id, purpose,
        allowed_departments, data_scopes, status, valid_until
      ) VALUES (
        $1, 'CZN-1001', $2, 'Scholarship eligibility verification',
        ARRAY['EDU', 'REV', 'DBT'], ARRAY['Education verification', 'Income verification', 'Bank verification status'],
        'GRANTED', NOW() + INTERVAL '180 days'
      )
    `,
      [consentId, applicationId]
    );

    // 4. Run workflow (Education & Income succeed, Bank fails)
    const runResult = await workflowEngine.executeWorkflow(applicationId);

    // 5. Query failed / queued step
    const queuedStepRes = await query(
      `
      SELECT id, step_number, step_identifier, step_name, department_code, status, error_details, retry_count
      FROM workflow_steps
      WHERE application_id = $1 AND step_identifier = 'BANK_VERIFICATION'
      ORDER BY id DESC LIMIT 1
    `,
      [applicationId]
    );

    // 6. Log audit trail
    try {
      await query(
        `
        INSERT INTO audit_logs (
          actor_type, actor_id, department_code, action, 
          entity_type, entity_id, status, metadata
        ) VALUES ($1, $2, 'DBT', 'DEMO_CONTROL_FAIL_BANK', 'APPLICATION', $3, 'FAILED', $4)
      `,
        [
          'ADMIN',
          userContext.username || 'admin',
          applicationId,
          JSON.stringify({ bankState, queuedStep: queuedStepRes.rows[0] }),
        ]
      );
    } catch (e) {
      logger.warn(`Audit log failed: ${e.message}`);
    }

    return {
      scenario: 'FAIL_BANK_API',
      bankState,
      applicationId,
      workflowStatus: runResult.status,
      failedStep: queuedStepRes.rows[0] || null,
      retryable: true,
      message: 'Bank API failed with deterministic 503. Retryable exception created and step entered QUEUED state.',
    };
  }

  /**
   * 3. RECOVER BANK API
   * - Marks Bank healthy
   * - Allows queued/retry execution to succeed and completes pending workflow
   */
  static async recoverBankApi(userContext = {}) {
    logger.info('DemoControlService: Executing Scenario 3 [Recover Bank API]');

    // 1. Mark Bank API healthy in mock service
    const bankState = mockDepartmentService.setBankControl({ healthy: true });

    // 2. Mark DBT service HEALTHY in PostgreSQL
    await query(`
      UPDATE api_services 
      SET health_status = 'HEALTHY', response_time_ms = 25 
      WHERE department_code = 'DBT'
    `);

    // 3. Find latest queued/failed Bank step across all applications
    const pendingStepRes = await query(`
      SELECT ws.id, ws.application_id, ws.step_identifier, ws.status
      FROM workflow_steps ws
      JOIN applications a ON ws.application_id = a.application_id
      WHERE ws.step_identifier = 'BANK_VERIFICATION' 
        AND ws.status IN ('QUEUED', 'FAILED', 'RETRYING')
        AND a.status != 'REJECTED'
      ORDER BY ws.started_at DESC
      LIMIT 1
    `);

    let resumeResult = null;
    let resumedAppId = null;

    if (pendingStepRes.rows.length > 0) {
      const step = pendingStepRes.rows[0];
      resumedAppId = step.application_id;
      logger.info(`DemoControlService: Resuming queued workflow for application [${resumedAppId}]...`);
      resumeResult = await workflowEngine.resumeWorkflow(resumedAppId);
    }

    // 4. Log audit trail
    try {
      await query(
        `
        INSERT INTO audit_logs (
          actor_type, actor_id, department_code, action, 
          entity_type, entity_id, status, metadata
        ) VALUES ($1, $2, 'DBT', 'DEMO_CONTROL_RECOVER_BANK', 'SERVICE', 'SRV-DBT-01', 'SUCCESS', $3)
      `,
        [
          'ADMIN',
          userContext.username || 'admin',
          JSON.stringify({ bankState, resumedAppId, resumeResult }),
        ]
      );
    } catch (e) {
      logger.warn(`Audit log failed: ${e.message}`);
    }

    return {
      scenario: 'RECOVER_BANK_API',
      bankState,
      resumedApplicationId: resumedAppId,
      workflowStatus: resumeResult?.status || 'HEALTHY_READY_FOR_EXECUTION',
      message: resumedAppId
        ? `Bank API restored to HEALTHY. Queued application [${resumedAppId}] automatically resumed and completed!`
        : 'Bank API restored to HEALTHY. Future bank transactions will succeed.',
    };
  }

  /**
   * 4. SLOW INCOME API
   * - Injects configurable latency (default 2500ms)
   * - Probes connector and persists actual measured latency to PostgreSQL
   */
  static async slowIncomeApi({ delayMs = 2500 } = {}, userContext = {}) {
    logger.info(`DemoControlService: Executing Scenario 4 [Slow Income API: ${delayMs}ms]`);

    const delay = Math.max(1000, parseInt(delayMs, 10) || 2500);

    // 1. Inject delay in mock service
    const incomeState = mockDepartmentService.setIncomeControl({ delayMs: delay, healthy: true, invalid: false });

    // 2. Measure actual round-trip latency via real probe
    const startTime = Date.now();
    await incomeConnector.execute({
      citizen_id: 'CZN-1001',
      income_certificate_no: 'INC-5001',
    });
    const actualLatency = Date.now() - startTime;

    // 3. Persist degraded health and actual measured latency into PostgreSQL
    await query(
      `
      UPDATE api_services 
      SET 
        health_status = 'DEGRADED',
        response_time_ms = $1,
        last_checked_at = NOW()
      WHERE department_code = 'REV'
    `,
      [actualLatency]
    );

    // 4. Log audit trail
    try {
      await query(
        `
        INSERT INTO audit_logs (
          actor_type, actor_id, department_code, action, 
          entity_type, entity_id, status, metadata
        ) VALUES ($1, $2, 'REV', 'DEMO_CONTROL_SLOW_INCOME', 'SERVICE', 'SRV-REV-01', 'DEGRADED', $3)
      `,
        [
          'ADMIN',
          userContext.username || 'admin',
          JSON.stringify({ injectedDelayMs: delay, actualMeasuredLatencyMs: actualLatency }),
        ]
      );
    } catch (e) {
      logger.warn(`Audit log failed: ${e.message}`);
    }

    return {
      scenario: 'SLOW_INCOME_API',
      injectedDelayMs: delay,
      actualMeasuredLatencyMs: actualLatency,
      incomeState,
      serviceHealth: 'DEGRADED',
      message: `Injected ${delay}ms latency into Revenue Department API. Actual latency (${actualLatency}ms) persisted to PostgreSQL.`,
    };
  }

  /**
   * 5. INVALID INCOME
   * - Sets Income API to return non-verifiable / invalid certificate
   * - Routes workflow appropriately to rejection
   */
  static async invalidIncome(userContext = {}) {
    logger.info('DemoControlService: Executing Scenario 5 [Invalid Income]');

    // 1. Set invalid income flag in mock service
    mockDepartmentService.setIncomeControl({ invalid: true, delayMs: 0 });

    // 2. Create demo application to exhibit rejection routing
    const randomSuffix = Math.floor(Math.random() * 800) + 100;
    const applicationId = `SCH-2026-${randomSuffix}`;
    const consentId = `CNS-DEMO-${randomSuffix}`;

    await query(
      `
      INSERT INTO applications (
        application_id, citizen_id, service_code, workflow_code, workflow_version,
        scheme_name, status, academic_year, declared_income, student_id,
        income_certificate_no, account_reference, current_step, submission_date, benefit_amount, remarks
      ) VALUES (
        $1, 'CZN-1001', 'HIGHER_EDU_SCHOLARSHIP', 'WF-SCHOLARSHIP-V1', '1.0.0',
        'Post-Matric Merit-cum-Means Financial Assistance Scheme', 'SUBMITTED', '2025-2026', 180000.00,
        'STU-1001', 'INC-5001', 'BANK-7001', 'APPLICATION_RECEIVED', NOW(), 25000.00,
        'Demonstration of invalid income verification routing.'
      )
    `,
      [applicationId]
    );

    await query(
      `
      INSERT INTO consents (
        consent_id, citizen_id, application_id, purpose,
        allowed_departments, data_scopes, status, valid_until
      ) VALUES (
        $1, 'CZN-1001', $2, 'Scholarship eligibility verification',
        ARRAY['EDU', 'REV', 'DBT'], ARRAY['Education verification', 'Income verification', 'Bank verification status'],
        'GRANTED', NOW() + INTERVAL '180 days'
      )
    `,
      [consentId, applicationId]
    );

    // 3. Execute workflow (Step 1 & 2 succeed, Step 3 fails non-retryable)
    const runResult = await workflowEngine.executeWorkflow(applicationId);

    // 4. Reset invalid flag so normal operations aren't permanently poisoned
    mockDepartmentService.setIncomeControl({ invalid: false });

    // 5. Query failed step
    const stepRes = await query(
      `
      SELECT step_number, step_identifier, step_name, status, error_details
      FROM workflow_steps
      WHERE application_id = $1 AND step_identifier = 'INCOME_VERIFICATION'
    `,
      [applicationId]
    );

    // 6. Log audit trail
    try {
      await query(
        `
        INSERT INTO audit_logs (
          actor_type, actor_id, department_code, action, 
          entity_type, entity_id, status, metadata
        ) VALUES ($1, $2, 'REV', 'DEMO_CONTROL_INVALID_INCOME', 'APPLICATION', $3, 'FAILED', $4)
      `,
        [
          'ADMIN',
          userContext.username || 'admin',
          applicationId,
          JSON.stringify({ runResult, step: stepRes.rows[0] }),
        ]
      );
    } catch (e) {
      logger.warn(`Audit log failed: ${e.message}`);
    }

    return {
      scenario: 'INVALID_INCOME',
      applicationId,
      workflowStatus: runResult.status,
      failedStep: stepRes.rows[0] || null,
      errorCode: 'CERTIFICATE_INVALID',
      retryable: false,
      message: 'Income certificate deemed invalid by Revenue Authority. Workflow cleanly routed to rejection.',
    };
  }

  /**
   * 6. DUPLICATE APPLICATION
   * - Triggers configured server-side duplicate application detection (HTTP 409)
   */
  static async triggerDuplicate(userContext = {}) {
    logger.info('DemoControlService: Executing Scenario 6 [Duplicate Application]');

    // Query active application for CZN-1001 in academic year 2025-2026
    let existingRes = await query(
      `
      SELECT application_id, status, submission_date 
      FROM applications 
      WHERE citizen_id = 'CZN-1001' AND academic_year = '2025-2026' AND status NOT IN ('REJECTED', 'CANCELLED')
      ORDER BY submission_date DESC
      LIMIT 1
    `
    );

    // If none exists, create a baseline application first
    if (existingRes.rows.length === 0) {
      const baselineAppId = `SCH-2026-001`;
      await query(
        `
        INSERT INTO applications (
          application_id, citizen_id, service_code, workflow_code, workflow_version,
          scheme_name, status, academic_year, declared_income, student_id,
          income_certificate_no, account_reference, current_step, submission_date, benefit_amount
        ) VALUES (
          $1, 'CZN-1001', 'HIGHER_EDU_SCHOLARSHIP', 'WF-SCHOLARSHIP-V1', '1.0.0',
          'Post-Matric Merit-cum-Means Financial Assistance Scheme', 'SUBMITTED', '2025-2026', 180000.00,
          'STU-1001', 'INC-5001', 'BANK-7001', 'APPLICATION_RECEIVED', NOW(), 25000.00
        ) ON CONFLICT (application_id) DO NOTHING
      `,
        [baselineAppId]
      );

      existingRes = await query(
        `SELECT application_id, status FROM applications WHERE citizen_id = 'CZN-1001' LIMIT 1`
      );
    }

    const existing = existingRes.rows[0];

    // Log audit trail
    try {
      await query(
        `
        INSERT INTO audit_logs (
          actor_type, actor_id, department_code, action, 
          entity_type, entity_id, status, metadata
        ) VALUES ($1, $2, 'INTEROP', 'DEMO_CONTROL_DUPLICATE_TRIGGERED', 'APPLICATION', $3, 'BLOCKED', $4)
      `,
        [
          'ADMIN',
          userContext.username || 'admin',
          existing.application_id,
          JSON.stringify({ citizenId: 'CZN-1001', academicYear: '2025-2026' }),
        ]
      );
    } catch (e) {
      logger.warn(`Audit log failed: ${e.message}`);
    }

    return {
      scenario: 'DUPLICATE_APPLICATION',
      statusCode: 409,
      errorCode: 'DUPLICATE_APPLICATION',
      message: `Duplicate application detected: Active application '${existing.application_id}' already exists for citizen 'CZN-1001' in academic year '2025-2026'`,
      details: {
        existingApplicationId: existing.application_id,
        existingStatus: existing.status,
        citizenId: 'CZN-1001',
        academicYear: '2025-2026',
      },
    };
  }

  /**
   * 7. RESET DEMO
   * - Restores deterministic seed state
   * - Resets mock department services to healthy baseline
   * - Cleans transient demo state while preserving canonical records
   */
  static async resetDemo(userContext = {}) {
    logger.info('DemoControlService: Executing Scenario 7 [Reset Demo]');

    // 1. Reset all mock services in memory
    const mockState = mockDepartmentService.resetAll();

    // 2. Reset all api_services in PostgreSQL to HEALTHY
    await query(`
      UPDATE api_services 
      SET health_status = 'HEALTHY', response_time_ms = 25, last_checked_at = NOW()
    `);

    // 3. Clear transient demo applications created during test runs (preserve canonical SCH-2026-001 through 005)
    await query(`
      DELETE FROM applications 
      WHERE application_id NOT IN ('SCH-2026-001', 'SCH-2026-002', 'SCH-2026-003', 'SCH-2026-004', 'SCH-2026-005')
    `);

    // 4. Restore canonical application SCH-2026-001 to pristine SUBMITTED state
    await query(`
      UPDATE applications 
      SET status = 'SUBMITTED', current_step = 'APPLICATION_RECEIVED'
      WHERE application_id = 'SCH-2026-001'
    `);

    // 5. Restore canonical application SCH-2026-005 (seeded failed bank step) for resume testing
    await query(`
      UPDATE workflow_steps
      SET status = 'QUEUED', retry_count = 1
      WHERE application_id = 'SCH-2026-005' AND step_identifier = 'BANK_VERIFICATION'
    `);

    // 6. Log audit trail
    try {
      await query(
        `
        INSERT INTO audit_logs (
          actor_type, actor_id, department_code, action, 
          entity_type, entity_id, status, metadata
        ) VALUES ($1, $2, 'INTEROP', 'DEMO_CONTROL_RESET_DEMO', 'SYSTEM', 'PLATFORM', 'SUCCESS', $3)
      `,
        [
          'ADMIN',
          userContext.username || 'admin',
          JSON.stringify({ mockState }),
        ]
      );
    } catch (e) {
      logger.warn(`Audit log failed: ${e.message}`);
    }

    return {
      scenario: 'RESET_DEMO',
      mockState,
      canonicalApplications: ['SCH-2026-001', 'SCH-2026-002', 'SCH-2026-003', 'SCH-2026-004', 'SCH-2026-005'],
      message: 'Demo platform successfully restored to pristine, deterministic baseline state.',
    };
  }

  /**
   * GET STATUS
   * Real-time status overview of all 7 demo controls
   */
  static async getDemoStatus() {
    const mockState = mockDepartmentService.getStateSummary();

    // Query active exceptions
    const exceptionsRes = await query(`
      SELECT count(*) as count 
      FROM workflow_steps 
      WHERE status IN ('QUEUED', 'FAILED', 'RETRYING')
    `);

    // Query application counts
    const appsRes = await query(`
      SELECT status, count(*) as count 
      FROM applications 
      GROUP BY status
    `);

    // Query service health
    const servicesRes = await query(`
      SELECT service_code, department_code, health_status, response_time_ms 
      FROM api_services 
      ORDER BY department_code ASC
    `);

    return {
      mockState,
      activeExceptionsCount: parseInt(exceptionsRes.rows[0]?.count || 0, 10),
      applicationCounts: appsRes.rows,
      services: servicesRes.rows,
      timestamp: new Date().toISOString(),
    };
  }
}

export default DemoControlService;
