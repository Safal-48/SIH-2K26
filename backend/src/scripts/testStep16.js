import assert from 'assert';
import logger from '../utils/logger.js';

const BASE_URL = 'http://localhost:5000/api';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runStep16Tests() {
  logger.info('===========================================================');
  logger.info('Starting Step 16: Interactive Demo Controls Verification');
  logger.info('===========================================================');

  // --- Authenticate Accounts ---
  logger.info('\n--- Authenticating Demo Accounts ---');
  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'demo123' }),
  });
  assert(adminLogin.ok, 'Admin login failed');
  const adminToken = adminLogin.data.data.token;
  logger.info('  [OK] Admin authenticated successfully');

  const citizenLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'citizen', password: 'demo123' }),
  });
  assert(citizenLogin.ok, 'Citizen login failed');
  const citizenToken = citizenLogin.data.data.token;
  logger.info('  [OK] Citizen authenticated successfully');

  // --- Test 1: RBAC on Demo Controls ---
  logger.info('\n--- Test 1: RBAC Authorization on Demo Control Endpoints ---');
  const unauthTest = await request('/admin/demo/status');
  assert.strictEqual(unauthTest.status, 401, 'Unauthenticated access must be blocked with 401');
  logger.info('  [OK] Unauthenticated access blocked with 401 Unauthorized');

  const citizenTest = await request('/admin/demo/status', {
    headers: { Authorization: `Bearer ${citizenToken}` },
  });
  assert.strictEqual(citizenTest.status, 403, 'Citizen role must be blocked with 403');
  logger.info('  [OK] Citizen role blocked with 403 Forbidden');

  const adminAuth = await request('/admin/demo/status', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(adminAuth.status, 200, 'Admin must be authorized with 200');
  logger.info('  [OK] Admin authorized successfully for demo controls');

  // --- Test 2: Control 1 - Run Full Success ---
  logger.info('\n--- Test 2: Control 1 - Run Full Success ---');
  const fullSuccess = await request('/admin/demo/full-success', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(fullSuccess.ok, `Run Full Success failed: ${JSON.stringify(fullSuccess.data)}`);
  assert.strictEqual(fullSuccess.data.data.status, 'SUCCESS', 'Status must be SUCCESS');
  assert.strictEqual(fullSuccess.data.data.stepsCount, 7, 'All 7 canonical steps must complete');
  logger.info(`  [OK] Application [${fullSuccess.data.data.applicationId}] completed all 7 steps with status: SUCCESS`);

  // --- Test 3: Control 2 - Fail Bank API ---
  logger.info('\n--- Test 3: Control 2 - Fail Bank API ---');
  const failBank = await request('/admin/demo/fail-bank', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(failBank.ok, `Fail Bank API failed: ${JSON.stringify(failBank.data)}`);
  assert.strictEqual(failBank.data.data.bankState.healthy, false, 'Bank state healthy must be false');
  assert.strictEqual(failBank.data.data.failedStep.step_identifier, 'BANK_VERIFICATION', 'Failed step must be BANK_VERIFICATION');
  assert.strictEqual(failBank.data.data.failedStep.status, 'QUEUED', 'Step status must be QUEUED');
  assert.strictEqual(failBank.data.data.retryable, true, 'Failure must be retryable');
  logger.info(`  [OK] Bank API failed deterministically with 503; step [${failBank.data.data.failedStep.step_identifier}] entered QUEUED state`);

  // --- Test 4: Control 3 - Recover Bank API ---
  logger.info('\n--- Test 4: Control 3 - Recover Bank API ---');
  const recoverBank = await request('/admin/demo/recover-bank', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(recoverBank.ok, `Recover Bank API failed: ${JSON.stringify(recoverBank.data)}`);
  assert.strictEqual(recoverBank.data.data.bankState.healthy, true, 'Bank state must be healthy');
  assert(recoverBank.data.data.resumedApplicationId, 'Queued application must be resumed');
  assert.strictEqual(recoverBank.data.data.workflowStatus, 'SUCCESS', 'Resumed workflow must complete with SUCCESS');
  logger.info(`  [OK] Bank API restored to HEALTHY; queued application [${recoverBank.data.data.resumedApplicationId}] resumed and completed with SUCCESS`);

  // --- Test 5: Control 4 - Slow Income API ---
  logger.info('\n--- Test 5: Control 4 - Slow Income API ---');
  const slowIncome = await request('/admin/demo/slow-income', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ delayMs: 1200 }),
  });
  assert(slowIncome.ok, `Slow Income API failed: ${JSON.stringify(slowIncome.data)}`);
  assert(slowIncome.data.data.actualMeasuredLatencyMs >= 1000, 'Measured latency must be at least 1000ms');
  assert.strictEqual(slowIncome.data.data.serviceHealth, 'DEGRADED', 'Service health must be DEGRADED in PostgreSQL');
  logger.info(`  [OK] Injected 1200ms delay into Income API. Actual measured latency: ${slowIncome.data.data.actualMeasuredLatencyMs}ms (persisted in PostgreSQL)`);

  // --- Test 6: Control 5 - Invalid Income ---
  logger.info('\n--- Test 6: Control 5 - Invalid Income ---');
  const invalidIncome = await request('/admin/demo/invalid-income', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(invalidIncome.ok, `Invalid Income failed: ${JSON.stringify(invalidIncome.data)}`);
  assert.strictEqual(invalidIncome.data.data.errorCode, 'CERTIFICATE_INVALID', 'Error code must be CERTIFICATE_INVALID');
  assert.strictEqual(invalidIncome.data.data.retryable, false, 'Invalid income must be non-retryable');
  assert.strictEqual(invalidIncome.data.data.failedStep.status, 'FAILED', 'Step status must be FAILED');
  logger.info(`  [OK] Income certificate rejected as invalid; workflow [${invalidIncome.data.data.applicationId}] cleanly routed to rejection`);

  // --- Test 7: Control 6 - Duplicate Application Detection ---
  logger.info('\n--- Test 7: Control 6 - Duplicate Application Detection ---');
  const duplicate = await request('/admin/demo/duplicate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(duplicate.status, 409, 'Duplicate application must return HTTP 409 Conflict');
  assert.strictEqual(duplicate.data.error.code, 'DUPLICATE_APPLICATION', 'Error code must be DUPLICATE_APPLICATION');
  assert(duplicate.data.error.details.existingApplicationId, 'Must cite existing application ID');
  logger.info(`  [OK] Duplicate application blocked with HTTP 409 Conflict [DUPLICATE_APPLICATION], citing [${duplicate.data.error.details.existingApplicationId}]`);

  // --- Test 8: Control 7 - Reset Demo ---
  logger.info('\n--- Test 8: Control 7 - Reset Demo ---');
  const resetDemo = await request('/admin/demo/reset', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(resetDemo.ok, `Reset Demo failed: ${JSON.stringify(resetDemo.data)}`);
  assert.strictEqual(resetDemo.data.data.mockState.bank.healthy, true, 'Bank state must be reset to healthy');
  assert.strictEqual(resetDemo.data.data.mockState.income.delayMs, 0, 'Income delay must be reset to 0');
  assert.strictEqual(resetDemo.data.data.mockState.income.invalid, false, 'Income invalid must be reset to false');
  logger.info('  [OK] Demo platform successfully restored to pristine, deterministic baseline state');

  logger.info('\n===========================================================');
  logger.info('STEP 16 COMPLETE: All 7 Demo Scenarios Verified & PASSED!');
  logger.info('===========================================================');
}

runStep16Tests()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error('Step 16 Test Suite Failed:', err);
    process.exit(1);
  });
