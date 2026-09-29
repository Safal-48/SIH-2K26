import { Router } from 'express';
import DataMappingController from '../controllers/dataMapping.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { ROLES } from '../services/auth.service.js';
import { validateRequest } from '../middleware/validate.js';
import { adminConfigSchemas } from '../validators/schemas.js';

const router = Router();

// ADMIN-only authorization guard for all data mapping operations
router.use(authenticate, authorizeRoles(ROLES.ADMIN, ROLES.SYSTEM));

/**
 * GET /api/mappings
 * List all field mappings (Source System, Source Field, Canonical Field, Transformation Rule)
 */
router.get('/', DataMappingController.listMappings);

/**
 * POST /api/mappings/test
 * Test transformation rule interactively
 */
router.post('/test', validateRequest({ body: adminConfigSchemas.testDataMapping }), DataMappingController.testRule);

/**
 * POST /api/mappings
 * Create a new mapping rule
 */
router.post('/', validateRequest({ body: adminConfigSchemas.createDataMapping }), DataMappingController.createMapping);

/**
 * GET /api/mappings/:id
 * Get single mapping
 */
router.get('/:id', DataMappingController.getMapping);

/**
 * PUT /api/mappings/:id
 * Update a mapping rule
 */
router.put('/:id', DataMappingController.updateMapping);

/**
 * DELETE /api/mappings/:id
 * Delete a mapping rule
 */
router.delete('/:id', DataMappingController.deleteMapping);

export default router;
