import { Router } from 'express';
import {
  listNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  getSlaMetrics,
  evaluateSlaAlerts,
} from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Middleware to optionally authenticate if Authorization header is present
const optionalAuth = (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return authenticate(req, res, next);
  }
  next();
};

/**
 * 1. SLA Monitoring Endpoints
 * GET /api/notifications/sla
 * POST /api/notifications/sla/evaluate
 */
router.get('/sla', optionalAuth, getSlaMetrics);
router.post('/sla/evaluate', optionalAuth, evaluateSlaAlerts);

/**
 * 2. Notification Feed & Management Endpoints
 * GET /api/notifications
 * POST /api/notifications
 */
router.get('/', optionalAuth, listNotifications);
router.post('/', optionalAuth, createNotification);

/**
 * 3. Mark Read Endpoints
 * PATCH /api/notifications/:id/read
 * POST /api/notifications/:id/read
 * POST /api/notifications/mark-all-read
 */
router.patch('/:id/read', optionalAuth, markAsRead);
router.post('/:id/read', optionalAuth, markAsRead);
router.post('/mark-all-read', optionalAuth, markAllAsRead);

export default router;
