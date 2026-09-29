import { Router } from 'express';
import workflowController from '../controllers/workflow.controller.js';
import { validateRequest } from '../middleware/validate.js';
import { workflowSchemas } from '../validators/schemas.js';

const router = Router();

/**
 * Workflow & Orchestration Engine Routes
 * All routes are backed directly by PostgreSQL workflow definitions and step sequences.
 */

// List all workflow definitions from PostgreSQL
router.get('/definitions', workflowController.listDefinitions);

// Get specific workflow definition and ordered steps
router.get('/definitions/:workflowCode', workflowController.getDefinition);

// Start workflow execution for an application
router.post('/start', workflowController.startWorkflow);

// Resume workflow execution from a failed/queued step (with Zod validation)
router.post(
  '/resume',
  validateRequest({ body: workflowSchemas.resume }),
  workflowController.resumeWorkflow
);

// Start/Run workflow for application by ID
router.post('/:id/run', workflowController.runWorkflowById);

// Get live workflow status by application ID
router.get('/:id/status', workflowController.getWorkflowStatusById);

// Get live workflow execution status and timeline for an application
router.get('/:applicationId', workflowController.getWorkflowStatus);

// Reset workflow steps for testing
router.post('/reset/:applicationId', workflowController.resetWorkflow);

export default router;
