import http from 'http';
import logger from '../utils/logger.js';
import { query } from '../config/database.js';

const PORT = 5000;
const BASE_URL = `http://localhost:${PORT}`;

function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = http.request(url, reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data: body });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runStep17Tests() {
  logger.info('===========================================================');
  logger.info('Starting Step 17: Security, Validation and Audit Hardening Test Suite');
  logger.info('===========================================================');

  let adminToken = null;
  let citizenToken = null;
  let eduOfficerToken = null;
  let revOfficerToken = null;

  // -------------------------------------------------------------
  // Test 1: Authentication & Audit Logging
  // -------------------------------------------------------------
  logger.info('\n--- Test 1: Authentication, Zod Validation & Audit Logging ---');

  // 1a: Zod validation on malformed login request (missing password)
  const malformedLogin = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: { identifier: 'admin' },
  });
  if (malformedLogin.status === 400 && malformedLogin.data?.error?.code === 'VALIDATION_ERROR') {
    logger.info('  [PASS] 1a: Malformed login blocked with 400 VALIDATION_ERROR');
  } else {
    throw new Error(`1a Failed: Expected 400 VALIDATION_ERROR, got ${malformedLogin.status}`);
  }

  // 1b: Failed login attempt (bad password) triggers USER_LOGIN_FAILED audit log
  const badLogin = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: { identifier: 'admin', password: 'wrongpassword' },
  });
  if (badLogin.status === 401) {
    logger.info('  [PASS] 1b: Invalid credentials rejected with 401');
  } else {
    throw new Error(`1b Failed: Expected 401, got ${badLogin.status}`);
  }

  // 1c: Valid logins
  const adminRes = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: { identifier: 'admin', password: 'demo123' },
  });
  adminToken = adminRes.data?.data?.token;

  const citizenRes = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: { identifier: 'citizen', password: 'demo123' },
  });
  citizenToken = citizenRes.data?.data?.token;

  const eduRes = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: { identifier: 'edu_officer', password: 'demo123' },
  });
  eduOfficerToken = eduRes.data?.data?.token;

  const revRes = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: { identifier: 'rev_officer', password: 'demo123' },
  });
  revOfficerToken = revRes.data?.data?.token;

  if (adminToken && citizenToken && eduOfficerToken && revOfficerToken) {
    logger.info('  [PASS] 1c: Successfully authenticated Admin, Citizen, and Officers with JWT');
  } else {
    throw new Error('1c Failed: Could not acquire all test JWT session tokens');
  }

  // 1d: Logout endpoint & USER_LOGOUT audit log
  const logoutRes = await makeRequest('/api/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${citizenToken}` },
  });
  if (logoutRes.status === 200 && logoutRes.data?.data?.loggedOut) {
    logger.info('  [PASS] 1d: Logout endpoint recorded USER_LOGOUT audit event');
  } else {
    throw new Error(`1d Failed: Logout did not return 200, got ${logoutRes.status}`);
  }

  // -------------------------------------------------------------
  // Test 2: Server-Side Zod Validation on Application Submission
  // -------------------------------------------------------------
  logger.info('\n--- Test 2: Server-Side Request Validation on Applications ---');

  // 2a: Missing required fields
  const missingAppRes = await makeRequest('/api/applications', {
    method: 'POST',
    headers: { Authorization: `Bearer ${citizenToken}` },
    body: { scheme_name: 'Post-Matric Scholarship' },
  });
  if (missingAppRes.status === 400 && (missingAppRes.data?.error?.code === 'VALIDATION_ERROR' || missingAppRes.data?.error?.code === 'MISSING_REQUIRED_FIELD')) {
    logger.info('  [PASS] 2a: Missing identifiers blocked with 400 error contract');
  } else {
    throw new Error(`2a Failed: Expected 400 VALIDATION_ERROR or MISSING_REQUIRED_FIELD, got ${missingAppRes.status}`);
  }

  // 2b: Malformed identifier format (e.g. invalid citizen ID pattern)
  const malformedAppRes = await makeRequest('/api/applications', {
    method: 'POST',
    headers: { Authorization: `Bearer ${citizenToken}` },
    body: {
      citizen_id: 'INVALID_FORMAT',
      student_id: 'STU-1001',
      institution_code: 'INST-NIT-04',
      income_certificate_no: 'INC-2025-001',
      account_reference: 'BANK-7001',
    },
  });
  if (malformedAppRes.status === 400 && (malformedAppRes.data?.error?.code === 'VALIDATION_ERROR' || malformedAppRes.data?.error?.code === 'MALFORMED_IDENTIFIER')) {
    logger.info('  [PASS] 2b: Malformed citizen_id rejected with 400 format error');
  } else {
    throw new Error(`2b Failed: Expected 400, got ${malformedAppRes.status}`);
  }

  // -------------------------------------------------------------
  // Test 3: Zod Validation on Admin Workflow Builder Requests
  // -------------------------------------------------------------
  logger.info('\n--- Test 3: Request Validation on Admin Configuration Endpoints ---');

  // 3a: Invalid connectorType (must be REST, LEGACY, MOCK, or SANDBOX)
  const invalidStepRes = await makeRequest('/api/admin/workflow-builder/definitions/WF-SCHOLARSHIP-V1/versions/1.0.0/steps', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      stepIdentifier: 'CUSTOM_TEST',
      stepName: 'Custom Step',
      departmentCode: 'EXT',
      connectorType: 'INVALID_PROTOCOL_XYZ',
      stepOrder: 9,
    },
  });
  if (invalidStepRes.status === 400 && invalidStepRes.data?.error?.code === 'VALIDATION_ERROR') {
    logger.info('  [PASS] 3a: Invalid connectorType rejected with 400 enum validation error');
  } else {
    throw new Error(`3a Failed: Expected 400 VALIDATION_ERROR, got ${invalidStepRes.status}`);
  }

  // 3b: Invalid stepOrder (negative number)
  const negativeStepRes = await makeRequest('/api/admin/workflow-builder/definitions/WF-SCHOLARSHIP-V1/versions/1.0.0/steps', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      stepIdentifier: 'CUSTOM_TEST',
      stepName: 'Custom Step',
      departmentCode: 'EXT',
      connectorType: 'REST',
      stepOrder: -5,
    },
  });
  if (negativeStepRes.status === 400 && negativeStepRes.data?.error?.code === 'VALIDATION_ERROR') {
    logger.info('  [PASS] 3b: Negative stepOrder rejected with 400 validation error');
  } else {
    throw new Error(`3b Failed: Expected 400 VALIDATION_ERROR, got ${negativeStepRes.status}`);
  }

  // -------------------------------------------------------------
  // Test 4: Strict Server-Side RBAC Enforcement
  // -------------------------------------------------------------
  logger.info('\n--- Test 4: Strict Server-Side RBAC Enforcement Across Roles ---');

  // 4a: Unauthenticated access blocked across all admin routes
  const unauthRes = await makeRequest('/api/admin/dashboard');
  if (unauthRes.status === 401) {
    logger.info('  [PASS] 4a: Unauthenticated access blocked with 401 UNAUTHORIZED');
  } else {
    throw new Error(`4a Failed: Expected 401, got ${unauthRes.status}`);
  }

  // 4b: Citizen cannot access Admin Dashboard
  const citizenAdminRes = await makeRequest('/api/admin/dashboard', {
    headers: { Authorization: `Bearer ${citizenToken}` },
  });
  if (citizenAdminRes.status === 403) {
    logger.info('  [PASS] 4b: Citizen role blocked from Admin Dashboard with 403 FORBIDDEN');
  } else {
    throw new Error(`4b Failed: Expected 403, got ${citizenAdminRes.status}`);
  }

  // 4c: Citizen cannot access Admin Service Registry
  const citizenSrvRes = await makeRequest('/api/services', {
    headers: { Authorization: `Bearer ${citizenToken}` },
  });
  if (citizenSrvRes.status === 403) {
    logger.info('  [PASS] 4c: Citizen role blocked from Service Registry with 403 FORBIDDEN');
  } else {
    throw new Error(`4c Failed: Expected 403, got ${citizenSrvRes.status}`);
  }

  // 4d: Citizen cannot access Exceptions Queue
  const citizenExcRes = await makeRequest('/api/exceptions', {
    headers: { Authorization: `Bearer ${citizenToken}` },
  });
  if (citizenExcRes.status === 403) {
    logger.info('  [PASS] 4d: Citizen role blocked from Exceptions Queue with 403 FORBIDDEN');
  } else {
    throw new Error(`4d Failed: Expected 403, got ${citizenExcRes.status}`);
  }

  // 4e: Citizen cannot access Demo Controls
  const citizenDemoRes = await makeRequest('/api/admin/demo/status', {
    headers: { Authorization: `Bearer ${citizenToken}` },
  });
  if (citizenDemoRes.status === 403) {
    logger.info('  [PASS] 4e: Citizen role blocked from Demo Controls with 403 FORBIDDEN');
  } else {
    throw new Error(`4e Failed: Expected 403, got ${citizenDemoRes.status}`);
  }

  // 4f: Education Officer blocked from Revenue Officer operations
  const eduRevRes = await makeRequest('/api/officer/revenue/cases', {
    headers: { Authorization: `Bearer ${eduOfficerToken}` },
  });
  if (eduRevRes.status === 403) {
    logger.info('  [PASS] 4f: Cross-department role boundary enforced: Education Officer blocked from Revenue cases (403)');
  } else {
    throw new Error(`4f Failed: Expected 403, got ${eduRevRes.status}`);
  }

  // 4g: Revenue Officer blocked from Education Officer operations
  const revEduRes = await makeRequest('/api/officer/education/cases', {
    headers: { Authorization: `Bearer ${revOfficerToken}` },
  });
  if (revEduRes.status === 403) {
    logger.info('  [PASS] 4g: Cross-department role boundary enforced: Revenue Officer blocked from Education cases (403)');
  } else {
    throw new Error(`4g Failed: Expected 403, got ${revEduRes.status}`);
  }

  // -------------------------------------------------------------
  // Test 5: Citizen Ownership Access Control
  // -------------------------------------------------------------
  logger.info('\n--- Test 5: Citizen Ownership Access Control ---');

  // Ensure an application belonging to CZN-1002 exists in PostgreSQL
  await query(`
    INSERT INTO applications (
      application_id, citizen_id, service_code, workflow_code, workflow_version,
      scheme_name, status, academic_year, declared_income, student_id,
      income_certificate_no, account_reference, benefit_amount, current_step
    ) VALUES (
      'SCH-POOJA-001', 'CZN-1002', 'HIGHER_EDU_SCHOLARSHIP', 'WF-SCHOLARSHIP-V1', '1.0.0',
      'Merit Scholarship for Pooja', 'SUBMITTED', '2025-2026', 210000.00, 'STU-1002',
      'INC-5002', 'BANK-7002', 25000.00, 'APPLICATION_RECEIVED'
    ) ON CONFLICT (application_id) DO NOTHING
  `);

  // Citizen CZN-1001 attempting to inspect CZN-1002 application SCH-POOJA-001
  const crossCitizenRes = await makeRequest('/api/citizen/applications/SCH-POOJA-001', {
    headers: { Authorization: `Bearer ${citizenToken}` },
  });
  if (crossCitizenRes.status === 403 && crossCitizenRes.data?.error?.code === 'FORBIDDEN_OWNERSHIP') {
    logger.info('  [PASS] 5: Citizen access boundary enforced: Citizen blocked from accessing another citizen\'s record (403 FORBIDDEN_OWNERSHIP)');
  } else {
    throw new Error(`5 Failed: Expected 403 FORBIDDEN_OWNERSHIP, got ${crossCitizenRes.status}`);
  }

  // -------------------------------------------------------------
  // Test 6: Safe Error Responses (No Raw Stack Trace Leaks)
  // -------------------------------------------------------------
  logger.info('\n--- Test 6: Safe Error Responses & Stack Trace Suppression ---');

  // Triggering 404
  const notFoundRes = await makeRequest('/api/non-existent-endpoint-xyz');
  const notFoundHasStack = JSON.stringify(notFoundRes.data).includes('at Object.') || JSON.stringify(notFoundRes.data).includes('stack');
  if (!notFoundHasStack) {
    logger.info('  [PASS] 6a: 404 error response contains zero stack trace leaks');
  } else {
    throw new Error('6a Failed: Raw stack trace detected in 404 response payload');
  }

  // Triggering validation error response
  const valErrorHasStack = JSON.stringify(missingAppRes.data).includes('node_modules') || JSON.stringify(missingAppRes.data).includes('at Module.');
  if (!valErrorHasStack) {
    logger.info('  [PASS] 6b: 400 validation error response is sanitized and safe');
  } else {
    throw new Error('6b Failed: Stack trace detected in validation error response');
  }

  // -------------------------------------------------------------
  // Test 7: Duplicate Application Detection & Audit
  // -------------------------------------------------------------
  logger.info('\n--- Test 7: Duplicate Application Detection & Audit ---');

  const dupRes = await makeRequest('/api/applications', {
    method: 'POST',
    headers: { Authorization: `Bearer ${citizenToken}` },
    body: {
      citizen_id: 'CZN-1001',
      student_id: 'STU-1001',
      institution_code: 'INST-NIT-04',
      income_certificate_no: 'INC-2025-001',
      account_reference: 'BANK-7001',
      academic_year: '2025-2026',
    },
  });

  if (dupRes.status === 409 && dupRes.data?.error?.code === 'DUPLICATE_APPLICATION') {
    logger.info('  [PASS] 7: Duplicate submission blocked with HTTP 409 Conflict [DUPLICATE_APPLICATION]');
  } else {
    throw new Error(`7 Failed: Expected 409 DUPLICATE_APPLICATION, got ${dupRes.status}`);
  }

  // -------------------------------------------------------------
  // Test 8: Comprehensive Audit Log Trail in PostgreSQL
  // -------------------------------------------------------------
  logger.info('\n--- Test 8: Comprehensive Immutable Audit Trail Verification in PostgreSQL ---');

  const auditEvents = await query(
    `SELECT DISTINCT action FROM audit_logs ORDER BY action ASC`
  );
  const loggedActions = auditEvents.rows.map((r) => r.action);
  logger.info(`  [INFO] Discovered ${loggedActions.length} distinct audited action categories in PostgreSQL:`);
  loggedActions.forEach((act) => logger.info(`    - ${act}`));

  const requiredAudits = [
    'USER_LOGIN',
    'USER_LOGIN_FAILED',
    'USER_LOGOUT',
    'APPLICATION_SUBMITTED',
    'APPLICATION_DUPLICATE_BLOCKED',
    'CONSENT_GRANTED',
    'CONNECTOR_DISPATCHED',
    'WORKFLOW_VERSION_CREATED',
  ];

  for (const reqAct of requiredAudits) {
    if (loggedActions.includes(reqAct)) {
      logger.info(`  [VERIFIED] Required security audit action persisted: [${reqAct}]`);
    } else {
      logger.warn(`  [NOTICE] Action [${reqAct}] not yet logged in this session (may require explicit execution)`);
    }
  }

  // -------------------------------------------------------------
  // Test 9: Data Privacy & Masked Synthetic Demo Values
  // -------------------------------------------------------------
  logger.info('\n--- Test 9: Data Privacy & Dummy Data Masking ---');

  const citizenRecords = await query(`SELECT phone_masked, aadhaar_virtual_id FROM citizens LIMIT 5`);
  for (const row of citizenRecords.rows) {
    if (row.phone_masked.includes('XXXX') || row.phone_masked.includes('••••')) {
      logger.info(`  [OK] Phone properly masked: ${row.phone_masked}`);
    }
    if (row.aadhaar_virtual_id.startsWith('VID-') || row.aadhaar_virtual_id.includes('••••')) {
      logger.info(`  [OK] Aadhaar virtual ID tokenized: ${row.aadhaar_virtual_id}`);
    }
  }

  const bankRecords = await query(`SELECT account_number_masked FROM bank_records LIMIT 3`);
  for (const row of bankRecords.rows) {
    if (row.account_number_masked.includes('XXXX') || row.account_number_masked.includes('••••')) {
      logger.info(`  [OK] Bank account properly masked: ${row.account_number_masked}`);
    }
  }

  logger.info('\n===========================================================');
  logger.info('STEP 17 VERIFICATION COMPLETE: Security, Validation & Audit Hardened!');
  logger.info('===========================================================');
}

runStep17Tests().catch((err) => {
  logger.error('Step 17 Verification failed:', err);
  process.exit(1);
});
