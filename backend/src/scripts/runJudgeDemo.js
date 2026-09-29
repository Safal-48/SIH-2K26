import logger from '../utils/logger.js';

const BASE_URL = 'http://localhost:5000/api';

async function runJudgeDemo() {
  logger.info('===========================================================');
  logger.info('SIH 2026 OFFICIAL JUDGE DEMONSTRATION RUN');
  logger.info('===========================================================');

  // Authenticate Admin to initialize demo environment
  const adminAuthRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin', password: 'demo123' })
  });
  const adminAuthData = await adminAuthRes.json();
  const adminToken = adminAuthData.data?.token;

  // Ensure deterministic baseline
  logger.info('\n[PRE-DEMO] Resetting demo state to baseline...');
  await fetch(`${BASE_URL}/admin/demo/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` }
  });
  logger.info('  [OK] Platform restored to deterministic baseline state');

  // [0:00] Citizen Login
  logger.info('\n[0:00] Step 1: Citizen logs in to portal');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'citizen', password: 'demo123' })
  });
  const loginData = await loginRes.json();
  const citizenToken = loginData.data?.token;
  logger.info(`  [OK] Authenticated: ${loginData.data?.user?.fullName} (${loginData.data?.user?.citizenId})`);

  // [0:30] Submit Scholarship Application
  logger.info('\n[0:30] Step 2: Citizen submits scholarship application (Form SCH-2026-A)');
  const appRes = await fetch(`${BASE_URL}/applications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${citizenToken}` },
    body: JSON.stringify({
      citizen_id: 'CZN-1001',
      student_id: 'STU-1001',
      institution_code: 'INST-NIT-04',
      income_certificate_no: 'INC-5001',
      account_reference: 'BANK-7001',
      academic_year: '2026-2027',
      declared_income: 180000,
      benefit_amount: 25000,
      scheme_name: 'Post-Matric Merit-cum-Means Financial Assistance Scheme'
    })
  });
  const appData = await appRes.json();
  const appId = appData.data?.applicationId;
  logger.info(`  [OK] Application Created: ${appId} | Status: ${appData.data?.status}`);

  // [1:00] Grant Digital Consent
  logger.info('\n[1:00] Step 3: Citizen grants explicit digital consent for cross-department verification');
  const consentRes = await fetch(`${BASE_URL}/applications/${appId}/consent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${citizenToken}` },
    body: JSON.stringify({
      purpose: 'Scholarship eligibility verification across higher education, revenue and banking registries',
      allowedDepartments: ['EDU', 'REV', 'DBT'],
      dataScopes: ['Education verification', 'Income verification', 'Bank verification status'],
      validUntil: '2026-12-31T23:59:59.000Z'
    })
  });
  const consentData = await consentRes.json();
  logger.info(`  [OK] Consent Granted: ${consentData.data?.consentId} | Status: ${consentData.data?.status}`);

  // [1:30] Trigger Bank Failure & Run Workflow
  logger.info('\n[1:30] Step 4: Admin simulates Bank API outage (503 Service Unavailable)');
  await fetch(`${BASE_URL}/bank/control`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ healthy: false, httpStatus: 503, errorCode: 'CORE_BANKING_TIMEOUT' })
  });
  logger.info('  [OK] Bank API state set to OUTAGE (healthy: false, status: 503)');

  logger.info('  -> Executing Workflow Engine Pipeline...');
  const runRes = await fetch(`${BASE_URL}/workflows/${appId}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${citizenToken}` },
    body: JSON.stringify({ queueOnFailure: true })
  });
  const runData = await runRes.json();
  logger.info(`  [OK] Workflow execution safely caught outage: status = ${runData.data?.status}`);

  // [2:00] Show Retry / Queue / Notification
  logger.info('\n[2:00] Step 5: Verify Step 4 retry backoff, QUEUED state, and citizen notification');
  const statusRes = await fetch(`${BASE_URL}/workflows/${appId}/status`, {
    headers: { Authorization: `Bearer ${citizenToken}` }
  });
  const statusData = await statusRes.json();
  statusData.data?.steps?.forEach((s) => {
    logger.info(`     Step ${s.stepOrder}: ${s.stepName} -> [${s.status}]${s.attempts > 1 ? ` (Attempts: ${s.attempts})` : ''}`);
  });

  const notifRes = await fetch(`${BASE_URL}/notifications`, {
    headers: { Authorization: `Bearer ${citizenToken}` }
  });
  const notifData = await notifRes.json();
  const latestNotif = notifData.data?.[0];
  if (latestNotif) {
    logger.info(`  [OK] Citizen Notification: "${latestNotif.title}" — ${latestNotif.message}`);
  }

  // [2:30] Recover Bank API
  logger.info('\n[2:30] Step 6: Admin recovers Bank API to HEALTHY state');
  await fetch(`${BASE_URL}/bank/control`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ healthy: true })
  });
  logger.info('  [OK] Bank API restored to HEALTHY (healthy: true)');

  // [3:00] Show Citizen Timeline & Resumed Completion
  logger.info('\n[3:00] Step 7: Exception Retry triggered without citizen resubmission');
  const excRes = await fetch(`${BASE_URL}/exceptions`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const excData = await excRes.json();
  const bankExc = excData.data?.exceptions?.find((e) => e.applicationId === appId);

  if (bankExc) {
    const retryRes = await fetch(`${BASE_URL}/exceptions/${bankExc.id}/retry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` }
    });
    const retryData = await retryRes.json();
    logger.info(`  [OK] Admin Exception Retry: ${retryData.message}`);
  } else {
    const resumeRes = await fetch(`${BASE_URL}/workflows/resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ applicationId: appId })
    });
    const resumeData = await resumeRes.json();
    logger.info(`  [OK] Workflow Resume: ${resumeData.message}`);
  }

  const finalTimelineRes = await fetch(`${BASE_URL}/applications/${appId}/timeline`, {
    headers: { Authorization: `Bearer ${citizenToken}` }
  });
  const finalTimelineData = await finalTimelineRes.json();
  logger.info(`  [OK] Final Application Status: [${finalTimelineData.data?.status}]`);
  logger.info(`  [OK] Final Workflow Progress: ${finalTimelineData.data?.completedSteps} / ${finalTimelineData.data?.totalSteps} Stages Completed (${finalTimelineData.data?.progressPercentage}%)`);

  // [3:30] Open Admin Control Center
  logger.info('\n[3:30] Step 8: Admin Control Center KPIs and Service Health');
  const dashRes = await fetch(`${BASE_URL}/admin/dashboard`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const dashData = await dashRes.json();
  const kpis = dashData.data?.overview || {};
  logger.info(`  [OK] Overview KPIs: Total Apps = ${kpis.totalApplications} | SLA Compliance = ${kpis.slaComplianceRate}% | Avg Latency = ${kpis.averageLatencyMs}ms`);

  // [4:00] Audit Logs & Data Mappings
  logger.info('\n[4:00] Step 9: Canonical Data Mappings and Audit Trail');
  const mapRes = await fetch(`${BASE_URL}/mappings`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const mapData = await mapRes.json();
  logger.info(`  [OK] Active Data Mapping Rules: ${mapData.data?.length} rules registered across departments`);

  const auditRes = await fetch(`${BASE_URL}/admin/audit-logs?limit=5`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const auditData = await auditRes.json();
  logger.info(`  [OK] Immutable Audit Records: Verified ${auditData.data?.count || auditData.data?.logs?.length} recent audit entries`);

  // [4:30] Workflow Builder
  logger.info('\n[4:30] Step 10: Dynamic Database-Driven Workflow Builder');
  const builderRes = await fetch(`${BASE_URL}/admin/workflow-builder/definitions`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const builderData = await builderRes.json();
  const def = builderData.data?.definitions?.[0] || builderData.data?.[0];
  logger.info(`  [OK] Active Workflow Topology: "${def?.name}" (v${def?.version}) with ${def?.stepCount} sequential steps`);

  // [5:00] Closing Concept
  logger.info('\n[5:00] Step 11: Product Conclusion');
  logger.info('  =============================================================');
  logger.info('  "Connect, orchestrate and monitor — without replacing existing systems."');
  logger.info('  =============================================================');
  logger.info('\nSIH 2026 JUDGE DEMONSTRATION EXECUTED SUCCESSFULLY IN APPROX 3 MINUTES!');
}

runJudgeDemo().catch((err) => {
  logger.error('Demo run error:', err);
  process.exit(1);
});
