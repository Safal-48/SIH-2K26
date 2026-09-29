import WorkflowDefinitionService from '../services/workflowDefinition.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const listDefinitions = async (req, res, next) => {
  try {
    const definitions = await WorkflowDefinitionService.listDefinitions();
    return ApiResponse.success(res, {
      message: 'Workflow definitions retrieved',
      data: { definitions, count: definitions.length },
    });
  } catch (error) {
    next(error);
  }
};

export const getDefinition = async (req, res, next) => {
  try {
    const { code } = req.params;
    const version = req.query.version || null;
    const details = await WorkflowDefinitionService.getDefinitionDetails(code, version);
    return ApiResponse.success(res, {
      message: 'Workflow details retrieved',
      data: details,
    });
  } catch (error) {
    next(error);
  }
};

export const getVersionDetails = async (req, res, next) => {
  try {
    const { code, version } = req.params;
    const details = await WorkflowDefinitionService.getDefinitionDetails(code, version);
    return ApiResponse.success(res, {
      message: `Workflow ${code} v${version} details retrieved`,
      data: details,
    });
  } catch (error) {
    next(error);
  }
};

export const createVersion = async (req, res, next) => {
  try {
    const actorId = req.user?.username || req.user?.sub || 'ADMIN';
    const result = await WorkflowDefinitionService.createVersion(req.body, actorId);
    return ApiResponse.created(res, {
      message: `Workflow version ${result.definition.version} created successfully in PostgreSQL`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const activateVersion = async (req, res, next) => {
  try {
    const { code, version } = req.params;
    const actorId = req.user?.username || req.user?.sub || 'ADMIN';
    const result = await WorkflowDefinitionService.activateVersion(code, version, actorId);
    return ApiResponse.success(res, {
      message: `Workflow version ${code} v${version} is now ACTIVE in PostgreSQL. Backend execution will strictly use this definition.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const addStep = async (req, res, next) => {
  try {
    const { code, version } = req.params;
    const actorId = req.user?.username || req.user?.sub || 'ADMIN';
    const result = await WorkflowDefinitionService.addStep(code, version, req.body, actorId);
    return ApiResponse.created(res, {
      message: 'Step added to workflow definition',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateStep = async (req, res, next) => {
  try {
    const { stepId } = req.params;
    const actorId = req.user?.username || req.user?.sub || 'ADMIN';
    const result = await WorkflowDefinitionService.updateStep(stepId, req.body, actorId);
    return ApiResponse.success(res, {
      message: 'Step definition updated successfully in PostgreSQL',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteStep = async (req, res, next) => {
  try {
    const { stepId } = req.params;
    const actorId = req.user?.username || req.user?.sub || 'ADMIN';
    const result = await WorkflowDefinitionService.deleteStep(stepId, actorId);
    return ApiResponse.success(res, {
      message: 'Step deleted and sequence reordered in PostgreSQL',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleStep = async (req, res, next) => {
  try {
    const { stepId } = req.params;
    const isEnabled = req.body?.isEnabled !== undefined ? req.body.isEnabled : req.body?.is_enabled;
    const actorId = req.user?.username || req.user?.sub || 'ADMIN';
    const result = await WorkflowDefinitionService.toggleStep(stepId, isEnabled, actorId);
    return ApiResponse.success(res, {
      message: 'Step enabled status toggled in PostgreSQL',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const reorderSteps = async (req, res, next) => {
  try {
    const { code, version } = req.params;
    const { stepIds } = req.body;
    const actorId = req.user?.username || req.user?.sub || 'ADMIN';
    const result = await WorkflowDefinitionService.reorderSteps(code, version, stepIds, actorId);
    return ApiResponse.success(res, {
      message: 'Workflow steps reordered in PostgreSQL',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const saveAllSteps = async (req, res, next) => {
  try {
    const { code, version } = req.params;
    const { steps } = req.body;
    const actorId = req.user?.username || req.user?.sub || 'ADMIN';
    const result = await WorkflowDefinitionService.saveAllSteps(code, version, steps, actorId);
    return ApiResponse.success(res, {
      message: 'Workflow version steps saved in PostgreSQL',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
