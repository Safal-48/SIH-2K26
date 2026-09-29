import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { ROLES } from '../services/auth.service.js';
import { validateRequest } from '../middleware/validate.js';
import { adminConfigSchemas } from '../validators/schemas.js';
import {
  listDefinitions,
  getDefinition,
  getVersionDetails,
  createVersion,
  activateVersion,
  addStep,
  updateStep,
  deleteStep,
  toggleStep,
  reorderSteps,
  saveAllSteps,
} from '../controllers/workflowDefinition.controller.js';

const router = Router();

// Strict RBAC: Only ADMIN or SYSTEM role can access Workflow Builder endpoints
router.use(authenticate, authorizeRoles(ROLES.ADMIN, ROLES.SYSTEM));

// Master definitions
router.get('/definitions', listDefinitions);
router.post('/definitions', validateRequest({ body: adminConfigSchemas.createWorkflowVersion }), createVersion);
router.get('/definitions/:code', getDefinition);

// Version specific operations
router.get('/definitions/:code/versions/:version', getVersionDetails);
router.post('/definitions/:code/versions/:version/activate', activateVersion);
router.put('/definitions/:code/versions/:version/steps', saveAllSteps);
router.post('/definitions/:code/versions/:version/reorder', reorderSteps);

// Individual step operations
router.post(
  '/definitions/:code/versions/:version/steps',
  validateRequest({ body: adminConfigSchemas.addWorkflowStep }),
  addStep
);
router.put(
  '/definitions/:code/versions/:version/steps/:stepId',
  validateRequest({ body: adminConfigSchemas.updateWorkflowStep }),
  updateStep
);
router.delete('/definitions/:code/versions/:version/steps/:stepId', deleteStep);
router.patch('/definitions/:code/versions/:version/steps/:stepId/toggle', toggleStep);

export default router;
