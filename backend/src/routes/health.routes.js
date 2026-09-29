import { Router } from 'express';
import { healthController } from '../controllers/health.controller.js';

const router = Router();

/**
 * @route GET /api/v1/health
 * @desc Get service health and database connection status
 * @access Public
 */
router.get('/', healthController.getHealth);

/**
 * @route GET /api/v1/health/ready
 * @desc Get service readiness probe
 * @access Public
 */
router.get('/ready', healthController.getReadiness);

export default router;
