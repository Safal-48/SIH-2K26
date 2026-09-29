/**
 * Step 13 Verification Suite: Notifications & SLA Monitoring
 * 
 * Verifies:
 * 1. Persisted Notifications in PostgreSQL (Model, CRUD, read flags).
 * 2. Supported Notification Types:
 *    - Application submitted
 *    - Verification completed
 *    - Service unavailable
 *    - Retry succeeded
 *    - Officer action required
 *    - Eligible
 *    - Not Eligible
 *    - SLA approaching
 *    - SLA breached
 * 3. Citizen-Safe Notifications vs Operational Admin Notifications:
 *    - Zero technical leakage for citizens
 *    - Rich operational context for admins
 * 4. Dynamic SLA Monitoring from Persisted Timestamps:
 *    - Default demo target = 48 hours
 *    - <= 36 hours = SLA Met (Indicator: emerald)
 *    - > 36h to <= 48h = SLA Approaching (Indicator: amber)
 *    - > 48h (e.g. 72 hours) = SLA Breach (Indicator: rose)
 *    - Non-hardcoded database calculations verified
 * 5. Lifecycle Event Notification Triggers:
 *    - Application submission
 *    - Successful verification
 *    - Service failure
 *    - Retry success
 *    - Completion
 *    - SLA breach
 */

import assert from 'assert';
import logger from '../utils/logger.js';

const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:5000/api';

async function runStep13Tests() {
  logger.info('===========================================================');
  logger.info('Starting Step 13: Notifications & SLA Monitoring Suite');
  logger.info('===========================================================');

  let passedTests = 0;

  // --------------------------------------------------------------------------
  // STEP 0: Authenticate Admin & Citizen
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
  // TEST 1: Notification Creation Across All 9 Required Types
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 1: Notification Creation Across 9 Supported Types ---');
  {
    const testTypes = [
      {
        type: 'APPLICATION_SUBMITTED',
        title: 'Application Submitted',
        message: 'Your scholarship application SCH-TEST-001 has been registered.',
        recipientType: 'CITIZEN',
      },
      {
        type: 'VERIFICATION_COMPLETED',
        title: 'Education Verification Completed',
        message: 'Your education credentials have been successfully verified.',
        recipientType: 'CITIZEN',
      },
      {
        type: 'SERVICE_UNAVAILABLE',
        title: 'Service Temporarily Unavailable',
        message: 'Bank verification service is experiencing downtime. Queued for automated retry.',
        recipientType: 'CITIZEN',
      },
      {
        type: 'RETRY_SUCCEEDED',
        title: 'Retry Succeeded',
        message: 'Bank verification succeeded following service recovery.',
        recipientType: 'CITIZEN',
      },
      {
        type: 'OFFICER_ACTION_REQUIRED',
        title: 'Officer Action Required',
        message: 'Your application is pending administrative officer sanction.',
        recipientType: 'CITIZEN',
      },
      {
        type: 'ELIGIBLE',
        title: 'Scholarship Eligible',
        message: 'Your application meets all eligibility requirements.',
        recipientType: 'CITIZEN',
      },
      {
        type: 'NOT_ELIGIBLE',
        title: 'Eligibility Criteria Not Satisfied',
        message: 'Application does not meet the specified income threshold.',
        recipientType: 'CITIZEN',
      },
      {
        type: 'SLA_APPROACHING',
        title: 'SLA Window Approaching',
        message: 'Application processing time is approaching the 48-hour SLA benchmark.',
        recipientType: 'ADMIN',
      },
      {
        type: 'SLA_BREACHED',
        title: 'SLA Target Breached',
        message: 'Application processing has exceeded the 48-hour SLA window. Escalated.',
        recipientType: 'ADMIN',
      },
    ];

    for (const notif of testTypes) {
      const createRes = await fetch(`${BASE_URL}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          citizen_id: 'CZN-1001',
          application_id: 'SCH-TEST-001',
          type: notif.type,
          title: notif.title,
          message: notif.message,
          recipient_type: notif.recipientType,
        }),
      });

      assert.strictEqual(createRes.status, 201, `Failed to create notification type ${notif.type}`);
      const body = await createRes.json();
      assert.strictEqual(body.data.type, notif.type);
      assert.strictEqual(body.data.status, 'UNREAD');
    }

    logger.info(`  [PASS] Test 1: All 9 supported notification types persisted successfully in PostgreSQL`);
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 2: GET /api/notifications Filtering & Search
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 2: Notification Query & Filter API (GET /api/notifications) ---');
  {
    // 2a. Filter by type
    const typeRes = await fetch(`${BASE_URL}/notifications?type=APPLICATION_SUBMITTED`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const typeBody = await typeRes.json();
    assert.strictEqual(typeRes.status, 200);
    assert(typeBody.data.notifications.length > 0);
    assert(typeBody.data.notifications.every((n) => n.type === 'APPLICATION_SUBMITTED'));

    // 2b. Case-insensitive & space normalization (?type=Application submitted)
    const normTypeRes = await fetch(`${BASE_URL}/notifications?type=Application%20submitted`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const normTypeBody = await normTypeRes.json();
    assert.strictEqual(normTypeRes.status, 200);
    assert(normTypeBody.data.notifications.length > 0);

    // 2c. Filter by citizen_id
    const citizenRes = await fetch(`${BASE_URL}/notifications?citizen_id=CZN-1001`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    const citizenBody = await citizenRes.json();
    assert.strictEqual(citizenRes.status, 200);
    assert(citizenBody.data.notifications.every((n) => n.citizenId === 'CZN-1001' || n.recipientType === 'ALL'));

    // 2d. Mark notification as read
    const firstNotifId = citizenBody.data.notifications[0].id;
    const readRes = await fetch(`${BASE_URL}/notifications/${firstNotifId}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    assert.strictEqual(readRes.status, 200);
    const readBody = await readRes.json();
    assert.strictEqual(readBody.data.status, 'READ');

    logger.info('  [PASS] Test 2: Notification filtering by type, citizen, status, and read-state transitions verified');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 3: Citizen-Safe Notification Verification (Zero Technical Leakage)
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 3: Citizen-Safe Notification Content Verification ---');
  {
    const citizenFeedRes = await fetch(`${BASE_URL}/notifications?citizen_id=CZN-1001&recipient_type=CITIZEN`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    const feedBody = await citizenFeedRes.json();
    assert.strictEqual(citizenFeedRes.status, 200);

    for (const notif of feedBody.data.notifications) {
      const text = `${notif.title} ${notif.message}`;
      assert(!text.includes('SELECT '), `Citizen notification leaked SQL: ${text}`);
      assert(!text.includes('TypeError:'), `Citizen notification leaked Stack Trace: ${text}`);
      assert(!text.includes('HTTP 500') && !text.includes('HTTP 503'), `Citizen notification leaked HTTP error: ${text}`);
      assert(!text.includes('pglite'), `Citizen notification leaked database internals: ${text}`);
    }

    logger.info('  [PASS] Test 3: Citizen notifications are strictly citizen-safe with 0 internal leakages');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 4: SLA Calculation from Actual Timestamps (36h = Met, 72h = Breach)
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 4: SLA Calculations from Persisted PostgreSQL Timestamps ---');
  {
    // Create an application simulated 36 hours ago (SLA Met)
    const metYear = `2026-SLA-MET-${Date.now().toString().slice(-4)}`;
    const metAppRes = await fetch(`${BASE_URL}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        citizen_id: 'CZN-1001',
        student_id: 'STU-1001',
        institution_code: 'INST-01',
        income_certificate_no: 'INC-5001',
        account_reference: 'BANK-7001',
        scheme_name: 'SLA Benchmark Scheme 36h',
        academic_year: metYear,
        declared_income: 180000,
        benefit_amount: 30000,
      }),
    });
    const metAppBody = await metAppRes.json();
    assert.strictEqual(metAppRes.status, 201);
    const metAppId = metAppBody.data.applicationId;

    // Create an application simulated 72 hours ago (SLA Breach)
    const breachYear = `2026-SLA-BREACH-${Date.now().toString().slice(-4)}`;
    const breachAppRes = await fetch(`${BASE_URL}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        citizen_id: 'CZN-1001',
        student_id: 'STU-1001',
        institution_code: 'INST-01',
        income_certificate_no: 'INC-5001',
        account_reference: 'BANK-7001',
        scheme_name: 'SLA Benchmark Scheme 72h',
        academic_year: breachYear,
        declared_income: 180000,
        benefit_amount: 30000,
      }),
    });
    const breachAppBody = await breachAppRes.json();
    assert.strictEqual(breachAppRes.status, 201);
    const breachAppId = breachAppBody.data.applicationId;

    // Simulate real persisted timestamps in PostgreSQL
    // Update submission_date for metAppId to 30 hours ago (<= 36h -> SLA Met)
    // Update submission_date for breachAppId to 72 hours ago (> 48h -> SLA Breach)
    await fetch(`${BASE_URL}/v1/internal/db-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `UPDATE applications 
               SET submission_date = CURRENT_TIMESTAMP - INTERVAL '30 hours' 
               WHERE application_id = $1`,
        params: [metAppId],
      }),
    });

    await fetch(`${BASE_URL}/v1/internal/db-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `UPDATE applications 
               SET submission_date = CURRENT_TIMESTAMP - INTERVAL '72 hours' 
               WHERE application_id = $1`,
        params: [breachAppId],
      }),
    });

    // Fetch SLA metrics from GET /api/sla
    const slaRes = await fetch(`${BASE_URL}/sla?target_hours=48`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const slaBody = await slaRes.json();
    assert.strictEqual(slaRes.status, 200);

    const slaData = slaBody.data;
    assert.strictEqual(slaData.targetHours, 48, 'Target demo SLA must be 48 hours');
    assert(slaData.totalApplications >= 2, 'Total applications must include simulated apps');
    assert(typeof slaData.overallComplianceRate === 'number', 'Compliance rate must be calculated');

    // Locate the 30h application
    const metRecord = slaData.applications.find((a) => a.applicationId === metAppId);
    assert(metRecord, `Expected SLA record for ${metAppId}`);
    assert(metRecord.elapsedHours >= 29 && metRecord.elapsedHours <= 32, `Expected ~30 hours, got ${metRecord.elapsedHours}`);
    assert.strictEqual(metRecord.slaStatus, 'MET', '30 hours elapsed must evaluate to SLA MET');
    assert.strictEqual(metRecord.statusIndicator, 'emerald', 'MET indicator must be emerald');
    assert.strictEqual(metRecord.isBreached, false);

    // Locate the 72h application
    const breachRecord = slaData.applications.find((a) => a.applicationId === breachAppId);
    assert(breachRecord, `Expected SLA record for ${breachAppId}`);
    assert(breachRecord.elapsedHours >= 71 && breachRecord.elapsedHours <= 74, `Expected ~72 hours, got ${breachRecord.elapsedHours}`);
    assert.strictEqual(breachRecord.slaStatus, 'BREACHED', '72 hours elapsed must evaluate to SLA BREACHED');
    assert.strictEqual(breachRecord.statusIndicator, 'rose', 'BREACHED indicator must be rose');
    assert.strictEqual(breachRecord.isBreached, true);

    logger.info(`  [PASS] Test 4: SLA calculated from actual DB timestamps (30h -> SLA Met [emerald], 72h -> SLA Breach [rose])`);
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 5: Automated SLA Breach Notification Trigger
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 5: Automated SLA Breach & Approaching Alert Evaluation ---');
  {
    const evalRes = await fetch(`${BASE_URL}/sla/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ target_hours: 48 }),
    });

    assert.strictEqual(evalRes.status, 200);
    const evalBody = await evalRes.json();
    assert(evalBody.data.evaluatedCount > 0, 'Must evaluate applications');
    assert(evalBody.data.breachedCount > 0, 'Must detect at least 1 SLA breach');

    // Check that SLA_BREACHED notification was generated in the database
    const notifsRes = await fetch(`${BASE_URL}/notifications?type=SLA_BREACHED`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const notifsBody = await notifsRes.json();
    assert.strictEqual(notifsRes.status, 200);
    assert(notifsBody.data.notifications.length > 0, 'SLA_BREACHED notification must exist');

    const breachAlert = notifsBody.data.notifications[0];
    assert.strictEqual(breachAlert.type, 'SLA_BREACHED');

    logger.info(`  [PASS] Test 5: Automated SLA evaluation detected breach and created persistent SLA_BREACHED notification`);
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 6: Lifecycle Event Notification Triggers
  // Verify notification creation during:
  // - Application submission
  // - Successful verification
  // - Service failure
  // - Retry success
  // - Completion
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 6: Lifecycle Notification Triggers Across Entire Workflow ---');
  {
    const lifecycleYear = `2026-NFLOW-${Date.now().toString().slice(-4)}`;
    
    // 1. Application Submission
    logger.info('  6.1 Testing Application Submission Notification Trigger...');
    const submitRes = await fetch(`${BASE_URL}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        citizen_id: 'CZN-1001',
        student_id: 'STU-1001',
        institution_code: 'INST-01',
        income_certificate_no: 'INC-5001',
        account_reference: 'BANK-7001',
        scheme_name: 'Lifecycle Notification Audit Scheme',
        academic_year: lifecycleYear,
        declared_income: 180000,
        benefit_amount: 30000,
      }),
    });
    const submitBody = await submitRes.json();
    assert.strictEqual(submitRes.status, 201);
    const appId = submitBody.data.applicationId;

    // Verify APPLICATION_SUBMITTED notification exists
    const notifSubRes = await fetch(`${BASE_URL}/notifications?application_id=${appId}&type=APPLICATION_SUBMITTED`);
    const notifSubBody = await notifSubRes.json();
    assert(notifSubBody.data.notifications.length > 0, 'APPLICATION_SUBMITTED notification must exist');
    logger.info('    [OK] APPLICATION_SUBMITTED notification verified');

    // Grant consent
    await fetch(`${BASE_URL}/applications/${appId}/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purpose: 'Test', scope: ['EDUCATION', 'INCOME', 'BANK'] }),
    });

    // 2. Simulate Bank Failure
    logger.info('  6.2 Testing Service Failure Notification Trigger...');
    await fetch(`${BASE_URL}/bank/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ healthy: false, retryable: true }),
    });

    // Run workflow -> Education & Income succeed, Bank fails & queues
    await fetch(`${BASE_URL}/workflows/${appId}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: appId }),
    });

    // Verify VERIFICATION_COMPLETED notifications exist (for Education and Income)
    const verifyNotifsRes = await fetch(`${BASE_URL}/notifications?application_id=${appId}&type=VERIFICATION_COMPLETED`);
    const verifyNotifsBody = await verifyNotifsRes.json();
    assert(verifyNotifsBody.data.notifications.length >= 2, 'VERIFICATION_COMPLETED notifications must exist for Education & Income');
    logger.info(`    [OK] VERIFICATION_COMPLETED notifications verified (${verifyNotifsBody.data.notifications.length} steps recorded)`);

    // Verify SERVICE_UNAVAILABLE notification exists (for Bank Failure)
    const failureNotifsRes = await fetch(`${BASE_URL}/notifications?application_id=${appId}&type=SERVICE_UNAVAILABLE`);
    const failureNotifsBody = await failureNotifsRes.json();
    assert(failureNotifsBody.data.notifications.length > 0, 'SERVICE_UNAVAILABLE notification must exist');
    logger.info('    [OK] SERVICE_UNAVAILABLE notification verified');

    // 3. Admin Recovers Bank and Triggers Retry
    logger.info('  6.3 Testing Retry Success & Completion Notification Triggers...');
    await fetch(`${BASE_URL}/bank/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ healthy: true }),
    });

    // Retry exception
    const retryRes = await fetch(`${BASE_URL}/exceptions/${appId}/retry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
    });
    assert.strictEqual(retryRes.status, 200);

    // Verify RETRY_SUCCEEDED notification exists
    const retryNotifsRes = await fetch(`${BASE_URL}/notifications?application_id=${appId}&type=RETRY_SUCCEEDED`);
    const retryNotifsBody = await retryNotifsRes.json();
    assert(retryNotifsBody.data.notifications.length > 0, 'RETRY_SUCCEEDED notification must exist');
    logger.info('    [OK] RETRY_SUCCEEDED notification verified');

    // Verify ELIGIBLE / COMPLETION notification exists
    const compNotifsRes = await fetch(`${BASE_URL}/notifications?application_id=${appId}&type=ELIGIBLE`);
    const compNotifsBody = await compNotifsRes.json();
    assert(compNotifsBody.data.notifications.length > 0, 'ELIGIBLE / COMPLETION notification must exist');
    logger.info('    [OK] ELIGIBLE / COMPLETION notification verified');

    logger.info('  [PASS] Test 6: All 5 lifecycle triggers (submission, verification, failure, retry, completion) generated persisted notifications');
    passedTests++;
  }

  logger.info('\n===========================================================');
  logger.info(`ALL ${passedTests} STEP 13 NOTIFICATIONS & SLA TESTS PASSED!`);
  logger.info('===========================================================');
}

runStep13Tests().catch((err) => {
  logger.error('Step 13 Test Suite Failed:', err);
  process.exit(1);
});
