import logger from '../utils/logger.js';
import DataMappingModel from '../models/dataMapping.model.js';

/**
 * Standard Error for Data Mapping & Validation Failures
 */
export class MappingValidationError extends Error {
  constructor(message, errorCode = 'MAPPING_VALIDATION_ERROR', details = null) {
    super(message);
    this.name = 'MappingValidationError';
    this.errorCode = errorCode;
    this.details = details;
  }
}

/**
 * Built-in Transformation Rules Library
 */
export const TRANSFORMATION_RULES = {
  DIRECT: (val) => val,

  TO_NUMBER: (val) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      // Strip currency symbols, commas, spaces
      const cleaned = val.replace(/[₹$,\s]/g, '');
      const parsed = Number(cleaned);
      if (isNaN(parsed)) {
        throw new MappingValidationError(`Failed to transform "${val}" to a valid number`, 'INVALID_NUMBER_FORMAT');
      }
      return parsed;
    }
    throw new MappingValidationError(`Cannot convert type ${typeof val} to number`, 'INVALID_TYPE_COERCION');
  },

  TO_BOOLEAN: (val) => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') {
      const lower = val.trim().toLowerCase();
      if (['true', '1', 'yes', 'y', 'match', 'verified', 'active'].includes(lower)) return true;
      if (['false', '0', 'no', 'n', 'mismatch', 'unverified', 'inactive'].includes(lower)) return false;
      throw new MappingValidationError(`Cannot convert string "${val}" to boolean`, 'INVALID_BOOLEAN_FORMAT');
    }
    if (typeof val === 'number') {
      return val === 1;
    }
    throw new MappingValidationError(`Cannot convert type ${typeof val} to boolean`, 'INVALID_TYPE_COERCION');
  },

  TO_UPPERCASE: (val) => {
    if (typeof val !== 'string') {
      return String(val || '').toUpperCase();
    }
    return val.trim().toUpperCase();
  },

  TRIM: (val) => {
    if (typeof val === 'string') return val.trim();
    return val;
  },

  TO_INT: (val) => {
    const num = parseInt(val, 10);
    if (isNaN(num)) {
      throw new MappingValidationError(`Failed to transform "${val}" to integer`, 'INVALID_INTEGER_FORMAT');
    }
    return num;
  },
};

/**
 * Canonical Data Model & Mapping Engine
 * Ensures departments never directly depend on heterogeneous vendor schemas.
 */
export class DataMapperService {
  constructor() {
    this.ruleRegistry = new Map();
    this.initDefaultRules();
  }

  /**
   * Initialize standard deterministic mapping rules for required departments
   */
  initDefaultRules() {
    // 1. Education Department Mappings
    this.registerRules('EDUCATION', 'CANONICAL_EDUCATION', [
      {
        source_system: 'Education Department',
        source_field: 'student_id',
        canonical_field: 'studentId',
        transformation_rule: 'TRIM',
        required: true,
      },
      {
        source_system: 'Education Department',
        source_field: 'status',
        canonical_field: 'status',
        transformation_rule: 'TO_UPPERCASE',
        required: true,
      },
      {
        source_system: 'Education Department',
        source_field: 'course',
        canonical_field: 'course',
        transformation_rule: 'DIRECT',
        required: false,
      },
      {
        source_system: 'Education Department',
        source_field: 'institution',
        canonical_field: 'institution',
        transformation_rule: 'DIRECT',
        required: false,
      },
      {
        source_system: 'Education Department',
        source_field: 'year',
        canonical_field: 'year',
        transformation_rule: 'TO_INT',
        required: false,
      },
      {
        source_system: 'Education Department',
        source_field: ['verification_id', 'verificationId'],
        canonical_field: 'verificationId',
        transformation_rule: 'DIRECT',
        required: false,
      },
    ]);

    // 2. Income / Revenue Department Mappings
    this.registerRules('INCOME', 'CANONICAL_INCOME', [
      {
        source_system: 'Revenue Department',
        source_field: 'annual_income',
        canonical_field: 'annualIncome',
        transformation_rule: 'TO_NUMBER',
        required: true,
      },
      {
        source_system: 'Revenue Department',
        source_field: ['income_category', 'category'],
        canonical_field: 'incomeCategory',
        transformation_rule: 'TO_UPPERCASE',
        required: true,
      },
      {
        source_system: 'Revenue Department',
        source_field: 'status',
        canonical_field: 'status',
        transformation_rule: 'TO_UPPERCASE',
        required: false,
        default_value: 'VERIFIED',
      },
      {
        source_system: 'Revenue Department',
        source_field: ['verification_id', 'verificationId'],
        canonical_field: 'verificationId',
        transformation_rule: 'DIRECT',
        required: false,
      },
    ]);

    // 3. Bank / DBT Department Mappings
    this.registerRules('BANK', 'CANONICAL_BANK', [
      {
        source_system: 'PFMS / Bank Gateway',
        source_field: ['account_holder_match', 'holder_match'],
        canonical_field: 'accountHolderMatch',
        transformation_rule: 'TO_BOOLEAN',
        required: true,
      },
      {
        source_system: 'PFMS / Bank Gateway',
        source_field: ['verification_id', 'verificationId'],
        canonical_field: 'verificationId',
        transformation_rule: 'DIRECT',
        required: true,
      },
      {
        source_system: 'PFMS / Bank Gateway',
        source_field: 'status',
        canonical_field: 'status',
        transformation_rule: 'TO_UPPERCASE',
        required: false,
        default_value: 'VERIFIED',
      },
      {
        source_system: 'PFMS / Bank Gateway',
        source_field: ['account_reference', 'accountReference'],
        canonical_field: 'accountReference',
        transformation_rule: 'DIRECT',
        required: false,
      },
    ]);
  }

  /**
   * Register mapping rules for a department in-memory and optionally sync to DB
   */
  registerRules(sourceSystem, targetModel, rules) {
    const key = `${sourceSystem.toUpperCase()}::${targetModel.toUpperCase()}`;
    this.ruleRegistry.set(key, rules);
    logger.debug(`DataMapperService: Registered ${rules.length} mapping rules for [${key}]`);
  }

  /**
   * Retrieve active rules for a department (checks DB first, falls back to in-memory)
   */
  async getRules(sourceSystem, targetModel) {
    const key = `${sourceSystem.toUpperCase()}::${targetModel.toUpperCase()}`;
    
    // Check PostgreSQL store if available
    try {
      const dbMapping = await DataMappingModel.findByDepartment(sourceSystem.toUpperCase(), targetModel.toUpperCase());
      if (dbMapping && Array.isArray(dbMapping.mapping_rules) && dbMapping.mapping_rules.length > 0) {
        return dbMapping.mapping_rules;
      }
    } catch {
      // Fallback cleanly to in-memory rule definition
    }

    const inMemory = this.ruleRegistry.get(key);
    if (!inMemory) {
      throw new MappingValidationError(
        `No mapping rules registered for source system [${sourceSystem}] targeting model [${targetModel}]`,
        'MAPPING_RULES_NOT_FOUND'
      );
    }
    return inMemory;
  }

  /**
   * Security & Schema Sanity Validator
   * Rejects prototype pollution, nulls, primitives, and script injections
   */
  validateSourceSchema(rawResponse) {
    if (rawResponse === null || rawResponse === undefined) {
      throw new MappingValidationError('Source response cannot be null or undefined', 'NULL_RESPONSE_REJECTED');
    }

    if (typeof rawResponse !== 'object' || Array.isArray(rawResponse)) {
      throw new MappingValidationError(
        `Invalid source response structure: expected JSON object, received ${Array.isArray(rawResponse) ? 'Array' : typeof rawResponse}`,
        'INVALID_RESPONSE_TYPE'
      );
    }

    // Security check: Prototype pollution detection
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    for (const key of Object.keys(rawResponse)) {
      if (dangerousKeys.includes(key)) {
        throw new MappingValidationError(`Security violation: Detected disallowed key "${key}" in source payload`, 'PROTOTYPE_POLLUTION_DETECTED');
      }

      // Check for script tag injection in string values
      if (typeof rawResponse[key] === 'string' && /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(rawResponse[key])) {
        throw new MappingValidationError(`Security violation: Detected potential script tag injection in field "${key}"`, 'SECURITY_THREAT_REJECTED');
      }
    }
  }

  /**
   * Main Transformation Pipeline
   * 1. Receive source response.
   * 2. Validate response structure and security.
   * 3. Apply mapping rules.
   * 4. Produce canonical representation.
   * 5. Reject invalid/unsafe response schemas.
   * 
   * @param {Object} rawResponse - Incoming departmental response
   * @param {Object} options
   * @param {string} options.sourceSystem - Source department (EDUCATION, INCOME, BANK)
   * @param {string} options.targetModel - Target canonical profile
   * @param {string} [options.citizenId] - Citizen correlation identifier
   * @param {string} [options.applicationId] - Application correlation identifier
   * @param {string} [options.service] - Service identifier (e.g. EDUCATION_VERIFICATION)
   * @param {boolean} [options.rejectUnknownFields=false] - If true, rejects responses containing unrecognized fields
   * @param {boolean} [options.persistRules=false] - If true, syncs rules to data_mappings table
   */
  async mapToCanonical(rawResponse, options = {}) {
    const {
      sourceSystem,
      targetModel,
      citizenId = 'CZN-1001',
      applicationId = 'SCH-2026-001',
      service = `${sourceSystem}_VERIFICATION`,
      rejectUnknownFields = false,
      persistRules = false,
    } = options;

    if (!sourceSystem || !targetModel) {
      throw new MappingValidationError('sourceSystem and targetModel must be specified for canonical mapping', 'MISSING_MAPPING_CONTEXT');
    }

    // 1 & 2: Receive and Validate Source Response
    this.validateSourceSchema(rawResponse);

    // 3: Fetch active mapping rules
    const rules = await this.getRules(sourceSystem, targetModel);

    if (persistRules) {
      await DataMappingModel.upsert({
        sourceDepartment: sourceSystem.toUpperCase(),
        sourceSchemaName: `${sourceSystem.toLowerCase()}_response_v1`,
        targetModel: targetModel.toUpperCase(),
        rules,
      }).catch((e) => logger.warn('DataMapperService: Failed to persist rules:', e.message));
    }

    const canonicalData = {};
    const matchedSourceFields = new Set();

    // 4: Apply Mapping Rules
    for (const rule of rules) {
      const candidateFields = Array.isArray(rule.source_field) ? rule.source_field : [rule.source_field];

      let rawValue = undefined;
      let matchedField = null;

      for (const field of candidateFields) {
        if (field in rawResponse && rawResponse[field] !== undefined && rawResponse[field] !== null) {
          rawValue = rawResponse[field];
          matchedField = field;
          matchedSourceFields.add(field);
          break;
        }
      }

      // Check required field validation
      if (rawValue === undefined || rawValue === null || rawValue === '') {
        if (rule.required) {
          throw new MappingValidationError(
            `Missing required source field [${candidateFields.join(' OR ')}] from department [${rule.source_system || sourceSystem}]`,
            'MISSING_REQUIRED_FIELD',
            { candidateFields, canonicalField: rule.canonical_field }
          );
        } else if (rule.default_value !== undefined) {
          rawValue = rule.default_value;
        }
      }

      // Apply transformation if value exists
      if (rawValue !== undefined) {
        const transformFn =
          typeof rule.transformation_rule === 'function'
            ? rule.transformation_rule
            : TRANSFORMATION_RULES[rule.transformation_rule] || TRANSFORMATION_RULES.DIRECT;

        try {
          canonicalData[rule.canonical_field] = transformFn(rawValue);
        } catch (err) {
          throw new MappingValidationError(
            `Transformation failed for field "${matchedField || rule.source_field}" -> "${rule.canonical_field}": ${err.message}`,
            err.errorCode || 'TRANSFORMATION_ERROR',
            { sourceField: matchedField || rule.source_field, rawValue, rule: rule.transformation_rule }
          );
        }
      }
    }

    // 5: Check for Unknown / Unmapped Fields
    const sourceKeys = Object.keys(rawResponse);
    const unknownFields = sourceKeys.filter((k) => !matchedSourceFields.has(k));

    if (rejectUnknownFields && unknownFields.length > 0) {
      throw new MappingValidationError(
        `Rejected payload containing unknown/unregistered fields: [${unknownFields.join(', ')}]`,
        'UNKNOWN_FIELDS_REJECTED',
        { unknownFields }
      );
    }

    // 6: Assemble Standard Canonical Envelope
    const canonicalEnvelope = {
      citizenId,
      applicationId,
      service,
      status: canonicalData.status || rawResponse.status || 'VERIFIED',
      sourceSystem: rules[0]?.source_system || sourceSystem,
      verificationId: canonicalData.verificationId || rawResponse.verification_id || rawResponse.verificationId || null,
      ...canonicalData,
      metadata: {
        mappedAt: new Date().toISOString(),
        unmappedFieldsCount: unknownFields.length,
        unmappedFields: unknownFields,
      },
    };

    logger.debug(`DataMapperService: Produced canonical representation for [${service}] (${citizenId})`);
    return canonicalEnvelope;
  }
}

export const dataMapperService = new DataMapperService();
export default dataMapperService;
