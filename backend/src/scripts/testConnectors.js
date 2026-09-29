import { 
  educationConnector, 
  incomeConnector, 
  bankConnector, 
  legacyConnector,
  CONNECTOR_TYPES 
} from '../connectors/index.js';
import mockDepartmentService from '../services/mockDepartment.service.js';
import logger from '../utils/logger.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runConnectorTests() {
  logger.info('===========================================================');
  logger.info('Starting Connector Abstraction Layer Test Suite');
  logger.info('===========================================================');

  let passedTests = 0;

  // --------------------------------------------------------------------------
  // TEST SUITE 1: EDUCATION CONNECTOR
  // --------------------------------------------------------------------------
  logger.info('--- 1. Testing Education Connector (educationConnector.js) ---');

  // 1.1 REST execution (Success)
  {
    const canonicalReq = {
      citizen_id: 'CZN-1001',
      student_id: 'STU-1001',
      institution_code: 'COL-001',
      correlation_id: 'CORR-TEST-EDU-01',
    };

    const result = await educationConnector.execute(canonicalReq, {
      connectorType: CONNECTOR_TYPES.REST,
    });

    assert(result.success === true, 'Education connector should succeed');
    assert(result.status === 'VERIFIED', `Expected status VERIFIED, got ${result.status}`);
    assert(result.department_code === 'EDU', 'Expected department_code EDU');
    assert(result.correlation_id === 'CORR-TEST-EDU-01', 'Expected correlation_id to be preserved');
    assert(typeof result.latency_ms === 'number' && result.latency_ms >= 0, 'Expected recorded latency_ms');
    assert(result.data.student_id === 'STU-1001', 'Expected data.student_id STU-1001');
    assert(result.data.course === 'BCA', 'Expected data.course BCA');
    assert(result.data.institution === 'Demo Government College', 'Expected data.institution');
    assert(result.data.academic_year === 2026, 'Expected data.academic_year 2026');
    assert(result.data.verification_id === 'EDU-9001', 'Expected data.verification_id EDU-9001');
    assert(result.data.is_enrolled === true, 'Expected data.is_enrolled true');
    logger.info(`  [PASS] 1.1 Education Connector (REST) succeeded in ${result.latency_ms}ms with normalized response`);
    passedTests++;
  }

  // 1.2 MOCK execution (In-process)
  {
    const canonicalReq = {
      citizen_id: 'CZN-1001',
      student_id: 'STU-1001',
      institution_code: 'COL-001',
    };

    const result = await educationConnector.execute(canonicalReq, {
      connectorType: CONNECTOR_TYPES.MOCK,
    });

    assert(result.success === true, 'Education connector (MOCK) should succeed');
    assert(result.data.course === 'BCA', 'Expected course BCA');
    logger.info(`  [PASS] 1.2 Education Connector (MOCK direct in-process) succeeded in ${result.latency_ms}ms`);
    passedTests++;
  }

  // 1.3 Standardized Error handling (Record Not Found)
  {
    const canonicalReq = {
      citizen_id: 'CZN-1001',
      student_id: 'STU-NONEXISTENT',
      institution_code: 'COL-001',
    };

    const errorResult = await educationConnector.execute(canonicalReq, {
      connectorType: CONNECTOR_TYPES.REST,
    });

    assert(errorResult.success === false, 'Connector must report success: false on failure');
    assert(errorResult.status === 'FAILED', 'Expected status FAILED');
    assert(errorResult.error_code === 'RECORD_NOT_FOUND', `Expected RECORD_NOT_FOUND, got ${errorResult.error_code}`);
    assert(errorResult.retryable === false, 'Expected non-retryable failure for unknown record');
    assert(typeof errorResult.latency_ms === 'number', 'Expected latency to be tracked on error');
    assert(typeof errorResult.correlation_id === 'string', 'Expected correlation_id on error');
    logger.info(`  [PASS] 1.3 Education Connector normalized error correctly: [${errorResult.error_code}] (latency: ${errorResult.latency_ms}ms)`);
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 2: INCOME CONNECTOR
  // --------------------------------------------------------------------------
  logger.info('--- 2. Testing Income Connector (incomeConnector.js) ---');

  // 2.1 REST execution (Success)
  {
    const canonicalReq = {
      citizen_id: 'CZN-1001',
      income_certificate_no: 'INC-5001',
      correlation_id: 'CORR-TEST-REV-01',
    };

    const result = await incomeConnector.execute(canonicalReq, {
      connectorType: CONNECTOR_TYPES.REST,
    });

    assert(result.success === true, 'Income connector should succeed');
    assert(result.status === 'VERIFIED', 'Expected status VERIFIED');
    assert(result.department_code === 'REV', 'Expected department_code REV');
    assert(result.data.annual_income === 180000, `Expected annual_income 180000, got ${result.data.annual_income}`);
    assert(result.data.income_category === 'LOW_INCOME', 'Expected income_category LOW_INCOME');
    assert(result.data.verification_id === 'INC-8001', 'Expected verification_id INC-8001');
    assert(result.data.is_eligible_for_subsidy === true, 'Expected is_eligible_for_subsidy true');
    logger.info(`  [PASS] 2.1 Income Connector (REST) succeeded in ${result.latency_ms}ms with normalized response`);
    passedTests++;
  }

  // 2.2 Standardized Error handling (Invalid Certificate)
  {
    const canonicalReq = {
      citizen_id: 'CZN-1001',
      income_certificate_no: 'INC-EXPIRED-99',
    };

    const errorResult = await incomeConnector.execute(canonicalReq);
    assert(errorResult.success === false, 'Expected success: false');
    assert(errorResult.error_code === 'CERTIFICATE_INVALID', `Expected CERTIFICATE_INVALID`);
    assert(errorResult.retryable === false, 'Expected retryable: false');
    logger.info(`  [PASS] 2.2 Income Connector normalized error correctly: [${errorResult.error_code}]`);
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 3: BANK CONNECTOR
  // --------------------------------------------------------------------------
  logger.info('--- 3. Testing Bank Connector (bankConnector.js) ---');

  // 3.1 REST execution (Success)
  {
    const canonicalReq = {
      citizen_id: 'CZN-1001',
      account_reference: 'BANK-7001',
      correlation_id: 'CORR-TEST-DBT-01',
    };

    const result = await bankConnector.execute(canonicalReq, {
      connectorType: CONNECTOR_TYPES.REST,
    });

    assert(result.success === true, 'Bank connector should succeed');
    assert(result.status === 'VERIFIED', 'Expected status VERIFIED');
    assert(result.department_code === 'DBT', 'Expected department_code DBT');
    assert(result.data.account_reference === 'BANK-7001', 'Expected account_reference');
    assert(result.data.account_holder_match === true, 'Expected account_holder_match true');
    assert(result.data.is_dbt_ready === true, 'Expected is_dbt_ready true');
    assert(result.data.verification_id === 'BNK-3001', 'Expected verification_id BNK-3001');
    logger.info(`  [PASS] 3.1 Bank Connector (REST) succeeded in ${result.latency_ms}ms with normalized response`);
    passedTests++;
  }

  // 3.2 Bank Outage Simulation (Controllable state handling)
  {
    // Toggle Bank to Failed on the running server
    await fetch('http://localhost:5000/api/bank/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        healthy: false,
        errorCode: 'CORE_BANKING_TIMEOUT',
        message: 'NPCI Aadhaar Payment Bridge is temporarily unreachable',
        retryable: true,
        httpStatus: 503,
      }),
    });

    const canonicalReq = {
      citizen_id: 'CZN-1001',
      account_reference: 'BANK-7001',
    };

    const errorResult = await bankConnector.execute(canonicalReq);
    assert(errorResult.success === false, 'Expected success false during outage');
    assert(errorResult.error_code === 'CORE_BANKING_TIMEOUT', `Expected CORE_BANKING_TIMEOUT, got ${errorResult.error_code}`);
    assert(errorResult.retryable === true, 'Expected retryable true for temporary banking outage');
    logger.info(`  [PASS] 3.2 Bank Connector trapped outage cleanly: [${errorResult.error_code}] (retryable: true)`);
    passedTests++;

    // Restore Bank
    await fetch('http://localhost:5000/api/bank/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ healthy: true }),
    });
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 4: LEGACY CONNECTOR
  // --------------------------------------------------------------------------
  logger.info('--- 4. Testing Legacy Connector (legacyConnector.js) ---');

  // 4.1 Legacy Mainframe Protocol Adaptation
  {
    const canonicalReq = {
      citizen_id: 'CZN-1001',
      record_key: 'LEG-ARCHIVE-9001',
      correlation_id: 'CORR-TEST-LEG-01',
    };

    const result = await legacyConnector.execute(canonicalReq, {
      connectorType: CONNECTOR_TYPES.LEGACY,
    });

    assert(result.success === true, 'Legacy connector should succeed');
    assert(result.status === 'VERIFIED', 'Expected status VERIFIED');
    assert(result.department_code === 'LEG', 'Expected department_code LEG');
    assert(result.data.record_key === 'LEG-ARCHIVE-9001', 'Expected record_key');
    assert(result.data.legacy_protocol === 'SOAP_EMULATED', 'Expected legacy_protocol SOAP_EMULATED');
    assert(result.data.is_legacy_verified === true, 'Expected is_legacy_verified true');
    assert(result.data.registration_year === 2021, 'Expected registration_year 2021');
    assert(Array.isArray(result.data.legacy_flags), 'Expected legacy_flags array');
    assert(result.data.legacy_flags.includes('FLAG_VERIFIED'), 'Expected parsed flag');
    logger.info(`  [PASS] 4.1 Legacy Connector adapted mainframe SOAP record into canonical model in ${result.latency_ms}ms:`);
    logger.info(`        Protocol: ${result.data.legacy_protocol} | System: ${result.data.originating_system} | Year: ${result.data.registration_year}`);
    passedTests++;
  }

  // 4.2 Legacy System Offline Simulation
  {
    const canonicalReq = {
      citizen_id: 'CZN-1001',
      record_key: 'LEG-FAIL',
    };

    const errorResult = await legacyConnector.execute(canonicalReq, {
      connectorType: CONNECTOR_TYPES.LEGACY,
    });

    assert(errorResult.success === false, 'Expected success false');
    assert(errorResult.error_code === 'LEGACY_SYSTEM_OFFLINE', `Expected LEGACY_SYSTEM_OFFLINE`);
    assert(errorResult.retryable === true, 'Expected retryable true');
    logger.info(`  [PASS] 4.2 Legacy Connector handled terminal connection reset: [${errorResult.error_code}]`);
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 5: SANDBOX CONNECTOR TYPE
  // --------------------------------------------------------------------------
  logger.info('--- 5. Testing Sandbox Connector Type ---');
  {
    const canonicalReq = {
      citizen_id: 'CZN-SANDBOX-01',
      student_id: 'STU-SANDBOX-01',
    };

    const result = await educationConnector.execute(canonicalReq, {
      connectorType: CONNECTOR_TYPES.SANDBOX,
    });

    assert(result.success === true, 'Sandbox execution should succeed');
    assert(result.connector_type === 'SANDBOX', 'Expected connector_type SANDBOX');
    assert(result.data.course.includes('Sandbox'), 'Expected sandbox course');
    logger.info(`  [PASS] 5.1 Sandbox mode execution verified successfully`);
    passedTests++;
  }

  logger.info('===========================================================');
  logger.info(`All ${passedTests} Connector Abstraction Layer Tests Passed Successfully!`);
  logger.info('===========================================================');
}

runConnectorTests().catch((err) => {
  logger.error('Connector Test Suite Failed:', err.message);
  console.error(err);
  process.exit(1);
});
