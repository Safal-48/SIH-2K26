import { Router } from 'express';
import ServiceRegistryController from '../controllers/serviceRegistry.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { ROLES } from '../services/auth.service.js';
import { validateRequest } from '../middleware/validate.js';
import { connectorSchemas } from '../validators/schemas.js';

const router = Router();

// ADMIN-only authorization guard for all service registry operations
router.use(authenticate, authorizeRoles(ROLES.ADMIN, ROLES.SYSTEM));

/**
 * GET /api/services
 * List all services with health, connector type, response time, and last checked
 */
router.get('/', ServiceRegistryController.listServices);

/**
 * GET /api/services/:id
 * Retrieve details for a specific service
 */
router.get('/:id', ServiceRegistryController.getService);

/**
 * POST /api/services/:id/test
 * Execute real backend connector probe test and persist health & latency into PostgreSQL
 */
router.post(
  '/:id/test',
  validateRequest({ body: connectorSchemas.test }),
  ServiceRegistryController.testService
);

/**
 * PUT /api/services/:id
 * Update connector type or endpoint configuration
 */
router.put('/:id', ServiceRegistryController.updateConfig);

export default router;
