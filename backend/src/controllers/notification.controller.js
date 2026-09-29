import { NotificationService, NOTIFICATION_TYPES } from '../services/notification.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { AppError } from '../utils/appError.js';
import logger from '../utils/logger.js';

/**
 * 1. List Notifications
 * GET /api/notifications
 * Supports filtering by citizenId, applicationId, type, status, recipientType, and search.
 */
export const listNotifications = async (req, res, next) => {
  try {
    let citizenId = req.query.citizen_id || req.query.citizenId;
    const applicationId = req.query.application_id || req.query.applicationId;
    const type = req.query.type;
    const status = req.query.status;
    let recipientType = req.query.recipient_type || req.query.recipientType;
    const search = req.query.search;
    const limit = req.query.limit;

    // RBAC Isolation: If authenticated user is a CITIZEN, restrict to their own citizen records
    if (req.user && req.user.role === 'CITIZEN') {
      if (req.user.citizenId) {
        citizenId = req.user.citizenId;
      }
      recipientType = 'CITIZEN';
    }

    const result = await NotificationService.getNotifications({
      citizenId,
      applicationId,
      type,
      status,
      recipientType,
      search,
      limit,
    });

    return ApiResponse.success(res, {
      message: 'Notifications retrieved successfully',
      data: {
        count: result.count,
        citizenId: citizenId || 'ALL',
        notifications: result.notifications,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Create / Dispatch Notification
 * POST /api/notifications
 */
export const createNotification = async (req, res, next) => {
  try {
    const {
      citizen_id,
      citizenId = citizen_id,
      application_id,
      applicationId = application_id,
      type,
      title,
      message,
      channel,
      recipient_type,
      recipientType = recipient_type,
      severity,
      metadata,
    } = req.body;

    if (!title || !message) {
      throw AppError.badRequest('Title and message are required fields', 'VALIDATION_ERROR');
    }

    const created = await NotificationService.createNotification({
      citizenId,
      applicationId,
      type: type || NOTIFICATION_TYPES.APPLICATION_SUBMITTED,
      title,
      message,
      channel,
      recipientType,
      severity,
      metadata,
    });

    return ApiResponse.success(res, {
      message: 'Notification created successfully',
      data: created,
      statusCode: 201,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Mark Single Notification as Read
 * PATCH /api/notifications/:id/read
 */
export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await NotificationService.markAsRead(id);

    if (!updated) {
      throw AppError.notFound(`Notification [${id}] not found`, 'NOTIFICATION_NOT_FOUND');
    }

    return ApiResponse.success(res, {
      message: 'Notification marked as read',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Mark All Notifications as Read for Citizen
 * POST /api/notifications/mark-all-read
 */
export const markAllAsRead = async (req, res, next) => {
  try {
    const citizenId = req.body.citizen_id || req.body.citizenId || req.user?.citizenId;
    if (!citizenId) {
      throw AppError.badRequest('citizen_id is required', 'VALIDATION_ERROR');
    }

    const count = await NotificationService.markAllAsRead(citizenId);
    return ApiResponse.success(res, {
      message: `Marked ${count} notifications as read`,
      data: { updatedCount: count, citizenId },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Get SLA Metrics & Compliance Telemetry
 * GET /api/sla or GET /api/notifications/sla
 */
export const getSlaMetrics = async (req, res, next) => {
  try {
    const targetHours = parseInt(req.query.target_hours || req.query.targetHours || '48', 10);
    const metrics = await NotificationService.calculateSlaMetrics(targetHours);

    return ApiResponse.success(res, {
      message: 'SLA monitoring metrics calculated from persisted timestamps',
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Evaluate and Trigger SLA Alerts
 * POST /api/sla/evaluate
 */
export const evaluateSlaAlerts = async (req, res, next) => {
  try {
    const targetHours = parseInt(req.body.target_hours || req.body.targetHours || '48', 10);
    const result = await NotificationService.evaluateAndTriggerSlaAlerts(targetHours);

    return ApiResponse.success(res, {
      message: `Evaluated ${result.evaluatedCount} applications. Generated ${result.newNotificationsCreated} SLA notifications.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  listNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  getSlaMetrics,
  evaluateSlaAlerts,
};
