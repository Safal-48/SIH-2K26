import { query } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Notification Model (Step 13)
 * Manages persisted notifications in PostgreSQL for citizens and administrators.
 */
export class NotificationModel {
  /**
   * Persist a new notification
   */
  static async create(payload) {
    const {
      citizenId = 'CZN-1001',
      applicationId = null,
      type,
      channel = 'IN_APP',
      title,
      message,
      status = 'UNREAD',
    } = payload;

    // Verify application_id exists before inserting to respect foreign key constraint
    let validAppId = null;
    if (applicationId) {
      try {
        const appCheck = await query(`SELECT 1 FROM applications WHERE application_id = $1 LIMIT 1`, [applicationId]);
        if (appCheck.rows && appCheck.rows.length > 0) {
          validAppId = applicationId;
        }
      } catch (err) {
        validAppId = null;
      }
    }

    const res = await query(
      `INSERT INTO notifications (
        citizen_id, application_id, type, channel, title, message, status, timestamp, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING id, citizen_id, application_id, type, channel, title, message, status, timestamp, created_at`,
      [
        citizenId || 'CZN-1001',
        validAppId,
        type,
        channel,
        title,
        message,
        status,
      ]
    );

    return res.rows[0];
  }

  /**
   * List notifications with multi-dimensional filtering
   */
  static async list(filters = {}) {
    const {
      citizenId,
      applicationId,
      type,
      status,
      search,
      limit = 50,
    } = filters;

    const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 50, 100));
    const conditions = [];
    const params = [];

    if (citizenId && citizenId !== 'ALL') {
      params.push(citizenId);
      conditions.push(`citizen_id = $${params.length}`);
    }

    if (applicationId) {
      params.push(applicationId);
      conditions.push(`application_id = $${params.length}`);
    }

    if (type && type !== 'ALL') {
      const normalizedType = type.toUpperCase().replace(/\s+/g, '_');
      params.push(normalizedType);
      conditions.push(`REPLACE(UPPER(type), ' ', '_') = $${params.length}`);
    }

    if (status && status !== 'ALL') {
      params.push(status.toUpperCase());
      conditions.push(`UPPER(status) = $${params.length}`);
    }

    if (search && search.trim().length > 0) {
      params.push(`%${search.trim().toLowerCase()}%`);
      conditions.push(`(LOWER(title) LIKE $${params.length} OR LOWER(message) LIKE $${params.length} OR LOWER(COALESCE(application_id, '')) LIKE $${params.length})`);
    }

    let sql = `
      SELECT 
        id, 
        citizen_id, 
        application_id, 
        type, 
        channel, 
        title, 
        message, 
        status, 
        timestamp, 
        created_at
      FROM notifications
    `;

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(' AND ');
    }

    sql += ` ORDER BY timestamp DESC LIMIT ${safeLimit}`;

    const res = await query(sql, params);
    return res.rows || [];
  }

  /**
   * Find notification by ID
   */
  static async findById(id) {
    const res = await query(
      `SELECT * FROM notifications WHERE id::text = $1 LIMIT 1`,
      [id]
    );
    return res.rows[0] || null;
  }

  /**
   * Mark notification as read
   */
  static async markRead(id) {
    const res = await query(
      `UPDATE notifications 
       SET status = 'READ' 
       WHERE id::text = $1 
       RETURNING *`,
      [id]
    );
    return res.rows[0] || null;
  }

  /**
   * Mark all notifications as read for a citizen
   */
  static async markAllRead(citizenId) {
    const res = await query(
      `UPDATE notifications 
       SET status = 'READ' 
       WHERE citizen_id = $1 AND status = 'UNREAD' 
       RETURNING count(*) as updated_count`,
      [citizenId]
    );
    return parseInt(res.rows[0]?.updated_count || '0', 10);
  }
}

export default NotificationModel;
