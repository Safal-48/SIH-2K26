import { query } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Citizen Consent Data Access Model
 * Manages legal consent artifacts for cross-departmental data sharing
 */
export class ConsentModel {
  /**
   * Get active, non-revoked consent for an application
   * @param {string} applicationId - Application identifier
   * @returns {Promise<Object|null>}
   */
  static async getActiveConsent(applicationId) {
    if (!applicationId) return null;
    const result = await query(
      `SELECT * FROM consents 
       WHERE application_id = $1 
         AND status = 'GRANTED' 
         AND revoked_at IS NULL 
         AND valid_until > CURRENT_TIMESTAMP 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [applicationId]
    );
    return result.rows[0] || null;
  }

  /**
   * Get latest consent record for an application (regardless of status)
   * @param {string} applicationId - Application identifier
   * @returns {Promise<Object|null>}
   */
  static async getByApplicationId(applicationId) {
    if (!applicationId) return null;
    const result = await query(
      `SELECT * FROM consents 
       WHERE application_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [applicationId]
    );
    return result.rows[0] || null;
  }

  /**
   * Grant or update consent for an application
   * @param {Object} consentData
   * @returns {Promise<Object>}
   */
  static async grantConsent({
    applicationId,
    citizenId,
    purpose = 'Scholarship eligibility verification',
    allowedDepartments = ['EDU', 'REV', 'DBT'],
    dataScopes = ['Education verification', 'Income verification', 'Bank verification status'],
    ipAddress = '127.0.0.1',
  }) {
    // Check if consent already exists for this application
    const existing = await this.getByApplicationId(applicationId);

    if (existing) {
      const updateResult = await query(
        `UPDATE consents 
         SET status = 'GRANTED',
             purpose = $2,
             allowed_departments = $3,
             data_scopes = $4,
             granted_at = CURRENT_TIMESTAMP,
             valid_from = CURRENT_TIMESTAMP,
             valid_until = CURRENT_TIMESTAMP + INTERVAL '180 days',
             revoked_at = NULL,
             ip_address = $5
         WHERE id = $1
         RETURNING *`,
        [existing.id, purpose, allowedDepartments, dataScopes, ipAddress]
      );
      return updateResult.rows[0];
    }

    const consentId = `CNS-${Date.now().toString().slice(-6)}`;
    const insertResult = await query(
      `INSERT INTO consents (
         consent_id, citizen_id, application_id, purpose,
         allowed_departments, data_scopes, status, granted_at,
         valid_from, valid_until, revoked_at, ip_address
       ) VALUES (
         $1, $2, $3, $4, $5, $6, 'GRANTED', CURRENT_TIMESTAMP,
         CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '180 days', NULL, $7
       ) RETURNING *`,
      [consentId, citizenId, applicationId, purpose, allowedDepartments, dataScopes, ipAddress]
    );

    return insertResult.rows[0];
  }

  /**
   * Revoke active consent for an application
   * @param {string} applicationId - Application identifier
   * @returns {Promise<Object|null>}
   */
  static async revokeConsent(applicationId) {
    const existing = await this.getByApplicationId(applicationId);
    if (!existing) return null;

    const result = await query(
      `UPDATE consents 
       SET status = 'REVOKED',
           revoked_at = CURRENT_TIMESTAMP
       WHERE application_id = $1 
       RETURNING *`,
      [applicationId]
    );
    return result.rows[0] || null;
  }
}

export default ConsentModel;
