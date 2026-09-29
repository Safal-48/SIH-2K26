import WorkflowModel from '../models/workflow.model.js';
import AuditLogModel from '../models/auditLog.model.js';
import { AppError } from '../utils/appError.js';
import logger from '../utils/logger.js';

export class WorkflowDefinitionService {
  /**
   * 1. Get all workflow definitions with active indicators
   */
  static async listDefinitions() {
    const definitions = await WorkflowModel.listDefinitions();
    return definitions.map((d) => ({
      id: d.id,
      workflowCode: d.workflow_code,
      name: d.name,
      description: d.description,
      version: d.version,
      isActive: Boolean(d.is_active),
      stepCount: parseInt(d.step_count || '0', 10),
      createdAt: d.created_at,
    }));
  }

  /**
   * 2. Get specific definition and its full ordered step sequence
   */
  static async getDefinitionDetails(workflowCode = 'WF-SCHOLARSHIP-V1', version = null) {
    let definition;
    if (version) {
      definition = await WorkflowModel.getDefinitionByVersion(workflowCode, version);
    } else {
      definition = await WorkflowModel.getActiveDefinition(workflowCode);
    }

    if (!definition) {
      throw new AppError(
        `Workflow definition not found for code [${workflowCode}]${version ? ` v${version}` : ''}`,
        404,
        'WORKFLOW_NOT_FOUND'
      );
    }

    const steps = await WorkflowModel.getDefinitionSteps(definition.workflow_code, definition.version);

    // Also get all available versions for this workflow code
    const allDefinitions = await WorkflowModel.listDefinitions();
    const availableVersions = allDefinitions
      .filter((d) => d.workflow_code === workflowCode)
      .map((d) => ({
        version: d.version,
        isActive: Boolean(d.is_active),
        stepCount: parseInt(d.step_count || '0', 10),
        createdAt: d.created_at,
      }));

    return {
      definition: {
        id: definition.id,
        workflowCode: definition.workflow_code,
        name: definition.name,
        description: definition.description,
        version: definition.version,
        isActive: Boolean(definition.is_active),
        createdAt: definition.created_at,
      },
      availableVersions,
      steps: steps.map((s) => ({
        id: s.id,
        workflowCode: s.workflow_code,
        workflowVersion: s.workflow_version,
        stepOrder: s.step_order,
        stepIdentifier: s.step_identifier,
        stepName: s.step_name,
        departmentCode: s.department_code,
        connectorType: s.connector_type || 'REST',
        connectorConfig: typeof s.connector_config === 'string' ? JSON.parse(s.connector_config) : (s.connector_config || {}),
        isMandatory: Boolean(s.is_mandatory),
        isEnabled: Boolean(s.is_enabled),
        timeoutSeconds: s.timeout_seconds || 30,
        retryPolicy: typeof s.retry_policy === 'string' ? JSON.parse(s.retry_policy) : (s.retry_policy || { maxRetries: 3, backoffMs: 1000 }),
      })),
    };
  }

  /**
   * 3. Create a new workflow definition or new version
   */
  static async createVersion({
    workflowCode = 'WF-SCHOLARSHIP-V1',
    name,
    description,
    version,
    isActive = false,
    copyFromVersion = null,
  }, actorId = 'ADMIN') {
    if (!version || !/^\d+\.\d+\.\d+$/.test(version.trim())) {
      throw new AppError('Version must follow semantic format (e.g. 1.1.0 or 2.0.0)', 400, 'INVALID_VERSION_FORMAT');
    }

    const cleanVersion = version.trim();
    const existing = await WorkflowModel.getDefinitionByVersion(workflowCode, cleanVersion);
    if (existing) {
      throw new AppError(`Workflow [${workflowCode}] version [${cleanVersion}] already exists`, 409, 'VERSION_ALREADY_EXISTS');
    }

    const definition = await WorkflowModel.createDefinition({
      workflowCode,
      name: name || `Scholarship Workflow v${cleanVersion}`,
      description: description || `Workflow specification version ${cleanVersion}`,
      version: cleanVersion,
      isActive: Boolean(isActive),
      copyFromVersion,
    });

    await AuditLogModel.log({
      requestId: `REQ-WF-VER-${Date.now().toString().slice(-6)}`,
      actorType: 'ADMIN',
      actorId,
      departmentCode: 'INTEROP',
      action: 'CREATE_WORKFLOW_VERSION',
      entityType: 'WORKFLOW_DEFINITION',
      entityId: `${workflowCode}:${cleanVersion}`,
      status: 'SUCCESS',
      metadata: { workflowCode, version: cleanVersion, copyFromVersion },
    });

    return await this.getDefinitionDetails(workflowCode, cleanVersion);
  }

  /**
   * 4. Activate a workflow version in PostgreSQL
   * Ensures backend workflow engine uses this active version immediately.
   */
  static async activateVersion(workflowCode, version, actorId = 'ADMIN') {
    const existing = await WorkflowModel.getDefinitionByVersion(workflowCode, version);
    if (!existing) {
      throw new AppError(`Workflow version [${version}] not found for [${workflowCode}]`, 404, 'VERSION_NOT_FOUND');
    }

    const activated = await WorkflowModel.activateDefinition(workflowCode, version);

    await AuditLogModel.log({
      requestId: `REQ-WF-ACT-${Date.now().toString().slice(-6)}`,
      actorType: 'ADMIN',
      actorId,
      departmentCode: 'INTEROP',
      action: 'ACTIVATE_WORKFLOW_VERSION',
      entityType: 'WORKFLOW_DEFINITION',
      entityId: `${workflowCode}:${version}`,
      status: 'SUCCESS',
      metadata: { workflowCode, version, isActive: true },
    });

    logger.info(`WorkflowDefinitionService: Activated workflow version [${workflowCode}] v${version}`);
    return await this.getDefinitionDetails(workflowCode, version);
  }

  /**
   * 5. Add a step to a workflow version
   */
  static async addStep(workflowCode, version, stepData, actorId = 'ADMIN') {
    if (!stepData.step_identifier && !stepData.stepIdentifier) {
      throw new AppError('stepIdentifier is required (e.g. FRAUD_DETECTION)', 400, 'MISSING_STEP_IDENTIFIER');
    }
    if (!stepData.step_name && !stepData.stepName) {
      throw new AppError('stepName is required', 400, 'MISSING_STEP_NAME');
    }

    const step = await WorkflowModel.addDefinitionStep(workflowCode, version, stepData);

    await AuditLogModel.log({
      requestId: `REQ-WF-STEP-ADD-${Date.now().toString().slice(-6)}`,
      actorType: 'ADMIN',
      actorId,
      departmentCode: step.department_code || 'INTEROP',
      action: 'ADD_WORKFLOW_STEP',
      entityType: 'WORKFLOW_STEP_DEFINITION',
      entityId: step.id,
      status: 'SUCCESS',
      metadata: { workflowCode, version, stepOrder: step.step_order, stepName: step.step_name },
    });

    return await this.getDefinitionDetails(workflowCode, version);
  }

  /**
   * 6. Update step configuration
   */
  static async updateStep(stepId, stepData, actorId = 'ADMIN') {
    const step = await WorkflowModel.updateDefinitionStep(stepId, stepData);
    if (!step) {
      throw new AppError(`Step definition [${stepId}] not found`, 404, 'STEP_NOT_FOUND');
    }

    await AuditLogModel.log({
      requestId: `REQ-WF-STEP-UPD-${Date.now().toString().slice(-6)}`,
      actorType: 'ADMIN',
      actorId,
      departmentCode: step.department_code || 'INTEROP',
      action: 'UPDATE_WORKFLOW_STEP',
      entityType: 'WORKFLOW_STEP_DEFINITION',
      entityId: stepId,
      status: 'SUCCESS',
      metadata: { stepId, stepName: step.step_name, connectorType: step.connector_type, isEnabled: step.is_enabled },
    });

    return await this.getDefinitionDetails(step.workflow_code, step.workflow_version);
  }

  /**
   * 7. Delete step
   */
  static async deleteStep(stepId, actorId = 'ADMIN') {
    const existing = await WorkflowModel.getStepDefinitionById(stepId);
    if (!existing) {
      throw new AppError(`Step definition [${stepId}] not found`, 404, 'STEP_NOT_FOUND');
    }

    const { workflow_code, workflow_version, step_name } = existing;
    await WorkflowModel.deleteDefinitionStep(stepId);

    await AuditLogModel.log({
      requestId: `REQ-WF-STEP-DEL-${Date.now().toString().slice(-6)}`,
      actorType: 'ADMIN',
      actorId,
      departmentCode: existing.department_code || 'INTEROP',
      action: 'DELETE_WORKFLOW_STEP',
      entityType: 'WORKFLOW_STEP_DEFINITION',
      entityId: stepId,
      status: 'SUCCESS',
      metadata: { workflowCode: workflow_code, version: workflow_version, stepName: step_name },
    });

    return await this.getDefinitionDetails(workflow_code, workflow_version);
  }

  /**
   * 8. Toggle step enabled/disabled state
   */
  static async toggleStep(stepId, isEnabled = null, actorId = 'ADMIN') {
    const step = await WorkflowModel.toggleStepEnabled(stepId, isEnabled);
    if (!step) {
      throw new AppError(`Step definition [${stepId}] not found`, 404, 'STEP_NOT_FOUND');
    }

    await AuditLogModel.log({
      requestId: `REQ-WF-STEP-TOG-${Date.now().toString().slice(-6)}`,
      actorType: 'ADMIN',
      actorId,
      departmentCode: step.department_code || 'INTEROP',
      action: 'TOGGLE_WORKFLOW_STEP',
      entityType: 'WORKFLOW_STEP_DEFINITION',
      entityId: stepId,
      status: 'SUCCESS',
      metadata: { stepId, isEnabled: step.is_enabled },
    });

    return await this.getDefinitionDetails(step.workflow_code, step.workflow_version);
  }

  /**
   * 9. Reorder steps
   */
  static async reorderSteps(workflowCode, version, stepIds, actorId = 'ADMIN') {
    if (!Array.isArray(stepIds) || stepIds.length === 0) {
      throw new AppError('stepIds array is required for reordering', 400, 'INVALID_REORDER_PAYLOAD');
    }

    await WorkflowModel.reorderDefinitionSteps(workflowCode, version, stepIds);

    await AuditLogModel.log({
      requestId: `REQ-WF-REORDER-${Date.now().toString().slice(-6)}`,
      actorType: 'ADMIN',
      actorId,
      departmentCode: 'INTEROP',
      action: 'REORDER_WORKFLOW_STEPS',
      entityType: 'WORKFLOW_DEFINITION',
      entityId: `${workflowCode}:${version}`,
      status: 'SUCCESS',
      metadata: { workflowCode, version, stepIds },
    });

    return await this.getDefinitionDetails(workflowCode, version);
  }

  /**
   * 10. Save all steps in full batch
   */
  static async saveAllSteps(workflowCode, version, steps, actorId = 'ADMIN') {
    if (!Array.isArray(steps) || steps.length === 0) {
      throw new AppError('Workflow must have at least one step', 400, 'EMPTY_STEPS_LIST');
    }

    await WorkflowModel.saveAllDefinitionSteps(workflowCode, version, steps);

    await AuditLogModel.log({
      requestId: `REQ-WF-BATCH-SAVE-${Date.now().toString().slice(-6)}`,
      actorType: 'ADMIN',
      actorId,
      departmentCode: 'INTEROP',
      action: 'SAVE_WORKFLOW_VERSION_STEPS',
      entityType: 'WORKFLOW_DEFINITION',
      entityId: `${workflowCode}:${version}`,
      status: 'SUCCESS',
      metadata: { workflowCode, version, stepCount: steps.length },
    });

    return await this.getDefinitionDetails(workflowCode, version);
  }
}

export default WorkflowDefinitionService;
