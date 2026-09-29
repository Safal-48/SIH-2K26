import BaseConnector, { CONNECTOR_TYPES } from './baseConnector.js';
import mockDepartmentService from '../services/mockDepartment.service.js';

/**
 * Education Department Connector Module
 * Connects to the Department of Higher Education registry for student enrollment validation.
 */
export class EducationConnector extends BaseConnector {
  constructor(options = {}) {
    super('EDU', 'Department of Higher & Technical Education', {
      endpoint: '/education/verify',
      ...options,
    });
  }

  /**
   * Build departmental request payload from canonical workflow parameters
   */
  buildPayload(canonicalRequest = {}) {
    return {
      citizen_id: canonicalRequest.citizen_id || canonicalRequest.citizenId,
      student_id: canonicalRequest.student_id || canonicalRequest.studentId,
      institution_code: canonicalRequest.institution_code || canonicalRequest.institutionCode || 'COL-001',
    };
  }

  /**
   * Normalize departmental response to canonical platform schema
   */
  normalizeResponse(raw = {}, canonicalRequest = {}) {
    return {
      status: raw.status || 'VERIFIED',
      student_id: raw.student_id,
      course: raw.course,
      institution: raw.institution,
      academic_year: raw.year,
      verification_id: raw.verification_id,
      is_enrolled: raw.status === 'VERIFIED',
      verified_at: new Date().toISOString(),
    };
  }

  /**
   * Direct in-process MOCK mode execution (bypasses HTTP when desired)
   */
  async executeMock(canonicalRequest, correlationId, options = {}) {
    const payload = this.buildPayload(canonicalRequest);
    const result = await mockDepartmentService.verifyEducation(payload, {
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
      student_id: canonicalRequest.student_id || 'STU-1001',
      course: 'BCA (Sandbox Environment)',
      institution: 'Demo Government College Sandbox',
      year: 2026,
      verification_id: `EDU-SANDBOX-${Date.now().toString().slice(-4)}`,
    };
  }
}

export const educationConnector = new EducationConnector();
export default educationConnector;
