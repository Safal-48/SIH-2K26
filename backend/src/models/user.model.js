import { query } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * User Data Access Model
 * Manages user accounts and credentials for RBAC and authentication
 */
export class UserModel {
  /**
   * Find user by username, citizen ID, or email
   * @param {string} identifier - Username, citizen ID, or email
   * @returns {Promise<Object|null>}
   */
  static async findByIdentifier(identifier) {
    if (!identifier) return null;
    const cleanId = String(identifier).trim();
    const result = await query(
      `SELECT * FROM users 
       WHERE LOWER(username) = LOWER($1) 
          OR citizen_id = $1 
          OR LOWER(email) = LOWER($1)
          OR (POSITION('@' IN $1) > 0 AND LOWER(username) = LOWER(SPLIT_PART($1, '@', 1)))
       LIMIT 1`,
      [cleanId]
    );
    return result.rows[0] || null;
  }

  /**
   * Find user specifically by email address
   * @param {string} email
   * @returns {Promise<Object|null>}
   */
  static async findByEmail(email) {
    if (!email) return null;
    const result = await query(
      `SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [String(email).trim()]
    );
    return result.rows[0] || null;
  }

  /**
   * Create a new user in PostgreSQL
   * @param {Object} userData
   * @returns {Promise<Object>}
   */
  static async create({
    username,
    passwordHash,
    role = 'CITIZEN',
    citizenId = null,
    departmentCode = 'CITIZEN',
    fullName,
    email,
  }) {
    if (citizenId) {
      try {
        const checkCitizen = await query('SELECT citizen_id FROM citizens WHERE citizen_id = $1 LIMIT 1', [citizenId]);
        if (checkCitizen.rows.length === 0) {
          await query(
            `INSERT INTO citizens (
              citizen_id,
              full_name,
              date_of_birth,
              gender,
              email,
              phone_masked,
              aadhaar_virtual_id,
              address_line,
              district,
              state,
              pincode,
              status
            ) VALUES ($1, $2, '2000-01-01', 'OTHER', $3, 'XXXXXX1234', 'VID-9999-XXXX', 'Digital Registration', 'Central District', 'Delhi', '110001', 'ACTIVE')
            ON CONFLICT (citizen_id) DO NOTHING`,
            [citizenId, fullName || 'Citizen User', email || '']
          );
        }
      } catch (citizenErr) {
        logger.warn(`Could not auto-provision master citizen record for ${citizenId}: ${citizenErr.message}`);
      }
    }

    const result = await query(
      `INSERT INTO users (
        username,
        password_hash,
        role,
        citizen_id,
        department_code,
        full_name,
        email,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
      RETURNING *`,
      [username, passwordHash, role, citizenId, departmentCode, fullName, email]
    );
    return result.rows[0];
  }

  /**
   * Update user password
   * @param {string} id - User UUID
   * @param {string} passwordHash
   * @returns {Promise<Object|null>}
   */
  static async updatePassword(id, passwordHash) {
    const result = await query(
      `UPDATE users 
       SET password_hash = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [passwordHash, id]
    );
    return result.rows[0] || null;
  }

  /**
   * Find user by UUID
   * @param {string} id - User UUID
   * @returns {Promise<Object|null>}
   */
  static async findById(id) {
    if (!id) return null;
    const result = await query(
      `SELECT * FROM users WHERE id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * List all users
   * @returns {Promise<Array>}
   */
  static async list() {
    const result = await query(
      `SELECT id, username, role, citizen_id, department_code, full_name, email, is_active, created_at 
       FROM users 
       ORDER BY role ASC, username ASC`
    );
    return result.rows;
  }
}

export default UserModel;
