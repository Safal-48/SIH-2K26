import logger from '../utils/logger.js';

const INTERNAL_QUERY_URL = 'http://localhost:5000/api/v1/internal/db-query';

async function query(text, params = []) {
  const res = await fetch(INTERNAL_QUERY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, params }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export async function initStep15() {
  logger.info('Initializing Step 15 Database Schema & Seed Data...');

  // 1. Add columns to api_services
  await query(`
    ALTER TABLE api_services 
    ADD COLUMN IF NOT EXISTS connector_type VARCHAR(50) NOT NULL DEFAULT 'REST',
    ADD COLUMN IF NOT EXISTS endpoint VARCHAR(255) DEFAULT '/verify',
    ADD COLUMN IF NOT EXISTS health_status VARCHAR(50) NOT NULL DEFAULT 'HEALTHY',
    ADD COLUMN IF NOT EXISTS response_time_ms INT NOT NULL DEFAULT 25,
    ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS last_test_result JSONB NOT NULL DEFAULT '{}'::jsonb;
  `);
  logger.info('  [OK] api_services columns verified/added');

  // 2. Update existing services with realistic defaults
  await query(`
    UPDATE api_services 
    SET connector_type = 'REST',
        endpoint = '/api/education/verify',
        health_status = 'HEALTHY',
        response_time_ms = 42,
        last_checked_at = NOW()
    WHERE service_code = 'SRV-EDU-01';
  `);

  await query(`
    UPDATE api_services 
    SET connector_type = 'REST',
        endpoint = '/api/income/verify',
        health_status = 'HEALTHY',
        response_time_ms = 35,
        last_checked_at = NOW()
    WHERE service_code = 'SRV-REV-01';
  `);

  await query(`
    UPDATE api_services 
    SET connector_type = 'REST',
        endpoint = '/api/bank/verify',
        health_status = 'HEALTHY',
        response_time_ms = 48,
        last_checked_at = NOW()
    WHERE service_code = 'SRV-DBT-01';
  `);

  await query(`
    UPDATE api_services 
    SET connector_type = 'LEGACY',
        endpoint = '/soap/legacy-records',
        health_status = 'HEALTHY',
        response_time_ms = 115,
        last_checked_at = NOW()
    WHERE service_code = 'SRV-LEG-01';
  `);

  // Insert MOCK & SANDBOX services if not existing
  await query(`
    INSERT INTO api_services (
      service_code, department_code, service_name, protocol, 
      connector_type, endpoint, base_url, health_endpoint, 
      health_status, response_time_ms, last_checked_at, timeout_ms, retry_limit, status
    ) VALUES 
    (
      'SRV-MCK-01', 'INTEROP', 'Mock Interoperability Simulation Gateway', 'REST_JSON',
      'MOCK', '/api/mock/ping', 'http://internal-mesh/api/v1/mock', '/health',
      'HEALTHY', 18, NOW(), 3000, 2, 'ACTIVE'
    ),
    (
      'SRV-SBX-01', 'DBT', 'Disbursement Clearing & Settlement Sandbox', 'REST_JSON',
      'SANDBOX', '/api/bank/sandbox-verify', 'http://internal-mesh/api/v1/sandbox', '/health',
      'HEALTHY', 24, NOW(), 5000, 3, 'ACTIVE'
    )
    ON CONFLICT (service_code) DO UPDATE 
    SET connector_type = EXCLUDED.connector_type,
        endpoint = EXCLUDED.endpoint,
        health_status = EXCLUDED.health_status;
  `);
  logger.info('  [OK] Service registry entries populated across all 4 connector types (REST, LEGACY, MOCK, SANDBOX)');

  // 3. Create field_data_mappings table
  await query(`
    CREATE TABLE IF NOT EXISTS field_data_mappings (
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
  `);
  logger.info('  [OK] field_data_mappings table ready');

  // 4. Seed Canonical Data Mappings (Prompt examples guaranteed)
  const canonicalMappings = [
    {
      source_system: 'Education',
      source_field: 'student_id',
      canonical_field: 'studentId',
      transformation_rule: 'direct',
      department_code: 'EDU',
      description: 'Maps student registry identifier directly to canonical studentId',
    },
    {
      source_system: 'Education',
      source_field: 'status',
      canonical_field: 'status',
      transformation_rule: 'VERIFIED / NOT_VERIFIED',
      department_code: 'EDU',
      description: 'Transforms enrollment verification code to standard status enum',
    },
    {
      source_system: 'Education',
      source_field: 'institution_code',
      canonical_field: 'institutionCode',
      transformation_rule: 'direct',
      department_code: 'EDU',
      description: 'Maps educational institution AISHE/university code directly',
    },
    {
      source_system: 'Income',
      source_field: 'annual_income',
      canonical_field: 'annualIncome',
      transformation_rule: 'number',
      department_code: 'REV',
      description: 'Parses currency/string values into numeric precision format',
    },
    {
      source_system: 'Income',
      source_field: 'category',
      canonical_field: 'incomeCategory',
      transformation_rule: 'direct',
      department_code: 'REV',
      description: 'Direct passthrough of revenue certificate classification category',
    },
    {
      source_system: 'Income',
      source_field: 'status',
      canonical_field: 'validityStatus',
      transformation_rule: 'VALID / EXPIRED',
      department_code: 'REV',
      description: 'Validates certificate validity timestamp against current date',
    },
    {
      source_system: 'Bank',
      source_field: 'holder_match',
      canonical_field: 'accountHolderMatch',
      transformation_rule: 'boolean',
      department_code: 'DBT',
      description: 'Coerces string/integer match flags into strict boolean type',
    },
    {
      source_system: 'Bank',
      source_field: 'verification_id',
      canonical_field: 'verificationId',
      transformation_rule: 'direct',
      department_code: 'DBT',
      description: 'Direct preservation of PFMS / NPCI transaction audit reference',
    },
    {
      source_system: 'Bank',
      source_field: 'dbt_active',
      canonical_field: 'dbtActive',
      transformation_rule: 'boolean',
      department_code: 'DBT',
      description: 'Verifies active Aadhaar payment bridge enablement status',
    },
    {
      source_system: 'Bank',
      source_field: 'account_reference',
      canonical_field: 'accountReference',
      transformation_rule: 'direct',
      department_code: 'DBT',
      description: 'Maps masked beneficiary bank account identifier directly',
    },
    {
      source_system: 'Legacy',
      source_field: 'RECORD_ID',
      canonical_field: 'legacyRecordId',
      transformation_rule: 'direct',
      department_code: 'LEG',
      description: 'Extracts mainframe punchcard key directly into archive tracking ID',
    },
    {
      source_system: 'Legacy',
      source_field: 'FLAG_MATCH',
      canonical_field: 'recordMatch',
      transformation_rule: 'boolean',
      department_code: 'LEG',
      description: 'Normalizes legacy Y/N string indicator to canonical boolean',
    },
  ];

  for (const m of canonicalMappings) {
    await query(
      `
      INSERT INTO field_data_mappings (
        source_system, source_field, canonical_field, 
        transformation_rule, department_code, description, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, TRUE)
      ON CONFLICT (source_system, source_field, canonical_field) 
      DO UPDATE SET 
        transformation_rule = EXCLUDED.transformation_rule,
        department_code = EXCLUDED.department_code,
        description = EXCLUDED.description,
        is_active = TRUE,
        updated_at = NOW();
    `,
      [m.source_system, m.source_field, m.canonical_field, m.transformation_rule, m.department_code, m.description]
    );
  }

  logger.info(`  [OK] Seeded ${canonicalMappings.length} canonical field mappings in field_data_mappings`);
  logger.info('Step 15 Database Initialization Completed Successfully.');
}

if (process.argv[1]?.endsWith('initStep15Db.js')) {
  initStep15()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('initStep15Db failed:', err);
      process.exit(1);
    });
}
