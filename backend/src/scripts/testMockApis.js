import logger from '../utils/logger.js';

const BASE_URL = 'http://localhost:5000';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const body = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, body };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runMockTests() {
  logger.info('===========================================================');
  logger.info('Starting Comprehensive Tests for Mock Departmental APIs');
  logger.info('===========================================================');

  let passedTests = 0;

  // --------------------------------------------------------------------------
  // TEST SUITE 1: EDUCATION VERIFICATION (/api/education/verify)
  // --------------------------------------------------------------------------
  logger.info('--- 1. Testing Education Verification Endpoint ---');

  // 1.1 Success case
  {
    const res = await request('/api/education/verify', {
      method: 'POST',
      body: JSON.stringify({
        citizen_id: 'CZN-1001',
        student_id: 'STU-1001',
        institution_code: 'COL-001',
      }),
    });

    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    assert(res.body.status === 'VERIFIED', `Expected status VERIFIED, got ${res.body.status}`);
    assert(res.body.student_id === 'STU-1001', `Expected student_id STU-1001`);
    assert(res.body.course === 'BCA', `Expected course BCA`);
    assert(res.body.institution === 'Demo Government College', `Expected institution Demo Government College`);
    assert(res.body.year === 2026, `Expected year 2026`);
    assert(res.body.verification_id === 'EDU-9001', `Expected verification_id EDU-9001`);
    logger.info('  [PASS] 1.1 Education Success Response matched exact PRD contract');
    passedTests++;
  }

  // 1.2 Validation Failure (Missing student_id)
  {
    const res = await request('/api/education/verify', {
      method: 'POST',
      body: JSON.stringify({
        citizen_id: 'CZN-1001',
      }),
    });

    assert(res.status === 400, `Expected 400 Bad Request, got ${res.status}`);
    assert(res.body.status === 'FAILED', `Expected status FAILED`);
    assert(res.body.error_code === 'VALIDATION_ERROR', `Expected VALIDATION_ERROR`);
    assert(res.body.retryable === false, `Expected retryable false for validation error`);
    assert(typeof res.body.correlation_id === 'string', `Expected correlation_id string`);
    logger.info('  [PASS] 1.2 Education Validation Failure handled with standard error contract');
    passedTests++;
  }

  // 1.3 Service Failure (503)
  {
    const res = await request('/api/education/verify', {
      method: 'POST',
      headers: { 'x-mock-mode': 'service_failure' },
      body: JSON.stringify({
        citizen_id: 'CZN-1001',
        student_id: 'STU-1001',
        institution_code: 'COL-001',
      }),
    });

    assert(res.status === 503, `Expected 503 Service Unavailable, got ${res.status}`);
    assert(res.body.status === 'FAILED', `Expected status FAILED`);
    assert(res.body.error_code === 'SERVICE_UNAVAILABLE', `Expected SERVICE_UNAVAILABLE`);
    assert(res.body.retryable === true, `Expected retryable true`);
    logger.info('  [PASS] 1.3 Education Service Failure (503, retryable) verified');
    passedTests++;
  }

  // 1.4 Timeout (504)
  {
    const res = await request('/api/education/verify', {
      method: 'POST',
      headers: { 'x-mock-mode': 'timeout' },
      body: JSON.stringify({
        citizen_id: 'CZN-1001',
        student_id: 'STU-1001',
        institution_code: 'COL-001',
      }),
    });

    assert(res.status === 504, `Expected 504 Gateway Timeout, got ${res.status}`);
    assert(res.body.status === 'FAILED', `Expected status FAILED`);
    assert(res.body.error_code === 'GATEWAY_TIMEOUT', `Expected GATEWAY_TIMEOUT`);
    assert(res.body.retryable === true, `Expected retryable true`);
    logger.info('  [PASS] 1.4 Education Timeout Failure (504, retryable) verified');
    passedTests++;
  }

  // 1.5 Retryable Failure (429 Rate limit)
  {
    const res = await request('/api/education/verify', {
      method: 'POST',
      headers: { 'x-mock-mode': 'retryable_failure' },
      body: JSON.stringify({
        citizen_id: 'CZN-1001',
        student_id: 'STU-1001',
        institution_code: 'COL-001',
      }),
    });

    assert(res.status === 429, `Expected 429 Too Many Requests, got ${res.status}`);
    assert(res.body.status === 'FAILED', `Expected status FAILED`);
    assert(res.body.retryable === true, `Expected retryable true`);
    logger.info('  [PASS] 1.5 Education Throttling / Retryable Failure verified');
    passedTests++;
  }

  // 1.6 Non-Retryable Failure (Record Not Found 404)
  {
    const res = await request('/api/education/verify', {
      method: 'POST',
      body: JSON.stringify({
        citizen_id: 'CZN-1001',
        student_id: 'STU-UNKNOWN-999',
        institution_code: 'COL-001',
      }),
    });

    assert(res.status === 404, `Expected 404 Not Found, got ${res.status}`);
    assert(res.body.status === 'FAILED', `Expected status FAILED`);
    assert(res.body.error_code === 'RECORD_NOT_FOUND', `Expected RECORD_NOT_FOUND`);
    assert(res.body.retryable === false, `Expected retryable false`);
    logger.info('  [PASS] 1.6 Education Non-Retryable Failure (404, retryable: false) verified');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 2: INCOME VERIFICATION (/api/income/verify)
  // --------------------------------------------------------------------------
  logger.info('--- 2. Testing Income Verification Endpoint ---');

  // 2.1 Success case
  {
    const res = await request('/api/income/verify', {
      method: 'POST',
      body: JSON.stringify({
        citizen_id: 'CZN-1001',
        income_certificate_no: 'INC-5001',
      }),
    });

    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    assert(res.body.status === 'VERIFIED', `Expected status VERIFIED`);
    assert(res.body.annual_income === 180000, `Expected annual_income 180000`);
    assert(res.body.income_category === 'LOW_INCOME', `Expected income_category LOW_INCOME`);
    assert(res.body.verification_id === 'INC-8001', `Expected verification_id INC-8001`);
    logger.info('  [PASS] 2.1 Income Success Response matched exact PRD contract');
    passedTests++;
  }

  // 2.2 Validation Failure
  {
    const res = await request('/api/income/verify', {
      method: 'POST',
      body: JSON.stringify({
        income_certificate_no: 'INC-5001',
      }),
    });

    assert(res.status === 400, `Expected 400 Bad Request`);
    assert(res.body.error_code === 'VALIDATION_ERROR');
    assert(res.body.retryable === false);
    logger.info('  [PASS] 2.2 Income Validation Failure handled properly');
    passedTests++;
  }

  // 2.3 Simulated Slow Response (Configured via Control Endpoint)
  {
    // Set 500ms delay
    await request('/api/income/control', {
      method: 'POST',
      body: JSON.stringify({ delayMs: 400 }),
    });

    const start = Date.now();
    const res = await request('/api/income/verify', {
      method: 'POST',
      body: JSON.stringify({
        citizen_id: 'CZN-1001',
        income_certificate_no: 'INC-5001',
      }),
    });
    const elapsed = Date.now() - start;

    assert(res.status === 200, `Expected 200 OK`);
    assert(elapsed >= 380, `Expected elapsed time >= 380ms, got ${elapsed}ms`);
    logger.info(`  [PASS] 2.3 Income Simulated Slow Response verified (response took ${elapsed}ms)`);
    passedTests++;

    // Reset delay back to 0
    await request('/api/income/control', {
      method: 'POST',
      body: JSON.stringify({ delayMs: 0 }),
    });
  }

  // 2.4 Non-Retryable Failure (Expired / Invalid Cert)
  {
    const res = await request('/api/income/verify', {
      method: 'POST',
      body: JSON.stringify({
        citizen_id: 'CZN-1001',
        income_certificate_no: 'INC-INVALID-99',
      }),
    });

    assert(res.status === 404, `Expected 404 Not Found`);
    assert(res.body.error_code === 'CERTIFICATE_INVALID');
    assert(res.body.retryable === false);
    logger.info('  [PASS] 2.4 Income Non-Retryable Failure (Invalid Certificate) verified');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 3: BANK / DBT VERIFICATION (/api/bank/verify)
  // --------------------------------------------------------------------------
  logger.info('--- 3. Testing Bank / DBT Verification Endpoint ---');

  // 3.1 Success case
  {
    const res = await request('/api/bank/verify', {
      method: 'POST',
      body: JSON.stringify({
        citizen_id: 'CZN-1001',
        account_reference: 'BANK-7001',
      }),
    });

    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    assert(res.body.status === 'VERIFIED', `Expected status VERIFIED`);
    assert(res.body.account_reference === 'BANK-7001', `Expected account_reference BANK-7001`);
    assert(res.body.account_holder_match === true, `Expected account_holder_match true`);
    assert(res.body.verification_id === 'BNK-3001', `Expected verification_id BNK-3001`);
    logger.info('  [PASS] 3.1 Bank Success Response matched exact PRD contract');
    passedTests++;
  }

  // 3.2 Validation Failure
  {
    const res = await request('/api/bank/verify', {
      method: 'POST',
      body: JSON.stringify({
        account_reference: 'BANK-7001',
      }),
    });

    assert(res.status === 400, `Expected 400 Bad Request`);
    assert(res.body.error_code === 'VALIDATION_ERROR');
    assert(res.body.retryable === false);
    logger.info('  [PASS] 3.2 Bank Validation Failure handled properly');
    passedTests++;
  }

  // 3.3 Controllable State: Healthy -> Failed -> Healthy
  {
    // Set Bank to Failed state
    logger.info('  Setting Bank API state to FAILED via /api/bank/control...');
    const controlRes = await request('/api/bank/control', {
      method: 'POST',
      body: JSON.stringify({
        healthy: false,
        errorCode: 'SERVICE_UNAVAILABLE',
        message: 'Department service temporarily unavailable',
        retryable: true,
        httpStatus: 503,
      }),
    });
    assert(controlRes.status === 200, 'Control endpoint failed');

    // Test that Bank Verification now returns 503 failure
    const failedRes = await request('/api/bank/verify', {
      method: 'POST',
      body: JSON.stringify({
        citizen_id: 'CZN-1001',
        account_reference: 'BANK-7001',
      }),
    });

    assert(failedRes.status === 503, `Expected 503 Service Unavailable, got ${failedRes.status}`);
    assert(failedRes.body.status === 'FAILED');
    assert(failedRes.body.error_code === 'SERVICE_UNAVAILABLE');
    assert(failedRes.body.message === 'Department service temporarily unavailable');
    assert(failedRes.body.retryable === true);
    assert(typeof failedRes.body.correlation_id === 'string');
    logger.info('  [PASS] 3.3.1 Bank API in FAILED state returned exact common error contract');

    // Restore Bank to Healthy state
    logger.info('  Restoring Bank API state to HEALTHY via /api/bank/control...');
    const restoreRes = await request('/api/bank/control', {
      method: 'POST',
      body: JSON.stringify({ healthy: true }),
    });
    assert(restoreRes.status === 200, 'Restore failed');

    // Test that Bank Verification is healthy again
    const healthyRes = await request('/api/bank/verify', {
      method: 'POST',
      body: JSON.stringify({
        citizen_id: 'CZN-1001',
        account_reference: 'BANK-7001',
      }),
    });

    assert(healthyRes.status === 200, `Expected 200 OK after restoring health`);
    assert(healthyRes.body.status === 'VERIFIED');
    logger.info('  [PASS] 3.3.2 Bank API restored to HEALTHY state and passed verification');
    passedTests += 2;
  }

  // 3.4 Non-Retryable Failure (Account holder mismatch)
  {
    const res = await request('/api/bank/verify', {
      method: 'POST',
      headers: { 'x-mock-mode': 'non_retryable_failure' },
      body: JSON.stringify({
        citizen_id: 'CZN-1001',
        account_reference: 'BANK-7001',
      }),
    });

    assert(res.status === 422, `Expected 422 Unprocessable Entity`);
    assert(res.body.status === 'FAILED');
    assert(res.body.retryable === false);
    logger.info('  [PASS] 3.4 Bank Non-Retryable Failure (Account mismatch) verified');
    passedTests++;
  }

  logger.info('===========================================================');
  logger.info(`All ${passedTests} Mock Department API Tests Passed Successfully!`);
  logger.info('===========================================================');
}

runMockTests().catch((err) => {
  logger.error('Mock Test Suite Failed:', err.message);
  console.error(err);
  process.exit(1);
});
