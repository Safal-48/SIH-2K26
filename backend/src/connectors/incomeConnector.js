import BaseConnector, { CONNECTOR_TYPES } from './baseConnector.js';
import mockDepartmentService from '../services/mockDepartment.service.js';

/**
 * Income / Revenue Department Connector Module
 * Connects to the Department of Revenue for annual household income certificate validation.
 */
export class IncomeConnector extends BaseConnector {
  constructor(options = {}) {
    super('REV', 'Department of Revenue & Land Records', {
      endpoint: '/income/verify',
      ...options,
    });
  }

  /**
   * Build departmental request payload from canonical workflow parameters
   */
  buildPayload(canonicalRequest = {}) {
    return {
      citizen_id: canonicalRequest.citizen_id || canonicalRequest.citizenId,
      income_certificate_no:
        canonicalRequest.income_certificate_no ||
        canonicalRequest.incomeCertificateNo ||
        canonicalRequest.certificate_number ||
        canonicalRequest.certificateNumber,
    };
  }

  /**
   * Normalize departmental response to canonical platform schema
   */
  normalizeResponse(raw = {}, canonicalRequest = {}) {
    const annualIncome = Number(raw.annual_income || 0);

    return {
      status: raw.status || 'VERIFIED',
      annual_income: annualIncome,
      income_category: raw.income_category || 'GENERAL',
      verification_id: raw.verification_id,
      is_eligible_for_subsidy: annualIncome <= 250000.0,
      verified_at: new Date().toISOString(),
    };
  }

  /**
   * Direct in-process MOCK mode execution (bypasses HTTP when desired)
   */
  async executeMock(canonicalRequest, correlationId, options = {}) {
    const payload = this.buildPayload(canonicalRequest);
    const result = await mockDepartmentService.verifyIncome(payload, {
      mockMode: options.mockMode,
      correlationId,
      requestDelay: options.mockDelay || 0,
    });

    if (result.error) {
      const err = new Error(result.error.message);
      Object.assign(err, result.error);
      throw err;
    }

    return result.data;
  }

  /**
   * Deterministic SANDBOX execution
   */
  async executeSandbox(canonicalRequest, correlationId, options = {}) {
    return {
      status: 'VERIFIED',
      annual_income: 180000,
      income_category: 'LOW_INCOME (Sandbox)',
      verification_id: `INC-SANDBOX-${Date.now().toString().slice(-4)}`,
    };
  }
}

export const incomeConnector = new IncomeConnector();
export default incomeConnector;
