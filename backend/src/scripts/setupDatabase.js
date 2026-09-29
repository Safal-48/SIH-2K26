import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import logger from '../utils/logger.js';
import config from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');
const schemaPath = path.resolve(rootDir, 'database/schema.sql');
const seedPath = path.resolve(rootDir, 'database/seed.sql');
const pgDataDir = path.resolve(rootDir, 'database/pgdata');

const REQUIRED_TABLES = [
  'citizens',
  'applications',
  'workflow_steps',
  'education_records',
  'income_records',
  'bank_records',
  'consents',
  'api_services',
  'api_requests',
  'audit_logs',
  'notifications',
  'workflow_definitions',
  'workflow_definition_steps',
  'data_mappings',
  'users',
];

/**
 * Split SQL script by statement while respecting multi-line strings / json blocks
 */
function splitSqlStatements(sqlContent) {
  // Normalize line endings
  const cleanSql = sqlContent.replace(/\r\n/g, '\n');
  return cleanSql;
}

export async function runDatabaseSetup() {
  logger.info('===========================================================');
  logger.info('Starting PostgreSQL Database Schema & Seed Provisioning');
  logger.info('===========================================================');

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  const seedSql = fs.readFileSync(seedPath, 'utf8');

  let executionEngine = 'native'; // or 'embedded-pglite'
  let client = null;
  let pgliteInstance = null;

  // 1. Attempt connection to native PostgreSQL instance first
  const { Client } = pg;
  const pgClient = new Client(config.db);

  try {
    await pgClient.connect();
    logger.info(`Connected to native PostgreSQL server at ${config.db.host}:${config.db.port}/${config.db.database}`);
    client = pgClient;
  } catch (pgErr) {
    logger.warn(`Native PostgreSQL unavailable (${pgErr.message}).`);
    logger.info(`Activating embedded persistent PostgreSQL engine (PGlite at ${pgDataDir})...`);
    executionEngine = 'embedded-pglite';

    if (process.argv.includes('--reset') && fs.existsSync(pgDataDir)) {
      logger.info('Reset flag detected: purging database/pgdata for pristine reinitialization...');
      fs.rmSync(pgDataDir, { recursive: true, force: true });
    }

    if (!fs.existsSync(pgDataDir)) {
      fs.mkdirSync(pgDataDir, { recursive: true });
    }

    pgliteInstance = new PGlite(pgDataDir);
    await pgliteInstance.waitReady;
    logger.info('Embedded PostgreSQL engine initialized successfully.');
  }

  const executeSql = async (sql) => {
    if (executionEngine === 'native') {
      return await client.query(sql);
    } else {
      return await pgliteInstance.exec(sql);
    }
  };

  const querySql = async (sql, params = []) => {
    if (executionEngine === 'native') {
      const res = await client.query(sql, params);
      return res.rows;
    } else {
      const res = await pgliteInstance.query(sql, params);
      return res.rows;
    }
  };

  try {
    // 2. Execute Schema
    logger.info('Executing database/schema.sql...');
    await executeSql(schemaSql);
    logger.info('Schema migration executed successfully.');

    // 3. Execute Seed
    logger.info('Executing database/seed.sql...');
    await executeSql(seedSql);
    logger.info('Deterministic seed data populated successfully.');

    // 4. Verification Step 1: Verify all 14 required tables exist
    logger.info('-----------------------------------------------------------');
    logger.info('Verifying required table existence...');
    const tableCheckQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    const existingTableRows = await querySql(tableCheckQuery);
    const existingTables = existingTableRows.map((r) => r.table_name);

    const missingTables = REQUIRED_TABLES.filter((t) => !existingTables.includes(t));
    if (missingTables.length > 0) {
      throw new Error(`Missing required tables: ${missingTables.join(', ')}`);
    }

    logger.info(`All ${REQUIRED_TABLES.length} required tables verified:`);
    REQUIRED_TABLES.forEach((tbl, idx) => {
      logger.info(`  [OK] ${idx + 1}. ${tbl}`);
    });

    // 5. Verification Step 2: Verify deterministic demo records
    logger.info('-----------------------------------------------------------');
    logger.info('Verifying deterministic demo records...');

    // Primary Citizen
    const citizenRows = await querySql(`SELECT * FROM citizens WHERE citizen_id = $1`, ['CZN-1001']);
    if (!citizenRows.length) throw new Error('Demo citizen CZN-1001 not found');
    logger.info(`  [OK] Primary Citizen found: ${citizenRows[0].full_name} (${citizenRows[0].citizen_id})`);

    // Student Record
    const studentRows = await querySql(`SELECT * FROM education_records WHERE student_id = $1`, ['STU-1001']);
    if (!studentRows.length) throw new Error('Demo student STU-1001 not found');
    logger.info(`  [OK] Student Record found: ${studentRows[0].student_id} - ${studentRows[0].institution_name} (CGPA: ${studentRows[0].cgpa})`);

    // Income Certificate
    const incomeRows = await querySql(`SELECT * FROM income_records WHERE income_certificate_no = $1`, ['INC-5001']);
    if (!incomeRows.length) throw new Error('Demo income certificate INC-5001 not found');
    logger.info(`  [OK] Income Certificate found: ${incomeRows[0].income_certificate_no} - ₹${incomeRows[0].annual_income} (${incomeRows[0].status})`);

    // Bank Reference
    const bankRows = await querySql(`SELECT * FROM bank_records WHERE account_reference = $1`, ['BANK-7001']);
    if (!bankRows.length) throw new Error('Demo bank reference BANK-7001 not found');
    logger.info(`  [OK] Bank Record found: ${bankRows[0].account_reference} - ${bankRows[0].bank_name} (Masked: ${bankRows[0].account_number_masked})`);

    // Application
    const appRows = await querySql(`SELECT * FROM applications WHERE application_id = $1`, ['SCH-2026-001']);
    if (!appRows.length) throw new Error('Demo application SCH-2026-001 not found');
    logger.info(`  [OK] Application found: ${appRows[0].application_id} - Status: ${appRows[0].status} (Benefit: ₹${appRows[0].benefit_amount})`);

    // 6. Verification Step 3: Verify Relationships & Foreign Keys
    logger.info('-----------------------------------------------------------');
    logger.info('Verifying relational foreign keys and JOIN integrity...');

    const joinTestSql = `
      SELECT 
        a.application_id,
        a.scheme_name,
        a.status as app_status,
        c.citizen_id,
        c.full_name as citizen_name,
        e.student_id,
        e.institution_name,
        e.cgpa,
        i.income_certificate_no,
        i.annual_income,
        b.account_reference,
        b.bank_name,
        co.consent_id,
        co.status as consent_status,
        COUNT(ws.id) as total_workflow_steps
      FROM applications a
      JOIN citizens c ON a.citizen_id = c.citizen_id
      JOIN education_records e ON a.student_id = e.student_id
      JOIN income_records i ON a.income_certificate_no = i.income_certificate_no
      JOIN bank_records b ON a.account_reference = b.account_reference
      LEFT JOIN consents co ON a.application_id = co.application_id
      LEFT JOIN workflow_steps ws ON a.application_id = ws.application_id
      WHERE a.application_id = 'SCH-2026-001'
      GROUP BY 
        a.application_id, a.scheme_name, a.status, c.citizen_id, c.full_name,
        e.student_id, e.institution_name, e.cgpa, i.income_certificate_no,
        i.annual_income, b.account_reference, b.bank_name, co.consent_id, co.status
    `;

    const joinRows = await querySql(joinTestSql);
    if (!joinRows.length) {
      throw new Error('Relational join query returned 0 rows! Check Foreign Key references.');
    }

    const report = joinRows[0];
    logger.info(`  [OK] Multi-table JOIN succeeded across 7 relational entities:`);
    logger.info(`       Application: ${report.application_id} (${report.app_status})`);
    logger.info(`       Citizen: ${report.citizen_name} [${report.citizen_id}]`);
    logger.info(`       Education: ${report.student_id} @ ${report.institution_name} (CGPA: ${report.cgpa})`);
    logger.info(`       Income Cert: ${report.income_certificate_no} (Annual Income: ₹${report.annual_income})`);
    logger.info(`       Bank: ${report.account_reference} (${report.bank_name})`);
    logger.info(`       Consent: ${report.consent_id} (${report.consent_status})`);
    logger.info(`       Workflow Steps: ${report.total_workflow_steps} steps configured`);

    logger.info('===========================================================');
    logger.info(`Database Setup Completed Successfully using [${executionEngine}] engine!`);
    logger.info('===========================================================');

    return {
      success: true,
      engine: executionEngine,
      tablesCount: REQUIRED_TABLES.length,
      demoCitizen: citizenRows[0].citizen_id,
      demoApplication: appRows[0].application_id,
      relationalCheck: report,
    };
  } finally {
    if (client) {
      await client.end();
    }
  }
}

// Allow direct CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runDatabaseSetup()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Database setup failed: ' + (err.message || err));
      console.error(err);
      process.exit(1);
    });
}
