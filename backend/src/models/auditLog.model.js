import { query } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Immutable Audit Log Model
 * Logs all cross-departmental data requests, consent validations, connector invocations, and workflow step state transitions.
 */
export const AuditLogModel = {
  /**
   * Insert an audit log entry
   * @param {Object} logEntry
   * @param {string} [logEntry.requestId]
   * @param {string} [logEntry.actorType='SYSTEM']
   * @param {string} [logEntry.actorId='WORKFLOW_ENGINE']
   * @param {string} [logEntry.departmentCode='INTEROP']
   * @param {string} logEntry.action
   * @param {string} [logEntry.entityType='APPLICATION']
   * @param {string} [logEntry.entityId]
   * @param {string} logEntry.status
   * @param {string} [logEntry.ipAddress='127.0.0.1']
   * @param {Object} [logEntry.metadata={}]
   */
  log: async ({
    requestId = null,
    actorType = 'SYSTEM',
    actorId = 'WORKFLOW_ENGINE',
    departmentCode = 'INTEROP',
    department, // alias
    action,
    entityType = 'APPLICATION',
    entityId = null,
    status = 'SUCCESS',
    ipAddress = '127.0.0.1',
    metadata = {},
  }) => {
    try {
      const text = `
        INSERT INTO audit_logs (
          request_id, actor_type, actor_id, department_code, action, 
          entity_type, entity_id, status, ip_address, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, request_id, action, status, created_at
      `;
      const values = [
        requestId,
        actorType,
        actorId,
        departmentCode || department || 'INTEROP',
        action,
        entityType,
        entityId,
        status,
        ipAddress,
        JSON.stringify(metadata || {}),
      ];
      const result = await query(text, values);
      return result.rows[0];
    } catch (err) {
      logger.error('Failed to persist audit log entry:', err.message);
      return null;
    }
  },

  /**
   * Find audit logs by entity ID
   * @param {string} entityId
   */
  findByEntity: async (entityId) => {
    const text = 'SELECT * FROM audit_logs WHERE entity_id = $1 ORDER BY timestamp DESC';
    const result = await query(text, [entityId]);
    return result.rows;
  },

  /**
   * List recent audit logs
   * @param {number} [limit=50]
   */
  listRecent: async (limit = 50) => {
    const text = 'SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT $1';
    const result = await query(text, [limit]);
    return result.rows;
  },
};

export default AuditLogModel;
