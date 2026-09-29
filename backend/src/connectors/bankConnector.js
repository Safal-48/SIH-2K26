import BaseConnector, { CONNECTOR_TYPES } from './baseConnector.js';
import mockDepartmentService from '../services/mockDepartment.service.js';

/**
 * Bank / DBT Connector Module
 * Connects to Public Financial Management System (PFMS) & Core Banking for beneficiary account and Aadhaar seeding verification.
 */
export class BankConnector extends BaseConnector {
  constructor(options = {}) {
    super('DBT', 'Public Financial Management & DBT Gateway', {
      endpoint: '/bank/verify',
      ...options,
    });
  }

  /**
   * Build departmental request payload from canonical workflow parameters
   */
  buildPayload(canonicalRequest = {}) {
    return {
      citizen_id: canonicalRequest.citizen_id || canonicalRequest.citizenId,
      account_reference:
        canonicalRequest.account_reference ||
        canonicalRequest.accountReference ||
        canonicalRequest.account_number ||
        canonicalRequest.accountNumber,
    };
  }

  /**
   * Normalize departmental response to canonical platform schema
   */
  normalizeResponse(raw = {}, canonicalRequest = {}) {
    return {
      status: raw.status || 'VERIFIED',
      account_reference: raw.account_reference,
      account_holder_match: Boolean(raw.account_holder_match),
      verification_id: raw.verification_id,
      is_dbt_ready: Boolean(raw.account_holder_match && raw.status === 'VERIFIED'),
      verified_at: new Date().toISOString(),
    };
  }

  /**
   * Direct in-process MOCK mode execution (bypasses HTTP when desired)
   */
  async executeMock(canonicalRequest, correlationId, options = {}) {
    const payload = this.buildPayload(canonicalRequest);
    const result = await mockDepartmentService.verifyBank(payload, {
      mockMode: options.mockMode,
      correlationId,
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
      account_reference: canonicalRequest.account_reference || 'BANK-7001',
      account_holder_match: true,
      verification_id: `BNK-SANDBOX-${Date.now().toString().slice(-4)}`,
    };
  }
}

export const bankConnector = new BankConnector();
export default bankConnector;
