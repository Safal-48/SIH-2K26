import crypto from 'crypto';
import logger from '../utils/logger.js';

/**
 * State store for Mock Departmental APIs
 */
class MockDepartmentService {
  constructor() {
    this.state = {
      bank: {
        healthy: true,
        errorCode: 'SERVICE_UNAVAILABLE',
        message: 'Core Banking PFMS Gateway temporarily unavailable',
        retryable: true,
        httpStatus: 503,
      },
      income: {
        delayMs: 0, // In milliseconds
        healthy: true,
        invalid: false,
      },
      education: {
        healthy: true,
      },
    };

    // Deterministic mock datasets
    this.educationDatabase = new Map([
      [
        'STU-1001',
        {
          student_id: 'STU-1001',
          citizen_id: 'CZN-1001',
          course: 'BCA',
          institution: 'Demo Government College',
          institution_code: 'COL-001',
          year: 2026,
          verification_id: 'EDU-9001',
          status: 'VERIFIED',
        },
      ],
      [
        'STU-1002',
        {
          student_id: 'STU-1002',
          citizen_id: 'CZN-1002',
          course: 'B.Sc Data Science',
          institution: 'State Technical University',
          institution_code: 'COL-002',
          year: 2026,
          verification_id: 'EDU-9002',
          status: 'VERIFIED',
        },
      ],
    ]);

    this.incomeDatabase = new Map([
      [
        'INC-5001',
        {
          income_certificate_no: 'INC-5001',
          citizen_id: 'CZN-1001',
          annual_income: 180000,
          income_category: 'LOW_INCOME',
          verification_id: 'INC-8001',
          status: 'VERIFIED',
        },
      ],
      [
        'INC-5002',
        {
          income_certificate_no: 'INC-5002',
          citizen_id: 'CZN-1002',
          annual_income: 210000,
          income_category: 'LOW_INCOME',
          verification_id: 'INC-8002',
          status: 'VERIFIED',
        },
      ],
    ]);

    this.bankDatabase = new Map([
      [
        'BANK-7001',
        {
          account_reference: 'BANK-7001',
          citizen_id: 'CZN-1001',
          account_holder_match: true,
          verification_id: 'BNK-3001',
          status: 'VERIFIED',
        },
      ],
      [
        'BANK-7002',
        {
          account_reference: 'BANK-7002',
          citizen_id: 'CZN-1002',
          account_holder_match: true,
          verification_id: 'BNK-3002',
          status: 'VERIFIED',
        },
      ],
    ]);
  }

  /**
   * Generate or preserve correlation ID
   */
  getCorrelationId(reqHeader) {
    if (reqHeader && typeof reqHeader === 'string' && reqHeader.trim()) {
      return reqHeader.trim();
    }
    return `REQ-${Date.now().toString().slice(-5)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  }

  /**
   * Helper to sleep for simulated delays
   */
  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Reset all mock API configurations to default healthy state
   */
  resetAll() {
    this.state.bank.healthy = true;
    this.state.bank.errorCode = 'SERVICE_UNAVAILABLE';
    this.state.bank.message = 'Core Banking PFMS Gateway temporarily unavailable';
    this.state.bank.retryable = true;
    this.state.bank.httpStatus = 503;
    this.state.income.delayMs = 0;
    this.state.income.healthy = true;
    this.state.income.invalid = false;
    this.state.education.healthy = true;
    logger.info('MockDepartmentService: Reset all departmental configurations to defaults');
    return this.getStateSummary();
  }

  getStateSummary() {
    return {
      bank: {
        healthy: this.state.bank.healthy,
        failureConfig: this.state.bank.healthy
          ? null
          : {
              errorCode: this.state.bank.errorCode,
              message: this.state.bank.message,
              retryable: this.state.bank.retryable,
              httpStatus: this.state.bank.httpStatus,
            },
      },
      income: {
        delayMs: this.state.income.delayMs,
        healthy: this.state.income.healthy,
        invalid: this.state.income.invalid,
      },
      education: {
        healthy: this.state.education.healthy,
      },
    };
  }

  // --- Bank API Control Methods ---
  setBankControl({ healthy = true, errorCode = 'SERVICE_UNAVAILABLE', message = 'Department service temporarily unavailable', retryable = true, httpStatus = 503 }) {
    this.state.bank.healthy = Boolean(healthy);
    this.state.bank.errorCode = errorCode;
    this.state.bank.message = message;
    this.state.bank.retryable = Boolean(retryable);
    this.state.bank.httpStatus = Number(httpStatus) || 503;
    logger.info(`MockDepartmentService: Bank API state updated to [${this.state.bank.healthy ? 'HEALTHY' : 'FAILED'}]`);
    return this.state.bank;
  }

  getBankControl() {
    return this.state.bank;
  }

  // --- Income API Control Methods ---
  setIncomeControl({ delayMs = 0, invalid = false, healthy = true }) {
    if (delayMs !== undefined) this.state.income.delayMs = Math.max(0, parseInt(delayMs, 10) || 0);
    if (invalid !== undefined) this.state.income.invalid = Boolean(invalid);
    if (healthy !== undefined) this.state.income.healthy = Boolean(healthy);
    logger.info(`MockDepartmentService: Income API updated: delay=[${this.state.income.delayMs}ms], invalid=[${this.state.income.invalid}]`);
    return this.state.income;
  }

  getIncomeControl() {
    return this.state.income;
  }

  // --- Education Verification Logic ---
  async verifyEducation({ citizen_id, student_id, institution_code }, { mockMode = null, correlationId }) {
    // 1. Check simulated failure modes
    if (mockMode === 'service_failure' || student_id === 'STU-SERVICE-FAIL') {
      return {
        error: {
          status: 'FAILED',
          error_code: 'SERVICE_UNAVAILABLE',
          message: 'Department service temporarily unavailable',
          retryable: true,
          correlation_id: correlationId,
        },
        httpStatus: 503,
      };
    }

    if (mockMode === 'timeout' || student_id === 'STU-TIMEOUT') {
      return {
        error: {
          status: 'FAILED',
          error_code: 'GATEWAY_TIMEOUT',
          message: 'Education registry gateway timed out while fetching academic transcript',
          retryable: true,
          correlation_id: correlationId,
        },
        httpStatus: 504,
      };
    }

    if (mockMode === 'retryable_failure') {
      return {
        error: {
          status: 'FAILED',
          error_code: 'RATE_LIMIT_EXCEEDED',
          message: 'Department service request quota throttled. Please retry shortly.',
          retryable: true,
          correlation_id: correlationId,
        },
        httpStatus: 429,
      };
    }

    if (mockMode === 'non_retryable_failure' || student_id === 'STU-NOT-FOUND') {
      return {
        error: {
          status: 'FAILED',
          error_code: 'RECORD_NOT_FOUND',
          message: `Student enrollment record not found for student_id: ${student_id}`,
          retryable: false,
          correlation_id: correlationId,
        },
        httpStatus: 404,
      };
    }

    // 2. Lookup record
    const record = this.educationDatabase.get(student_id);
    if (!record || (citizen_id && record.citizen_id !== citizen_id)) {
      return {
        error: {
          status: 'FAILED',
          error_code: 'RECORD_NOT_FOUND',
          message: `Academic credentials mismatch or record not found for student ID: ${student_id}`,
          retryable: false,
          correlation_id: correlationId,
        },
        httpStatus: 404,
      };
    }

    // 3. Return exact expected contract
    return {
      data: {
        status: 'VERIFIED',
        student_id: record.student_id,
        course: record.course,
        institution: record.institution,
        year: record.year,
        verification_id: record.verification_id,
      },
      httpStatus: 200,
    };
  }

  // --- Income Verification Logic ---
  async verifyIncome({ citizen_id, income_certificate_no }, { mockMode = null, correlationId, requestDelay = 0 }) {
    // 1. Simulated delay handling
    const delay = requestDelay > 0 ? requestDelay : this.state.income.delayMs;
    if (delay > 0) {
      logger.info(`MockDepartmentService: Simulating slow response for Income API (${delay}ms)...`);
      await this.sleep(delay);
    }

    // 1b. Check if invalid income simulation is active
    if (this.state.income.invalid || mockMode === 'invalid_income') {
      return {
        error: {
          status: 'FAILED',
          error_code: 'CERTIFICATE_INVALID',
          message: 'Income certificate deemed invalid or expired by Revenue Authority',
          retryable: false,
          correlation_id: correlationId,
        },
        httpStatus: 422,
      };
    }

    // 2. Check simulated failure modes
    if (mockMode === 'service_failure' || income_certificate_no === 'INC-SERVICE-FAIL') {
      return {
        error: {
          status: 'FAILED',
          error_code: 'SERVICE_UNAVAILABLE',
          message: 'Department service temporarily unavailable',
          retryable: true,
          correlation_id: correlationId,
        },
        httpStatus: 503,
      };
    }

    if (mockMode === 'timeout' || income_certificate_no === 'INC-TIMEOUT') {
      return {
        error: {
          status: 'FAILED',
          error_code: 'GATEWAY_TIMEOUT',
          message: 'Revenue department certificate validation gateway timed out',
          retryable: true,
          correlation_id: correlationId,
        },
        httpStatus: 504,
      };
    }

    if (mockMode === 'retryable_failure') {
      return {
        error: {
          status: 'FAILED',
          error_code: 'SERVICE_UNAVAILABLE',
          message: 'Department service temporarily unavailable',
          retryable: true,
          correlation_id: correlationId,
        },
        httpStatus: 503,
      };
    }

    if (mockMode === 'non_retryable_failure' || income_certificate_no === 'INC-NOT-FOUND') {
      return {
        error: {
          status: 'FAILED',
          error_code: 'CERTIFICATE_INVALID',
          message: `Income certificate number ${income_certificate_no} is expired, revoked, or non-existent`,
          retryable: false,
          correlation_id: correlationId,
        },
        httpStatus: 404,
      };
    }

    // 3. Lookup record
    const record = this.incomeDatabase.get(income_certificate_no);
    if (!record || (citizen_id && record.citizen_id !== citizen_id)) {
      return {
        error: {
          status: 'FAILED',
          error_code: 'CERTIFICATE_INVALID',
          message: `Income certificate ${income_certificate_no} could not be validated for citizen ${citizen_id}`,
          retryable: false,
          correlation_id: correlationId,
        },
        httpStatus: 404,
      };
    }

    // 4. Return exact expected contract
    return {
      data: {
        status: 'VERIFIED',
        annual_income: record.annual_income,
        income_category: record.income_category,
        verification_id: record.verification_id,
      },
      httpStatus: 200,
    };
  }

  // --- Bank / DBT Verification Logic ---
  async verifyBank({ citizen_id, account_reference }, { mockMode = null, correlationId }) {
    // 1. Check controllable state first (Healthy vs Failed)
    if (!this.state.bank.healthy) {
      return {
        error: {
          status: 'FAILED',
          error_code: this.state.bank.errorCode,
          message: this.state.bank.message,
          retryable: this.state.bank.retryable,
          correlation_id: correlationId,
        },
        httpStatus: this.state.bank.httpStatus,
      };
    }

    // 2. Check header or payload based overrides
    if (mockMode === 'service_failure' || account_reference === 'BANK-SERVICE-FAIL') {
      return {
        error: {
          status: 'FAILED',
          error_code: 'SERVICE_UNAVAILABLE',
          message: 'Department service temporarily unavailable',
          retryable: true,
          correlation_id: correlationId,
        },
        httpStatus: 503,
      };
    }

    if (mockMode === 'timeout' || account_reference === 'BANK-TIMEOUT') {
      return {
        error: {
          status: 'FAILED',
          error_code: 'GATEWAY_TIMEOUT',
          message: 'PFMS / Core Banking verification timed out',
          retryable: true,
          correlation_id: correlationId,
        },
        httpStatus: 504,
      };
    }

    if (mockMode === 'retryable_failure') {
      return {
        error: {
          status: 'FAILED',
          error_code: 'SERVICE_UNAVAILABLE',
          message: 'Department service temporarily unavailable',
          retryable: true,
          correlation_id: correlationId,
        },
        httpStatus: 503,
      };
    }

    if (mockMode === 'non_retryable_failure' || account_reference === 'BANK-MISMATCH') {
      return {
        error: {
          status: 'FAILED',
          error_code: 'ACCOUNT_HOLDER_MISMATCH',
          message: 'Bank account name does not match citizen identity records',
          retryable: false,
          correlation_id: correlationId,
        },
        httpStatus: 422,
      };
    }

    // 3. Lookup record
    const record = this.bankDatabase.get(account_reference);
    if (!record || (citizen_id && record.citizen_id !== citizen_id)) {
      return {
        error: {
          status: 'FAILED',
          error_code: 'ACCOUNT_NOT_FOUND',
          message: `Bank account reference ${account_reference} not found in DBT beneficiary ledger`,
          retryable: false,
          correlation_id: correlationId,
        },
        httpStatus: 404,
      };
    }

    // 4. Return exact expected contract
    return {
      data: {
        status: 'VERIFIED',
        account_reference: record.account_reference,
        account_holder_match: record.account_holder_match,
        verification_id: record.verification_id,
      },
      httpStatus: 200,
    };
  }
}

export const mockDepartmentService = new MockDepartmentService();
export default mockDepartmentService;
