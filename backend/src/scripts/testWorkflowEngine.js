import { query } from '../config/database.js';
import workflowEngine from '../workflow/workflowEngine.js';
import WorkflowModel from '../models/workflow.model.js';
import logger from '../utils/logger.js';

const BASE_URL = 'http://localhost:5000/api/v1';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runWorkflowEngineTests() {
  logger.info('===========================================================');
  logger.info('Starting Step 6: Backend Workflow Engine Test Suite');
  logger.info('===========================================================');

  let passedTests = 0;

  // --------------------------------------------------------------------------
  // TEST 1: FULL SUCCESS (GOLDEN PATH)
  // Application -> Education -> Income -> Bank -> Eligibility -> Officer Approval -> Completion
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 1: Full Success (Golden Path) ---');
  {
    // Reset SCH-2026-001 to ensure pristine state
    await WorkflowModel.resetSteps('SCH-2026-001');

    const res = await fetch(`${BASE_URL}/workflows/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicationId: 'SCH-2026-001',
      }),
    });

    const body = await res.json();
    assert(res.ok, `Expected 200 OK, got ${res.status}: ${JSON.stringify(body)}`);
    assert(body.data.success === true, 'Expected workflow execution success');
    assert(body.data.status === 'SUCCESS', `Expected status SUCCESS, got ${body.data.status}`);

    // Verify application state in database
    const app = await WorkflowModel.getApplication('SCH-2026-001');
    assert(app.status === 'SUCCESS', `Expected application status SUCCESS, got ${app.status}`);
    assert(app.current_step === 'COMPLETION', `Expected current_step COMPLETION, got ${app.current_step}`);
    assert(app.approval_date !== null, 'Expected approval_date to be populated');

    // Verify all 7 steps in database
    const stepInstances = await WorkflowModel.getStepInstances('SCH-2026-001');
    assert(stepInstances.length === 7, `Expected 7 step instances, got ${stepInstances.length}`);

    stepInstances.forEach((step) => {
      assert(step.status === 'SUCCESS', `Step ${step.step_number} (${step.step_name}) status is ${step.status}`);
      assert(step.started_at !== null, `Step ${step.step_number} missing started_at`);
      assert(step.completed_at !== null, `Step ${step.step_number} missing completed_at`);
      assert(step.attempts >= 1, `Step ${step.step_number} attempts should be >= 1`);
      assert(step.response_payload && Object.keys(step.response_payload).length > 0, `Step ${step.step_number} missing response payload`);
    });

    // Verify API Requests logged
    const apiReqs = await query(`SELECT * FROM api_requests WHERE application_id = $1`, ['SCH-2026-001']);
    assert(apiReqs.rows.length >= 3, `Expected at least 3 API request telemetry records, got ${apiReqs.rows.length}`);

    // Verify Audit Logs logged
    const audits = await query(`SELECT * FROM audit_logs WHERE entity_id = $1`, ['SCH-2026-001']);
    assert(audits.rows.length >= 7, `Expected at least 7 audit logs, got ${audits.rows.length}`);

    logger.info('  [PASS] Test 1: Full Success Golden Path completed all 7 steps verified in PostgreSQL');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 2: EDUCATION FAILURE
  // SCH-2026-002 has invalid student ID -> Education connector fails
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 2: Education Failure ---');
  {
    await WorkflowModel.resetSteps('SCH-2026-002');

    const res = await fetch(`${BASE_URL}/workflows/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicationId: 'SCH-2026-002',
      }),
    });

    const body = await res.json();
    const resData = body.data || body.error?.details || body.details || {};
    assert(res.status === 422, `Expected 422 Unprocessable Entity, got ${res.status}`);
    assert(body.success === false, 'Expected success to be false');
    assert(resData.status === 'FAILED', `Expected status FAILED, got ${resData.status}`);
    assert(resData.failedStepNumber === 2, `Expected failedStepNumber 2, got ${resData.failedStepNumber}`);
    assert(resData.failedStepIdentifier === 'EDUCATION_VERIFICATION', 'Expected failedStepIdentifier EDUCATION_VERIFICATION');

    // Verify step 1 SUCCESS, step 2 FAILED, steps 3-7 PENDING
    const steps = await WorkflowModel.getStepInstances('SCH-2026-002');
    const step1 = steps.find((s) => s.step_number === 1);
    const step2 = steps.find((s) => s.step_number === 2);
    const step3 = steps.find((s) => s.step_number === 3);

    assert(step1 && step1.status === 'SUCCESS', 'Step 1 should be SUCCESS');
    assert(step2 && step2.status === 'FAILED', 'Step 2 should be FAILED');
    assert(step2.error_details !== null, 'Step 2 should have error details persisted');
    assert(step3 === undefined || step3.status === 'PENDING', 'Step 3 should not have run');

    // Verify application status is FAILED
    const app = await WorkflowModel.getApplication('SCH-2026-002');
    assert(app.status === 'FAILED', `Application status should be FAILED, got ${app.status}`);

    logger.info('  [PASS] Test 2: Education failure halted pipeline at Step 2 and persisted error');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 3: INCOME FAILURE
  // SCH-2026-003 has invalid income certificate -> Income connector fails
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 3: Income Failure ---');
  {
    await WorkflowModel.resetSteps('SCH-2026-003');

    const res = await fetch(`${BASE_URL}/workflows/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicationId: 'SCH-2026-003',
      }),
    });

    const body = await res.json();
    const resData = body.data || body.error?.details || body.details || {};
    assert(res.status === 422, `Expected 422, got ${res.status}`);
    assert(resData.status === 'FAILED', `Expected status FAILED, got ${resData.status}`);
    assert(resData.failedStepNumber === 3, `Expected failedStepNumber 3, got ${resData.failedStepNumber}`);
    assert(resData.failedStepIdentifier === 'INCOME_VERIFICATION', 'Expected failedStepIdentifier INCOME_VERIFICATION');

    // Verify step 1 and 2 SUCCESS, step 3 FAILED
    const steps = await WorkflowModel.getStepInstances('SCH-2026-003');
    const step1 = steps.find((s) => s.step_number === 1);
    const step2 = steps.find((s) => s.step_number === 2);
    const step3 = steps.find((s) => s.step_number === 3);

    assert(step1.status === 'SUCCESS', 'Step 1 should be SUCCESS');
    assert(step2.status === 'SUCCESS', 'Step 2 should be SUCCESS');
    assert(step3.status === 'FAILED', 'Step 3 should be FAILED');

    logger.info('  [PASS] Test 3: Income failure halted pipeline at Step 3 with Step 1 & 2 SUCCESS');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 4: BANK FAILURE
  // SCH-2026-004 has non-existent bank account -> Bank connector fails
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 4: Bank Failure ---');
  {
    await WorkflowModel.resetSteps('SCH-2026-004');

    const res = await fetch(`${BASE_URL}/workflows/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicationId: 'SCH-2026-004',
      }),
    });

    const body = await res.json();
    const resData = body.data || body.error?.details || body.details || {};
    assert(res.status === 422, `Expected 422, got ${res.status}`);
    assert(resData.status === 'FAILED', `Expected status FAILED, got ${resData.status}`);
    assert(resData.failedStepNumber === 4, `Expected failedStepNumber 4, got ${resData.failedStepNumber}`);
    assert(resData.failedStepIdentifier === 'BANK_VERIFICATION', 'Expected failedStepIdentifier BANK_VERIFICATION');

    const steps = await WorkflowModel.getStepInstances('SCH-2026-004');
    const step1 = steps.find((s) => s.step_number === 1);
    const step2 = steps.find((s) => s.step_number === 2);
    const step3 = steps.find((s) => s.step_number === 3);
    const step4 = steps.find((s) => s.step_number === 4);

    assert(step1.status === 'SUCCESS', 'Step 1 should be SUCCESS');
    assert(step2.status === 'SUCCESS', 'Step 2 should be SUCCESS');
    assert(step3.status === 'SUCCESS', 'Step 3 should be SUCCESS');
    assert(step4.status === 'FAILED', 'Step 4 should be FAILED');

    logger.info('  [PASS] Test 4: Bank failure halted pipeline at Step 4 with Steps 1-3 SUCCESS');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 5: RETRYABLE FAILURE & QUEUE STATE
  // Verify retry attempts, RETRYING status, and QUEUED state
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 5: Retryable Failure Handling & Queue State ---');
  {
    // Create temporary test application for retryable test
    await query(`
      INSERT INTO applications (
        application_id, citizen_id, service_code, workflow_code, workflow_version,
        scheme_name, status, academic_year, declared_income, student_id,
        income_certificate_no, account_reference, current_step, benefit_amount
      ) VALUES (
        'SCH-TEST-RETRY', 'CZN-1001', 'HIGHER_EDU_SCHOLARSHIP', 'WF-SCHOLARSHIP-V1', '1.0.0',
        'Retry Test Scheme', 'SUBMITTED', '2025-2026', 180000.00, 'STU-1001',
        'INC-5001', 'BANK-7001', 'APPLICATION_RECEIVED', 25000.00
      ) ON CONFLICT (application_id) DO NOTHING
    `);

    await query(`
      INSERT INTO consents (consent_id, citizen_id, application_id, purpose, allowed_departments, data_scopes, status, valid_until)
      VALUES ('CNS-RETRY-01', 'CZN-1001', 'SCH-TEST-RETRY', 'Retry verification', ARRAY['EDU', 'REV', 'DBT'], ARRAY['ALL'], 'GRANTED', CURRENT_TIMESTAMP + INTERVAL '30 days')
      ON CONFLICT (consent_id) DO NOTHING
    `);

    await WorkflowModel.resetSteps('SCH-TEST-RETRY');

    // Execute with education mockMode set to 'retryable_failure' and queueOnFailure: true
    const res = await fetch(`${BASE_URL}/workflows/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicationId: 'SCH-TEST-RETRY',
        educationMockMode: 'retryable_failure',
        queueOnFailure: true,
      }),
    });

    const body = await res.json();
    assert(res.status === 202, `Expected 202 Accepted (Queued), got ${res.status}`);
    assert(body.data.status === 'QUEUED', `Expected status QUEUED, got ${body.data.status}`);
    assert(body.data.retryable === true, 'Expected retryable flag to be true');
    assert(body.data.retryCount >= 1, `Expected retryCount >= 1, got ${body.data.retryCount}`);
    assert(body.data.attempts >= 2, `Expected attempts >= 2, got ${body.data.attempts}`);

    // Verify persisted state in PostgreSQL
    const stepInst = await WorkflowModel.getStepInstance('SCH-TEST-RETRY', 2);
    assert(stepInst.status === 'QUEUED', `Expected step 2 status QUEUED, got ${stepInst.status}`);
    assert(stepInst.attempts >= 2, `Expected step 2 attempts >= 2, got ${stepInst.attempts}`);

    logger.info(`  [PASS] Test 5: Retryable failure retried ${stepInst.retry_count} times and entered QUEUED state`);
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 6: RESUME WORKFLOW FROM FAILED / QUEUED STEP
  // SCH-2026-005 was seeded with Steps 1-3 SUCCESS, Step 4 FAILED
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 6: Resume Workflow ---');
  {
    // Reset SCH-2026-005 to pristine test resume state (Steps 1-3 SUCCESS, Step 4 FAILED)
    await query(`DELETE FROM workflow_steps WHERE application_id = 'SCH-2026-005'`);
    await query(`
      UPDATE applications 
      SET status = 'FAILED', current_step = 'BANK_VERIFICATION', approval_date = NULL, remarks = 'Failed at bank'
      WHERE application_id = 'SCH-2026-005'
    `);
    await query(`
      INSERT INTO workflow_steps (
        application_id, step_number, step_identifier, step_name, department_code,
        status, request_payload, response_payload, error_details, execution_time_ms,
        retry_count, attempts, started_at, completed_at
      ) VALUES 
      ('SCH-2026-005', 1, 'APPLICATION_RECEIVED', 'Application Received', 'INTEROP', 'SUCCESS', '{}'::jsonb, '{"verified": true}'::jsonb, NULL, 15, 0, 1, CURRENT_TIMESTAMP - INTERVAL '1 hour', CURRENT_TIMESTAMP - INTERVAL '1 hour' + INTERVAL '15 ms'),
      ('SCH-2026-005', 2, 'EDUCATION_VERIFICATION', 'Education Verification', 'EDU', 'SUCCESS', '{}'::jsonb, '{"status": "VERIFIED"}'::jsonb, NULL, 95, 0, 1, CURRENT_TIMESTAMP - INTERVAL '1 hour' + INTERVAL '20 ms', CURRENT_TIMESTAMP - INTERVAL '1 hour' + INTERVAL '115 ms'),
      ('SCH-2026-005', 3, 'INCOME_VERIFICATION', 'Income Verification', 'REV', 'SUCCESS', '{}'::jsonb, '{"status": "VERIFIED", "annualIncome": 180000.00}'::jsonb, NULL, 110, 0, 1, CURRENT_TIMESTAMP - INTERVAL '1 hour' + INTERVAL '120 ms', CURRENT_TIMESTAMP - INTERVAL '1 hour' + INTERVAL '230 ms'),
      ('SCH-2026-005', 4, 'BANK_VERIFICATION', 'Bank Verification', 'DBT', 'FAILED', '{}'::jsonb, '{}'::jsonb, 'Simulated transient PFMS bank gateway timeout (retryable)', 250, 1, 1, CURRENT_TIMESTAMP - INTERVAL '1 hour' + INTERVAL '235 ms', CURRENT_TIMESTAMP - INTERVAL '1 hour' + INTERVAL '485 ms')
    `);

    // Verify initial seeded state of SCH-2026-005
    const initialSteps = await WorkflowModel.getStepInstances('SCH-2026-005');
    assert(initialSteps.find((s) => s.step_number === 1).status === 'SUCCESS', 'Initial Step 1 should be SUCCESS');
    assert(initialSteps.find((s) => s.step_number === 2).status === 'SUCCESS', 'Initial Step 2 should be SUCCESS');
    assert(initialSteps.find((s) => s.step_number === 3).status === 'SUCCESS', 'Initial Step 3 should be SUCCESS');
    assert(initialSteps.find((s) => s.step_number === 4).status === 'FAILED', 'Initial Step 4 should be FAILED');

    // Resume the workflow
    const res = await fetch(`${BASE_URL}/workflows/resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicationId: 'SCH-2026-005',
      }),
    });

    const body = await res.json();
    assert(res.ok, `Expected 200 OK on resume, got ${res.status}: ${JSON.stringify(body)}`);
    assert(body.data.success === true, 'Expected resume to successfully complete');
    assert(body.data.status === 'SUCCESS', `Expected status SUCCESS, got ${body.data.status}`);

    // Verify all steps are now SUCCESS
    const resumedSteps = await WorkflowModel.getStepInstances('SCH-2026-005');
    assert(resumedSteps.length === 7, `Expected 7 step instances, got ${resumedSteps.length}`);
    resumedSteps.forEach((s) => {
      assert(s.status === 'SUCCESS', `Step ${s.step_number} should be SUCCESS after resume, got ${s.status}`);
    });

    logger.info('  [PASS] Test 6: Workflow resumed from Step 4 and executed through completion');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 7: ALREADY COMPLETED STEPS ARE NOT RE-EXECUTED
  // Verify that Steps 1, 2, 3 kept their original completion timestamps
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 7: Already Completed Steps Are Not Re-Executed ---');
  {
    const steps = await WorkflowModel.getStepInstances('SCH-2026-005');
    const step1 = steps.find((s) => s.step_number === 1);
    const step2 = steps.find((s) => s.step_number === 2);
    const step3 = steps.find((s) => s.step_number === 3);
    const step4 = steps.find((s) => s.step_number === 4);

    // Initial seed was 1 day ago. Step 4 ran just now.
    const step1Completed = new Date(step1.completed_at).getTime();
    const step4Completed = new Date(step4.completed_at).getTime();

    // Step 1 completed at least 1 hour before Step 4
    assert(step4Completed - step1Completed > 60000, 'Step 1 should retain its original timestamp and NOT have re-executed');
    assert(step1.attempts === 1, `Step 1 attempts should remain 1, got ${step1.attempts}`);
    assert(step2.attempts === 1, `Step 2 attempts should remain 1, got ${step2.attempts}`);
    assert(step3.attempts === 1, `Step 3 attempts should remain 1, got ${step3.attempts}`);

    logger.info('  [PASS] Test 7: Verified Steps 1-3 were not restarted or re-executed during resume');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 8: WORKFLOW PERSISTENCE AFTER RESTART
  // Verify persistent records in PostgreSQL across all tables
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 8: Workflow Persistence Verification ---');
  {
    const appQuery = await query(`SELECT * FROM applications WHERE application_id = $1`, ['SCH-2026-001']);
    assert(appQuery.rows.length === 1, 'Application record persisted');
    assert(appQuery.rows[0].status === 'SUCCESS', 'Application status persisted as SUCCESS');

    const stepsQuery = await query(`SELECT * FROM workflow_steps WHERE application_id = $1 ORDER BY step_number ASC`, ['SCH-2026-001']);
    assert(stepsQuery.rows.length === 7, `Expected 7 persisted step records, got ${stepsQuery.rows.length}`);

    const reqQuery = await query(`SELECT * FROM api_requests WHERE application_id = $1`, ['SCH-2026-001']);
    assert(reqQuery.rows.length >= 3, 'API request records persisted in database');

    const auditQuery = await query(`SELECT * FROM audit_logs WHERE entity_id = $1`, ['SCH-2026-001']);
    assert(auditQuery.rows.length >= 7, 'Audit log records persisted in database');

    logger.info('  [PASS] Test 8: All application, step, telemetry, and audit records verified in PostgreSQL');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 9: ENABLED / DISABLED STEPS (SKIPPED STATUS)
  // Temporarily disable step 6 (OFFICER_APPROVAL) in DB and verify SKIPPED status
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 9: Enabled/Disabled Step Configuration ---');
  {
    // Create test application SCH-TEST-SKIP
    await query(`
      INSERT INTO applications (
        application_id, citizen_id, service_code, workflow_code, workflow_version,
        scheme_name, status, academic_year, declared_income, student_id,
        income_certificate_no, account_reference, current_step, benefit_amount
      ) VALUES (
        'SCH-TEST-SKIP', 'CZN-1001', 'HIGHER_EDU_SCHOLARSHIP', 'WF-SCHOLARSHIP-V1', '1.0.0',
        'Skip Step Test Scheme', 'SUBMITTED', '2025-2026', 180000.00, 'STU-1001',
        'INC-5001', 'BANK-7001', 'APPLICATION_RECEIVED', 25000.00
      ) ON CONFLICT (application_id) DO NOTHING
    `);

    await query(`
      INSERT INTO consents (consent_id, citizen_id, application_id, purpose, allowed_departments, data_scopes, status, valid_until)
      VALUES ('CNS-SKIP-01', 'CZN-1001', 'SCH-TEST-SKIP', 'Skip verification', ARRAY['EDU', 'REV', 'DBT'], ARRAY['ALL'], 'GRANTED', CURRENT_TIMESTAMP + INTERVAL '30 days')
      ON CONFLICT (consent_id) DO NOTHING
    `);

    await WorkflowModel.resetSteps('SCH-TEST-SKIP');

    // Temporarily disable Step 6 in PostgreSQL
    await query(`
      UPDATE workflow_definition_steps 
      SET is_enabled = FALSE 
      WHERE workflow_code = 'WF-SCHOLARSHIP-V1' AND step_order = 6
    `);

    const res = await fetch(`${BASE_URL}/workflows/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: 'SCH-TEST-SKIP' }),
    });

    const body = await res.json();
    assert(res.ok, `Expected 200 OK, got ${res.status}`);
    assert(body.data.status === 'SUCCESS', `Expected workflow SUCCESS, got ${body.data.status}`);

    // Verify step 6 is marked SKIPPED
    const step6 = await WorkflowModel.getStepInstance('SCH-TEST-SKIP', 6);
    assert(step6.status === 'SKIPPED', `Step 6 should be SKIPPED, got ${step6.status}`);
    assert(step6.response_payload.skipped === true, 'Step 6 response payload should indicate skipped');

    // Restore Step 6 in PostgreSQL
    await query(`
      UPDATE workflow_definition_steps 
      SET is_enabled = TRUE 
      WHERE workflow_code = 'WF-SCHOLARSHIP-V1' AND step_order = 6
    `);

    logger.info('  [PASS] Test 9: Disabled step was dynamically SKIPPED and workflow completed');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 10: DEMONSTRATE WORKFLOW IS DRIVEN BY POSTGRESQL CONFIGURATION
  // Dynamically insert a completely custom 3-step pipeline into PostgreSQL:
  // 1. APPLICATION_RECEIVED
  // 2. EDUCATION_VERIFICATION
  // 3. COMPLETION
  // Then execute it without modifying ANY backend application code!
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 10: Workflow Driven Entirely by PostgreSQL Database Configuration ---');
  {
    const CUSTOM_WF = 'WF-CUSTOM-DYNAMIC';

    // 1. Insert new workflow definition into PostgreSQL
    await query(`
      INSERT INTO workflow_definitions (workflow_code, name, description, version, is_active)
      VALUES ($1, 'Dynamic Express Verification Pipeline', 'Pipeline with dynamically defined sequence in PostgreSQL', '1.0.0', TRUE)
      ON CONFLICT (workflow_code, version) DO UPDATE SET is_active = TRUE
    `, [CUSTOM_WF]);

    // 2. Insert 3 custom steps into PostgreSQL
    await query(`DELETE FROM workflow_definition_steps WHERE workflow_code = $1`, [CUSTOM_WF]);
    await query(`
      INSERT INTO workflow_definition_steps (workflow_code, workflow_version, step_order, step_identifier, step_name, department_code, is_mandatory, is_enabled)
      VALUES 
        ($1, '1.0.0', 1, 'APPLICATION_RECEIVED', 'Custom Application Intake', 'INTEROP', TRUE, TRUE),
        ($1, '1.0.0', 2, 'EDUCATION_VERIFICATION', 'Custom Academic Audit', 'EDU', TRUE, TRUE),
        ($1, '1.0.0', 3, 'COMPLETION', 'Custom Direct Sanction', 'INTEROP', TRUE, TRUE)
    `, [CUSTOM_WF]);

    // 3. Create application configured to use this custom workflow
    await query(`
      INSERT INTO applications (
        application_id, citizen_id, service_code, workflow_code, workflow_version,
        scheme_name, status, academic_year, declared_income, student_id,
        income_certificate_no, account_reference, current_step, benefit_amount
      ) VALUES (
        'SCH-DYNAMIC-001', 'CZN-1001', 'FAST_TRACK_SCHEME', $1, '1.0.0',
        'Custom Dynamic Pipeline Scheme', 'SUBMITTED', '2025-2026', 180000.00, 'STU-1001',
        'INC-5001', 'BANK-7001', 'APPLICATION_RECEIVED', 15000.00
      ) ON CONFLICT (application_id) DO UPDATE SET workflow_code = $1, status = 'SUBMITTED'
    `, [CUSTOM_WF]);

    await query(`
      INSERT INTO consents (consent_id, citizen_id, application_id, purpose, allowed_departments, data_scopes, status, valid_until)
      VALUES ('CNS-DYN-01', 'CZN-1001', 'SCH-DYNAMIC-001', 'Dynamic verification', ARRAY['EDU'], ARRAY['ALL'], 'GRANTED', CURRENT_TIMESTAMP + INTERVAL '30 days')
      ON CONFLICT (consent_id) DO NOTHING
    `);

    await WorkflowModel.resetSteps('SCH-DYNAMIC-001');

    // 4. Execute the dynamic workflow
    const res = await fetch(`${BASE_URL}/workflows/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: 'SCH-DYNAMIC-001' }),
    });

    const body = await res.json();
    assert(res.ok, `Expected 200 OK, got ${res.status}: ${JSON.stringify(body)}`);
    assert(body.data.status === 'SUCCESS', `Expected SUCCESS, got ${body.data.status}`);
    assert(body.data.totalStepsExecuted === 3, `Expected exactly 3 steps executed, got ${body.data.totalStepsExecuted}`);

    // Verify only the 3 steps defined in PostgreSQL were executed
    const executedSteps = await WorkflowModel.getStepInstances('SCH-DYNAMIC-001');
    assert(executedSteps.length === 3, `Expected exactly 3 step instances in PostgreSQL, got ${executedSteps.length}`);
    assert(executedSteps[0].step_identifier === 'APPLICATION_RECEIVED', 'Step 1 should be APPLICATION_RECEIVED');
    assert(executedSteps[1].step_identifier === 'EDUCATION_VERIFICATION', 'Step 2 should be EDUCATION_VERIFICATION');
    assert(executedSteps[2].step_identifier === 'COMPLETION', 'Step 3 should be COMPLETION');

    logger.info('  [PASS] Test 10: Successfully executed dynamic 3-step pipeline driven 100% by PostgreSQL records!');
    passedTests++;

    // Cleanup dynamic test pipeline
    await query(`DELETE FROM workflow_definition_steps WHERE workflow_code = $1`, [CUSTOM_WF]);
    await query(`DELETE FROM workflow_definitions WHERE workflow_code = $1`, [CUSTOM_WF]);
    await query(`DELETE FROM workflow_steps WHERE application_id = 'SCH-DYNAMIC-001'`);
    await query(`DELETE FROM applications WHERE application_id = 'SCH-DYNAMIC-001'`);
  }

  logger.info('\n===========================================================');
  logger.info(`ALL ${passedTests} WORKFLOW ENGINE TESTS PASSED SUCCESSFULLY!`);
  logger.info('===========================================================');
}

runWorkflowEngineTests().catch((err) => {
  logger.error('Workflow engine test suite failed: ' + (err.message || err));
  console.error(err);
  process.exit(1);
});
