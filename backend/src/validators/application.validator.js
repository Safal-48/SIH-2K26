import { z } from 'zod';

/**
 * Normalizes input payload supporting both camelCase and snake_case keys
 */
export function normalizeApplicationPayload(body) {
  if (!body || typeof body !== 'object') return {};
  return {
    citizen_id: body.citizen_id !== undefined ? String(body.citizen_id).trim() : (body.citizenId !== undefined ? String(body.citizenId).trim() : undefined),
    student_id: body.student_id !== undefined ? String(body.student_id).trim() : (body.studentId !== undefined ? String(body.studentId).trim() : undefined),
    institution_code: body.institution_code !== undefined ? String(body.institution_code).trim() : (body.institutionCode !== undefined ? String(body.institutionCode).trim() : undefined),
    income_certificate_no: body.income_certificate_no !== undefined ? String(body.income_certificate_no).trim() : (body.incomeCertificateNo !== undefined ? String(body.incomeCertificateNo).trim() : undefined),
    account_reference: body.account_reference !== undefined ? String(body.account_reference).trim() : (body.accountReference !== undefined ? String(body.accountReference).trim() : (body.bank_reference !== undefined ? String(body.bank_reference).trim() : (body.bankReference !== undefined ? String(body.bankReference).trim() : undefined))),
    scheme_name: body.scheme_name || body.schemeName || 'Post-Matric Merit-cum-Means Financial Assistance Scheme',
    academic_year: body.academic_year || body.academicYear || '2025-2026',
    declared_income: body.declared_income !== undefined ? Number(body.declared_income) : (body.declaredIncome !== undefined ? Number(body.declaredIncome) : 180000.00),
    benefit_amount: body.benefit_amount !== undefined ? Number(body.benefit_amount) : (body.benefitAmount !== undefined ? Number(body.benefitAmount) : 25000.00),
    consent_granted: body.consent_granted !== undefined ? Boolean(body.consent_granted) : (body.consentGranted !== undefined ? Boolean(body.consentGranted) : false),
  };
}

/**
 * Detailed Server-Side Validation Function
 * Ensures missing fields and malformed identifiers produce actionable 400 error contracts
 */
export function validateApplicationInput(payload) {
  const normalized = normalizeApplicationPayload(payload);

  // 1. Check for missing required identifiers
  const missingFields = [];
  if (!normalized.citizen_id) missingFields.push('citizen_id');
  if (!normalized.student_id) missingFields.push('student_id');
  if (!normalized.institution_code) missingFields.push('institution_code');
  if (!normalized.income_certificate_no) missingFields.push('income_certificate_no');
  if (!normalized.account_reference) missingFields.push('bank_reference / account_reference');

  if (missingFields.length > 0) {
    return {
      isValid: false,
      errorCode: 'MISSING_REQUIRED_FIELD',
      statusCode: 400,
      message: `Missing required application identifier(s): ${missingFields.join(', ')}`,
      details: { missingFields },
      normalized,
    };
  }

  // 2. Validate identifier formats (Malformed check)
  const citizenRegex = /^CZN-[A-Za-z0-9-]+$/;
  if (!citizenRegex.test(normalized.citizen_id)) {
    return {
      isValid: false,
      errorCode: 'MALFORMED_IDENTIFIER',
      statusCode: 400,
      message: `Malformed citizen_id: '${normalized.citizen_id}'. Must follow format CZN-XXXX (e.g. CZN-1001)`,
      details: { field: 'citizen_id', value: normalized.citizen_id, expectedFormat: 'CZN-XXXX' },
      normalized,
    };
  }

  const studentRegex = /^STU-[A-Za-z0-9-]+$/;
  if (!studentRegex.test(normalized.student_id)) {
    return {
      isValid: false,
      errorCode: 'MALFORMED_IDENTIFIER',
      statusCode: 400,
      message: `Malformed student_id: '${normalized.student_id}'. Must follow format STU-XXXX (e.g. STU-1001)`,
      details: { field: 'student_id', value: normalized.student_id, expectedFormat: 'STU-XXXX' },
      normalized,
    };
  }

  const instRegex = /^[A-Za-z0-9-]+$/;
  if (!instRegex.test(normalized.institution_code) || normalized.institution_code.length < 3) {
    return {
      isValid: false,
      errorCode: 'MALFORMED_IDENTIFIER',
      statusCode: 400,
      message: `Malformed institution_code: '${normalized.institution_code}'. Must be alphanumeric code (e.g. INST-NIT-04 or COL-001)`,
      details: { field: 'institution_code', value: normalized.institution_code },
      normalized,
    };
  }

  const incomeRegex = /^INC-[A-Za-z0-9-]+$/;
  if (!incomeRegex.test(normalized.income_certificate_no)) {
    return {
      isValid: false,
      errorCode: 'MALFORMED_IDENTIFIER',
      statusCode: 400,
      message: `Malformed income_certificate_no: '${normalized.income_certificate_no}'. Must follow format INC-XXXX (e.g. INC-5001)`,
      details: { field: 'income_certificate_no', value: normalized.income_certificate_no, expectedFormat: 'INC-XXXX' },
      normalized,
    };
  }

  const bankRegex = /^BANK-[A-Za-z0-9-]+$/;
  if (!bankRegex.test(normalized.account_reference)) {
    return {
      isValid: false,
      errorCode: 'MALFORMED_IDENTIFIER',
      statusCode: 400,
      message: `Malformed bank_reference / account_reference: '${normalized.account_reference}'. Must follow format BANK-XXXX (e.g. BANK-7001)`,
      details: { field: 'account_reference', value: normalized.account_reference, expectedFormat: 'BANK-XXXX' },
      normalized,
    };
  }

  return {
    isValid: true,
    normalized,
  };
}

export default {
  normalizeApplicationPayload,
  validateApplicationInput,
};
