import { dataMapperService, MappingValidationError, TRANSFORMATION_RULES } from '../services/dataMapper.service.js';
import DataMappingModel from '../models/dataMapping.model.js';
import logger from '../utils/logger.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runDataMapperTests() {
  logger.info('===========================================================');
  logger.info('Starting Canonical Data Model & Mapping System Test Suite');
  logger.info('===========================================================');

  let passedTests = 0;

  // --------------------------------------------------------------------------
  // TEST 1: SUCCESSFUL MAPPINGS (Education, Income, Bank)
  // --------------------------------------------------------------------------
  logger.info('--- 1. Testing Successful Canonical Mappings ---');

  // 1.1 Education Mapping
  {
    const rawEducationResponse = {
      status: 'VERIFIED',
      student_id: 'STU-1001',
      course: 'BCA',
      institution: 'Demo Government College',
      year: 2026,
      verification_id: 'EDU-9001',
    };

    const canonical = await dataMapperService.mapToCanonical(rawEducationResponse, {
      sourceSystem: 'EDUCATION',
      targetModel: 'CANONICAL_EDUCATION',
      citizenId: 'CZN-1001',
      applicationId: 'SCH-2026-001',
      service: 'EDUCATION_VERIFICATION',
    });

    assert(canonical.citizenId === 'CZN-1001', 'Expected citizenId CZN-1001');
    assert(canonical.applicationId === 'SCH-2026-001', 'Expected applicationId SCH-2026-001');
    assert(canonical.service === 'EDUCATION_VERIFICATION', 'Expected service EDUCATION_VERIFICATION');
    assert(canonical.status === 'VERIFIED', 'Expected status VERIFIED');
    assert(canonical.sourceSystem === 'Education Department', 'Expected sourceSystem Education Department');
    assert(canonical.verificationId === 'EDU-9001', 'Expected verificationId EDU-9001');
    assert(canonical.studentId === 'STU-1001', 'Expected canonical studentId STU-1001');
    assert(canonical.course === 'BCA', 'Expected canonical course BCA');
    assert(canonical.institution === 'Demo Government College', 'Expected canonical institution');
    assert(canonical.year === 2026, 'Expected canonical year 2026');

    logger.info('  [PASS] 1.1 Education Response mapped to exact canonical model');
    logger.info('        Canonical preview: ' + JSON.stringify({
      citizenId: canonical.citizenId,
      applicationId: canonical.applicationId,
      service: canonical.service,
      status: canonical.status,
      sourceSystem: canonical.sourceSystem,
      verificationId: canonical.verificationId,
      studentId: canonical.studentId,
    }));
    passedTests++;
  }

  // 1.2 Income Mapping
  {
    const rawIncomeResponse = {
      status: 'VERIFIED',
      annual_income: 180000,
      income_category: 'LOW_INCOME',
      verification_id: 'INC-8001',
    };

    const canonical = await dataMapperService.mapToCanonical(rawIncomeResponse, {
      sourceSystem: 'INCOME',
      targetModel: 'CANONICAL_INCOME',
      citizenId: 'CZN-1001',
      applicationId: 'SCH-2026-001',
      service: 'INCOME_VERIFICATION',
    });

    assert(canonical.annualIncome === 180000, 'Expected annualIncome 180000');
    assert(canonical.incomeCategory === 'LOW_INCOME', 'Expected incomeCategory LOW_INCOME');
    assert(canonical.verificationId === 'INC-8001', 'Expected verificationId INC-8001');
    assert(canonical.status === 'VERIFIED', 'Expected status VERIFIED');
    logger.info('  [PASS] 1.2 Income Response mapped to canonical model (annual_income -> annualIncome)');
    passedTests++;
  }

  // 1.3 Bank Mapping (with alias account_holder_match -> accountHolderMatch)
  {
    const rawBankResponse = {
      status: 'VERIFIED',
      account_reference: 'BANK-7001',
      account_holder_match: true,
      verification_id: 'BNK-3001',
    };

    const canonical = await dataMapperService.mapToCanonical(rawBankResponse, {
      sourceSystem: 'BANK',
      targetModel: 'CANONICAL_BANK',
      citizenId: 'CZN-1001',
      applicationId: 'SCH-2026-001',
      service: 'BANK_DBT_VERIFICATION',
    });

    assert(canonical.accountHolderMatch === true, 'Expected accountHolderMatch true');
    assert(canonical.verificationId === 'BNK-3001', 'Expected verificationId BNK-3001');
    assert(canonical.accountReference === 'BANK-7001', 'Expected accountReference BANK-7001');
    logger.info('  [PASS] 1.3 Bank Response mapped to canonical model (account_holder_match -> accountHolderMatch)');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 2: MISSING FIELD VALIDATION
  // --------------------------------------------------------------------------
  logger.info('--- 2. Testing Missing Required Field Validation ---');
  {
    // Missing required student_id
    const incompletePayload = {
      status: 'VERIFIED',
      course: 'BCA',
    };

    let caughtError = null;
    try {
      await dataMapperService.mapToCanonical(incompletePayload, {
        sourceSystem: 'EDUCATION',
        targetModel: 'CANONICAL_EDUCATION',
      });
    } catch (err) {
      caughtError = err;
    }

    assert(caughtError instanceof MappingValidationError, 'Expected MappingValidationError');
    assert(caughtError.errorCode === 'MISSING_REQUIRED_FIELD', `Expected MISSING_REQUIRED_FIELD, got ${caughtError?.errorCode}`);
    logger.info(`  [PASS] 2.1 Rejection of missing student_id verified: [${caughtError.errorCode}] ${caughtError.message}`);
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 3: INVALID & UNSAFE RESPONSE VALIDATION
  // --------------------------------------------------------------------------
  logger.info('--- 3. Testing Invalid & Unsafe Response Schemas ---');

  // 3.1 Null / Undefined input
  {
    let nullError = null;
    try {
      await dataMapperService.mapToCanonical(null, {
        sourceSystem: 'EDUCATION',
        targetModel: 'CANONICAL_EDUCATION',
      });
    } catch (err) {
      nullError = err;
    }
    assert(nullError?.errorCode === 'NULL_RESPONSE_REJECTED', 'Expected NULL_RESPONSE_REJECTED');
    logger.info('  [PASS] 3.1 Null response schema rejected');
    passedTests++;
  }

  // 3.2 Non-object primitive (e.g., raw string or array)
  {
    let typeError = null;
    try {
      await dataMapperService.mapToCanonical(['invalid', 'array'], {
        sourceSystem: 'EDUCATION',
        targetModel: 'CANONICAL_EDUCATION',
      });
    } catch (err) {
      typeError = err;
    }
    assert(typeError?.errorCode === 'INVALID_RESPONSE_TYPE', 'Expected INVALID_RESPONSE_TYPE');
    logger.info('  [PASS] 3.2 Non-object (Array) schema rejected');
    passedTests++;
  }

  // 3.3 Security: Prototype Pollution attempt
  {
    let protoError = null;
    try {
      // Craft a payload with __proto__ key
      const maliciousPayload = JSON.parse('{"__proto__": {"admin": true}, "student_id": "STU-1001", "status": "VERIFIED"}');
      await dataMapperService.mapToCanonical(maliciousPayload, {
        sourceSystem: 'EDUCATION',
        targetModel: 'CANONICAL_EDUCATION',
      });
    } catch (err) {
      protoError = err;
    }
    assert(protoError?.errorCode === 'PROTOTYPE_POLLUTION_DETECTED', 'Expected PROTOTYPE_POLLUTION_DETECTED');
    logger.info('  [PASS] 3.3 Prototype pollution attempt detected and safely rejected');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 4: TRANSFORMATION RULES
  // --------------------------------------------------------------------------
  logger.info('--- 4. Testing Transformation Rules & Type Coercion ---');

  // 4.1 Currency String to Number Transformation
  {
    const rawWithCurrency = {
      annual_income: '₹1,80,000.00',
      income_category: 'low_income',
      verification_id: 'INC-8001',
    };

    const canonical = await dataMapperService.mapToCanonical(rawWithCurrency, {
      sourceSystem: 'INCOME',
      targetModel: 'CANONICAL_INCOME',
    });

    assert(canonical.annualIncome === 180000, `Expected 180000, got ${canonical.annualIncome}`);
    assert(canonical.incomeCategory === 'LOW_INCOME', `Expected uppercase LOW_INCOME, got ${canonical.incomeCategory}`);
    logger.info('  [PASS] 4.1 Currency string ("₹1,80,000.00") successfully transformed to number (180000)');
    passedTests++;
  }

  // 4.2 Boolean String Transformation
  {
    const rawWithBoolString = {
      holder_match: 'MATCH',
      verification_id: 'BNK-3001',
    };

    const canonical = await dataMapperService.mapToCanonical(rawWithBoolString, {
      sourceSystem: 'BANK',
      targetModel: 'CANONICAL_BANK',
    });

    assert(canonical.accountHolderMatch === true, 'Expected boolean true from "MATCH" string');
    logger.info('  [PASS] 4.2 String flag ("MATCH") successfully coerced to boolean true');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 5: UNKNOWN / UNMAPPED FIELDS (Lenient vs Strict Mode)
  // --------------------------------------------------------------------------
  logger.info('--- 5. Testing Unknown / Unmapped Field Handling ---');

  // 5.1 Lenient Mode (Default): Unknown fields isolated safely in metadata
  {
    const payloadWithExtra = {
      student_id: 'STU-1001',
      status: 'VERIFIED',
      legacy_mainframe_dump_field: '0x99238FF',
      unauthorized_extra_field: 'TEST',
    };

    const canonical = await dataMapperService.mapToCanonical(payloadWithExtra, {
      sourceSystem: 'EDUCATION',
      targetModel: 'CANONICAL_EDUCATION',
      rejectUnknownFields: false,
    });

    assert(canonical.studentId === 'STU-1001', 'Expected studentId STU-1001');
    assert(canonical.legacy_mainframe_dump_field === undefined, 'Extra field should not pollute canonical root');
    assert(canonical.metadata.unmappedFields.includes('legacy_mainframe_dump_field'), 'Unknown fields tracked in metadata');
    logger.info('  [PASS] 5.1 Lenient Mode: Unmapped fields isolated without polluting canonical model');
    passedTests++;
  }

  // 5.2 Strict Mode: Unknown fields cause explicit schema rejection
  {
    const payloadWithExtra = {
      student_id: 'STU-1001',
      status: 'VERIFIED',
      unrecognized_rogue_attribute: 'ALERT',
    };

    let strictError = null;
    try {
      await dataMapperService.mapToCanonical(payloadWithExtra, {
        sourceSystem: 'EDUCATION',
        targetModel: 'CANONICAL_EDUCATION',
        rejectUnknownFields: true,
      });
    } catch (err) {
      strictError = err;
    }

    assert(strictError instanceof MappingValidationError, 'Expected MappingValidationError');
    assert(strictError.errorCode === 'UNKNOWN_FIELDS_REJECTED', 'Expected UNKNOWN_FIELDS_REJECTED');
    logger.info(`  [PASS] 5.2 Strict Mode: Rejected payload with unrecognized attributes [${strictError.details.unknownFields.join(', ')}]`);
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 6: REUSABILITY FOR FUTURE DEPARTMENTS & PERSISTENCE
  // --------------------------------------------------------------------------
  logger.info('--- 6. Testing Dynamic Department Rule Registration & Reusability ---');
  {
    // Dynamically register a new department (e.g. Transport Department)
    dataMapperService.registerRules('TRANSPORT', 'CANONICAL_VEHICLE', [
      {
        source_system: 'Ministry of Road Transport',
        source_field: 'vehicle_reg_no',
        canonical_field: 'registrationNumber',
        transformation_rule: 'TO_UPPERCASE',
        required: true,
      },
      {
        source_system: 'Ministry of Road Transport',
        source_field: 'chassis_match_flag',
        canonical_field: 'isChassisVerified',
        transformation_rule: 'TO_BOOLEAN',
        required: true,
      },
    ]);

    const transportRaw = {
      vehicle_reg_no: 'dl-01-ab-1234',
      chassis_match_flag: 'YES',
    };

    const canonicalVehicle = await dataMapperService.mapToCanonical(transportRaw, {
      sourceSystem: 'TRANSPORT',
      targetModel: 'CANONICAL_VEHICLE',
      service: 'TRANSPORT_VERIFICATION',
    });

    assert(canonicalVehicle.registrationNumber === 'DL-01-AB-1234', 'Expected uppercase registration number');
    assert(canonicalVehicle.isChassisVerified === true, 'Expected boolean true');
    logger.info('  [PASS] 6.1 Future department (Transport) dynamically mapped using generic engine:');
    logger.info(`        Result: ${canonicalVehicle.registrationNumber} (Verified: ${canonicalVehicle.isChassisVerified})`);
    passedTests++;
  }

  logger.info('===========================================================');
  logger.info(`All ${passedTests} Canonical Data Mapper Tests Passed Successfully!`);
  logger.info('===========================================================');
}

runDataMapperTests().catch((err) => {
  logger.error('Data Mapper Test Suite Failed:', err.message);
  console.error(err);
  process.exit(1);
});
