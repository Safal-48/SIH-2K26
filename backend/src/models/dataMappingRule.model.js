import { query } from '../config/database.js';
import logger from '../utils/logger.js';

export const DataMappingRuleModel = {
  /**
   * List all field data mappings with optional filters
   */
  listAll: async (filters = {}) => {
    try {
      const conditions = [];
      const values = [];

      if (filters.sourceSystem) {
        values.push(`%${filters.sourceSystem}%`);
        conditions.push(`source_system ILIKE $${values.length}`);
      }

      if (filters.departmentCode) {
        values.push(filters.departmentCode.toUpperCase());
        conditions.push(`department_code = $${values.length}`);
      }

      if (filters.search) {
        values.push(`%${filters.search}%`);
        conditions.push(`(
          source_system ILIKE $${values.length} OR 
          source_field ILIKE $${values.length} OR 
          canonical_field ILIKE $${values.length} OR 
          transformation_rule ILIKE $${values.length}
        )`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const text = `
        SELECT 
          id,
          source_system,
          source_field,
          canonical_field,
          transformation_rule,
          department_code,
          description,
          is_active,
          created_at,
          updated_at
        FROM field_data_mappings
        ${whereClause}
        ORDER BY department_code ASC, source_system ASC, source_field ASC
      `;

      const res = await query(text, values);
      return res.rows;
    } catch (err) {
      logger.error('DataMappingRuleModel.listAll error:', err.message);
      throw err;
    }
  },

  /**
   * Find field mapping by ID
   */
  findById: async (id) => {
    try {
      const text = `
        SELECT *
        FROM field_data_mappings
        WHERE id = $1
        LIMIT 1
      `;
      const res = await query(text, [id]);
      return res.rows[0] || null;
    } catch (err) {
      logger.error(`DataMappingRuleModel.findById error for "${id}":`, err.message);
      throw err;
    }
  },

  /**
   * Create a new field mapping rule
   */
  create: async ({
    sourceSystem,
    sourceField,
    canonicalField,
    transformationRule,
    departmentCode = 'GEN',
    description = '',
    isActive = true,
  }) => {
    try {
      const text = `
        INSERT INTO field_data_mappings (
          source_system,
          source_field,
          canonical_field,
          transformation_rule,
          department_code,
          description,
          is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (source_system, source_field, canonical_field)
        DO UPDATE SET 
          transformation_rule = EXCLUDED.transformation_rule,
          department_code = EXCLUDED.department_code,
          description = EXCLUDED.description,
          is_active = EXCLUDED.is_active,
          updated_at = NOW()
        RETURNING *
      `;
      const values = [
        sourceSystem,
        sourceField,
        canonicalField,
        transformationRule,
        departmentCode.toUpperCase(),
        description,
        isActive,
      ];
      const res = await query(text, values);
      return res.rows[0];
    } catch (err) {
      logger.error('DataMappingRuleModel.create error:', err.message);
      throw err;
    }
  },

  /**
   * Update an existing field mapping rule
   */
  update: async (id, fields = {}) => {
    try {
      const text = `
        UPDATE field_data_mappings
        SET 
          source_system = COALESCE($1, source_system),
          source_field = COALESCE($2, source_field),
          canonical_field = COALESCE($3, canonical_field),
          transformation_rule = COALESCE($4, transformation_rule),
          department_code = COALESCE($5, department_code),
          description = COALESCE($6, description),
          is_active = COALESCE($7, is_active),
          updated_at = NOW()
        WHERE id = $8
        RETURNING *
      `;
      const values = [
        fields.sourceSystem || null,
        fields.sourceField || null,
        fields.canonicalField || null,
        fields.transformationRule || null,
        fields.departmentCode ? fields.departmentCode.toUpperCase() : null,
        fields.description !== undefined ? fields.description : null,
        fields.isActive !== undefined ? fields.isActive : null,
        id,
      ];
      const res = await query(text, values);
      return res.rows[0] || null;
    } catch (err) {
      logger.error(`DataMappingRuleModel.update error for "${id}":`, err.message);
      throw err;
    }
  },

  /**
   * Delete a field mapping rule
   */
  delete: async (id) => {
    try {
      const text = `DELETE FROM field_data_mappings WHERE id = $1 RETURNING *`;
      const res = await query(text, [id]);
      return res.rows[0] || null;
    } catch (err) {
      logger.error(`DataMappingRuleModel.delete error for "${id}":`, err.message);
      throw err;
    }
  },
};

export default DataMappingRuleModel;
