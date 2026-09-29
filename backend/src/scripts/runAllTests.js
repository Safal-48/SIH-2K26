import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testScripts = [
  { name: 'Mock APIs Suite', file: 'testMockApis.js' },
  { name: 'Connectors Suite', file: 'testConnectors.js' },
  { name: 'Data Mapper Suite', file: 'testDataMapper.js' },
  { name: 'Workflow Engine Suite', file: 'testWorkflowEngine.js' },
  { name: 'Auth / RBAC / Consent Suite', file: 'testAuthRbacConsent.js' },
  { name: 'Application Lifecycle Suite', file: 'testApplicationLifecycle.js' },
  { name: 'Unified Timeline Suite', file: 'testUnifiedTimeline.js' },
  { name: 'Admin Dashboard Suite', file: 'testAdminDashboard.js' },
  { name: 'Exception Recovery Suite', file: 'testExceptionRecovery.js' },
  { name: 'Notifications & SLA Suite', file: 'testNotificationsAndSla.js' },
  { name: 'Workflow Builder Suite', file: 'testWorkflowBuilder.js' },
  { name: 'Step 15 Hardening Suite', file: 'testStep15.js' },
  { name: 'Step 16 Resiliency Suite', file: 'testStep16.js' },
  { name: 'Step 17 Verification Suite', file: 'testStep17.js' }
];

function runScript(script) {
  return new Promise((resolve, reject) => {
    const fullPath = path.join(__dirname, script.file);
    const proc = spawn(process.execPath, [fullPath], {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '../..'),
      env: { ...process.env, NODE_ENV: 'test' }
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Test script ${script.name} (${script.file}) failed with code ${code}`));
      }
    });
  });
}

async function main() {
  console.log('===============================================================');
  console.log('STARTING COMPLETE TEST SUITE VERIFICATION (14 SUITES)');
  console.log('===============================================================');

  const startTime = Date.now();
  let passed = 0;

  for (const script of testScripts) {
    console.log(`\n>>> RUNNING: ${script.name} (${script.file})...`);
    try {
      await runScript(script);
      passed++;
      console.log(`[PASS] ${script.name}`);
    } catch (err) {
      console.error(`\n[FAIL] ${err.message}`);
      process.exit(1);
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n===============================================================');
  console.log(`ALL TEST SUITES PASSED! (${passed}/${testScripts.length}) in ${durationSec}s`);
  console.log('===============================================================');
}

main().catch((err) => {
  console.error('Fatal error running test suites:', err);
  process.exit(1);
});
