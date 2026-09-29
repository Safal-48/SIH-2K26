import { query } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Data Mapping Model
 * Handles persistence and retrieval of departmental mapping rules in PostgreSQL.
 */
export const DataMappingModel = {
  /**
   * Find mapping rules by department and canonical target model
   * @param {string} sourceDepartment - e.g. 'EDU', 'REV', 'DBT'
   * @param {string} targetModel - e.g. 'CANONICAL_EDUCATION', 'CANONICAL_INCOME', 'CANONICAL_BANK'
   */
  findByDepartment: async (sourceDepartment, targetModel) => {
    try {
      const text = `
        SELECT id, source_department, source_schema_name, target_canonical_model, mapping_rules, version, is_active
        FROM data_mappings
        WHERE source_department = $1 AND target_canonical_model = $2 AND is_active = TRUE
        LIMIT 1
      `;
      const result = await query(text, [sourceDepartment, targetModel]);
      return result.rows[0] || null;
    } catch (err) {
      logger.warn(`DataMappingModel.findByDepartment: Could not load from DB (${err.message}). Fallback to default in-memory rules.`);
      return null;
    }
  },

  /**
   * Upsert a departmental mapping rule definition
   */
  upsert: async ({ sourceDepartment, sourceSchemaName, targetModel, rules, version = '1.0' }) => {
    try {
      const text = `
        INSERT INTO data_mappings (source_department, source_schema_name, target_canonical_model, mapping_rules, version, is_active)
        VALUES ($1, $2, $3, $4, $5, TRUE)
        ON CONFLICT (source_department, source_schema_name, target_canonical_model)
        DO UPDATE SET mapping_rules = $4, version = $5, is_active = TRUE
        RETURNING id, source_department, target_canonical_model, version, created_at
      `;
      const values = [sourceDepartment, sourceSchemaName, targetModel, JSON.stringify(rules), version];
      const result = await query(text, values);
      return result.rows[0];
    } catch (err) {
      logger.error('DataMappingModel.upsert error:', err.message);
      throw err;
    }
  },

  /**
   * List all registered mapping rules
   */
  listAll: async () => {
    try {
      const text = `
        SELECT id, source_department, source_schema_name, target_canonical_model, version, is_active, created_at
        FROM data_mappings
        ORDER BY source_department ASC
      `;
      const result = await query(text);
      return result.rows;
    } catch (err) {
      logger.warn('DataMappingModel.listAll error:', err.message);
      return [];
    }
  },
};

export default DataMappingModel;
