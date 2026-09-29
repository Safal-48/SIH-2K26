-- ==============================================================================
-- Cross-Department Service Interoperability & Orchestration Platform
-- PostgreSQL Relational Database Schema
-- Step 2: Canonical Data Model & Interoperability Relational Grid
-- ==============================================================================

-- ==============================================================================
-- 1. CITIZENS (Master Registry)
-- ==============================================================================
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS api_requests CASCADE;
DROP TABLE IF EXISTS api_services CASCADE;
DROP TABLE IF EXISTS workflow_steps CASCADE;
DROP TABLE IF EXISTS workflow_definition_steps CASCADE;
DROP TABLE IF EXISTS workflow_definitions CASCADE;
DROP TABLE IF EXISTS field_data_mappings CASCADE;
DROP TABLE IF EXISTS data_mappings CASCADE;
DROP TABLE IF EXISTS consents CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS bank_records CASCADE;
DROP TABLE IF EXISTS income_records CASCADE;
DROP TABLE IF EXISTS education_records CASCADE;
DROP TABLE IF EXISTS citizens CASCADE;

CREATE TABLE citizens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    citizen_id VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20) NOT NULL,
    email VARCHAR(150),
    phone_masked VARCHAR(20) NOT NULL,
    aadhaar_virtual_id VARCHAR(50) NOT NULL,
    address_line TEXT NOT NULL,
    district VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 2. APPLICATIONS (Service Request Submissions)
-- ==============================================================================
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id VARCHAR(50) UNIQUE NOT NULL,
    citizen_id VARCHAR(50) NOT NULL REFERENCES citizens(citizen_id) ON DELETE RESTRICT,
    service_code VARCHAR(50) NOT NULL DEFAULT 'HIGHER_EDU_SCHOLARSHIP',
    workflow_code VARCHAR(100) NOT NULL DEFAULT 'WF-SCHOLARSHIP-V1',
    workflow_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    scheme_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED',
    academic_year VARCHAR(20) NOT NULL DEFAULT '2025-2026',
    declared_income NUMERIC(12,2) NOT NULL,
    student_id VARCHAR(50),
    institution_code VARCHAR(50) DEFAULT 'INST-NIT-04',
    income_certificate_no VARCHAR(50),
    account_reference VARCHAR(50),
    current_step VARCHAR(100) NOT NULL DEFAULT 'APPLICATION_RECEIVED',
    submission_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approval_date TIMESTAMPTZ,
    benefit_amount NUMERIC(10,2) NOT NULL DEFAULT 25000.00,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 3. WORKFLOW STEPS (Runtime Execution States)
-- ==============================================================================
CREATE TABLE workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id VARCHAR(50) NOT NULL REFERENCES applications(application_id) ON DELETE CASCADE,
    step_number INT NOT NULL,
    step_identifier VARCHAR(100),
    step_name VARCHAR(150) NOT NULL,
    department_code VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    request_payload JSONB DEFAULT '{}'::jsonb,
    response_payload JSONB DEFAULT '{}'::jsonb,
    error_details TEXT,
    execution_time_ms INT,
    retry_count INT NOT NULL DEFAULT 0,
    attempts INT NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_app_step UNIQUE (application_id, step_number)
);

-- ==============================================================================
-- 4. EDUCATION RECORDS (Higher Education Registry Store)
-- ==============================================================================
CREATE TABLE education_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id VARCHAR(50) UNIQUE NOT NULL,
    citizen_id VARCHAR(50) NOT NULL REFERENCES citizens(citizen_id) ON DELETE RESTRICT,
    full_name VARCHAR(150) NOT NULL,
    institution_code VARCHAR(50) NOT NULL,
    institution_name VARCHAR(255) NOT NULL,
    university_board VARCHAR(255) NOT NULL,
    course VARCHAR(150) NOT NULL,
    current_year INT NOT NULL,
    enrollment_status VARCHAR(50) NOT NULL DEFAULT 'ENROLLED',
    cgpa NUMERIC(4,2) NOT NULL,
    attendance_percentage NUMERIC(5,2) NOT NULL,
    passing_status BOOLEAN NOT NULL DEFAULT TRUE,
    disciplinary_action BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 5. INCOME RECORDS (Revenue Department Registry Store)
-- ==============================================================================
CREATE TABLE income_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    income_certificate_no VARCHAR(50) UNIQUE NOT NULL,
    citizen_id VARCHAR(50) NOT NULL REFERENCES citizens(citizen_id) ON DELETE RESTRICT,
    applicant_name VARCHAR(150) NOT NULL,
    annual_income NUMERIC(12,2) NOT NULL,
    issuing_district VARCHAR(100) NOT NULL,
    issuing_authority VARCHAR(255) NOT NULL,
    certificate_category VARCHAR(50) NOT NULL DEFAULT 'GENERAL_EWS',
    issue_date DATE NOT NULL,
    valid_until DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'VALID',
    verified_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 6. BANK RECORDS (PFMS & DBT Beneficiary Registry Store)
-- ==============================================================================
CREATE TABLE bank_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_reference VARCHAR(50) UNIQUE NOT NULL,
    citizen_id VARCHAR(50) NOT NULL REFERENCES citizens(citizen_id) ON DELETE RESTRICT,
    account_holder_name VARCHAR(150) NOT NULL,
    bank_name VARCHAR(150) NOT NULL,
    ifsc_code VARCHAR(50) NOT NULL,
    account_number_masked VARCHAR(50) NOT NULL,
    is_aadhaar_seeded BOOLEAN NOT NULL DEFAULT TRUE,
    dbt_active BOOLEAN NOT NULL DEFAULT TRUE,
    npci_mapper_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    last_verified_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 7. CONSENTS (Citizen Consent Artifacts for Data Exchange)
-- ==============================================================================
CREATE TABLE consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consent_id VARCHAR(50) UNIQUE NOT NULL,
    citizen_id VARCHAR(50) NOT NULL REFERENCES citizens(citizen_id) ON DELETE RESTRICT,
    application_id VARCHAR(50) REFERENCES applications(application_id) ON DELETE CASCADE,
    purpose VARCHAR(255) NOT NULL,
    allowed_departments TEXT[] NOT NULL,
    data_scopes TEXT[] NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'GRANTED',
    granted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    ip_address VARCHAR(50) DEFAULT '127.0.0.1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 8. API SERVICES (Department Connector Directory)
-- ==============================================================================
CREATE TABLE api_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_code VARCHAR(50) UNIQUE NOT NULL,
    department_code VARCHAR(50) NOT NULL,
    service_name VARCHAR(255) NOT NULL,
    protocol VARCHAR(50) NOT NULL DEFAULT 'REST_JSON',
    connector_type VARCHAR(50) NOT NULL DEFAULT 'REST',
    endpoint VARCHAR(255) DEFAULT '/verify',
    base_url VARCHAR(500) NOT NULL,
    health_endpoint VARCHAR(255) DEFAULT '/health',
    health_status VARCHAR(50) NOT NULL DEFAULT 'HEALTHY',
    response_time_ms INT NOT NULL DEFAULT 25,
    last_checked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_test_result JSONB NOT NULL DEFAULT '{}'::jsonb,
    timeout_ms INT NOT NULL DEFAULT 5000,
    retry_limit INT NOT NULL DEFAULT 3,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 9. API REQUESTS (Cross-Department Dispatch & Telemetry)
-- ==============================================================================
CREATE TABLE api_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(100) UNIQUE NOT NULL,
    application_id VARCHAR(50) REFERENCES applications(application_id) ON DELETE SET NULL,
    service_code VARCHAR(50) REFERENCES api_services(service_code) ON DELETE RESTRICT,
    endpoint VARCHAR(255) NOT NULL,
    http_method VARCHAR(10) NOT NULL DEFAULT 'POST',
    request_headers JSONB DEFAULT '{}'::jsonb,
    request_body JSONB DEFAULT '{}'::jsonb,
    response_status_code INT,
    response_body JSONB DEFAULT '{}'::jsonb,
    latency_ms INT,
    status VARCHAR(50) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 10. AUDIT LOGS (Immutable Cryptographic Audit Trail)
-- ==============================================================================
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    request_id VARCHAR(100),
    actor_type VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    actor_id VARCHAR(100) NOT NULL,
    department_code VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id VARCHAR(100),
    status VARCHAR(50) NOT NULL,
    ip_address VARCHAR(50) DEFAULT '127.0.0.1',
    metadata JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 11. NOTIFICATIONS (Citizen & Officer Event Alerts)
-- ==============================================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    citizen_id VARCHAR(50) NOT NULL REFERENCES citizens(citizen_id) ON DELETE CASCADE,
    application_id VARCHAR(50) REFERENCES applications(application_id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    channel VARCHAR(50) NOT NULL DEFAULT 'IN_APP',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'UNREAD',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 12. WORKFLOW DEFINITIONS (Master Process Catalogue)
-- ==============================================================================
CREATE TABLE workflow_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_wf_code_version UNIQUE (workflow_code, version)
);

-- ==============================================================================
-- 13. WORKFLOW DEFINITION STEPS (Pipeline Sequence Specification)
-- ==============================================================================
CREATE TABLE workflow_definition_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_code VARCHAR(100) NOT NULL,
    workflow_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    step_order INT NOT NULL,
    step_identifier VARCHAR(100) NOT NULL,
    step_name VARCHAR(150) NOT NULL,
    department_code VARCHAR(50) NOT NULL,
    connector_type VARCHAR(50) NOT NULL DEFAULT 'REST',
    connector_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    timeout_seconds INT NOT NULL DEFAULT 30,
    retry_policy JSONB NOT NULL DEFAULT '{"maxRetries": 3, "backoffMs": 1000}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_wf_step_order UNIQUE (workflow_code, workflow_version, step_order),
    FOREIGN KEY (workflow_code, workflow_version) REFERENCES workflow_definitions(workflow_code, version) ON DELETE CASCADE
);

-- ==============================================================================
-- 14. DATA MAPPINGS (Canonical Transformation Rules)
-- ==============================================================================
CREATE TABLE data_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_department VARCHAR(50) NOT NULL,
    source_schema_name VARCHAR(100) NOT NULL,
    target_canonical_model VARCHAR(100) NOT NULL,
    mapping_rules JSONB NOT NULL,
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_data_mapping UNIQUE (source_department, source_schema_name, target_canonical_model)
);

-- ==============================================================================
-- 14B. FIELD DATA MAPPINGS (Granular Field-Level Transformation Registry)
-- ==============================================================================
CREATE TABLE field_data_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_system VARCHAR(100) NOT NULL,
    source_field VARCHAR(100) NOT NULL,
    canonical_field VARCHAR(100) NOT NULL,
    transformation_rule VARCHAR(150) NOT NULL,
    department_code VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_field_mapping UNIQUE (source_system, source_field, canonical_field)
);

-- ==============================================================================
-- 15. USERS (Platform Authentication & Role-Based Access Control)
-- ==============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    citizen_id VARCHAR(50) REFERENCES citizens(citizen_id) ON DELETE SET NULL,
    department_code VARCHAR(50) NOT NULL DEFAULT 'INTEROP',
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- REQUIRED INDEXES
-- 1. citizen_id
-- 2. application_id
-- 3. status
-- 4. timestamp
-- 5. request_id
-- ==============================================================================

-- citizen_id indexes
CREATE INDEX idx_citizens_citizen_id ON citizens (citizen_id);
CREATE INDEX idx_applications_citizen_id ON applications (citizen_id);
CREATE INDEX idx_education_records_citizen_id ON education_records (citizen_id);
CREATE INDEX idx_income_records_citizen_id ON income_records (citizen_id);
CREATE INDEX idx_bank_records_citizen_id ON bank_records (citizen_id);
CREATE INDEX idx_consents_citizen_id ON consents (citizen_id);
CREATE INDEX idx_notifications_citizen_id ON notifications (citizen_id);
CREATE INDEX idx_users_citizen_id ON users (citizen_id);

-- application_id indexes
CREATE INDEX idx_applications_application_id ON applications (application_id);
CREATE INDEX idx_workflow_steps_application_id ON workflow_steps (application_id);
CREATE INDEX idx_consents_application_id ON consents (application_id);
CREATE INDEX idx_api_requests_application_id ON api_requests (application_id);
CREATE INDEX idx_notifications_application_id ON notifications (application_id);

-- status indexes
CREATE INDEX idx_citizens_status ON citizens (status);
CREATE INDEX idx_applications_status ON applications (status);
CREATE INDEX idx_workflow_steps_status ON workflow_steps (status);
CREATE INDEX idx_income_records_status ON income_records (status);
CREATE INDEX idx_consents_status ON consents (status);
CREATE INDEX idx_api_services_status ON api_services (status);
CREATE INDEX idx_api_requests_status ON api_requests (status);
CREATE INDEX idx_audit_logs_status ON audit_logs (status);
CREATE INDEX idx_notifications_status ON notifications (status);

-- user indexes
CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_users_role ON users (role);

-- timestamp indexes
CREATE INDEX idx_api_requests_timestamp ON api_requests (timestamp DESC);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs (timestamp DESC);
CREATE INDEX idx_notifications_timestamp ON notifications (timestamp DESC);
CREATE INDEX idx_applications_created_at ON applications (created_at DESC);

-- request_id indexes
CREATE INDEX idx_api_requests_request_id ON api_requests (request_id);
CREATE INDEX idx_audit_logs_request_id ON audit_logs (request_id);
