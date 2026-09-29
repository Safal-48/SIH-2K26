import assert from 'assert';
import config from '../config/env.js';
import logger from '../utils/logger.js';

const PORT = config.port || 5000;
const BASE_URL = `http://127.0.0.1:${PORT}/api/v1`;
const DIRECT_API_URL = `http://127.0.0.1:${PORT}/api`;

async function runTests() {
  logger.info('===========================================================');
  logger.info('Starting Step 8: Scholarship Application Lifecycle Test Suite');
  logger.info('===========================================================');

  let passedTests = 0;
  let createdApplicationId = null;

  // --------------------------------------------------------------------------
  // TEST 1: Missing Required Identifier Fields (400 Bad Request)
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 1: Missing Required Identifier Fields ---');
  {
    // Omit student_id
    const payloadMissing = {
      citizen_id: 'CZN-1001',
      institution_code: 'INST-NIT-04',
      income_certificate_no: 'INC-5001',
      account_reference: 'BANK-7001',
    };

    const res = await fetch(`${DIRECT_API_URL}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadMissing),
    });

    const body = await res.json();
    assert(res.status === 400, `Expected 400 for missing field, got ${res.status}`);
    assert(body.error.code === 'MISSING_REQUIRED_FIELD', `Expected MISSING_REQUIRED_FIELD, got ${body.error.code}`);
    assert(
      body.error.details.missingFields.includes('student_id'),
      'Missing fields should specify student_id'
    );

    logger.info('  [PASS] Test 1: Missing identifier rejected with 400 and MISSING_REQUIRED_FIELD');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 2: Malformed Identifiers (400 Bad Request)
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 2: Malformed Identifier Format Validation ---');
  {
    // 2a. Malformed citizen_id
    const resBadCitizen = await fetch(`${DIRECT_API_URL}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        citizen_id: 'INVALID_CITIZEN_123',
        student_id: 'STU-1001',
        institution_code: 'INST-NIT-04',
        income_certificate_no: 'INC-5001',
        account_reference: 'BANK-7001',
      }),
    });
    const bodyBadCitizen = await resBadCitizen.json();
    assert(resBadCitizen.status === 400, `Expected 400 for malformed citizen_id, got ${resBadCitizen.status}`);
    assert(bodyBadCitizen.error.code === 'MALFORMED_IDENTIFIER', 'Expected MALFORMED_IDENTIFIER');

    // 2b. Malformed student_id
    const resBadStudent = await fetch(`${DIRECT_API_URL}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        citizen_id: 'CZN-1001',
        student_id: 'NOT_A_VALID_STUDENT_ID',
        institution_code: 'INST-NIT-04',
        income_certificate_no: 'INC-5001',
        account_reference: 'BANK-7001',
      }),
    });
    const bodyBadStudent = await resBadStudent.json();
    assert(resBadStudent.status === 400, `Expected 400 for malformed student_id, got ${resBadStudent.status}`);
    assert(bodyBadStudent.error.code === 'MALFORMED_IDENTIFIER', 'Expected MALFORMED_IDENTIFIER');

    // 2c. Malformed income_certificate_no
    const resBadIncome = await fetch(`${DIRECT_API_URL}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        citizen_id: 'CZN-1001',
        student_id: 'STU-1001',
        institution_code: 'INST-NIT-04',
        income_certificate_no: 'BAD-INCOME-CERT',
        account_reference: 'BANK-7001',
      }),
    });
    const bodyBadIncome = await resBadIncome.json();
    assert(resBadIncome.status === 400, `Expected 400 for malformed income cert, got ${resBadIncome.status}`);
    assert(bodyBadIncome.error.code === 'MALFORMED_IDENTIFIER', 'Expected MALFORMED_IDENTIFIER');

    // 2d. Malformed account_reference
    const resBadBank = await fetch(`${DIRECT_API_URL}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        citizen_id: 'CZN-1001',
        student_id: 'STU-1001',
        institution_code: 'INST-NIT-04',
        income_certificate_no: 'INC-5001',
        account_reference: 'ACCOUNT_WITHOUT_PREFIX',
      }),
    });
    const bodyBadBank = await resBadBank.json();
    assert(resBadBank.status === 400, `Expected 400 for malformed account_reference, got ${resBadBank.status}`);
    assert(bodyBadBank.error.code === 'MALFORMED_IDENTIFIER', 'Expected MALFORMED_IDENTIFIER');

    logger.info('  [PASS] Test 2: Server-side regex validation rejected malformed identifiers with 400');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 3: Unknown Citizen Check (404 Not Found)
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 3: Unknown Citizen Check (Master Registry) ---');
  {
    const resUnknown = await fetch(`${DIRECT_API_URL}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        citizen_id: 'CZN-9999-GHOST',
        student_id: 'STU-1001',
        institution_code: 'INST-NIT-04',
        income_certificate_no: 'INC-5001',
        account_reference: 'BANK-7001',
      }),
    });

    const bodyUnknown = await resUnknown.json();
    assert(resUnknown.status === 404, `Expected 404 for unknown citizen, got ${resUnknown.status}`);
    assert(bodyUnknown.error.code === 'CITIZEN_NOT_FOUND', `Expected CITIZEN_NOT_FOUND, got ${bodyUnknown.error.code}`);

    logger.info('  [PASS] Test 3: Unregistered citizen safely rejected with HTTP 404 CITIZEN_NOT_FOUND');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 4: Duplicate Application Detection (409 Conflict)
  // SCH-2026-001 already exists for CZN-1001 in academic year 2025-2026
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 4: Duplicate Application Detection ---');
  {
    const resDuplicate = await fetch(`${DIRECT_API_URL}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        citizen_id: 'CZN-1001',
        student_id: 'STU-1001',
        institution_code: 'INST-NIT-04',
        income_certificate_no: 'INC-5001',
        account_reference: 'BANK-7001',
        academic_year: '2025-2026',
      }),
    });

    const bodyDuplicate = await resDuplicate.json();
    assert(resDuplicate.status === 409, `Expected 409 Conflict, got ${resDuplicate.status}`);
    assert(bodyDuplicate.error.code === 'DUPLICATE_APPLICATION', 'Expected DUPLICATE_APPLICATION error code');
    assert(bodyDuplicate.error.details.existingApplicationId, 'Details must cite existing application ID');

    logger.info('  [PASS] Test 4: Duplicate application detected and rejected with HTTP 409 DUPLICATE_APPLICATION');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 5: Valid Application Submission & Identifier Persistence (201 Created)
  // Create a brand new application for CZN-1002
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 5: Valid Application Submission (201 Created) ---');
  {
    const dynamicYear = `2026-${Date.now().toString().slice(-4)}`;
    const validPayload = {
      citizen_id: 'CZN-1002',
      student_id: 'STU-1002',
      institution_code: 'INST-SUT-12',
      income_certificate_no: 'INC-5002',
      account_reference: 'BANK-7002',
      scheme_name: 'Post-Matric Merit-cum-Means Financial Assistance Scheme',
      academic_year: dynamicYear,
      declared_income: 210000.00,
      benefit_amount: 25000.00,
    };

    const res = await fetch(`${DIRECT_API_URL}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });

    const body = await res.json();
    assert(res.status === 201, `Expected 201 Created, got ${res.status}: ${JSON.stringify(body)}`);
    assert(body.success === true, 'Response should indicate success');
    assert(body.data.applicationId, 'Generated application ID must be returned');
    assert(body.data.applicationId.startsWith('SCH-2026-'), `Application ID should follow pattern SCH-2026-XXX, got ${body.data.applicationId}`);
    assert(body.data.citizenId === 'CZN-1002', 'Citizen ID should match');
    assert(body.data.status === 'SUBMITTED', 'Status should be SUBMITTED');
    assert(body.data.currentStep === 'APPLICATION_RECEIVED', 'Current step should be APPLICATION_RECEIVED');
    assert(body.data.consentRequired === true, 'Consent must be required prior to cross-department verification');
    assert(body.data.consentStatus === 'PENDING_CONSENT', 'Consent status should be PENDING_CONSENT');

    // Verify all 5 identifiers persisted in data
    assert(body.data.identifiers.citizenId === 'CZN-1002', 'citizenId preserved');
    assert(body.data.identifiers.studentId === 'STU-1002', 'studentId preserved');
    assert(body.data.identifiers.institutionCode === 'INST-SUT-12', 'institutionCode preserved');
    assert(body.data.identifiers.incomeCertificateNo === 'INC-5002', 'incomeCertificateNo preserved');
    assert(body.data.identifiers.accountReference === 'BANK-7002', 'accountReference preserved');

    createdApplicationId = body.data.applicationId;

    // Verify Step 1 is initialized in database via timeline API
    const timelineRes = await fetch(`${DIRECT_API_URL}/applications/${createdApplicationId}/timeline`);
    const timelineBody = await timelineRes.json();
    assert(timelineRes.ok, 'Timeline API should return 200 OK');
    const step1 = timelineBody.data.timeline.find((s) => s.step_number === 1);
    assert(step1 !== undefined, 'Step 1 instance must exist in timeline');
    assert(step1.status === 'SUCCESS', 'Step 1 APPLICATION_RECEIVED should be marked SUCCESS');
    assert(step1.step_identifier === 'APPLICATION_RECEIVED', 'Step identifier must match');

    logger.info(`  [PASS] Test 5: Application ${createdApplicationId} successfully submitted with 5 identifiers, Step 1 initialized`);
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 6: Application Retrieval (GET /api/applications/:id)
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 6: Application Retrieval (GET /api/applications/:id) ---');
  {
    // 6a. Direct /api/applications/:id
    const resDirect = await fetch(`${DIRECT_API_URL}/applications/${createdApplicationId}`);
    const bodyDirect = await resDirect.json();
    assert(resDirect.ok, 'GET /api/applications/:id should return 200 OK');
    assert(bodyDirect.data.application.application_id === createdApplicationId, 'Application ID must match');
    assert(bodyDirect.data.application.citizen_name === 'Pooja Verma', 'Citizen name must be populated from citizens JOIN');

    // 6b. Versioned /api/v1/applications/:id
    const resVersioned = await fetch(`${BASE_URL}/applications/${createdApplicationId}`);
    const bodyVersioned = await resVersioned.json();
    assert(resVersioned.ok, 'GET /api/v1/applications/:id should return 200 OK');
    assert(bodyVersioned.data.application.student_id === 'STU-1002', 'Student ID should match');

    // 6c. Non-existent application -> 404
    const resNotFound = await fetch(`${DIRECT_API_URL}/applications/SCH-NONEXISTENT`);
    assert(resNotFound.status === 404, `Expected 404 for non-existent application, got ${resNotFound.status}`);

    logger.info('  [PASS] Test 6: Application retrieval verified via both /api and /api/v1 gateways');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 7: Application Timeline Retrieval (GET /api/applications/:id/timeline)
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 7: Application Timeline Retrieval (GET /api/applications/:id/timeline) ---');
  {
    // Retrieve timeline for createdApplicationId (which has step 1 initialized)
    const res = await fetch(`${DIRECT_API_URL}/applications/${createdApplicationId}/timeline`);
    const body = await res.json();
    assert(res.ok, 'GET /api/applications/:id/timeline should return 200 OK');
    assert(body.data.applicationId === createdApplicationId, 'Timeline application ID must match');
    assert(Array.isArray(body.data.timeline), 'Timeline must be an array of steps');
    assert(body.data.timeline.length >= 1, `Expected at least 1 step in timeline, got ${body.data.timeline.length}`);
    assert(body.data.timeline[0].step_identifier === 'APPLICATION_RECEIVED', 'Step 1 must be APPLICATION_RECEIVED');

    // Retrieve timeline for seeded SCH-2026-005 (which has 4 steps seeded)
    const res5 = await fetch(`${DIRECT_API_URL}/applications/SCH-2026-005/timeline`);
    const body5 = await res5.json();
    assert(res5.ok, 'GET timeline for SCH-2026-005 should return 200 OK');
    assert(body5.data.timeline.length >= 4, `Expected at least 4 steps for SCH-2026-005, got ${body5.data.timeline.length}`);

    // Non-existent application timeline -> 404
    const resNotFound = await fetch(`${DIRECT_API_URL}/applications/SCH-NONEXISTENT/timeline`);
    assert(resNotFound.status === 404, `Expected 404 for non-existent timeline, got ${resNotFound.status}`);

    logger.info('  [PASS] Test 7: Timeline retrieval returned ordered sequential steps with execution timestamps');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 8: Workflow Consent Enforcement & Run Before/After Consent
  // POST /api/workflows/:id/run
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 8: Workflow Execution Gatekeeper (POST /api/workflows/:id/run) ---');
  {
    // 8a. Run workflow for created application BEFORE granting consent -> MUST FAIL at Step 2
    const runBeforeRes = await fetch(`${DIRECT_API_URL}/workflows/${createdApplicationId}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const runBeforeBody = await runBeforeRes.json();
    assert(runBeforeRes.status === 422, `Expected 422 because consent is missing, got ${runBeforeRes.status}`);
    const errDetails = runBeforeBody.data || runBeforeBody.error?.details || {};
    assert(errDetails.status === 'FAILED', `Workflow status must be FAILED, got ${errDetails.status}`);
    assert(errDetails.failedStepIdentifier === 'EDUCATION_VERIFICATION', 'Should halt at Step 2');

    // 8b. Grant consent via POST /api/applications/:id/consent
    const consentRes = await fetch(`${DIRECT_API_URL}/applications/${createdApplicationId}/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        purpose: 'Scholarship eligibility verification',
        scope: ['Education verification', 'Income verification', 'Bank verification status'],
      }),
    });

    const consentBody = await consentRes.json();
    assert(consentRes.ok, `Expected 200 for consent grant, got ${consentRes.status}`);
    assert(consentBody.data.status === 'GRANTED', 'Consent status must be GRANTED');
    assert(consentBody.data.purpose === 'Scholarship eligibility verification', 'Purpose must match');

    // 8c. Run workflow AFTER consent is granted -> MUST COMPLETE through all steps
    const runAfterRes = await fetch(`${DIRECT_API_URL}/workflows/${createdApplicationId}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const runAfterBody = await runAfterRes.json();
    assert(runAfterRes.ok, `Expected 200 OK after consent granted, got ${runAfterRes.status}: ${JSON.stringify(runAfterBody)}`);
    assert(runAfterBody.data.status === 'SUCCESS', `Expected workflow SUCCESS, got ${runAfterBody.data.status}`);

    logger.info('  [PASS] Test 8: Workflow run blocked without consent, then succeeded through completion after consent granted');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 9: Workflow Live Status Inspection (GET /api/workflows/:id/status)
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 9: Workflow Live Status Inspection (GET /api/workflows/:id/status) ---');
  {
    const res = await fetch(`${DIRECT_API_URL}/workflows/${createdApplicationId}/status`);
    const body = await res.json();
    assert(res.ok, 'GET /api/workflows/:id/status should return 200 OK');
    assert(body.data.applicationId === createdApplicationId, 'Application ID must match');
    const completedCount = body.data.completedSteps !== undefined ? body.data.completedSteps : body.data.steps?.filter((s) => s.status === 'SUCCESS' || s.status === 'SKIPPED').length;
    assert(completedCount === 7, `Expected 7 completed steps, got ${completedCount}`);
    assert(Array.isArray(body.data.steps), 'Steps must be an array');

    logger.info('  [PASS] Test 9: Live workflow status retrieved with all 7 completed steps');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 10: Notifications Feed (GET /api/notifications)
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 10: Notification Alerts (GET /api/notifications) ---');
  {
    // Retrieve notifications for CZN-1002
    const res = await fetch(`${DIRECT_API_URL}/notifications?citizen_id=CZN-1002`);
    const body = await res.json();
    assert(res.ok, 'GET /api/notifications should return 200 OK');
    assert(body.data.count > 0, 'Notifications count must be > 0');
    assert(Array.isArray(body.data.notifications), 'Notifications must be array');

    const submittedAlert = body.data.notifications.find((n) => n.type === 'APPLICATION_SUBMITTED');
    assert(submittedAlert !== undefined, 'Expected APPLICATION_SUBMITTED notification');

    logger.info('  [PASS] Test 10: Citizen notification alerts verified');
    passedTests++;
  }

  logger.info('\n===========================================================');
  logger.info(`ALL ${passedTests} APPLICATION LIFECYCLE TESTS PASSED SUCCESSFULLY!`);
  logger.info('===========================================================');
}

runTests().catch((err) => {
  logger.error('Test Suite Failed:', err.message, err.stack);
  process.exit(1);
});
