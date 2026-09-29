import workflowEngine from '../workflow/workflowEngine.js';
import WorkflowModel from '../models/workflow.model.js';
import { ApiResponse } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

/**
 * Workflow Controller
 * Exposes REST API endpoints for starting, resuming, and tracking cross-department orchestration workflows.
 */
export const workflowController = {
  /**
   * Start or execute a workflow for an application
   * POST /api/v1/workflows/start
   */
  startWorkflow: async (req, res, next) => {
    try {
      const {
        applicationId,
        workflowCode,
        workflowVersion,
        mockMode = false,
        connectorType,
        queueOnFailure = false,
        educationMockMode,
        incomeMockMode,
        bankMockMode,
      } = req.body;

      if (!applicationId) {
        return ApiResponse.error(res, 'applicationId is required', 400);
      }

      logger.info(`WorkflowController: Request to start workflow for [${applicationId}]`);

      const executionResult = await workflowEngine.executeWorkflow(applicationId, {
        workflowCode,
        workflowVersion,
        mockMode,
        connectorType,
        queueOnFailure,
        educationMockMode,
        incomeMockMode,
        bankMockMode,
      });

      if (executionResult.success) {
        return ApiResponse.success(res, {
          message: `Workflow completed successfully for application ${applicationId}`,
          data: executionResult,
          statusCode: 200,
        });
      } else if (executionResult.status === 'QUEUED') {
        return ApiResponse.success(res, {
          message: `Workflow queued at step ${executionResult.failedStepName}`,
          data: executionResult,
          statusCode: 202,
        });
      } else {
        return ApiResponse.error(res, {
          message: `Workflow halted at step ${executionResult.failedStepName} (${executionResult.status}): ${executionResult.error}`,
          statusCode: 422,
          errorCode: 'WORKFLOW_EXECUTION_FAILED',
          details: executionResult,
        });
      }
    } catch (err) {
      next(err);
    }
  },

  /**
   * Resume an existing workflow from the failed or queued step
   * POST /api/v1/workflows/resume
   */
  resumeWorkflow: async (req, res, next) => {
    try {
      const {
        applicationId,
        mockMode = false,
        connectorType,
        queueOnFailure = false,
        educationMockMode,
        incomeMockMode,
        bankMockMode,
      } = req.body;

      if (!applicationId) {
        return ApiResponse.error(res, { message: 'applicationId is required', statusCode: 400 });
      }

      logger.info(`WorkflowController: Request to resume workflow for [${applicationId}]`);

      const executionResult = await workflowEngine.resumeWorkflow(applicationId, {
        mockMode,
        connectorType,
        queueOnFailure,
        educationMockMode,
        incomeMockMode,
        bankMockMode,
      });

      if (executionResult.success) {
        return ApiResponse.success(res, {
          message: `Workflow resumed and completed successfully for application ${applicationId}`,
          data: executionResult,
          statusCode: 200,
        });
      } else if (executionResult.status === 'QUEUED') {
        return ApiResponse.success(res, {
          message: `Workflow queued at step ${executionResult.failedStepName}`,
          data: executionResult,
          statusCode: 202,
        });
      } else {
        return ApiResponse.error(res, {
          message: `Workflow resumed and halted at step ${executionResult.failedStepName} (${executionResult.status}): ${executionResult.error}`,
          statusCode: 422,
          errorCode: 'WORKFLOW_EXECUTION_FAILED',
          details: executionResult,
        });
      }
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get workflow status and timeline for an application
   * GET /api/v1/workflows/:applicationId
   */
  getWorkflowStatus: async (req, res, next) => {
    try {
      const { applicationId } = req.params;
      const statusData = await workflowEngine.getWorkflowStatus(applicationId);

      if (!statusData) {
        return ApiResponse.error(res, `Application [${applicationId}] not found`, 404);
      }

      return ApiResponse.success(res, {
        message: `Workflow status retrieved for ${applicationId}`,
        data: statusData,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * List all available workflow definitions in PostgreSQL
   * GET /api/v1/workflows/definitions
   */
  listDefinitions: async (req, res, next) => {
    try {
      const definitions = await WorkflowModel.listDefinitions();
      return ApiResponse.success(res, {
        message: 'Workflow definitions loaded from PostgreSQL',
        data: definitions,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get specific workflow definition with all its configured steps from PostgreSQL
   * GET /api/v1/workflows/definitions/:workflowCode
   */
  getDefinition: async (req, res, next) => {
    try {
      const { workflowCode } = req.params;
      const { version } = req.query;

      let definition;
      if (version) {
        definition = await WorkflowModel.getDefinitionByVersion(workflowCode, version);
      } else {
        definition = await WorkflowModel.getActiveDefinition(workflowCode);
      }

      if (!definition) {
        return ApiResponse.error(res, `Workflow definition [${workflowCode}] not found in database`, 404);
      }

      const steps = await WorkflowModel.getDefinitionSteps(definition.workflow_code, definition.version);

      return ApiResponse.success(res, {
        message: `Workflow definition [${workflowCode}] loaded from PostgreSQL`,
        data: {
          ...definition,
          steps,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Reset workflow steps for testing
   * POST /api/v1/workflows/reset/:applicationId
   */
  resetWorkflow: async (req, res, next) => {
    try {
      const { applicationId } = req.params;
      await WorkflowModel.resetSteps(applicationId);

      return ApiResponse.success(res, {
        message: `Workflow steps reset to initial state for application ${applicationId}`,
        data: { applicationId, status: 'SUBMITTED' },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Run workflow for an application by ID
   * POST /api/workflows/:id/run
   */
  runWorkflowById: async (req, res, next) => {
    try {
      const applicationId = req.params.id || req.body.applicationId;
      if (!applicationId) {
        return ApiResponse.error(res, { message: 'applicationId is required', statusCode: 400 });
      }

      logger.info(`WorkflowController: Request to run workflow for [${applicationId}]`);

      const executionResult = await workflowEngine.executeWorkflow(applicationId, {
        mockMode: req.body.mockMode !== undefined ? req.body.mockMode : true,
        connectorType: req.body.connectorType,
        queueOnFailure: req.body.queueOnFailure || false,
      });

      if (executionResult.success) {
        return ApiResponse.success(res, {
          message: `Workflow completed successfully for application ${applicationId}`,
          data: executionResult,
          statusCode: 200,
        });
      } else if (executionResult.status === 'QUEUED') {
        return ApiResponse.success(res, {
          message: `Workflow queued at step ${executionResult.failedStepName}`,
          data: executionResult,
          statusCode: 202,
        });
      } else {
        return ApiResponse.error(res, {
          message: `Workflow halted at step ${executionResult.failedStepName} (${executionResult.status}): ${executionResult.error}`,
          statusCode: 422,
          errorCode: 'WORKFLOW_EXECUTION_FAILED',
          details: executionResult,
        });
      }
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get workflow status by application ID
   * GET /api/workflows/:id/status
   */
  getWorkflowStatusById: async (req, res, next) => {
    try {
      const applicationId = req.params.id;
      const statusData = await workflowEngine.getWorkflowStatus(applicationId);

      if (!statusData) {
        return ApiResponse.error(res, { message: `Application [${applicationId}] not found`, statusCode: 404 });
      }

      return ApiResponse.success(res, {
        message: `Workflow status retrieved for ${applicationId}`,
        data: statusData,
      });
    } catch (err) {
      next(err);
    }
  },
};

export default workflowController;
