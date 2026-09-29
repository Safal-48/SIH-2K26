import { Router } from 'express';
import DemoControlController from '../controllers/demoControl.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { ROLES } from '../services/auth.service.js';

const router = Router();

// ADMIN-only authorization guard for all Demo Controls
router.use(authenticate, authorizeRoles(ROLES.ADMIN, ROLES.SYSTEM));

/**
 * 1. Run Full Success (restore known-good state & execute golden path)
 * POST /api/admin/demo/full-success
 */
router.post('/full-success', DemoControlController.runFullSuccess);

/**
 * 2. Fail Bank API (Bank returns 503 / timeout, creates retryable exception)
 * POST /api/admin/demo/fail-bank
 */
router.post('/fail-bank', DemoControlController.failBank);

/**
 * 3. Recover Bank API (marks Bank healthy, allows queued/retry execution)
 * POST /api/admin/demo/recover-bank
 */
router.post('/recover-bank', DemoControlController.recoverBank);

/**
 * 4. Slow Income API (injects latency, persists actual measured latency)
 * POST /api/admin/demo/slow-income
 */
router.post('/slow-income', DemoControlController.slowIncome);

/**
 * 5. Invalid Income (returns invalid/non-verifiable result, routes appropriately)
 * POST /api/admin/demo/invalid-income
 */
router.post('/invalid-income', DemoControlController.invalidIncome);

/**
 * 6. Duplicate Application (triggers configured duplicate detection)
 * POST /api/admin/demo/duplicate
 */
router.post('/duplicate', DemoControlController.duplicate);

/**
 * 7. Reset Demo (restore deterministic seed state, clear transient demo state)
 * POST /api/admin/demo/reset
 */
router.post('/reset', DemoControlController.reset);

/**
 * Status of all controls
 * GET /api/admin/demo/status
 */
router.get('/status', DemoControlController.getStatus);

export default router;
