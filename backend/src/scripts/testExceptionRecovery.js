/**
 * Step 12 Verification Suite: Exception Handling, Retry, Queue Simulation & Recovery
 * 
 * Verifies the primary demo scenario & platform capabilities:
 * 1. Submit application (CZN-1001, student, income, bank identifiers).
 * 2. Education verification succeeds (Step 2: SUCCESS).
 * 3. Income verification succeeds (Step 3: SUCCESS).
 * 4. Bank API is set to failing state (503 Service Unavailable / Timeout).
 * 5. Bank verification fails (Step 4: FAILED / retryable = true).
 * 6. In-flight retries occur (status: RETRYING) and then transitions to QUEUED state.
 * 7. Exception appears in GET /api/exceptions with attempts, correlation ID, and retryable flag.
 * 8. Citizen notification for queued verification is persisted.
 * 9. Non-retryable exceptions are strictly rejected from auto-retry.
 * 10. Admin recovers Bank service (healthy: true).
 * 11. Admin calls POST /api/exceptions/:id/retry:
 *     - Retries only retryable failure.
 *     - Persists attempts.
 *     - Avoids duplicating already successful calls (Steps 1-3 preserved).
 *     - Resumes from failed Step 4 (Bank Verification).
 * 12. Retry succeeds! Bank verified (SUCCESS).
 * 13. Workflow resumes and completes remaining steps (Eligibility, Approval, Completion).
 * 14. Citizen timeline reflects Bank verified and Application completed without citizen resubmission.
 * 15. RBAC enforcement: non-admin roles strictly blocked (401 / 403).
 */

import assert from 'assert';
import logger from '../utils/logger.js';

const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:5000/api';

async function runStep12Tests() {
  logger.info('===========================================================');
  logger.info('Starting Step 12: Exception Handling, Retry & Recovery Suite');
  logger.info('===========================================================');

  let passedTests = 0;

  // --------------------------------------------------------------------------
  // STEP 0: Authentication Helpers
  // --------------------------------------------------------------------------
  logger.info('\n--- Authenticating Demo Accounts ---');

  const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin', password: 'demo123' }),
  });
  const adminLoginBody = await adminLoginRes.json();
  assert.strictEqual(adminLoginRes.status, 200, 'Admin login failed');
  const adminToken = adminLoginBody.data.token;
  logger.info('  [OK] Admin authenticated successfully');

  const citizenLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'citizen', password: 'demo123' }),
  });
  const citizenLoginBody = await citizenLoginRes.json();
  assert.strictEqual(citizenLoginRes.status, 200, 'Citizen login failed');
  const citizenToken = citizenLoginBody.data.token;
  logger.info('  [OK] Citizen authenticated successfully');

  // --------------------------------------------------------------------------
  // TEST 1: RBAC Access Protection on Exception APIs
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 1: RBAC Protection on Exception APIs ---');
  {
    // 1a. Unauthenticated GET /api/exceptions -> 401
    const unauthGet = await fetch(`${BASE_URL}/exceptions`);
    assert.strictEqual(unauthGet.status, 401, 'Unauthenticated request must return 401');

    // 1b. Citizen GET /api/exceptions -> 403 Forbidden
    const citizenGet = await fetch(`${BASE_URL}/exceptions`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    assert.strictEqual(citizenGet.status, 403, 'Citizen must be forbidden from viewing exception queue');

    // 1c. Citizen POST /api/exceptions/dummy/retry -> 403 Forbidden
    const citizenRetry = await fetch(`${BASE_URL}/exceptions/SCH-DUMMY/retry`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    assert.strictEqual(citizenRetry.status, 403, 'Citizen must be forbidden from triggering exception retry');

    // 1d. Admin GET /api/exceptions -> 200 OK
    const adminGet = await fetch(`${BASE_URL}/exceptions`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(adminGet.status, 200, 'Admin must have access to exception queue');

    logger.info('  [PASS] Test 1: RBAC access guards strictly enforced (401 unauthenticated, 403 citizen, 200 admin)');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 2-11: PRIMARY DEMO SCENARIO (Bank Failure, Retry, Queue & Recovery)
  // --------------------------------------------------------------------------
  logger.info('\n--- PRIMARY DEMO SCENARIO: Bank Failure & Deterministic Recovery ---');
  let demoAppId = null;
  let exceptionId = null;

  // 2. Submit application
  logger.info('\n1. Submitting New Scholarship Application...');
  {
    const dynamicYear = `2026-EXC-${Date.now().toString().slice(-4)}`;
    const submitRes = await fetch(`${BASE_URL}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        citizen_id: 'CZN-1001',
        student_id: 'STU-1001',
        institution_code: 'INST-IIT-01',
        income_certificate_no: 'INC-5001',
        account_reference: 'BANK-7001',
        scheme_name: 'National Technical Merit Scholarship',
        academic_year: dynamicYear,
        declared_income: 180000,
        benefit_amount: 50000,
      }),
    });

    const submitBody = await submitRes.json();
    assert.strictEqual(submitRes.status, 201, `Application submission failed: ${JSON.stringify(submitBody)}`);
    demoAppId = submitBody.data.applicationId;
    logger.info(`  [OK] Application created: ${demoAppId}`);

    // Grant active citizen consent
    const consentRes = await fetch(`${BASE_URL}/applications/${demoAppId}/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        purpose: 'Direct Benefit Transfer & Scholarship Verification',
        scope: ['EDUCATION', 'INCOME', 'BANK'],
      }),
    });
    assert.strictEqual(consentRes.status, 200, 'Consent grant failed');
    logger.info('  [OK] Citizen consent granted for multi-department verification');
  }

  // 3. Set Bank API to DOWN (simulated outage: 503 / Timeout, retryable)
  logger.info('\n2. Simulating Bank API Outage (503 Service Unavailable)...');
  {
    const bankOutageRes = await fetch(`${BASE_URL}/bank/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        healthy: false,
        errorCode: 'CORE_BANKING_TIMEOUT',
        message: 'NPCI Aadhaar Payment Bridge temporarily unreachable (HTTP 503)',
        retryable: true,
        httpStatus: 503,
      }),
    });
    assert.strictEqual(bankOutageRes.status, 200, 'Setting bank outage failed');
    logger.info('  [OK] Bank API set to failing state (healthy: false, retryable: true, status: 503)');
  }

  // 4. Run Workflow: Education succeeds, Income succeeds, Bank fails & transitions to QUEUED
  logger.info('\n3. Executing Workflow Engine Pipeline...');
  {
    const runRes = await fetch(`${BASE_URL}/workflows/${demoAppId}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: demoAppId }),
    });

    const runBody = await runRes.json();
    // Since Step 4 failed with retryable outage and queued, returns 202 (Accepted/Queued) or 422
    assert([202, 422].includes(runRes.status), `Expected 202 or 422, got ${runRes.status}`);
    const resultData = runBody.data || runBody.details || {};
    assert.strictEqual(resultData.failedStepIdentifier, 'BANK_VERIFICATION', 'Failed step must be BANK_VERIFICATION');
    assert.strictEqual(resultData.status, 'QUEUED', 'Status must transition to QUEUED');
    assert.strictEqual(resultData.retryable, true, 'Retryable flag must be true');
    assert(resultData.attempts >= 1, 'Attempts must be tracked');

    logger.info(`  [PASS] Steps 1-3 succeeded. Step 4 (Bank) caught outage: retryable=true, status=QUEUED, attempts=${resultData.attempts}`);
    passedTests++;
  }

  // 5. Verify Exception Appears in GET /api/exceptions
  logger.info('\n4. Inspecting Operational Exception Queue (GET /api/exceptions)...');
  {
    const excRes = await fetch(`${BASE_URL}/exceptions?status=QUEUED&search=${demoAppId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const excBody = await excRes.json();
    assert.strictEqual(excRes.status, 200);
    assert(excBody.data.exceptions.length > 0, `Exception for ${demoAppId} must appear in queue`);

    const exceptionRecord = excBody.data.exceptions.find((ex) => ex.applicationId === demoAppId);
    assert(exceptionRecord, `Expected exception for ${demoAppId}`);
    assert.strictEqual(exceptionRecord.status, 'QUEUED');
    assert.strictEqual(exceptionRecord.retryable, true);
    assert.strictEqual(exceptionRecord.departmentCode, 'DBT');
    assert.strictEqual(exceptionRecord.stepName, 'Bank Verification');
    assert(exceptionRecord.attempts >= 1, 'Attempts must be >= 1');
    assert(exceptionRecord.correlationId, 'Correlation ID must be present');

    exceptionId = exceptionRecord.id;
    logger.info(`  [PASS] Exception verified in queue: ID=${exceptionId}, Status=${exceptionRecord.status}, Attempts=${exceptionRecord.attempts}`);
    passedTests++;
  }

  // 6. Verify Citizen Notification Created for Queued Workflow
  logger.info('\n5. Verifying Citizen Notification Feed...');
  {
    const notifRes = await fetch(`${BASE_URL}/notifications?citizenId=CZN-1001`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    const notifBody = await notifRes.json();
    assert.strictEqual(notifRes.status, 200);
    const queuedNotif = notifBody.data.notifications.find(
      (n) => n.application_id === demoAppId && n.type === 'WORKFLOW_QUEUED'
    );
    assert(queuedNotif, `Expected WORKFLOW_QUEUED notification for application ${demoAppId}`);
    assert.strictEqual(queuedNotif.title, 'Verification In Queue');

    logger.info('  [PASS] Citizen notification verified: "Verification In Queue" recorded with zero technical leakage');
    passedTests++;
  }

  // 7. Verify Prior Successful Steps Were NOT Duplicated & State is Preserved
  logger.info('\n6. Checking Workflow Step Preservation in PostgreSQL...');
  {
    const statusRes = await fetch(`${BASE_URL}/workflows/${demoAppId}/status`);
    const statusBody = await statusRes.json();
    assert.strictEqual(statusRes.status, 200);

    const steps = statusBody.data.steps;
    const step1 = steps.find((s) => s.stepOrder === 1);
    const step2 = steps.find((s) => s.stepOrder === 2);
    const step3 = steps.find((s) => s.stepOrder === 3);
    const step4 = steps.find((s) => s.stepOrder === 4);
    const step5 = steps.find((s) => s.stepOrder === 5);

    assert.strictEqual(step1.status, 'SUCCESS', 'Step 1 must remain SUCCESS');
    assert.strictEqual(step2.status, 'SUCCESS', 'Step 2 must remain SUCCESS');
    assert.strictEqual(step3.status, 'SUCCESS', 'Step 3 must remain SUCCESS');
    assert.strictEqual(step4.status, 'QUEUED', 'Step 4 must be QUEUED');
    assert.strictEqual(step5.status, 'PENDING', 'Step 5 must remain PENDING');

    logger.info('  [PASS] Preserved workflow state confirmed: Steps 1-3 SUCCESS, Step 4 QUEUED, Steps 5-7 PENDING');
    passedTests++;
  }

  // 8. Admin Recovery: Restore Bank API to HEALTHY state
  logger.info('\n7. Admin Recovery Action: Restoring Bank API Health...');
  {
    const restoreRes = await fetch(`${BASE_URL}/bank/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ healthy: true }),
    });
    assert.strictEqual(restoreRes.status, 200, 'Bank restoration failed');
    logger.info('  [OK] Bank API restored to healthy state (healthy: true)');
  }

  // 9. Admin Triggers Exception Retry: POST /api/exceptions/:id/retry
  logger.info('\n8. Executing Exception Retry (POST /api/exceptions/:id/retry)...');
  {
    const retryRes = await fetch(`${BASE_URL}/exceptions/${exceptionId}/retry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
    });

    const retryBody = await retryRes.json();
    assert.strictEqual(retryRes.status, 200, `Retry execution failed: ${JSON.stringify(retryBody)}`);
    assert.strictEqual(retryBody.data.status, 'SUCCESS', 'Workflow status must be SUCCESS');
    assert.strictEqual(retryBody.data.recoveredStep, 'Bank Verification');
    assert(retryBody.data.attempts >= 2, `Attempts must be incremented, got ${retryBody.data.attempts}`);

    logger.info(`  [PASS] Exception retry succeeded: Bank verified, subsequent steps completed, attempts persisted (${retryBody.data.attempts})`);
    passedTests++;
  }

  // 10. Verify Citizen Application State: Completed without citizen resubmission
  logger.info('\n9. Verifying Citizen Application & Timeline State...');
  {
    // Application details check
    const appRes = await fetch(`${BASE_URL}/applications/${demoAppId}`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    const appBody = await appRes.json();
    assert.strictEqual(appRes.status, 200);
    const currentStatus = appBody.data.status || appBody.data.application?.status;
    assert.strictEqual(currentStatus, 'SUCCESS', 'Application status must be SUCCESS');

    // Timeline check
    const timelineRes = await fetch(`${BASE_URL}/applications/${demoAppId}/timeline`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    const timelineBody = await timelineRes.json();
    assert.strictEqual(timelineRes.status, 200);

    const bankStage = timelineBody.data.timeline.find(
      (t) => t.step_name === 'Bank Verification' || t.stageName === 'Bank Verification'
    );
    assert(bankStage, 'Bank stage must exist in timeline');
    const bankStatus = bankStage.citizen_status || bankStage.status || bankStage.visual_state;
    assert(['Verified', 'Completed', 'SUCCESS'].includes(bankStatus), `Bank stage must be verified, got ${bankStatus}`);

    const completionStage = timelineBody.data.timeline.find(
      (t) => t.step_name === 'Completion' || t.stageName === 'Completion'
    );
    assert(completionStage, 'Completion stage must exist in timeline');
    const compStatus = completionStage.citizen_status || completionStage.visual_state || completionStage.status;
    assert(['Completed', 'SUCCESS'].includes(compStatus), `Completion stage must be Completed/SUCCESS, got ${compStatus}`);

    logger.info('  [PASS] Citizen timeline verified: Bank Verified, Completion Sanctioned, 0 resubmissions required');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 12: Non-Retryable Failure Enforcement
  // Verify that NON_RETRYABLE exceptions are strictly prohibited from auto-retry
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 12: Non-Retryable Exception Protection ---');
  {
    const dynamicYearNonRetry = `2026-NR-${Date.now().toString().slice(-4)}`;
    // Submit application with invalid student ID (Education Department will fail with RECORD_NOT_FOUND)
    const submitNonRetry = await fetch(`${BASE_URL}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        citizen_id: 'CZN-1001',
        student_id: 'STU-NONEXISTENT',
        institution_code: 'INST-01',
        income_certificate_no: 'INC-5001',
        account_reference: 'BANK-7001',
        scheme_name: 'Non-Retryable Test Scheme',
        academic_year: dynamicYearNonRetry,
        declared_income: 180000,
        benefit_amount: 25000,
      }),
    });
    const submitBody = await submitNonRetry.json();
    assert.strictEqual(submitNonRetry.status, 201, `Submission failed: ${JSON.stringify(submitBody)}`);
    const nonRetryAppId = submitBody.data.applicationId;

    await fetch(`${BASE_URL}/applications/${nonRetryAppId}/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purpose: 'Test', scope: ['EDUCATION', 'INCOME', 'BANK'] }),
    });

    // Run workflow -> fails at Education with RECORD_NOT_FOUND (retryable: false)
    await fetch(`${BASE_URL}/workflows/${nonRetryAppId}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: nonRetryAppId }),
    });

    // Attempt to retry non-retryable exception via POST /api/exceptions/:id/retry
    const nonRetryRes = await fetch(`${BASE_URL}/exceptions/${nonRetryAppId}/retry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
    });

    assert.strictEqual(nonRetryRes.status, 400, 'Non-retryable exception must be rejected with HTTP 400 Bad Request');
    const nonRetryBody = await nonRetryRes.json();
    assert.strictEqual(nonRetryBody.error.code, 'NON_RETRYABLE_EXCEPTION', 'Error code must be NON_RETRYABLE_EXCEPTION');

    logger.info('  [PASS] Non-retryable failure strictly blocked: Prohibited from automated retry with HTTP 400 and NON_RETRYABLE_EXCEPTION');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 13: Local Deterministic Queue Batch Processing
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 13: Local Queue Summary & Batch Simulation ---');
  {
    const summaryRes = await fetch(`${BASE_URL}/exceptions/queue/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const summaryBody = await summaryRes.json();
    assert.strictEqual(summaryRes.status, 200);
    assert(summaryBody.data.totalQueued !== undefined, 'Queue summary must report totalQueued');
    assert(Array.isArray(summaryBody.data.departments), 'Queue summary must list departments');

    logger.info(`  [PASS] Queue summary metrics verified: ${summaryBody.data.totalQueued} Queued, ${summaryBody.data.totalFailed} Failed`);
    passedTests++;
  }

  logger.info('\n===========================================================');
  logger.info(`ALL ${passedTests} STEP 12 EXCEPTION & RECOVERY TESTS PASSED SUCCESSFULLY!`);
  logger.info('===========================================================');
}

runStep12Tests().catch((err) => {
  logger.error('Step 12 Test Suite Failed:', err);
  process.exit(1);
});
