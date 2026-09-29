-- ==============================================================================
-- Cross-Department Service Interoperability & Orchestration Platform
-- PostgreSQL Seed Data (Deterministic Synthetic Demo Data)
-- Step 2: Test Datasets & Initial State Configurations
-- ==============================================================================

-- Clean existing data in reverse dependency order to ensure safe re-seeding
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE audit_logs CASCADE;
TRUNCATE TABLE api_requests CASCADE;
TRUNCATE TABLE api_services CASCADE;
TRUNCATE TABLE workflow_steps CASCADE;
TRUNCATE TABLE workflow_definition_steps CASCADE;
TRUNCATE TABLE workflow_definitions CASCADE;
TRUNCATE TABLE data_mappings CASCADE;
TRUNCATE TABLE consents CASCADE;
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE applications CASCADE;
TRUNCATE TABLE bank_records CASCADE;
TRUNCATE TABLE income_records CASCADE;
TRUNCATE TABLE education_records CASCADE;
TRUNCATE TABLE citizens CASCADE;

-- ==============================================================================
-- 1. CITIZENS
-- ==============================================================================
INSERT INTO citizens (
    citizen_id, 
    full_name, 
    date_of_birth, 
    gender, 
    email, 
    phone_masked, 
    aadhaar_virtual_id, 
    address_line, 
    district, 
    state, 
    pincode, 
    status
) VALUES 
(
    'CZN-1001',
    'Aarav Sharma',
    '2004-05-15',
    'MALE',
    'aarav.sharma@demo-gov.in',
    '+91-XXXXX-98765',
    'VID-9901-8822-7733',
    'H.No 42, Civil Lines, University Road',
    'North District',
    'State of Prant',
    '110001',
    'ACTIVE'
),
(
    'CZN-1002',
    'Pooja Verma',
    '2003-11-20',
    'FEMALE',
    'pooja.verma@demo-gov.in',
    '+91-XXXXX-12345',
    'VID-9901-3344-5566',
    'Flat 304, Green Park Society',
    'West District',
    'State of Prant',
    '110016',
    'ACTIVE'
);

-- ==============================================================================
-- 2. EDUCATION RECORDS (Department of Higher Education Store)
-- ==============================================================================
INSERT INTO education_records (
    student_id,
    citizen_id,
    full_name,
    institution_code,
    institution_name,
    university_board,
    course,
    current_year,
    enrollment_status,
    cgpa,
    attendance_percentage,
    passing_status,
    disciplinary_action,
    verified_at
) VALUES 
(
    'STU-1001',
    'CZN-1001',
    'Aarav Sharma',
    'INST-NIT-04',
    'National Institute of Technology',
    'Central Technical University Board',
    'B.Tech Computer Science & Engineering',
    3,
    'ENROLLED',
    8.75,
    91.20,
    TRUE,
    FALSE,
    CURRENT_TIMESTAMP
),
(
    'STU-1002',
    'CZN-1002',
    'Pooja Verma',
    'INST-SUT-12',
    'State University of Technology',
    'State Higher Education Council',
    'B.Sc Data Science & Artificial Intelligence',
    2,
    'ENROLLED',
    7.90,
    86.50,
    TRUE,
    FALSE,
    CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 3. INCOME RECORDS (Department of Revenue Store)
-- ==============================================================================
INSERT INTO income_records (
    income_certificate_no,
    citizen_id,
    applicant_name,
    annual_income,
    issuing_district,
    issuing_authority,
    certificate_category,
    issue_date,
    valid_until,
    status,
    verified_at
) VALUES 
(
    'INC-5001',
    'CZN-1001',
    'Aarav Sharma',
    180000.00,
    'North District',
    'Office of Sub-Divisional Magistrate (North)',
    'GENERAL_EWS',
    '2025-04-10',
    '2027-03-31',
    'VALID',
    CURRENT_TIMESTAMP
),
(
    'INC-5002',
    'CZN-1002',
    'Pooja Verma',
    210000.00,
    'West District',
    'Office of Sub-Divisional Magistrate (West)',
    'LOW_INCOME',
    '2025-05-18',
    '2027-03-31',
    'VALID',
    CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 4. BANK RECORDS (Public Financial Management / DBT Store)
-- ==============================================================================
INSERT INTO bank_records (
    account_reference,
    citizen_id,
    account_holder_name,
    bank_name,
    ifsc_code,
    account_number_masked,
    is_aadhaar_seeded,
    dbt_active,
    npci_mapper_status,
    last_verified_at
) VALUES 
(
    'BANK-7001',
    'CZN-1001',
    'Aarav Sharma',
    'State Bank of India',
    'SBIN0001234',
    'XXXX-XXXX-4421',
    TRUE,
    TRUE,
    'ACTIVE',
    CURRENT_TIMESTAMP
),
(
    'BANK-7002',
    'CZN-1002',
    'Pooja Verma',
    'Punjab National Bank',
    'PUNB0005678',
    'XXXX-XXXX-8899',
    TRUE,
    TRUE,
    'ACTIVE',
    CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 5. APPLICATIONS (Service Request Submissions)
-- ==============================================================================
INSERT INTO applications (
    application_id,
    citizen_id,
    service_code,
    workflow_code,
    workflow_version,
    scheme_name,
    status,
    academic_year,
    declared_income,
    student_id,
    income_certificate_no,
    account_reference,
    current_step,
    submission_date,
    benefit_amount,
    remarks
) VALUES 
(
    'SCH-2026-001',
    'CZN-1001',
    'HIGHER_EDU_SCHOLARSHIP',
    'WF-SCHOLARSHIP-V1',
    '1.0.0',
    'Post-Matric Merit-cum-Means Financial Assistance Scheme',
    'SUBMITTED',
    '2025-2026',
    180000.00,
    'STU-1001',
    'INC-5001',
    'BANK-7001',
    'APPLICATION_RECEIVED',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    25000.00,
    'Primary demo application for full automated orchestration pipeline.'
),
(
    'SCH-2026-002',
    'CZN-1001',
    'HIGHER_EDU_SCHOLARSHIP',
    'WF-SCHOLARSHIP-V1',
    '1.0.0',
    'Post-Matric Merit-cum-Means Financial Assistance Scheme',
    'SUBMITTED',
    '2025-2026',
    180000.00,
    'STU-9999',
    'INC-5001',
    'BANK-7001',
    'APPLICATION_RECEIVED',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    25000.00,
    'Test application designed for Education Department verification failure.'
),
(
    'SCH-2026-003',
    'CZN-1001',
    'HIGHER_EDU_SCHOLARSHIP',
    'WF-SCHOLARSHIP-V1',
    '1.0.0',
    'Post-Matric Merit-cum-Means Financial Assistance Scheme',
    'SUBMITTED',
    '2025-2026',
    180000.00,
    'STU-1001',
    'INC-9999',
    'BANK-7001',
    'APPLICATION_RECEIVED',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    25000.00,
    'Test application designed for Revenue/Income Department verification failure.'
),
(
    'SCH-2026-004',
    'CZN-1001',
    'HIGHER_EDU_SCHOLARSHIP',
    'WF-SCHOLARSHIP-V1',
    '1.0.0',
    'Post-Matric Merit-cum-Means Financial Assistance Scheme',
    'SUBMITTED',
    '2025-2026',
    180000.00,
    'STU-1001',
    'INC-5001',
    'BANK-9999',
    'APPLICATION_RECEIVED',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    25000.00,
    'Test application designed for Bank/DBT Department verification failure.'
),
(
    'SCH-2026-005',
    'CZN-1001',
    'HIGHER_EDU_SCHOLARSHIP',
    'WF-SCHOLARSHIP-V1',
    '1.0.0',
    'Post-Matric Merit-cum-Means Financial Assistance Scheme',
    'FAILED',
    '2025-2026',
    180000.00,
    'STU-1001',
    'INC-5001',
    'BANK-7001',
    'BANK_VERIFICATION',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    25000.00,
    'Test application for workflow resume capability after transient failure.'
);

-- ==============================================================================
-- 6. CONSENTS (Citizen Consent Artifacts)
-- ==============================================================================
INSERT INTO consents (
    consent_id,
    citizen_id,
    application_id,
    purpose,
    allowed_departments,
    data_scopes,
    status,
    granted_at,
    valid_from,
    valid_until,
    ip_address
) VALUES 
(
    'CNS-8801',
    'CZN-1001',
    'SCH-2026-001',
    'Scholarship eligibility verification',
    ARRAY['EDU', 'REV', 'DBT'],
    ARRAY['Education verification', 'Income verification', 'Bank verification status'],
    'GRANTED',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP + INTERVAL '180 days',
    '127.0.0.1'
),
(
    'CNS-8802',
    'CZN-1001',
    'SCH-2026-002',
    'Scholarship eligibility verification',
    ARRAY['EDU', 'REV', 'DBT'],
    ARRAY['Education verification', 'Income verification', 'Bank verification status'],
    'GRANTED',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    CURRENT_TIMESTAMP + INTERVAL '180 days',
    '127.0.0.1'
),
(
    'CNS-8803',
    'CZN-1001',
    'SCH-2026-003',
    'Scholarship eligibility verification',
    ARRAY['EDU', 'REV', 'DBT'],
    ARRAY['Education verification', 'Income verification', 'Bank verification status'],
    'GRANTED',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    CURRENT_TIMESTAMP + INTERVAL '180 days',
    '127.0.0.1'
),
(
    'CNS-8804',
    'CZN-1001',
    'SCH-2026-004',
    'Scholarship eligibility verification',
    ARRAY['EDU', 'REV', 'DBT'],
    ARRAY['Education verification', 'Income verification', 'Bank verification status'],
    'GRANTED',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    CURRENT_TIMESTAMP + INTERVAL '180 days',
    '127.0.0.1'
),
(
    'CNS-8805',
    'CZN-1001',
    'SCH-2026-005',
    'Scholarship eligibility verification',
    ARRAY['EDU', 'REV', 'DBT'],
    ARRAY['Education verification', 'Income verification', 'Bank verification status'],
    'GRANTED',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    CURRENT_TIMESTAMP + INTERVAL '180 days',
    '127.0.0.1'
);

-- ==============================================================================
-- 7. WORKFLOW STEPS (Seeded Step Instances for Resume Test SCH-2026-005)
-- ==============================================================================
INSERT INTO workflow_steps (
    application_id,
    step_number,
    step_identifier,
    step_name,
    department_code,
    status,
    request_payload,
    response_payload,
    error_details,
    execution_time_ms,
    retry_count,
    attempts,
    started_at,
    completed_at
) VALUES 
(
    'SCH-2026-005',
    1,
    'APPLICATION_RECEIVED',
    'Application Received',
    'INTEROP',
    'SUCCESS',
    '{"applicationId": "SCH-2026-005", "citizenId": "CZN-1001"}'::jsonb,
    '{"verified": true, "status": "APPLICATION_RECEIVED"}'::jsonb,
    NULL,
    15,
    0,
    1,
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    CURRENT_TIMESTAMP - INTERVAL '1 day' + INTERVAL '15 milliseconds'
),
(
    'SCH-2026-005',
    2,
    'EDUCATION_VERIFICATION',
    'Education Verification',
    'EDU',
    'SUCCESS',
    '{"studentId": "STU-1001", "citizenId": "CZN-1001"}'::jsonb,
    '{"status": "VERIFIED", "studentId": "STU-1001", "cgpa": 8.75}'::jsonb,
    NULL,
    95,
    0,
    1,
    CURRENT_TIMESTAMP - INTERVAL '1 day' + INTERVAL '20 milliseconds',
    CURRENT_TIMESTAMP - INTERVAL '1 day' + INTERVAL '115 milliseconds'
),
(
    'SCH-2026-005',
    3,
    'INCOME_VERIFICATION',
    'Income Verification',
    'REV',
    'SUCCESS',
    '{"income_certificate_no": "INC-5001", "citizenId": "CZN-1001"}'::jsonb,
    '{"status": "VERIFIED", "annualIncome": 180000.00, "category": "LOW_INCOME"}'::jsonb,
    NULL,
    110,
    0,
    1,
    CURRENT_TIMESTAMP - INTERVAL '1 day' + INTERVAL '120 milliseconds',
    CURRENT_TIMESTAMP - INTERVAL '1 day' + INTERVAL '230 milliseconds'
),
(
    'SCH-2026-005',
    4,
    'BANK_VERIFICATION',
    'Bank Verification',
    'DBT',
    'FAILED',
    '{"account_reference": "BANK-7001", "citizenId": "CZN-1001"}'::jsonb,
    '{}'::jsonb,
    'Simulated transient PFMS bank gateway timeout (retryable)',
    250,
    1,
    1,
    CURRENT_TIMESTAMP - INTERVAL '1 day' + INTERVAL '235 milliseconds',
    CURRENT_TIMESTAMP - INTERVAL '1 day' + INTERVAL '485 milliseconds'
);

-- ==============================================================================
-- 8. API SERVICES (Department Connector Directory)
-- ==============================================================================
INSERT INTO api_services (
    service_code,
    department_code,
    service_name,
    protocol,
    connector_type,
    endpoint,
    base_url,
    health_endpoint,
    health_status,
    response_time_ms,
    timeout_ms,
    retry_limit,
    status
) VALUES 
(
    'SRV-EDU-01',
    'EDU',
    'National Academic Depository & Enrollment Registry',
    'REST_JSON',
    'REST',
    '/api/education/verify',
    'http://internal-mesh/api/v1/education',
    '/health',
    'HEALTHY',
    42,
    5000,
    3,
    'ACTIVE'
),
(
    'SRV-REV-01',
    'REV',
    'Revenue Administration & Caste/Income Certificate Registry',
    'REST_JSON',
    'REST',
    '/api/income/verify',
    'http://internal-mesh/api/v1/revenue',
    '/health',
    'HEALTHY',
    35,
    5000,
    3,
    'ACTIVE'
),
(
    'SRV-DBT-01',
    'DBT',
    'Public Financial Management System (PFMS) & NPCI Seeding Gateway',
    'REST_JSON',
    'REST',
    '/api/bank/verify',
    'http://internal-mesh/api/v1/pfms',
    '/health',
    'HEALTHY',
    48,
    5000,
    3,
    'ACTIVE'
),
(
    'SRV-LEG-01',
    'LEG',
    'Legacy Mainframe Central Records Archive',
    'SOAP_XML',
    'LEGACY',
    '/soap/legacy-records',
    'http://internal-mesh/soap/legacy-records',
    '/status',
    'HEALTHY',
    115,
    8000,
    2,
    'ACTIVE'
),
(
    'SRV-MCK-01',
    'INTEROP',
    'Mock Interoperability Simulation Gateway',
    'REST_JSON',
    'MOCK',
    '/api/mock/ping',
    'http://internal-mesh/api/v1/mock',
    '/health',
    'HEALTHY',
    18,
    3000,
    2,
    'ACTIVE'
),
(
    'SRV-SBX-01',
    'DBT',
    'Disbursement Clearing & Settlement Sandbox',
    'REST_JSON',
    'SANDBOX',
    '/api/bank/sandbox-verify',
    'http://internal-mesh/api/v1/sandbox',
    '/health',
    'HEALTHY',
    24,
    5000,
    3,
    'ACTIVE'
);

-- ==============================================================================
-- 9. API REQUESTS (Telemetry & Dispatch Logs)
-- ==============================================================================
INSERT INTO api_requests (
    request_id,
    application_id,
    service_code,
    endpoint,
    http_method,
    request_headers,
    request_body,
    response_status_code,
    response_body,
    latency_ms,
    status,
    timestamp
) VALUES 
(
    'REQ-2026-9001',
    'SCH-2026-001',
    'SRV-EDU-01',
    '/api/v1/education/verify-student',
    'POST',
    '{"X-Consent-ID": "CNS-8801", "Content-Type": "application/json"}'::jsonb,
    '{"studentId": "STU-1001", "academicYear": "2025-2026"}'::jsonb,
    200,
    '{"verified": true, "cgpa": 8.75, "attendance": 91.2, "institution": "INST-NIT-04"}'::jsonb,
    118,
    'SUCCESS',
    CURRENT_TIMESTAMP - INTERVAL '1 day'
),
(
    'REQ-2026-9002',
    'SCH-2026-001',
    'SRV-REV-01',
    '/api/v1/revenue/verify-income',
    'POST',
    '{"X-Consent-ID": "CNS-8801", "Content-Type": "application/json"}'::jsonb,
    '{"certificateNumber": "INC-5001", "district": "North District"}'::jsonb,
    200,
    '{"status": "VALID", "annualIncome": 180000.00, "category": "GENERAL_EWS"}'::jsonb,
    145,
    'SUCCESS',
    CURRENT_TIMESTAMP - INTERVAL '2 hours'
);

-- ==============================================================================
-- 10. AUDIT LOGS (Immutable Traceability)
-- ==============================================================================
INSERT INTO audit_logs (
    request_id,
    actor_type,
    actor_id,
    department_code,
    action,
    entity_type,
    entity_id,
    status,
    ip_address,
    metadata,
    timestamp
) VALUES 
(
    'REQ-2026-9001',
    'WORKFLOW_ENGINE',
    'ENGINE-NODE-01',
    'EDU',
    'FETCH_ACADEMIC_RECORD',
    'STUDENT',
    'STU-1001',
    'SUCCESS',
    '127.0.0.1',
    '{"consentId": "CNS-8801", "cgpa": 8.75}'::jsonb,
    CURRENT_TIMESTAMP - INTERVAL '1 day'
),
(
    'REQ-2026-9002',
    'WORKFLOW_ENGINE',
    'ENGINE-NODE-01',
    'REV',
    'FETCH_INCOME_RECORD',
    'INCOME_CERTIFICATE',
    'INC-5001',
    'SUCCESS',
    '127.0.0.1',
    '{"consentId": "CNS-8801", "annualIncome": 180000.00}'::jsonb,
    CURRENT_TIMESTAMP - INTERVAL '2 hours'
);

-- ==============================================================================
-- 11. NOTIFICATIONS
-- ==============================================================================
INSERT INTO notifications (
    citizen_id,
    application_id,
    type,
    channel,
    title,
    message,
    status,
    timestamp
) VALUES 
(
    'CZN-1001',
    'SCH-2026-001',
    'APPLICATION_SUBMITTED',
    'IN_APP',
    'Scholarship Application Received',
    'Your application SCH-2026-001 has been registered and scheduled for cross-departmental verification.',
    'READ',
    CURRENT_TIMESTAMP - INTERVAL '2 days'
),
(
    'CZN-1001',
    'SCH-2026-001',
    'CONSENT_GRANTED',
    'IN_APP',
    'Data Exchange Consent Active',
    'You authorized consent CNS-8801 for Education, Revenue, and PFMS record verification.',
    'READ',
    CURRENT_TIMESTAMP - INTERVAL '2 days'
),
(
    'CZN-1001',
    'SCH-2026-001',
    'ACADEMIC_VERIFIED',
    'IN_APP',
    'Education Records Verified',
    'Academic credentials (CGPA 8.75) verified successfully from National Institute of Technology.',
    'UNREAD',
    CURRENT_TIMESTAMP - INTERVAL '1 day'
);

-- ==============================================================================
-- 12. WORKFLOW DEFINITIONS
-- ==============================================================================
-- 12. WORKFLOW DEFINITIONS
-- ==============================================================================
INSERT INTO workflow_definitions (
    workflow_code,
    name,
    description,
    version,
    is_active
) VALUES 
(
    'WF-SCHOLARSHIP-V1',
    'Post-Matric Scholarship Verification Pipeline v1',
    'End-to-end automated orchestration pipeline validating academic enrollment, income eligibility, and DBT account readiness',
    '1.0.0',
    TRUE
),
(
    'WF-SCHOLARSHIP-V2',
    'Post-Matric Scholarship Verification Pipeline v2',
    'Next-generation scholarship verification pipeline with dynamic fraud scoring and instant DBT trigger',
    '2.0.0',
    FALSE
);

-- ==============================================================================
-- 13. WORKFLOW DEFINITION STEPS (Scholarship v1: 7-Step Sequence)
-- 1. Application Received
-- 2. Education Verification
-- 3. Income Verification
-- 4. Bank Verification
-- 5. Eligibility Check
-- 6. Officer Approval
-- 7. Completion
-- ==============================================================================
INSERT INTO workflow_definition_steps (
    workflow_code,
    workflow_version,
    step_order,
    step_identifier,
    step_name,
    department_code,
    is_mandatory,
    is_enabled,
    timeout_seconds,
    retry_policy
) VALUES 
(
    'WF-SCHOLARSHIP-V1',
    '1.0.0',
    1,
    'APPLICATION_RECEIVED',
    'Application Received',
    'INTEROP',
    TRUE,
    TRUE,
    15,
    '{"maxRetries": 1, "backoffMs": 500}'::jsonb
),
(
    'WF-SCHOLARSHIP-V1',
    '1.0.0',
    2,
    'EDUCATION_VERIFICATION',
    'Education Verification',
    'EDU',
    TRUE,
    TRUE,
    30,
    '{"maxRetries": 3, "backoffMs": 1000}'::jsonb
),
(
    'WF-SCHOLARSHIP-V1',
    '1.0.0',
    3,
    'INCOME_VERIFICATION',
    'Income Verification',
    'REV',
    TRUE,
    TRUE,
    30,
    '{"maxRetries": 3, "backoffMs": 1000}'::jsonb
),
(
    'WF-SCHOLARSHIP-V1',
    '1.0.0',
    4,
    'BANK_VERIFICATION',
    'Bank Verification',
    'DBT',
    TRUE,
    TRUE,
    30,
    '{"maxRetries": 3, "backoffMs": 1000}'::jsonb
),
(
    'WF-SCHOLARSHIP-V1',
    '1.0.0',
    5,
    'ELIGIBILITY_CHECK',
    'Eligibility Check',
    'INTEROP',
    TRUE,
    TRUE,
    15,
    '{"maxRetries": 1, "backoffMs": 500}'::jsonb
),
(
    'WF-SCHOLARSHIP-V1',
    '1.0.0',
    6,
    'OFFICER_APPROVAL',
    'Officer Approval',
    'INTEROP',
    TRUE,
    TRUE,
    30,
    '{"maxRetries": 2, "backoffMs": 500}'::jsonb
),
(
    'WF-SCHOLARSHIP-V1',
    '1.0.0',
    7,
    'COMPLETION',
    'Completion',
    'INTEROP',
    TRUE,
    TRUE,
    15,
    '{"maxRetries": 1, "backoffMs": 500}'::jsonb
),
-- Alternate v2 workflow sequence to demonstrate multi-version configuration in DB
(
    'WF-SCHOLARSHIP-V2',
    '2.0.0',
    1,
    'APPLICATION_RECEIVED',
    'Application Received (v2 Fast-Track)',
    'INTEROP',
    TRUE,
    TRUE,
    10,
    '{"maxRetries": 1, "backoffMs": 500}'::jsonb
),
(
    'WF-SCHOLARSHIP-V2',
    '2.0.0',
    2,
    'INTEGRATED_VERIFICATION',
    'Integrated Multi-Agency Instant Verification',
    'INTEROP',
    TRUE,
    TRUE,
    20,
    '{"maxRetries": 2, "backoffMs": 500}'::jsonb
),
(
    'WF-SCHOLARSHIP-V2',
    '2.0.0',
    3,
    'DIRECT_DISBURSEMENT',
    'Automated Direct Benefit Transfer Clearance',
    'DBT',
    TRUE,
    TRUE,
    15,
    '{"maxRetries": 2, "backoffMs": 500}'::jsonb
);

-- ==============================================================================
-- 14. DATA MAPPINGS
-- ==============================================================================
INSERT INTO data_mappings (
    source_department,
    source_schema_name,
    target_canonical_model,
    mapping_rules,
    version,
    is_active
) VALUES 
(
    'EDU',
    'state_univ_student_v2',
    'CANONICAL_ACADEMIC_RECORD',
    '{
        "fields": {
            "student_id": "studentId",
            "institution_name": "collegeName",
            "cgpa": "gradePointsAverage",
            "attendance_percentage": "attendanceRate"
        },
        "transformations": {
            "isPassing": "cgpa >= 5.0 && attendance_percentage >= 75.0"
        }
    }'::jsonb,
    '1.0',
    TRUE
),
(
    'REV',
    'revenue_income_cert_v1',
    'CANONICAL_INCOME_RECORD',
    '{
        "fields": {
            "income_certificate_no": "cert_number",
            "annual_income": "gross_annual_income",
            "status": "validity_status"
        },
        "transformations": {
            "isEwsEligible": "annual_income <= 250000.00"
        }
    }'::jsonb,
    '1.0',
    TRUE
),
(
    'DBT',
    'pfms_beneficiary_v1',
    'CANONICAL_BANK_RECORD',
    '{
        "fields": {
            "account_reference": "ref_id",
            "account_number_masked": "account_masked",
            "is_aadhaar_seeded": "aadhaar_linked",
            "dbt_active": "active_for_dbt"
        }
    }'::jsonb,
    '1.0',
    TRUE
);

-- ==============================================================================
-- 15. USERS (Demo System & Role Accounts)
-- Password for all demo accounts: demo123
-- SHA-256 hash: d82494f05d6917ba02f7aaa29689ccb444bb73f20380876cb05d1f37537b7892
-- ==============================================================================
INSERT INTO users (
    username,
    password_hash,
    role,
    citizen_id,
    department_code,
    full_name,
    email,
    is_active
) VALUES 
(
    'citizen',
    'd82494f05d6917ba02f7aaa29689ccb444bb73f20380876cb05d1f37537b7892',
    'CITIZEN',
    'CZN-1001',
    'CITIZEN',
    'Aarav Sharma',
    'aarav.sharma@demo-gov.in',
    TRUE
),
(
    'edu_officer',
    'd82494f05d6917ba02f7aaa29689ccb444bb73f20380876cb05d1f37537b7892',
    'EDUCATION_OFFICER',
    NULL,
    'EDU',
    'Dr. Ramesh Kumar',
    'ramesh.kumar@edu.demo-gov.in',
    TRUE
),
(
    'rev_officer',
    'd82494f05d6917ba02f7aaa29689ccb444bb73f20380876cb05d1f37537b7892',
    'REVENUE_OFFICER',
    NULL,
    'REV',
    'Smt. Sunita Devi',
    'sunita.devi@rev.demo-gov.in',
    TRUE
),
(
    'bank_officer',
    'd82494f05d6917ba02f7aaa29689ccb444bb73f20380876cb05d1f37537b7892',
    'BANK_DBT_OFFICER',
    NULL,
    'DBT',
    'Vikram Malhotra',
    'vikram.malhotra@pfms.demo-gov.in',
    TRUE
),
(
    'admin',
    'd82494f05d6917ba02f7aaa29689ccb444bb73f20380876cb05d1f37537b7892',
    'ADMIN',
    NULL,
    'ADMIN',
    'Platform Administrator',
    'admin@platform.demo-gov.in',
    TRUE
),
(
    'system',
    'd82494f05d6917ba02f7aaa29689ccb444bb73f20380876cb05d1f37537b7892',
    'SYSTEM',
    NULL,
    'INTEROP',
    'Interoperability System Engine',
    'system.daemon@platform.demo-gov.in',
    TRUE
);

-- ==============================================================================
-- 16. FIELD DATA MAPPINGS (Canonical Field-Level Transformation Registry)
-- ==============================================================================
INSERT INTO field_data_mappings (
    source_system, source_field, canonical_field, transformation_rule, department_code, description, is_active
) VALUES 
('Education', 'student_id', 'studentId', 'direct', 'EDU', 'Maps student registry identifier directly to canonical studentId', TRUE),
('Education', 'status', 'status', 'VERIFIED / NOT_VERIFIED', 'EDU', 'Transforms enrollment verification code to standard status enum', TRUE),
('Education', 'institution_code', 'institutionCode', 'direct', 'EDU', 'Maps educational institution AISHE/university code directly', TRUE),
('Income', 'annual_income', 'annualIncome', 'number', 'REV', 'Parses currency/string values into numeric precision format', TRUE),
('Income', 'category', 'incomeCategory', 'direct', 'REV', 'Direct passthrough of revenue certificate classification category', TRUE),
('Income', 'status', 'validityStatus', 'VALID / EXPIRED', 'REV', 'Validates certificate validity timestamp against current date', TRUE),
('Bank', 'holder_match', 'accountHolderMatch', 'boolean', 'DBT', 'Coerces string/integer match flags into strict boolean type', TRUE),
('Bank', 'verification_id', 'verificationId', 'direct', 'DBT', 'Direct preservation of PFMS / NPCI transaction audit reference', TRUE),
('Bank', 'dbt_active', 'dbtActive', 'boolean', 'DBT', 'Verifies active Aadhaar payment bridge enablement status', TRUE),
('Bank', 'account_reference', 'accountReference', 'direct', 'DBT', 'Maps masked beneficiary bank account identifier directly', TRUE),
('Legacy', 'RECORD_ID', 'legacyRecordId', 'direct', 'LEG', 'Extracts mainframe punchcard key directly into archive tracking ID', TRUE),
('Legacy', 'FLAG_MATCH', 'recordMatch', 'boolean', 'LEG', 'Normalizes legacy Y/N string indicator to canonical boolean', TRUE)
ON CONFLICT (source_system, source_field, canonical_field) DO NOTHING;

