import { query } from '../config/database.js';
import NotificationModel from '../models/notification.model.js';
import logger from '../utils/logger.js';

export const NOTIFICATION_TYPES = {
  APPLICATION_SUBMITTED: 'APPLICATION_SUBMITTED',
  VERIFICATION_COMPLETED: 'VERIFICATION_COMPLETED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RETRY_SUCCEEDED: 'RETRY_SUCCEEDED',
  OFFICER_ACTION_REQUIRED: 'OFFICER_ACTION_REQUIRED',
  ELIGIBLE: 'ELIGIBLE',
  NOT_ELIGIBLE: 'NOT_ELIGIBLE',
  SLA_APPROACHING: 'SLA_APPROACHING',
  SLA_BREACHED: 'SLA_BREACHED',
};

/**
 * Notification & SLA Monitoring Service (Step 13)
 * Manages persisted multi-channel notifications and dynamic SLA calculations.
 */
export class NotificationService {
  /**
   * 1. Send / Create a Notification
   */
  static async createNotification(payload) {
    const {
      citizenId,
      applicationId,
      type,
      title,
      message,
      channel = 'IN_APP',
      recipientType = 'CITIZEN',
      severity = 'INFO',
      metadata = {},
    } = payload;

    const record = await NotificationModel.create({
      citizenId,
      applicationId,
      type: type || NOTIFICATION_TYPES.APPLICATION_SUBMITTED,
      channel,
      title,
      message,
      status: 'UNREAD',
      recipientType,
      severity,
      metadata,
    });

    logger.info(`NotificationService: Created [${record.type}] for [${citizenId || 'BROADCAST'}] (App: ${applicationId || 'N/A'})`);
    return record;
  }

  /**
   * 2. List Notifications with Role & Citizen-Safe Isolation
   */
  static async getNotifications(filters = {}) {
    const notifications = await NotificationModel.list(filters);

    // Format and sanitize for citizen output if requester is citizen
    const formatted = notifications.map((n) => ({
      id: n.id,
      citizen_id: n.citizen_id,
      citizenId: n.citizen_id,
      application_id: n.application_id,
      applicationId: n.application_id,
      type: n.type,
      channel: n.channel,
      title: n.title,
      message: n.message,
      status: n.status,
      is_read: n.status === 'READ',
      recipient_type: n.recipient_type || 'CITIZEN',
      recipientType: n.recipient_type || 'CITIZEN',
      severity: n.severity || 'INFO',
      metadata: n.metadata ? (typeof n.metadata === 'string' ? JSON.parse(n.metadata) : n.metadata) : {},
      timestamp: n.timestamp,
      created_at: n.created_at,
      createdAt: n.created_at,
    }));

    return {
      count: formatted.length,
      notifications: formatted,
    };
  }

  /**
   * 3. Mark Notification as Read
   */
  static async markAsRead(id) {
    return await NotificationModel.markRead(id);
  }

  /**
   * 4. Mark All Notifications as Read for Citizen
   */
  static async markAllAsRead(citizenId) {
    return await NotificationModel.markAllRead(citizenId);
  }

  /**
   * 5. Calculate End-to-End Application SLA Metrics from Actual Timestamps
   * Default demo SLA target = 48 hours.
   * 
   * Example:
   * <= 36 hours = SLA Met (healthy, emerald)
   * 36h - 48h = SLA Approaching (warning, amber)
   * > 48 hours = SLA Breach (critical, rose)
   */
  static async calculateSlaMetrics(targetHours = 48) {
    const res = await query(`
      SELECT 
        a.application_id,
        a.citizen_id,
        a.scheme_name,
        a.status,
        a.current_step,
        a.submission_date,
        a.benefit_amount,
        COALESCE(a.approval_date, a.updated_at) as completed_at,
        ROUND(
          CASE 
            WHEN a.status IN ('SUCCESS', 'APPROVED', 'COMPLETED') 
              THEN EXTRACT(EPOCH FROM (COALESCE(a.approval_date, a.updated_at, CURRENT_TIMESTAMP) - a.submission_date)) / 3600.0
            ELSE 
              EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - a.submission_date)) / 3600.0
          END::numeric, 1
        ) as elapsed_hours
      FROM applications a
      ORDER BY a.submission_date DESC
    `);

    const rows = res.rows || [];
    let metCount = 0;
    let approachingCount = 0;
    let breachedCount = 0;
    let totalElapsed = 0;

    const applications = rows.map((row) => {
      const elapsed = parseFloat(row.elapsed_hours || '0');
      totalElapsed += elapsed;

      let slaStatus;
      let statusIndicator;
      let statusLabel;

      if (elapsed <= 36) {
        slaStatus = 'MET';
        statusIndicator = 'emerald';
        statusLabel = 'SLA Met';
        metCount++;
      } else if (elapsed <= targetHours) {
        slaStatus = 'APPROACHING';
        statusIndicator = 'amber';
        statusLabel = 'SLA Approaching';
        approachingCount++;
      } else {
        slaStatus = 'BREACHED';
        statusIndicator = 'rose';
        statusLabel = 'SLA Breach';
        breachedCount++;
      }

      return {
        applicationId: row.application_id,
        citizenId: row.citizen_id,
        schemeName: row.scheme_name,
        status: row.status,
        currentStep: row.current_step,
        submissionDate: row.submission_date,
        completedAt: row.status === 'SUCCESS' ? row.completed_at : null,
        elapsedHours: elapsed,
        targetHours,
        slaStatus,
        statusIndicator,
        statusLabel,
        isBreached: elapsed > targetHours,
        isApproaching: elapsed > 36 && elapsed <= targetHours,
      };
    });

    const totalApplications = applications.length;
    const inSlaCount = totalApplications - breachedCount;
    const overallComplianceRate = totalApplications > 0
      ? Math.round((inSlaCount / totalApplications) * 100)
      : 100;
    const averageProcessingHours = totalApplications > 0
      ? Math.round((totalElapsed / totalApplications) * 10) / 10
      : 0;

    return {
      targetHours,
      totalApplications,
      slaMetCount: metCount,
      slaApproachingCount: approachingCount,
      slaBreachedCount: breachedCount,
      inSlaCount,
      overallComplianceRate,
      averageProcessingHours,
      applications,
    };
  }

  /**
   * 6. Evaluate Applications and Automatically Trigger SLA Notifications
   * Generates SLA_APPROACHING and SLA_BREACHED notifications when thresholds are crossed.
   */
  static async evaluateAndTriggerSlaAlerts(targetHours = 48) {
    const metrics = await this.calculateSlaMetrics(targetHours);
    let newNotifications = 0;

    for (const app of metrics.applications) {
      if (app.status === 'SUCCESS' || app.status === 'COMPLETED' || app.status === 'REJECTED') {
        // Skip terminal applications from new active alerts
        continue;
      }

      if (app.slaStatus === 'BREACHED') {
        // Check if SLA_BREACHED notification already exists
        const existing = await query(
          `SELECT 1 FROM notifications 
           WHERE application_id = $1 AND type = $2 LIMIT 1`,
          [app.applicationId, NOTIFICATION_TYPES.SLA_BREACHED]
        );

        if (existing.rows.length === 0) {
          // Citizen notification (reassuring, citizen-safe)
          await this.createNotification({
            citizenId: app.citizenId,
            applicationId: app.applicationId,
            type: NOTIFICATION_TYPES.SLA_BREACHED,
            title: 'Processing Time Update',
            message: `Processing for application ${app.applicationId} is taking longer than expected. Escalated for priority resolution.`,
            recipientType: 'CITIZEN',
            severity: 'WARNING',
            metadata: { elapsedHours: app.elapsedHours, targetHours },
          });

          // Operational notification (action-oriented for Admin)
          await this.createNotification({
            citizenId: app.citizenId,
            applicationId: app.applicationId,
            type: NOTIFICATION_TYPES.SLA_BREACHED,
            title: 'Processing SLA Breached',
            message: `[SLA CRITICAL] Application ${app.applicationId} has breached the ${targetHours}h SLA target (${app.elapsedHours}h elapsed). Auto-escalated to departmental nodal officer.`,
            recipientType: 'ADMIN',
            severity: 'CRITICAL',
            metadata: { elapsedHours: app.elapsedHours, targetHours },
          });

          newNotifications += 2;
        }
      } else if (app.slaStatus === 'APPROACHING') {
        // Check if SLA_APPROACHING notification already exists
        const existing = await query(
          `SELECT 1 FROM notifications 
           WHERE application_id = $1 AND type = $2 LIMIT 1`,
          [app.applicationId, NOTIFICATION_TYPES.SLA_APPROACHING]
        );

        if (existing.rows.length === 0) {
          await this.createNotification({
            citizenId: app.citizenId,
            applicationId: app.applicationId,
            type: NOTIFICATION_TYPES.SLA_APPROACHING,
            title: 'SLA Window Approaching',
            message: `Application ${app.applicationId} is approaching processing timeline threshold (${app.elapsedHours}h elapsed of ${targetHours}h SLA). Expedited routing engaged.`,
            recipientType: 'ADMIN',
            severity: 'WARNING',
            metadata: { elapsedHours: app.elapsedHours, targetHours },
          });

          newNotifications++;
        }
      }
    }

    return {
      evaluatedCount: metrics.totalApplications,
      breachedCount: metrics.slaBreachedCount,
      approachingCount: metrics.slaApproachingCount,
      newNotificationsCreated: newNotifications,
      metrics,
    };
  }
}

export default NotificationService;
