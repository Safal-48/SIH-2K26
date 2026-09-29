import assert from 'assert';
import config from '../config/env.js';
import logger from '../utils/logger.js';
import { query } from '../config/database.js';
import WorkflowModel from '../models/workflow.model.js';

const PORT = config.port || 5000;
const BASE_URL = `http://localhost:${PORT}/api/v1`;
const DIRECT_API_URL = `http://localhost:${PORT}/api`;

async function runTests() {
  logger.info('===========================================================');
  logger.info('Starting Step 7: Auth, JWT Session, RBAC & Consent Test Suite');
  logger.info('===========================================================');

  let passedTests = 0;
  const tokens = {};

  // --------------------------------------------------------------------------
  // TEST 1: Demo Login & JWT Generation for all required roles
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 1: Authentication & JWT Session Generation for Demo Accounts ---');
  {
    const demoCredentials = [
      { role: 'CITIZEN', identifier: 'citizen', password: 'demo123', expectedCitizenId: 'CZN-1001' },
      { role: 'CITIZEN_ALT', identifier: 'CZN-1001', password: 'demo123', expectedCitizenId: 'CZN-1001' },
      { role: 'EDUCATION_OFFICER', identifier: 'edu_officer', password: 'demo123', expectedDept: 'EDU' },
      { role: 'REVENUE_OFFICER', identifier: 'rev_officer', password: 'demo123', expectedDept: 'REV' },
      { role: 'BANK_DBT_OFFICER', identifier: 'bank_officer', password: 'demo123', expectedDept: 'DBT' },
      { role: 'ADMIN', identifier: 'admin', password: 'demo123', expectedDept: 'ADMIN' },
      { role: 'SYSTEM', identifier: 'system', password: 'demo123', expectedDept: 'INTEROP' },
    ];

    for (const cred of demoCredentials) {
      // Test direct /api/auth/login and versioned /api/v1/auth/login
      const endpoint = cred.role === 'CITIZEN' ? `${DIRECT_API_URL}/auth/login` : `${BASE_URL}/auth/login`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cred.identifier, password: cred.password }),
      });

      const body = await res.json();
      assert(res.ok, `Login failed for ${cred.identifier}: ${JSON.stringify(body)}`);
      assert(body.success === true, 'Response must indicate success');
      assert(body.data.token, 'Response must include JWT token');
      assert(body.data.user, 'Response must include user session context');
      assert(Array.isArray(body.data.user.permissions), 'Session must include role permissions');

      if (cred.expectedCitizenId) {
        assert(body.data.user.citizenId === cred.expectedCitizenId, `Citizen ID should be ${cred.expectedCitizenId}`);
      }
      if (cred.expectedDept) {
        assert(body.data.user.departmentCode === cred.expectedDept, `Department code should be ${cred.expectedDept}`);
      }

      tokens[cred.role] = body.data.token;
    }

    logger.info('  [PASS] Test 1: All 6 demo accounts authenticated successfully with JWT & session context');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 2: Session Context Inspection (GET /api/auth/me)
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 2: Session Context Verification (/me endpoint) ---');
  {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokens.CITIZEN}` },
    });
    const body = await res.json();
    assert(res.ok, 'GET /me must return 200 OK');
    assert(body.data.user.username === 'citizen', 'Session should match citizen username');
    assert(body.data.user.role === 'CITIZEN', 'Role should be CITIZEN');

    logger.info('  [PASS] Test 2: Token verification and session context inspection verified');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 3: Unauthorized Access (Missing / Invalid Token)
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 3: Unauthorized Access (401 Handling) ---');
  {
    // 3a. Missing token
    const resMissing = await fetch(`${BASE_URL}/citizen/applications`);
    assert(resMissing.status === 401, `Expected 401 for missing token, got ${resMissing.status}`);
    const bodyMissing = await resMissing.json();
    assert(bodyMissing.error.code === 'UNAUTHORIZED', 'Expected UNAUTHORIZED error code');

    // 3b. Invalid/malformed token
    const resInvalid = await fetch(`${BASE_URL}/citizen/applications`, {
      headers: { Authorization: 'Bearer this.is.an.invalid.token' },
    });
    assert(resInvalid.status === 401, `Expected 401 for invalid token, got ${resInvalid.status}`);
    const bodyInvalid = await resInvalid.json();
    assert(bodyInvalid.error.code === 'INVALID_TOKEN', 'Expected INVALID_TOKEN error code');

    logger.info('  [PASS] Test 3: Unauthorized requests properly rejected with HTTP 401');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 4: Role-Based Access Control (RBAC) Cross-Role Isolation (403 Handling)
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 4: Role-Based Access Control (403 Forbidden Handling) ---');
  {
    // 4a. Citizen attempting to access Education Officer cases
    const resCitToEdu = await fetch(`${BASE_URL}/officer/education/cases`, {
      headers: { Authorization: `Bearer ${tokens.CITIZEN}` },
    });
    assert(resCitToEdu.status === 403, `Citizen accessing officer cases should return 403, got ${resCitToEdu.status}`);
    const bodyCitToEdu = await resCitToEdu.json();
    assert(bodyCitToEdu.error.code === 'FORBIDDEN', 'Expected FORBIDDEN error code');

    // 4b. Citizen attempting to access Admin Audit Logs
    const resCitToAdmin = await fetch(`${BASE_URL}/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${tokens.CITIZEN}` },
    });
    assert(resCitToAdmin.status === 403, `Citizen accessing admin logs should return 403, got ${resCitToAdmin.status}`);

    // 4c. Education Officer attempting to access Revenue cases
    const resEduToRev = await fetch(`${BASE_URL}/officer/revenue/cases`, {
      headers: { Authorization: `Bearer ${tokens.EDUCATION_OFFICER}` },
    });
    assert(resEduToRev.status === 403, `Education officer accessing revenue cases should return 403, got ${resEduToRev.status}`);

    // 4d. Revenue Officer attempting to access Bank cases
    const resRevToBank = await fetch(`${BASE_URL}/officer/bank/cases`, {
      headers: { Authorization: `Bearer ${tokens.REVENUE_OFFICER}` },
    });
    assert(resRevToBank.status === 403, `Revenue officer accessing bank cases should return 403, got ${resRevToBank.status}`);

    // 4e. Bank Officer attempting to access Admin monitoring
    const resBankToAdmin = await fetch(`${BASE_URL}/admin/monitoring`, {
      headers: { Authorization: `Bearer ${tokens.BANK_DBT_OFFICER}` },
    });
    assert(resBankToAdmin.status === 403, `Bank officer accessing admin monitoring should return 403, got ${resBankToAdmin.status}`);

    logger.info('  [PASS] Test 4: RBAC cross-role boundaries enforced with HTTP 403 across all roles');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 5: Citizen Resource Ownership Authorization
  // Citizen can access own application; blocked from accessing other citizens' records
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 5: Citizen Resource Ownership Verification ---');
  {
    // Create test application for another citizen (CZN-1002)
    await query(`
      INSERT INTO applications (
        application_id, citizen_id, service_code, workflow_code, workflow_version,
        scheme_name, status, academic_year, declared_income, student_id,
        income_certificate_no, account_reference, current_step, benefit_amount
      ) VALUES (
        'SCH-OTHER-CITIZEN', 'CZN-1002', 'HIGHER_EDU_SCHOLARSHIP', 'WF-SCHOLARSHIP-V1', '1.0.0',
        'Other Citizen Scheme', 'SUBMITTED', '2025-2026', 320000.00, 'STU-1002',
        'INC-5002', 'BANK-7002', 'APPLICATION_RECEIVED', 25000.00
      ) ON CONFLICT (application_id) DO NOTHING
    `);

    // 5a. Citizen CZN-1001 accessing own application (SCH-2026-001)
    const resOwn = await fetch(`${BASE_URL}/applications/SCH-2026-001`, {
      headers: { Authorization: `Bearer ${tokens.CITIZEN}` },
    });
    assert(resOwn.ok, `Citizen should access own application, got ${resOwn.status}`);

    // 5b. Citizen CZN-1001 attempting to access CZN-1002's application (SCH-OTHER-CITIZEN)
    const resOther = await fetch(`${BASE_URL}/applications/SCH-OTHER-CITIZEN`, {
      headers: { Authorization: `Bearer ${tokens.CITIZEN}` },
    });
    assert(resOther.status === 403, `Citizen accessing someone else's application should return 403, got ${resOther.status}`);
    const bodyOther = await resOther.json();
    assert(bodyOther.error.code === 'FORBIDDEN_OWNERSHIP', 'Expected FORBIDDEN_OWNERSHIP error code');

    // 5c. Admin can inspect any citizen application
    const resAdmin = await fetch(`${BASE_URL}/applications/SCH-OTHER-CITIZEN`, {
      headers: { Authorization: `Bearer ${tokens.ADMIN}` },
    });
    assert(resAdmin.ok, `Admin should be able to access any application, got ${resAdmin.status}`);

    logger.info('  [PASS] Test 5: Citizen resource ownership strictly enforced (own allowed, others blocked)');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 6: Citizen Consent Management (POST /api/applications/:id/consent)
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 6: Consent Lifecycle (Grant, Inspect, Revoke) ---');
  {
    const targetApp = 'SCH-2026-001';

    // 6a. Grant Consent via POST /api/applications/:id/consent
    const grantRes = await fetch(`${DIRECT_API_URL}/applications/${targetApp}/consent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.CITIZEN}`,
      },
      body: JSON.stringify({
        purpose: 'Scholarship eligibility verification',
        scope: ['Education verification', 'Income verification', 'Bank verification status'],
      }),
    });

    const grantBody = await grantRes.json();
    assert(grantRes.ok, `Grant consent failed: ${JSON.stringify(grantBody)}`);
    assert(grantBody.data.purpose === 'Scholarship eligibility verification', 'Purpose should match');
    assert(Array.isArray(grantBody.data.scope), 'Scope should be array');
    assert(grantBody.data.scope.length === 3, 'Scope should contain 3 requested data elements');
    assert(grantBody.data.status === 'GRANTED', 'Status should be GRANTED');
    assert(grantBody.data.granted_at, 'Consent must contain granted_at timestamp');
    assert(grantBody.data.revoked_at === null, 'Revoked at should be null initially');

    // 6b. Retrieve Consent via GET /api/applications/:id/consent
    const getRes = await fetch(`${DIRECT_API_URL}/applications/${targetApp}/consent`, {
      headers: { Authorization: `Bearer ${tokens.CITIZEN}` },
    });
    const getBody = await getRes.json();
    assert(getRes.ok, 'GET consent should return 200 OK');
    assert(getBody.data.status === 'GRANTED', 'Status should be GRANTED');

    // 6c. Revoke Consent via POST /api/applications/:id/consent/revoke
    const revokeRes = await fetch(`${DIRECT_API_URL}/applications/${targetApp}/consent/revoke`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokens.CITIZEN}` },
    });
    const revokeBody = await revokeRes.json();
    assert(revokeRes.ok, `Revoke consent failed: ${JSON.stringify(revokeBody)}`);
    assert(revokeBody.data.status === 'REVOKED', 'Status should be REVOKED');
    assert(revokeBody.data.revoked_at !== null, 'revoked_at timestamp must be set');

    // Restore consent for SCH-2026-001 so subsequent systems remain clean
    await fetch(`${DIRECT_API_URL}/applications/${targetApp}/consent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.CITIZEN}`,
      },
      body: JSON.stringify({
        purpose: 'Scholarship eligibility verification',
        scope: ['Education verification', 'Income verification', 'Bank verification status'],
      }),
    });

    logger.info('  [PASS] Test 6: Consent grant, scope validation, and revocation lifecycle verified');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 7: The workflow must NOT perform cross-department verification before required consent exists
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 7: Workflow Consent Enforcement (Blocked Cross-Department Verification) ---');
  {
    const TEST_APP = 'SCH-TEST-CONSENT-GUARD';

    // 1. Create a fresh test application without consent
    await query(`
      INSERT INTO applications (
        application_id, citizen_id, service_code, workflow_code, workflow_version,
        scheme_name, status, academic_year, declared_income, student_id,
        income_certificate_no, account_reference, current_step, benefit_amount
      ) VALUES (
        $1, 'CZN-1001', 'HIGHER_EDU_SCHOLARSHIP', 'WF-SCHOLARSHIP-V1', '1.0.0',
        'Consent Enforcement Scheme', 'SUBMITTED', '2025-2026', 180000.00, 'STU-1001',
        'INC-5001', 'BANK-7001', 'APPLICATION_RECEIVED', 25000.00
      ) ON CONFLICT (application_id) DO UPDATE SET status = 'SUBMITTED'
    `, [TEST_APP]);

    // Ensure NO consent exists for this application
    await query(`DELETE FROM consents WHERE application_id = $1`, [TEST_APP]);
    await WorkflowModel.resetSteps(TEST_APP);

    // 2. Start the workflow - Step 1 (Application Received) succeeds, but Step 2 (Education Verification) MUST fail
    const runRes = await fetch(`${BASE_URL}/workflows/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.ADMIN}`,
      },
      body: JSON.stringify({ applicationId: TEST_APP }),
    });

    const runBody = await runRes.json();
    const runData = runBody.data || runBody.error?.details || runBody.details || {};
    assert(runRes.status === 422, `Expected 422 execution result envelope, got ${runRes.status}`);
    assert(runData.status === 'FAILED', `Workflow must be marked FAILED without consent, got ${runData.status}`);

    // Verify Step 1 is SUCCESS
    const step1 = await WorkflowModel.getStepInstance(TEST_APP, 1);
    assert(step1.status === 'SUCCESS', `Step 1 should be SUCCESS, got ${step1?.status}`);

    // Verify Step 2 is FAILED due to CONSENT_REQUIRED
    const step2 = await WorkflowModel.getStepInstance(TEST_APP, 2);
    assert(step2.status === 'FAILED', `Step 2 should be FAILED, got ${step2?.status}`);
    assert(
      step2.error_details && step2.error_details.includes('consent'),
      `Error details should mention consent, got: ${step2?.error_details}`
    );

    // Verify audit log recorded CROSS_DEPT_VERIFICATION_BLOCKED
    const auditRes = await query(
      `SELECT * FROM audit_logs WHERE entity_id = $1 AND action = 'CROSS_DEPT_VERIFICATION_BLOCKED'`,
      [TEST_APP]
    );
    assert(auditRes.rows.length > 0, 'Audit log must record CROSS_DEPT_VERIFICATION_BLOCKED');

    // 3. Now GRANT consent for this application via POST /api/applications/:id/consent
    const grantRes = await fetch(`${DIRECT_API_URL}/applications/${TEST_APP}/consent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.CITIZEN}`,
      },
      body: JSON.stringify({
        purpose: 'Scholarship eligibility verification',
        scope: ['Education verification', 'Income verification', 'Bank verification status'],
      }),
    });
    assert(grantRes.ok, 'Granting consent should succeed');

    // 4. Resume workflow from failed step - it should now successfully execute cross-department verifications!
    const resumeRes = await fetch(`${BASE_URL}/workflows/resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.ADMIN}`,
      },
      body: JSON.stringify({ applicationId: TEST_APP }),
    });

    const resumeBody = await resumeRes.json();
    assert(resumeRes.ok, 'Resume should succeed');
    assert(resumeBody.data.status === 'SUCCESS', `Workflow should complete with SUCCESS after consent granted, got ${resumeBody.data.status}`);

    logger.info('  [PASS] Test 7: Cross-department verification strictly blocked until active consent is granted');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 8: Authorized Department Officer Queues
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 8: Authorized Departmental Officer Cases ---');
  {
    // 8a. Education Officer accessing Education Cases
    const eduRes = await fetch(`${BASE_URL}/officer/education/cases`, {
      headers: { Authorization: `Bearer ${tokens.EDUCATION_OFFICER}` },
    });
    const eduBody = await eduRes.json();
    assert(eduRes.ok, 'Education officer should access education cases');
    assert(eduBody.data.department === 'EDU', 'Department should be EDU');

    // 8b. Revenue Officer accessing Revenue Cases
    const revRes = await fetch(`${BASE_URL}/officer/revenue/cases`, {
      headers: { Authorization: `Bearer ${tokens.REVENUE_OFFICER}` },
    });
    const revBody = await revRes.json();
    assert(revRes.ok, 'Revenue officer should access revenue cases');
    assert(revBody.data.department === 'REV', 'Department should be REV');

    // 8c. Bank Officer accessing Bank Cases
    const bankRes = await fetch(`${BASE_URL}/officer/bank/cases`, {
      headers: { Authorization: `Bearer ${tokens.BANK_DBT_OFFICER}` },
    });
    const bankBody = await bankRes.json();
    assert(bankRes.ok, 'Bank officer should access bank cases');
    assert(bankBody.data.department === 'DBT', 'Department should be DBT');

    logger.info('  [PASS] Test 8: Departmental officers successfully access their designated queues');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 9: Admin Audit & Monitoring Operations
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 9: Admin Audit & Monitoring Telemetry ---');
  {
    // 9a. Admin audit logs
    const auditRes = await fetch(`${BASE_URL}/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${tokens.ADMIN}` },
    });
    const auditBody = await auditRes.json();
    assert(auditRes.ok, 'Admin should access audit logs');
    assert(Array.isArray(auditBody.data.logs), 'Audit logs should be an array');
    assert(auditBody.data.count > 0, 'Audit logs should contain records');

    // 9b. Admin monitoring metrics
    const monitorRes = await fetch(`${BASE_URL}/admin/monitoring`, {
      headers: { Authorization: `Bearer ${tokens.ADMIN}` },
    });
    const monitorBody = await monitorRes.json();
    assert(monitorRes.ok, 'Admin should access monitoring');
    assert(monitorBody.data.applications, 'Monitoring should include application stats');
    assert(monitorBody.data.workflowSteps, 'Monitoring should include workflow step stats');

    logger.info('  [PASS] Test 9: Admin audit trail and system monitoring telemetry verified');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 10: Citizen Timeline & Notifications Access
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 10: Citizen Timeline & Notification Feeds ---');
  {
    // 10a. Citizen notifications
    const notifRes = await fetch(`${BASE_URL}/citizen/notifications`, {
      headers: { Authorization: `Bearer ${tokens.CITIZEN}` },
    });
    const notifBody = await notifRes.json();
    assert(notifRes.ok, 'Citizen should access notifications');
    assert(notifBody.data.citizenId === 'CZN-1001', 'Notifications must match citizen ID');

    // 10b. Citizen timeline for own application
    const timelineRes = await fetch(`${BASE_URL}/citizen/applications/SCH-2026-001/timeline`, {
      headers: { Authorization: `Bearer ${tokens.CITIZEN}` },
    });
    const timelineBody = await timelineRes.json();
    assert(timelineRes.ok, 'Citizen should access own timeline');
    assert(timelineBody.data.applicationId === 'SCH-2026-001', 'Timeline must match application ID');

    logger.info('  [PASS] Test 10: Citizen timeline and personal notification feed verified');
    passedTests++;
  }

  logger.info('\n===========================================================');
  logger.info(`ALL ${passedTests} AUTH, RBAC & CONSENT TESTS PASSED SUCCESSFULLY!`);
  logger.info('===========================================================');
}

runTests().catch((err) => {
  logger.error('Test Suite Failed:', err);
  process.exit(1);
});
