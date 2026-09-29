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

async function runStep15Tests() {
  logger.info('===========================================================');
  logger.info('Starting Step 15: Data Mapping & Service Registry Test Suite');
  logger.info('===========================================================');

  // --- Step 0: Authenticate Accounts ---
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

  // --- Test 1: RBAC on Service Registry & Data Mappings ---
  logger.info('\n--- Test 1: RBAC Authorization on Service Registry & Data Mappings ---');
  
  // 1a: Unauthenticated
  const unauthMappings = await request('/mappings');
  assert.strictEqual(unauthMappings.status, 401, 'Unauthenticated mappings must return 401');
  const unauthServices = await request('/services');
  assert.strictEqual(unauthServices.status, 401, 'Unauthenticated services must return 401');
  logger.info('  [OK] Unauthenticated access blocked with 401 Unauthorized');

  // 1b: Citizen role access blocked
  const citizenMappings = await request('/mappings', {
    headers: { Authorization: `Bearer ${citizenToken}` },
  });
  assert.strictEqual(citizenMappings.status, 403, 'Citizen mappings must return 403');
  const citizenServices = await request('/services', {
    headers: { Authorization: `Bearer ${citizenToken}` },
  });
  assert.strictEqual(citizenServices.status, 403, 'Citizen services must return 403');
  const citizenTest = await request('/services/SRV-EDU-01/test', {
    method: 'POST',
    headers: { Authorization: `Bearer ${citizenToken}` },
  });
  assert.strictEqual(citizenTest.status, 403, 'Citizen test endpoint must return 403');
  logger.info('  [OK] Citizen role blocked with 403 Forbidden across all endpoints');

  // 1c: Admin access allowed
  const adminMappings = await request('/mappings', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(adminMappings.status, 200, 'Admin mappings must return 200');
  const adminServices = await request('/services', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(adminServices.status, 200, 'Admin services must return 200');
  logger.info('  [OK] Admin authorized successfully for Service Registry & Data Mappings');

  // --- Test 2: Verify DATA MAPPINGS Data & Structure ---
  logger.info('\n--- Test 2: Verify DATA MAPPINGS Specification & Required Examples ---');
  const mappingItems = adminMappings.data.data;
  assert(Array.isArray(mappingItems), 'Mappings data must be an array');
  assert(mappingItems.length >= 6, `Expected at least 6 mappings, got ${mappingItems.length}`);
  logger.info(`  [OK] Loaded ${mappingItems.length} registered field data mappings from PostgreSQL`);

  // Verify prompt required examples exist
  const expectedExamples = [
    { sourceSystem: 'Education', sourceField: 'student_id', canonicalField: 'studentId', rule: 'direct' },
    { sourceSystem: 'Education', sourceField: 'status', canonicalField: 'status', rule: 'VERIFIED / NOT_VERIFIED' },
    { sourceSystem: 'Income', sourceField: 'annual_income', canonicalField: 'annualIncome', rule: 'number' },
    { sourceSystem: 'Income', sourceField: 'category', canonicalField: 'incomeCategory', rule: 'direct' },
    { sourceSystem: 'Bank', sourceField: 'holder_match', canonicalField: 'accountHolderMatch', rule: 'boolean' },
    { sourceSystem: 'Bank', sourceField: 'verification_id', canonicalField: 'verificationId', rule: 'direct' },
  ];

  for (const exp of expectedExamples) {
    const match = mappingItems.find(
      (m) =>
        m.sourceSystem.toLowerCase() === exp.sourceSystem.toLowerCase() &&
        m.sourceField.toLowerCase() === exp.sourceField.toLowerCase() &&
        m.canonicalField.toLowerCase() === exp.canonicalField.toLowerCase()
    );
    assert(match, `Missing required canonical mapping: ${exp.sourceSystem} | ${exp.sourceField} | ${exp.canonicalField}`);
    assert(
      match.transformationRule.toLowerCase().includes(exp.rule.toLowerCase().split(' ')[0]),
      `Rule mismatch for ${exp.sourceField}: expected ${exp.rule}, got ${match.transformationRule}`
    );
    logger.info(`    [VERIFIED] ${match.sourceSystem} | ${match.sourceField} -> ${match.canonicalField} [Rule: ${match.transformationRule}]`);
  }

  // --- Test 3: Test Interactive Transformation Engine ---
  logger.info('\n--- Test 3: Test Interactive Transformation Evaluation ---');
  const numTest = await request('/mappings/test', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ value: '₹ 1,80,000.00', rule: 'number' }),
  });
  assert(numTest.ok, 'Number transformation failed');
  assert.strictEqual(numTest.data.data.output, 180000, 'Number parse must equal 180000');
  logger.info(`  [OK] Number transform: "₹ 1,80,000.00" -> ${numTest.data.data.output} (${numTest.data.data.type})`);

  const boolTest = await request('/mappings/test', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ value: 'match', rule: 'boolean' }),
  });
  assert(boolTest.ok, 'Boolean transformation failed');
  assert.strictEqual(boolTest.data.data.output, true, 'Boolean parse must equal true');
  logger.info(`  [OK] Boolean transform: "match" -> ${boolTest.data.data.output} (${boolTest.data.data.type})`);

  // --- Test 4: Verify SERVICE REGISTRY Display Fields & Supported Connectors ---
  logger.info('\n--- Test 4: Verify SERVICE REGISTRY Display Fields & Connectors ---');
  const serviceItems = adminServices.data.data;
  assert(Array.isArray(serviceItems), 'Services data must be an array');
  assert(serviceItems.length >= 4, `Expected at least 4 services, got ${serviceItems.length}`);

  const requiredFields = ['service', 'department', 'connectorType', 'endpoint', 'health', 'responseTime', 'lastChecked'];
  for (const srv of serviceItems) {
    for (const f of requiredFields) {
      assert(srv[f] !== undefined && srv[f] !== null, `Service ${srv.serviceCode} missing field: ${f}`);
    }
    logger.info(`    [SERVICE] ${srv.serviceName} (${srv.serviceCode}) | Dept: ${srv.department} | Type: ${srv.connectorType} | Endpoint: ${srv.endpoint} | Health: ${srv.health} | Latency: ${srv.responseTime}ms`);
  }

  // Verify all 4 required connector types are present in registry
  const presentTypes = new Set(serviceItems.map((s) => s.connectorType.toUpperCase()));
  const requiredConnectorTypes = ['REST', 'LEGACY', 'MOCK', 'SANDBOX'];
  for (const t of requiredConnectorTypes) {
    assert(presentTypes.has(t), `Supported connector type "${t}" must be represented in Service Registry`);
    logger.info(`  [OK] Connector type verified in registry: [${t}]`);
  }

  // --- Test 5: Execute POST /api/services/:id/test (Backend Probe Execution & Telemetry) ---
  logger.info('\n--- Test 5: Execute POST /api/services/:id/test and Verify Backend Execution ---');
  
  // Test Education REST service
  const eduTest = await request('/services/SRV-EDU-01/test', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(eduTest.ok, `Education service test probe failed: ${JSON.stringify(eduTest.data)}`);
  assert(eduTest.data.data.responseTime > 0, 'Response time must be greater than 0ms');
  assert.strictEqual(eduTest.data.data.health, 'HEALTHY', 'Education service should be HEALTHY');
  logger.info(`  [OK] Education service tested successfully. Latency: ${eduTest.data.data.responseTime}ms, Health: ${eduTest.data.data.health}`);

  // Test Legacy connector service
  const legTest = await request('/services/SRV-LEG-01/test', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(legTest.ok, `Legacy service test probe failed: ${JSON.stringify(legTest.data)}`);
  assert.strictEqual(legTest.data.data.connectorType, 'LEGACY', 'Connector type must be LEGACY');
  logger.info(`  [OK] Legacy service tested successfully. Latency: ${legTest.data.data.responseTime}ms, Health: ${legTest.data.data.health}`);

  // --- Test 6: Verify Persistence in PostgreSQL ---
  logger.info('\n--- Test 6: Verify Persistence of Health & Response Time in PostgreSQL ---');
  const freshServices = await request('/services', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(freshServices.ok, 'Failed to re-fetch services');
  const persistedEdu = freshServices.data.data.find((s) => s.serviceCode === 'SRV-EDU-01');
  assert(persistedEdu, 'SRV-EDU-01 not found');
  assert.strictEqual(persistedEdu.responseTime, eduTest.data.data.responseTime, 'Persisted response time must match test result');
  assert.strictEqual(persistedEdu.health, 'HEALTHY', 'Persisted health must be HEALTHY');
  logger.info(`  [OK] Verified PostgreSQL persistence: SRV-EDU-01 response time = ${persistedEdu.responseTime}ms, health = ${persistedEdu.health}, lastChecked = ${persistedEdu.lastChecked}`);

  logger.info('\n===========================================================');
  logger.info('STEP 15 BACKEND VERIFICATION COMPLETE: All test cases PASSED!');
  logger.info('===========================================================');
}

runStep15Tests()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error('Step 15 Test Suite Failed:', err);
    process.exit(1);
  });
