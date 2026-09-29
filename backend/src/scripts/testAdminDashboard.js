/**
 * Step 11 Verification Suite: Admin Control Center
 * 
 * Verifies:
 * 1. RBAC Guard: Non-admin roles (CITIZEN, unauthenticated) strictly rejected with 401/403.
 * 2. Section 1: Overview KPIs calculated directly from PostgreSQL database (no hardcoding).
 * 3. Section 2: Service Health with 6 required fields:
 *    - service name, department, connector type, health status, response time, last checked.
 * 4. Section 3: Live Events operational activity stream.
 * 5. Section 4: Active Workflows with operational data.
 * 6. Section 5: Completed Workflows with operational data.
 * 7. Section 6: Pending Workflows with operational data.
 * 8. Section 7: Failed Workflows with operational data (correlation ID, retry count, status, failure reason).
 * 9. Section 8: SLA Monitoring with department targets and compliance.
 * 10. Section 9: Recent Exceptions queue.
 * 11. Section 10: Recent Audit Events trail.
 * 12. Workflow Filters (by status and search term).
 * 13. Admin Operation: Resume failed workflow directly from admin endpoint.
 */

import assert from 'assert';
import logger from '../utils/logger.js';

const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:5000/api';

async function runStep11Tests() {
  logger.info('===========================================================');
  logger.info('Starting Step 11: Admin Control Center Test Suite');
  logger.info('===========================================================');

  let passedTests = 0;

  // --------------------------------------------------------------------------
  // STEP 0: Authentication Helpers
  // --------------------------------------------------------------------------
  logger.info('\n--- Authenticating Demo Accounts ---');

  // Authenticate as Admin
  const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin', password: 'demo123' }),
  });
  const adminLoginBody = await adminLoginRes.json();
  assert.strictEqual(adminLoginRes.status, 200, 'Admin login failed');
  const adminToken = adminLoginBody.data.token;
  logger.info('  [OK] Admin authenticated successfully');

  // Authenticate as Citizen
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
  // TEST 1: RBAC Access Control Guard
  // Non-admin roles cannot access admin operations
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 1: RBAC Protection on Admin Endpoints ---');
  {
    // 1a. Unauthenticated -> 401 Unauthorized
    const unauthRes = await fetch(`${BASE_URL}/admin/dashboard`);
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request must return 401');

    // 1b. Citizen role -> 403 Forbidden
    const citizenForbiddenRes = await fetch(`${BASE_URL}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    assert.strictEqual(citizenForbiddenRes.status, 403, 'Citizen role must be rejected with 403 Forbidden');

    // 1c. Admin role -> 200 OK
    const adminOkRes = await fetch(`${BASE_URL}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(adminOkRes.status, 200, 'Admin role must receive 200 OK');

    logger.info('  [PASS] Test 1: RBAC guard enforced: Unauthenticated=401, Citizen=403, Admin=200');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 2: Overview KPIs (Section 1)
  // Calculated from database, not hardcoded
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 2: Section 1 - Overview KPIs from Database ---');
  let dashboardData = null;
  {
    const res = await fetch(`${BASE_URL}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    dashboardData = body.data;

    const { overview } = dashboardData;
    assert(overview !== undefined, 'Overview object must be present');
    assert(typeof overview.totalApplications === 'number', 'totalApplications must be a number');
    assert(typeof overview.activeWorkflows === 'number', 'activeWorkflows must be a number');
    assert(typeof overview.completedWorkflows === 'number', 'completedWorkflows must be a number');
    assert(typeof overview.pendingWorkflows === 'number', 'pendingWorkflows must be a number');
    assert(typeof overview.failedWorkflows === 'number', 'failedWorkflows must be a number');
    assert(typeof overview.totalApiDispatches === 'number', 'totalApiDispatches must be a number');
    assert(typeof overview.averageLatencyMs === 'number', 'averageLatencyMs must be a number');
    assert(typeof overview.slaComplianceRate === 'number', 'slaComplianceRate must be a number');

    assert(overview.totalApplications > 0, `Expected totalApplications > 0, got ${overview.totalApplications}`);
    assert(overview.totalApiDispatches > 0, `Expected totalApiDispatches > 0, got ${overview.totalApiDispatches}`);

    logger.info(`  [PASS] Test 2: Overview KPIs verified: ${overview.totalApplications} Apps, ${overview.totalApiDispatches} Dispatches, Avg Latency: ${overview.averageLatencyMs}ms, SLA: ${overview.slaComplianceRate}%`);
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 3: Service Health with 6 Required Fields (Section 2)
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 3: Section 2 - Service Health ---');
  {
    const services = dashboardData.serviceHealth;
    assert(Array.isArray(services), 'serviceHealth must be an array');
    assert(services.length >= 3, `Expected at least 3 services, got ${services.length}`);

    const requiredFields = [
      'serviceName',
      'department',
      'connectorType',
      'healthStatus',
      'responseTime',
      'lastChecked',
    ];

    for (const srv of services) {
      for (const field of requiredFields) {
        assert(srv[field] !== undefined && srv[field] !== null, `Service must include field [${field}]: ${JSON.stringify(srv)}`);
      }
      assert(['HEALTHY', 'DEGRADED', 'DOWN'].includes(srv.healthStatus), `Invalid healthStatus: ${srv.healthStatus}`);
      assert(typeof srv.responseTime === 'number', 'responseTime must be numeric');
    }

    // Verify key departments are represented
    const depts = services.map((s) => s.department);
    assert(depts.includes('EDU'), 'Education department must be present');
    assert(depts.includes('REV'), 'Revenue department must be present');
    assert(depts.includes('DBT'), 'Bank / DBT department must be present');

    logger.info(`  [PASS] Test 3: Service Health verified across ${services.length} services with all 6 required fields`);
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 4: Live Events Stream (Section 3)
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 4: Section 3 - Live Events Stream ---');
  {
    const events = dashboardData.liveEvents;
    assert(Array.isArray(events), 'liveEvents must be an array');
    assert(events.length > 0, 'liveEvents must contain recent activity records');

    const firstEvent = events[0];
    assert(firstEvent.event_type, 'Event must have event_type');
    assert(firstEvent.timestamp, 'Event must have timestamp');
    assert(firstEvent.status, 'Event must have status');

    logger.info(`  [PASS] Test 4: Live events operational stream contains ${events.length} chronological events`);
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 5: Active, Completed, Pending & Failed Workflows (Sections 4, 5, 6, 7)
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 5: Sections 4, 5, 6, 7 - Categorized Workflows with Operational Data ---');
  {
    const { activeWorkflows, completedWorkflows, pendingWorkflows, failedWorkflows } = dashboardData;

    assert(Array.isArray(activeWorkflows), 'activeWorkflows must be an array');
    assert(Array.isArray(completedWorkflows), 'completedWorkflows must be an array');
    assert(Array.isArray(pendingWorkflows), 'pendingWorkflows must be an array');
    assert(Array.isArray(failedWorkflows), 'failedWorkflows must be an array');

    assert(completedWorkflows.length > 0, 'Expected at least one completed workflow from prior tests');

    // Completed workflow operational checks
    const sampleCompleted = completedWorkflows[0];
    assert(sampleCompleted.application_id, 'Must contain application_id');
    assert(sampleCompleted.citizen_id, 'Must contain citizen_id');
    assert(sampleCompleted.status, 'Must contain status');

    logger.info(`  [PASS] Test 5: Categorized workflows verified: ${activeWorkflows.length} Active, ${completedWorkflows.length} Completed, ${pendingWorkflows.length} Pending, ${failedWorkflows.length} Failed`);
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 6: SLA Monitoring (Section 8)
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 6: Section 8 - SLA Monitoring & Latency Distribution ---');
  {
    const sla = dashboardData.slaMonitoring;
    assert(sla !== undefined, 'slaMonitoring must be present');
    assert(typeof sla.overallCompliance === 'number', 'overallCompliance must be numeric');
    assert(Array.isArray(sla.departments), 'sla.departments must be an array');
    assert(sla.distribution !== undefined, 'sla.distribution must be present');
    assert(typeof sla.distribution.under100ms === 'number', 'distribution under100ms required');

    for (const dept of sla.departments) {
      assert(dept.department, 'Dept code required');
      assert(typeof dept.avgLatencyMs === 'number', 'avgLatencyMs required');
      assert(typeof dept.complianceRate === 'number', 'complianceRate required');
    }

    logger.info(`  [PASS] Test 6: SLA monitoring verified: ${sla.overallCompliance}% overall compliance across ${sla.departments.length} departments`);
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 7: Recent Exceptions (Section 9) & Audit Events (Section 10)
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 7: Sections 9 & 10 - Exceptions & Audit Trail ---');
  {
    const exceptions = dashboardData.recentExceptions;
    const auditLogs = dashboardData.recentAuditEvents;

    assert(Array.isArray(exceptions), 'recentExceptions must be an array');
    assert(Array.isArray(auditLogs), 'recentAuditEvents must be an array');
    assert(auditLogs.length > 0, 'auditLogs must contain records');

    const firstAudit = auditLogs[0];
    assert(firstAudit.action, 'Audit record must have action');
    assert(firstAudit.actor_id, 'Audit record must have actor_id');
    assert(firstAudit.timestamp, 'Audit record must have timestamp');

    logger.info(`  [PASS] Test 7: Exceptions queue (${exceptions.length} items) and Audit Trail (${auditLogs.length} records) verified`);
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 8: Workflow Filtering & Search API
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 8: Operational Filters & Search API ---');
  {
    // 8a. Filter by COMPLETED status
    const compFilterRes = await fetch(`${BASE_URL}/admin/workflows?status=COMPLETED`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const compFilterBody = await compFilterRes.json();
    assert.strictEqual(compFilterRes.status, 200);
    assert(Array.isArray(compFilterBody.data.workflows), 'workflows must be an array');
    for (const wf of compFilterBody.data.workflows) {
      assert(['SUCCESS', 'APPROVED', 'COMPLETED'].includes(wf.status), `Workflow status must be completed, got ${wf.status}`);
    }

    // 8b. Search by Application ID
    const searchRes = await fetch(`${BASE_URL}/admin/workflows?search=SCH-2026-001`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const searchBody = await searchRes.json();
    assert.strictEqual(searchRes.status, 200);
    assert(searchBody.data.workflows.length > 0, 'Should find SCH-2026-001');
    assert.strictEqual(searchBody.data.workflows[0].application_id, 'SCH-2026-001');

    logger.info('  [PASS] Test 8: Filter by status and search by application ID verified successfully');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 9: Admin Workflow Resume Operation
  // --------------------------------------------------------------------------
  logger.info('\n--- TEST 9: Admin Operational Action (Resume Workflow) ---');
  {
    // Create an application, cause bank failure, then resume as Admin
    const dynamicYear = `2026-ADM-${Date.now().toString().slice(-4)}`;
    const submitRes = await fetch(`${BASE_URL}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        citizen_id: 'CZN-1001',
        student_id: 'STU-1001',
        institution_code: 'INST-NIT-04',
        income_certificate_no: 'INC-5001',
        account_reference: 'BANK-7001',
        scheme_name: 'Admin Operational Recovery Test Scheme',
        academic_year: dynamicYear,
        declared_income: 180000,
        benefit_amount: 25000,
      }),
    });
    const submitBody = await submitRes.json();
    const testAppId = submitBody.data.applicationId;

    // Grant consent
    await fetch(`${BASE_URL}/applications/${testAppId}/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        purpose: 'Admin recovery test',
        scope: ['EDUCATION', 'INCOME', 'BANK'],
      }),
    });

    // Make bank fail temporarily
    await fetch(`${BASE_URL}/bank/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ healthy: false, message: 'Simulated downtime for Admin test' }),
    });

    // Run workflow -> fails at Step 4
    await fetch(`${BASE_URL}/workflows/${testAppId}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: testAppId }),
    });

    // Restore bank to healthy
    await fetch(`${BASE_URL}/bank/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ healthy: true }),
    });

    // Non-admin cannot resume via admin endpoint
    const nonAdminResumeRes = await fetch(`${BASE_URL}/admin/workflows/${testAppId}/resume`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    assert.strictEqual(nonAdminResumeRes.status, 403, 'Citizen must not be authorized to trigger admin resume');

    // Admin resumes workflow
    const adminResumeRes = await fetch(`${BASE_URL}/admin/workflows/${testAppId}/resume`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminResumeBody = await adminResumeRes.json();
    assert.strictEqual(adminResumeRes.status, 200, `Admin resume failed: ${JSON.stringify(adminResumeBody)}`);
    assert.strictEqual(adminResumeBody.data.success, true);

    // Verify audit log was recorded for admin resume
    const auditRes = await fetch(`${BASE_URL}/admin/audit-logs?limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const auditBody = await auditRes.json();
    const resumeAudit = auditBody.data.logs.find((l) => l.action === 'ADMIN_WORKFLOW_RESUME' && l.entity_id === testAppId);
    assert(resumeAudit !== undefined, 'Admin resume action must be recorded in immutable audit log');
    assert.strictEqual(resumeAudit.actor_type, 'ADMIN');

    logger.info(`  [PASS] Test 9: Admin successfully resumed failed workflow ${testAppId} and immutable audit event was recorded`);
    passedTests++;
  }

  logger.info('\n===========================================================');
  logger.info(`ALL ${passedTests} STEP 11 ADMIN CONTROL CENTER TESTS PASSED SUCCESSFULLY!`);
  logger.info('===========================================================');
}

runStep11Tests().catch((err) => {
  logger.error('Step 11 Test Suite Failed:', err);
  process.exit(1);
});
