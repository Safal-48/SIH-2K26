import DataMappingRuleModel from '../models/dataMappingRule.model.js';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';

export class DataMappingRuleService {
  /**
   * List all data mappings
   */
  static async getAllMappings(filters = {}) {
    const rows = await DataMappingRuleModel.listAll(filters);
    return rows.map((r) => ({
      id: r.id,
      sourceSystem: r.source_system,
      source_system: r.source_system,
      sourceField: r.source_field,
      source_field: r.source_field,
      canonicalField: r.canonical_field,
      canonical_field: r.canonical_field,
      transformationRule: r.transformation_rule,
      transformation_rule: r.transformation_rule,
      departmentCode: r.department_code,
      department_code: r.department_code,
      description: r.description,
      isActive: r.is_active,
      is_active: r.is_active,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  /**
   * Get single mapping by ID
   */
  static async getMappingById(id) {
    const r = await DataMappingRuleModel.findById(id);
    if (!r) return null;
    return {
      id: r.id,
      sourceSystem: r.source_system,
      source_field: r.source_field,
      canonicalField: r.canonical_field,
      transformationRule: r.transformation_rule,
      departmentCode: r.department_code,
      description: r.description,
      isActive: r.is_active,
    };
  }

  /**
   * Create a new mapping rule
   */
  static async createMapping(data, userContext = {}) {
    const { sourceSystem, sourceField, canonicalField, transformationRule, departmentCode, description } = data;
    if (!sourceSystem || !sourceField || !canonicalField || !transformationRule) {
      const err = new Error('sourceSystem, sourceField, canonicalField, and transformationRule are required');
      err.status = 400;
      throw err;
    }

    const created = await DataMappingRuleModel.create({
      sourceSystem: sourceSystem.trim(),
      sourceField: sourceField.trim(),
      canonicalField: canonicalField.trim(),
      transformationRule: transformationRule.trim(),
      departmentCode: (departmentCode || 'GEN').trim(),
      description: description || '',
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    });

    // Write audit log
    try {
      await query(
        `
        INSERT INTO audit_logs (
          actor_type, actor_id, department_code, action, 
          entity_type, entity_id, status, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
        [
          'ADMIN',
          userContext.username || 'admin',
          created.department_code,
          'CREATE_DATA_MAPPING',
          'DATA_MAPPING',
          created.id,
          'SUCCESS',
          JSON.stringify({ sourceSystem, sourceField, canonicalField, transformationRule }),
        ]
      );
    } catch (e) {
      logger.warn(`Audit log failed: ${e.message}`);
    }

    return {
      id: created.id,
      sourceSystem: created.source_system,
      source_system: created.source_system,
      sourceField: created.source_field,
      source_field: created.source_field,
      canonicalField: created.canonical_field,
      canonical_field: created.canonical_field,
      transformationRule: created.transformation_rule,
      transformation_rule: created.transformation_rule,
      departmentCode: created.department_code,
      department_code: created.department_code,
      description: created.description,
      isActive: created.is_active,
      is_active: created.is_active,
    };
  }

  /**
   * Update an existing mapping rule
   */
  static async updateMapping(id, data, userContext = {}) {
    const updated = await DataMappingRuleModel.update(id, data);
    if (!updated) {
      const err = new Error(`Data mapping rule with ID "${id}" not found`);
      err.status = 404;
      throw err;
    }

    // Write audit log
    try {
      await query(
        `
        INSERT INTO audit_logs (
          actor_type, actor_id, department_code, action, 
          entity_type, entity_id, status, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
        [
          'ADMIN',
          userContext.username || 'admin',
          updated.department_code,
          'UPDATE_DATA_MAPPING',
          'DATA_MAPPING',
          updated.id,
          'SUCCESS',
          JSON.stringify(data),
        ]
      );
    } catch (e) {
      logger.warn(`Audit log failed: ${e.message}`);
    }

    return {
      id: updated.id,
      sourceSystem: updated.source_system,
      source_system: updated.source_system,
      sourceField: updated.source_field,
      source_field: updated.source_field,
      canonicalField: updated.canonical_field,
      canonical_field: updated.canonical_field,
      transformationRule: updated.transformation_rule,
      transformation_rule: updated.transformation_rule,
      departmentCode: updated.department_code,
      department_code: updated.department_code,
      description: updated.description,
      isActive: updated.is_active,
      is_active: updated.is_active,
    };
  }

  /**
   * Delete a mapping rule
   */
  static async deleteMapping(id, userContext = {}) {
    const deleted = await DataMappingRuleModel.delete(id);
    if (!deleted) {
      const err = new Error(`Data mapping rule with ID "${id}" not found`);
      err.status = 404;
      throw err;
    }

    // Write audit log
    try {
      await query(
        `
        INSERT INTO audit_logs (
          actor_type, actor_id, department_code, action, 
          entity_type, entity_id, status, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
        [
          'ADMIN',
          userContext.username || 'admin',
          deleted.department_code,
          'DELETE_DATA_MAPPING',
          'DATA_MAPPING',
          deleted.id,
          'SUCCESS',
          JSON.stringify({ sourceSystem: deleted.source_system, sourceField: deleted.source_field }),
        ]
      );
    } catch (e) {
      logger.warn(`Audit log failed: ${e.message}`);
    }

    return deleted;
  }

  /**
   * Execute live transformation test in backend
   */
  static testTransformation(value, rule = 'direct') {
    const normalizedRule = (rule || 'direct').trim().toUpperCase();

    let outputValue = value;
    let outputType = typeof value;

    if (normalizedRule === 'DIRECT') {
      outputValue = value;
    } else if (normalizedRule === 'NUMBER' || normalizedRule === 'TO_NUMBER') {
      const cleaned = String(value).replace(/[₹$,\s]/g, '');
      const parsed = Number(cleaned);
      if (isNaN(parsed)) throw new Error(`Cannot parse "${value}" into a valid number`);
      outputValue = parsed;
      outputType = 'number';
    } else if (normalizedRule === 'BOOLEAN' || normalizedRule === 'TO_BOOLEAN') {
      const str = String(value).trim().toLowerCase();
      if (['true', '1', 'yes', 'y', 'match', 'verified', 'active'].includes(str)) {
        outputValue = true;
      } else if (['false', '0', 'no', 'n', 'mismatch', 'unverified', 'inactive'].includes(str)) {
        outputValue = false;
      } else {
        throw new Error(`Cannot parse "${value}" into a boolean`);
      }
      outputType = 'boolean';
    } else if (normalizedRule.includes('VERIFIED / NOT_VERIFIED')) {
      const str = String(value).trim().toUpperCase();
      outputValue = str === 'VERIFIED' || str === 'PASS' || str === 'CONFIRMED' ? 'VERIFIED' : 'NOT_VERIFIED';
      outputType = 'string';
    } else if (normalizedRule.includes('VALID / EXPIRED')) {
      const str = String(value).trim().toUpperCase();
      outputValue = str === 'VALID' || str === 'ACTIVE' ? 'VALID' : 'EXPIRED';
      outputType = 'string';
    } else if (normalizedRule === 'TRIM') {
      outputValue = String(value).trim();
      outputType = 'string';
    } else if (normalizedRule === 'TO_UPPERCASE') {
      outputValue = String(value).trim().toUpperCase();
      outputType = 'string';
    }

    return {
      input: value,
      rule,
      output: outputValue,
      type: outputType,
      timestamp: new Date().toISOString(),
    };
  }
}

export default DataMappingRuleService;
