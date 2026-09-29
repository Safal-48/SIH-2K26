/**
 * Step 10 Verification Suite: Unified Service Timeline
 * 
 * Verifies:
 * 1. 7 Timeline Stages with exact names and ordering.
 * 2. Visual states (PENDING, RUNNING, SUCCESS, FAILED, RETRYING, QUEUED, COMPLETED).
 * 3. Citizen-friendly labels (Submitted, Verification in progress, Verified, Pending, Action required, Completed).
 * 4. Zero exposure of technical implementation details (no correlation IDs, error codes, retry counts).
 * 5. Golden path execution from submission to completion.
 * 6. Bank failure and trustworthy recovery path without resubmission.
 * 7. State persistence across independent queries / simulated browser refreshes.
 */

import assert from 'assert';
import logger from '../utils/logger.js';
import { getCitizenStatus, getCitizenMessage, TIMELINE_STAGES } from '../services/timeline.service.js';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000/api';

async function runStep10Tests() {
  logger.info('===========================================================');
  logger.info('Starting Step 10: Unified Service Timeline Test Suite');
  logger.info('===========================================================');

  let passedTests = 0;

  // --------------------------------------------------------------------------
  // TEST 1: Exhaustive Visual State and Citizen Label Mapping
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 1: Visual State & Citizen-Friendly Label Mapping ---');
  {
    const expectedStates = [
      { id: 'APPLICATION_RECEIVED', raw: 'PENDING', label: 'Pending' },
      { id: 'APPLICATION_RECEIVED', raw: 'RUNNING', label: 'Verification in progress' },
      { id: 'APPLICATION_RECEIVED', raw: 'SUCCESS', label: 'Submitted' },
      { id: 'APPLICATION_RECEIVED', raw: 'FAILED', label: 'Action required' },
      { id: 'APPLICATION_RECEIVED', raw: 'RETRYING', label: 'Verification in progress' },
      { id: 'APPLICATION_RECEIVED', raw: 'QUEUED', label: 'Action required' },
      { id: 'APPLICATION_RECEIVED', raw: 'COMPLETED', label: 'Completed' },

      { id: 'BANK_VERIFICATION', raw: 'PENDING', label: 'Pending' },
      { id: 'BANK_VERIFICATION', raw: 'RUNNING', label: 'Verification in progress' },
      { id: 'BANK_VERIFICATION', raw: 'SUCCESS', label: 'Verified' },
      { id: 'BANK_VERIFICATION', raw: 'FAILED', label: 'Action required' },
      { id: 'BANK_VERIFICATION', raw: 'RETRYING', label: 'Verification in progress' },
      { id: 'BANK_VERIFICATION', raw: 'QUEUED', label: 'Action required' },
      { id: 'BANK_VERIFICATION', raw: 'COMPLETED', label: 'Completed' },

      { id: 'COMPLETION', raw: 'SUCCESS', label: 'Completed' },
      { id: 'COMPLETION', raw: 'COMPLETED', label: 'Completed' },
    ];

    for (const testCase of expectedStates) {
      const label = getCitizenStatus(testCase.id, testCase.raw);
      assert.strictEqual(
        label,
        testCase.label,
        `Expected label '${testCase.label}' for ${testCase.id} with status '${testCase.raw}', got '${label}'`
      );
    }

    // Verify 7 timeline stages definition
    assert.strictEqual(TIMELINE_STAGES.length, 7, 'Timeline must define exactly 7 stages');
    assert.strictEqual(TIMELINE_STAGES[0].step_name, 'Application Submitted');
    assert.strictEqual(TIMELINE_STAGES[1].step_name, 'Education Verification');
    assert.strictEqual(TIMELINE_STAGES[2].step_name, 'Income Verification');
    assert.strictEqual(TIMELINE_STAGES[3].step_name, 'Bank Verification');
    assert.strictEqual(TIMELINE_STAGES[4].step_name, 'Eligibility Check');
    assert.strictEqual(TIMELINE_STAGES[5].step_name, 'Officer Approval');
    assert.strictEqual(TIMELINE_STAGES[6].step_name, 'Completion');

    logger.info('  [PASS] Test 1: All 7 visual states correctly mapped to approved citizen-friendly labels');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 2: Citizen Privacy Protection (No Technical Leakage)
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 2: Citizen Privacy Protection & Zero Technical Leakage ---');
  {
    for (const stage of TIMELINE_STAGES) {
      for (const status of ['PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'RETRYING', 'QUEUED', 'COMPLETED']) {
        const msg = getCitizenMessage(stage.step_identifier, status);
        assert(typeof msg === 'string' && msg.length > 5, 'Message must be informative');

        // Check for forbidden technical leakages
        assert(!msg.includes('CORR-'), `Message contains correlation ID: ${msg}`);
        assert(!msg.includes('SELECT'), `Message contains SQL: ${msg}`);
        assert(!msg.includes('500') && !msg.includes('503'), `Message contains HTTP code: ${msg}`);
        assert(!msg.includes('Connector'), `Message contains connector detail: ${msg}`);
        assert(!msg.includes('stack'), `Message contains stack trace: ${msg}`);
        assert(!msg.includes('workflow_steps'), `Message contains database table: ${msg}`);
        assert(!msg.includes('retry_count'), `Message contains internal retry counter: ${msg}`);
      }
    }

    logger.info('  [PASS] Test 2: Zero technical details exposed in all citizen-facing message templates');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 3: Golden Path Full 7-Stage Progression
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 3: Golden Path Full 7-Stage Progression ---');
  let goldenAppId = null;
  {
    const dynamicYear = `2026-G-${Date.now().toString().slice(-4)}`;
    const payload = {
      citizen_id: 'CZN-1001',
      student_id: 'STU-1001',
      institution_code: 'INST-NIT-04',
      income_certificate_no: 'INC-5001',
      account_reference: 'BANK-7001',
      scheme_name: 'National Merit Scholarship Scheme 2026',
      academic_year: dynamicYear,
      declared_income: 180000,
      benefit_amount: 25000,
    };

    // 1. Submit Application
    const submitRes = await fetch(`${BASE_URL}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const submitBody = await submitRes.json();
    assert.strictEqual(submitRes.status, 201, 'Application submission must succeed with 201');
    goldenAppId = submitBody.data.applicationId;

    // 2. Fetch Initial Timeline Before Workflow Run
    const initialTimelineRes = await fetch(`${BASE_URL}/applications/${goldenAppId}/timeline`);
    const initialTimelineBody = await initialTimelineRes.json();
    assert.strictEqual(initialTimelineRes.status, 200);

    const initialTimeline = initialTimelineBody.data.timeline;
    assert.strictEqual(initialTimeline.length, 7, 'Initial timeline must have all 7 stages');
    assert.strictEqual(initialTimeline[0].step_identifier, 'APPLICATION_RECEIVED');
    assert.strictEqual(initialTimeline[0].status, 'SUCCESS');
    assert.strictEqual(initialTimeline[0].citizen_status, 'Submitted');
    assert(initialTimeline[0].basic_message, 'Stage 1 must include basic message');
    assert(initialTimeline[0].started_at, 'Stage 1 must have started_at timestamp');

    // Steps 2-7 must be PENDING with label "Pending"
    for (let i = 1; i < 7; i++) {
      assert.strictEqual(initialTimeline[i].status, 'PENDING');
      assert.strictEqual(initialTimeline[i].citizen_status, 'Pending');
      assert.strictEqual(initialTimeline[i].completed_at, null);
    }

    // 3. Grant Consent
    const consentRes = await fetch(`${BASE_URL}/applications/${goldenAppId}/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        purpose: 'Scholarship Eligibility Verification',
        scope: ['EDUCATION', 'INCOME', 'BANK'],
      }),
    });
    assert.strictEqual(consentRes.status, 200, 'Consent grant must succeed');

    // 4. Run Workflow to Completion
    const runRes = await fetch(`${BASE_URL}/workflows/${goldenAppId}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: goldenAppId }),
    });
    const runBody = await runRes.json();
    assert.strictEqual(runRes.status, 200, `Workflow run failed: ${JSON.stringify(runBody)}`);
    assert.strictEqual(runBody.data.success, true);

    // 5. Fetch Completed 7-Stage Timeline
    const completedTimelineRes = await fetch(`${BASE_URL}/applications/${goldenAppId}/timeline`);
    const completedTimelineBody = await completedTimelineRes.json();
    assert.strictEqual(completedTimelineRes.status, 200);

    const compData = completedTimelineBody.data;
    assert.strictEqual(compData.completedSteps, 7, 'All 7 stages must be complete');
    assert.strictEqual(compData.progressPercentage, 100, 'Progress must be 100%');

    const timeline = compData.timeline;
    assert.strictEqual(timeline.length, 7);

    // Verify citizen labels across golden path:
    assert.strictEqual(timeline[0].citizen_status, 'Submitted');
    assert.strictEqual(timeline[1].citizen_status, 'Verified'); // Education
    assert.strictEqual(timeline[2].citizen_status, 'Verified'); // Income
    assert.strictEqual(timeline[3].citizen_status, 'Verified'); // Bank
    assert.strictEqual(timeline[4].citizen_status, 'Verified'); // Eligibility
    assert.strictEqual(timeline[5].citizen_status, 'Verified'); // Officer Approval
    assert.strictEqual(timeline[6].citizen_status, 'Completed'); // Completion

    // Verify all completed steps have completion timestamps
    for (const step of timeline) {
      assert(step.completed_at !== null, `Step ${step.step_name} must have completed_at timestamp`);
      assert(step.basic_message && step.basic_message.length > 0, `Step ${step.step_name} must have basic_message`);
    }

    logger.info(`  [PASS] Test 3: Golden path completed: Application ${goldenAppId} traversed all 7 stages to 100% completion`);
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 4: Failure & Recovery Path (Bank Verification Failure -> Recovery)
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 4: Failure & Recovery Path (Bank Verification) ---');
  let recoveryAppId = null;
  {
    const dynamicYear = `2026-R-${Date.now().toString().slice(-4)}`;
    const payload = {
      citizen_id: 'CZN-1002',
      student_id: 'STU-1002',
      institution_code: 'INST-SUT-12',
      income_certificate_no: 'INC-5002',
      account_reference: 'BANK-7002',
      scheme_name: 'Post-Matric Technical Scholarship Scheme',
      academic_year: dynamicYear,
      declared_income: 210000,
      benefit_amount: 30000,
    };

    // 1. Submit Application
    const submitRes = await fetch(`${BASE_URL}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const submitBody = await submitRes.json();
    assert.strictEqual(submitRes.status, 201);
    recoveryAppId = submitBody.data.applicationId;

    // 2. Grant Consent
    await fetch(`${BASE_URL}/applications/${recoveryAppId}/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        purpose: 'Technical scholarship verification',
        scope: ['EDUCATION', 'INCOME', 'BANK'],
      }),
    });

    // 3. Set Mock Bank API to Failed State
    const setBankFailRes = await fetch(`${BASE_URL}/bank/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        healthy: false,
        retryable: true,
        errorCode: 'GATEWAY_TIMEOUT',
        message: 'Core Banking Gateway Timeout',
      }),
    });
    assert.strictEqual(setBankFailRes.status, 200);

    // 4. Run Workflow -> Steps 1-3 succeed, Step 4 fails
    const runFailRes = await fetch(`${BASE_URL}/workflows/${recoveryAppId}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: recoveryAppId }),
    });
    // Expected 422 (or halted status)
    assert(runFailRes.status === 422 || runFailRes.status === 202);

    // 5. Inspect Timeline During Failure State
    const failedTimelineRes = await fetch(`${BASE_URL}/applications/${recoveryAppId}/timeline`);
    const failedTimelineBody = await failedTimelineRes.json();
    assert.strictEqual(failedTimelineRes.status, 200);

    const fTimeline = failedTimelineBody.data.timeline;
    assert.strictEqual(fTimeline.length, 7);

    // Steps 1, 2, 3 must be successfully verified
    assert.strictEqual(fTimeline[0].citizen_status, 'Submitted');
    assert.strictEqual(fTimeline[0].status, 'SUCCESS');

    assert.strictEqual(fTimeline[1].citizen_status, 'Verified');
    assert.strictEqual(fTimeline[1].status, 'SUCCESS');

    assert.strictEqual(fTimeline[2].citizen_status, 'Verified');
    assert.strictEqual(fTimeline[2].status, 'SUCCESS');

    // Step 4 (Bank) must be FAILED or QUEUED with citizen label "Action required"
    assert(
      fTimeline[3].status === 'FAILED' || fTimeline[3].status === 'QUEUED',
      `Expected Bank status FAILED or QUEUED, got ${fTimeline[3].status}`
    );
    assert.strictEqual(
      fTimeline[3].citizen_status,
      'Action required',
      `Expected 'Action required' citizen label for bank failure, got '${fTimeline[3].citizen_status}'`
    );
    assert(
      fTimeline[3].basic_message.includes('Bank verification') || fTimeline[3].basic_message.includes('delay'),
      `Message must be citizen-friendly guidance: ${fTimeline[3].basic_message}`
    );
    // MUST NOT leak internal error code
    assert(!fTimeline[3].basic_message.includes('GATEWAY_TIMEOUT'), 'Must not leak technical error code');

    // Steps 5, 6, 7 must be safely PENDING
    assert.strictEqual(fTimeline[4].citizen_status, 'Pending');
    assert.strictEqual(fTimeline[5].citizen_status, 'Pending');
    assert.strictEqual(fTimeline[6].citizen_status, 'Pending');

    logger.info('  [OK] Bank failure accurately reflected: Steps 1-3 Verified, Step 4 Action required, Steps 5-7 Pending');

    // 6. Simulate Browser Refresh / Persistence Check
    // Query a second time independently
    const refreshTimelineRes = await fetch(`${BASE_URL}/applications/${recoveryAppId}/timeline`);
    const refreshTimelineBody = await refreshTimelineRes.json();
    assert.strictEqual(refreshTimelineBody.data.timeline[3].status, fTimeline[3].status, 'State must persist across refresh');
    assert.strictEqual(refreshTimelineBody.data.timeline[1].status, 'SUCCESS', 'Education step must persist as SUCCESS');

    // 7. Recover Bank Service to HEALTHY
    const restoreBankRes = await fetch(`${BASE_URL}/bank/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ healthy: true }),
    });
    assert.strictEqual(restoreBankRes.status, 200);

    // 8. Citizen Triggers Recovery / Resume for SAME application (No resubmission needed!)
    logger.info('  Resuming workflow execution after bank service recovery (No resubmission required)...');
    const resumeRes = await fetch(`${BASE_URL}/workflows/${recoveryAppId}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: recoveryAppId }),
    });
    const resumeBody = await resumeRes.json();
    assert.strictEqual(resumeRes.status, 200, `Workflow resume failed: ${JSON.stringify(resumeBody)}`);
    assert.strictEqual(resumeBody.data.success, true);

    // 9. Inspect Final Timeline After Recovery
    const recoveredTimelineRes = await fetch(`${BASE_URL}/applications/${recoveryAppId}/timeline`);
    const recoveredTimelineBody = await recoveredTimelineRes.json();
    assert.strictEqual(recoveredTimelineRes.status, 200);

    const rTimeline = recoveredTimelineBody.data.timeline;
    assert.strictEqual(recoveredTimelineBody.data.completedSteps, 7, 'All 7 stages must now be completed');

    assert.strictEqual(rTimeline[0].citizen_status, 'Submitted');
    assert.strictEqual(rTimeline[1].citizen_status, 'Verified');
    assert.strictEqual(rTimeline[2].citizen_status, 'Verified');
    assert.strictEqual(rTimeline[3].citizen_status, 'Verified', 'Bank Verification must now be Verified!');
    assert.strictEqual(rTimeline[4].citizen_status, 'Verified', 'Eligibility Check must now be Verified!');
    assert.strictEqual(rTimeline[5].citizen_status, 'Verified', 'Officer Approval must now be Verified!');
    assert.strictEqual(rTimeline[6].citizen_status, 'Completed', 'Completion must now be Completed!');

    logger.info(`  [PASS] Test 4: Trustworthy recovery verified: Bank recovered without resubmission for ${recoveryAppId}`);
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 5: Browser Refresh Persistence Verification
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 5: Persistence Across Browser Refreshes ---');
  {
    // Query both tested applications again
    const gCheck = await (await fetch(`${BASE_URL}/applications/${goldenAppId}/timeline`)).json();
    const rCheck = await (await fetch(`${BASE_URL}/applications/${recoveryAppId}/timeline`)).json();

    assert.strictEqual(gCheck.data.completedSteps, 7, 'Golden application state durable in PostgreSQL');
    assert.strictEqual(rCheck.data.completedSteps, 7, 'Recovered application state durable in PostgreSQL');

    logger.info('  [PASS] Test 5: Persisted PostgreSQL timeline state preserved intact across multiple re-queries');
    passedTests++;
  }

  // Reset all mock services to healthy baseline
  await fetch(`${BASE_URL}/mock/reset`, { method: 'POST' });

  logger.info('\n===========================================================');
  logger.info(`ALL ${passedTests} STEP 10 UNIFIED TIMELINE TESTS PASSED SUCCESSFULLY!`);
  logger.info('===========================================================');
}

runStep10Tests().catch((err) => {
  logger.error('Step 10 Test Suite Failed:', err);
  process.exit(1);
});
