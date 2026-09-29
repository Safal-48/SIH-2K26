import { z } from 'zod';

/**
 * ==============================================================================
 * Comprehensive Zod Validation Schemas for Platform Requests
 * Step 17: Security, Validation and Audit Hardening
 * ==============================================================================
 */

// 1. Authentication Request Schemas
export const authSchemas = {
  login: z.object({
    identifier: z.string().optional(),
    username: z.string().optional(),
    email: z.string().optional(),
    password: z.string().min(1, 'Password is required'),
  }).refine((data) => Boolean(data.identifier || data.username || data.email), {
    message: 'Username, Citizen ID, or Email is required',
    path: ['identifier'],
  }),
  register: z.object({
    email: z.string().email('Valid email address is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    citizenId: z.string().optional(),
  }),
  sendOtp: z.object({
    email: z.string().email('Valid email address is required'),
  }),
  verifyOtp: z.object({
    email: z.string().email('Valid email address is required'),
    otp: z.string().min(4, 'OTP must be at least 4 digits'),
  }),
  forgotPassword: z.object({
    email: z.string().email('Valid email address is required'),
  }),
  resetPassword: z.object({
    email: z.string().email('Valid email address is required'),
    token: z.string().min(1, 'Reset token is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  }),
};

// 2. Application Request Schemas
export const applicationSchemas = {
  submit: z.object({
    citizen_id: z.string().regex(/^CZN-[A-Za-z0-9-]+$/, 'Malformed citizen_id: Must follow CZN-XXXX').optional(),
    citizenId: z.string().regex(/^CZN-[A-Za-z0-9-]+$/, 'Malformed citizenId: Must follow CZN-XXXX').optional(),
    student_id: z.string().regex(/^STU-[A-Za-z0-9-]+$/, 'Malformed student_id: Must follow STU-XXXX').optional(),
    studentId: z.string().regex(/^STU-[A-Za-z0-9-]+$/, 'Malformed studentId: Must follow STU-XXXX').optional(),
    institution_code: z.string().min(2, 'institution_code must be at least 2 characters').optional(),
    institutionCode: z.string().min(2, 'institutionCode must be at least 2 characters').optional(),
    income_certificate_no: z.string().regex(/^INC-[A-Za-z0-9-]+$/, 'Malformed income_certificate_no: Must follow INC-XXXX').optional(),
    incomeCertificateNo: z.string().regex(/^INC-[A-Za-z0-9-]+$/, 'Malformed incomeCertificateNo: Must follow INC-XXXX').optional(),
    account_reference: z.string().regex(/^BANK-[A-Za-z0-9-]+$/, 'Malformed account_reference: Must follow BANK-XXXX').optional(),
    accountReference: z.string().regex(/^BANK-[A-Za-z0-9-]+$/, 'Malformed accountReference: Must follow BANK-XXXX').optional(),
    bank_reference: z.string().regex(/^BANK-[A-Za-z0-9-]+$/, 'Malformed bank_reference: Must follow BANK-XXXX').optional(),
    bankReference: z.string().regex(/^BANK-[A-Za-z0-9-]+$/, 'Malformed bankReference: Must follow BANK-XXXX').optional(),
    declared_income: z.number().nonnegative('declared_income must be non-negative').optional(),
    declaredIncome: z.number().nonnegative('declaredIncome must be non-negative').optional(),
    benefit_amount: z.number().positive('benefit_amount must be positive').optional(),
    benefitAmount: z.number().positive('benefitAmount must be positive').optional(),
    scheme_name: z.string().optional(),
    schemeName: z.string().optional(),
    academic_year: z.string().optional(),
    academicYear: z.string().optional(),
    consent_granted: z.boolean().optional(),
    consentGranted: z.boolean().optional(),
  }).refine((data) => Boolean(data.citizen_id || data.citizenId), {
    message: 'Missing required application identifier: citizen_id',
    path: ['citizen_id'],
  }).refine((data) => Boolean(data.student_id || data.studentId), {
    message: 'Missing required application identifier: student_id',
    path: ['student_id'],
  }).refine((data) => Boolean(data.institution_code || data.institutionCode), {
    message: 'Missing required application identifier: institution_code',
    path: ['institution_code'],
  }).refine((data) => Boolean(data.income_certificate_no || data.incomeCertificateNo), {
    message: 'Missing required application identifier: income_certificate_no',
    path: ['income_certificate_no'],
  }).refine((data) => Boolean(data.account_reference || data.accountReference || data.bank_reference || data.bankReference), {
    message: 'Missing required application identifier: bank_reference / account_reference',
    path: ['account_reference'],
  }),
};

// 3. Citizen Consent Schemas
export const consentSchemas = {
  grant: z.object({
    purpose: z.string().min(3, 'Purpose description must be at least 3 characters').optional(),
    scope: z.union([z.array(z.string()), z.string()]).optional(),
    allowedDepartments: z.array(z.string()).optional(),
  }),
  paramsId: z.object({
    id: z.string().min(1, 'Application ID is required in URL parameters'),
  }),
};

// 4. Connector Payload Schemas
export const connectorSchemas = {
  test: z.object({
    serviceId: z.string().optional(),
    payload: z.record(z.any()).optional(),
  }).optional(),
  verify: z.object({
    endpoint: z.string().optional(),
    payload: z.record(z.any()).optional(),
  }),
};

// 5. Workflow Request Schemas
export const workflowSchemas = {
  resume: z.object({
    applicationId: z.string().min(1, 'applicationId is required').optional(),
    notes: z.string().optional(),
  }).optional(),
  retry: z.object({
    exceptionId: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
};

// 6. Admin Configuration Schemas
export const adminConfigSchemas = {
  createWorkflowVersion: z.object({
    workflowCode: z.string().min(2, 'Workflow code must be at least 2 characters'),
    version: z.string().min(1, 'Version identifier is required'),
    name: z.string().optional(),
    description: z.string().optional(),
    copyFromVersion: z.string().optional(),
    isActive: z.boolean().optional(),
  }).passthrough(),
  updateWorkflowStep: z.object({
    stepOrder: z.number().int().positive('stepOrder must be a positive integer').optional(),
    step_order: z.number().int().positive('step_order must be a positive integer').optional(),
    isEnabled: z.boolean().optional(),
    is_enabled: z.boolean().optional(),
    connectorType: z.enum(['REST', 'LEGACY', 'MOCK', 'SANDBOX'], {
      errorMap: () => ({ message: "connectorType must be one of 'REST', 'LEGACY', 'MOCK', 'SANDBOX'" }),
    }).optional(),
    connector_type: z.enum(['REST', 'LEGACY', 'MOCK', 'SANDBOX'], {
      errorMap: () => ({ message: "connector_type must be one of 'REST', 'LEGACY', 'MOCK', 'SANDBOX'" }),
    }).optional(),
    timeoutSeconds: z.number().int().positive('timeoutSeconds must be positive').optional(),
    timeout_seconds: z.number().int().positive('timeout_seconds must be positive').optional(),
    connectorConfig: z.record(z.any()).optional(),
    connector_config: z.record(z.any()).optional(),
  }).passthrough(),
  addWorkflowStep: z.object({
    stepIdentifier: z.string().min(2, 'stepIdentifier must be at least 2 characters').optional(),
    step_identifier: z.string().min(2, 'step_identifier must be at least 2 characters').optional(),
    stepName: z.string().min(2, 'stepName must be at least 2 characters').optional(),
    step_name: z.string().min(2, 'step_name must be at least 2 characters').optional(),
    departmentCode: z.string().min(2, 'departmentCode must be at least 2 characters').optional(),
    department_code: z.string().min(2, 'department_code must be at least 2 characters').optional(),
    connectorType: z.enum(['REST', 'LEGACY', 'MOCK', 'SANDBOX'], {
      errorMap: () => ({ message: "connectorType must be one of 'REST', 'LEGACY', 'MOCK', 'SANDBOX'" }),
    }).optional(),
    connector_type: z.enum(['REST', 'LEGACY', 'MOCK', 'SANDBOX'], {
      errorMap: () => ({ message: "connector_type must be one of 'REST', 'LEGACY', 'MOCK', 'SANDBOX'" }),
    }).optional(),
    stepOrder: z.number().int().positive('stepOrder must be a positive integer').optional(),
    step_order: z.number().int().positive('step_order must be a positive integer').optional(),
    connectorConfig: z.record(z.any()).optional(),
    connector_config: z.record(z.any()).optional(),
    timeoutSeconds: z.number().int().positive().optional(),
    timeout_seconds: z.number().int().positive().optional(),
    isMandatory: z.boolean().optional(),
    is_mandatory: z.boolean().optional(),
    isEnabled: z.boolean().optional(),
    is_enabled: z.boolean().optional(),
  }).passthrough().refine(
    (data) => Boolean(data.stepIdentifier || data.step_identifier),
    { message: 'stepIdentifier or step_identifier is required', path: ['stepIdentifier'] }
  ).refine(
    (data) => Boolean(data.stepName || data.step_name),
    { message: 'stepName or step_name is required', path: ['stepName'] }
  ).refine(
    (data) => Boolean(data.departmentCode || data.department_code),
    { message: 'departmentCode or department_code is required', path: ['departmentCode'] }
  ).refine(
    (data) => Boolean(data.connectorType || data.connector_type),
    { message: 'connectorType or connector_type is required', path: ['connectorType'] }
  ).refine(
    (data) => data.stepOrder !== undefined || data.step_order !== undefined,
    { message: 'stepOrder or step_order is required', path: ['stepOrder'] }
  ),
  createDataMapping: z.object({
    sourceSystem: z.string().min(1, 'Source system is required'),
    sourceField: z.string().min(1, 'Source field is required'),
    canonicalField: z.string().min(1, 'Canonical field is required'),
    transformationRule: z.string().min(1, 'Transformation rule is required'),
    departmentCode: z.string().optional(),
    description: z.string().optional(),
    sampleSourceValue: z.any().optional(),
    sampleCanonicalValue: z.any().optional(),
    isActive: z.boolean().optional(),
  }).passthrough(),
  testDataMapping: z.object({
    rule: z.string().min(1).optional(),
    transformationRule: z.string().min(1).optional(),
    value: z.any().optional(),
    sampleValue: z.any().optional(),
  }).refine((data) => Boolean(data.rule || data.transformationRule), {
    message: 'Transformation rule is required',
    path: ['rule'],
  }),
};

export default {
  authSchemas,
  applicationSchemas,
  consentSchemas,
  connectorSchemas,
  workflowSchemas,
  adminConfigSchemas,
};
