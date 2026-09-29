import { query } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Workflow Model
 * Provides database queries for workflow definitions, definition steps, and runtime step execution instances.
 */
export const WorkflowModel = {
  /**
   * Get active workflow definition by code
   * @param {string} workflowCode
   */
  getActiveDefinition: async (workflowCode = 'WF-SCHOLARSHIP-V1') => {
    const text = `
      SELECT * FROM workflow_definitions 
      WHERE workflow_code = $1 AND is_active = TRUE 
      ORDER BY version DESC 
      LIMIT 1
    `;
    const result = await query(text, [workflowCode]);
    return result.rows[0] || null;
  },

  /**
   * Get specific workflow definition by code and version
   * @param {string} workflowCode
   * @param {string} version
   */
  getDefinitionByVersion: async (workflowCode, version) => {
    const text = `
      SELECT * FROM workflow_definitions 
      WHERE workflow_code = $1 AND version = $2
    `;
    const result = await query(text, [workflowCode, version]);
    return result.rows[0] || null;
  },

  /**
   * Get ordered execution steps for a workflow definition from PostgreSQL
   * @param {string} workflowCode
   * @param {string} [version='1.0.0']
   */
  getDefinitionSteps: async (workflowCode, version = '1.0.0') => {
    const text = `
      SELECT 
        id, workflow_code, workflow_version, step_order, 
        step_identifier, step_name, department_code, 
        COALESCE(connector_type, 'REST') as connector_type,
        COALESCE(connector_config, '{}'::jsonb) as connector_config,
        is_mandatory, is_enabled, timeout_seconds, retry_policy
      FROM workflow_definition_steps
      WHERE workflow_code = $1 AND workflow_version = $2
      ORDER BY step_order ASC
    `;
    const result = await query(text, [workflowCode, version]);
    return result.rows;
  },

  /**
   * List all registered workflow definitions
   */
  listDefinitions: async () => {
    const text = `
      SELECT wd.*, COUNT(wds.id) as step_count
      FROM workflow_definitions wd
      LEFT JOIN workflow_definition_steps wds 
        ON wd.workflow_code = wds.workflow_code AND wd.version = wds.workflow_version
      GROUP BY wd.id, wd.workflow_code, wd.name, wd.description, wd.version, wd.is_active, wd.created_at
      ORDER BY wd.workflow_code, wd.version DESC
    `;
    const result = await query(text);
    return result.rows;
  },

  /**
   * Get application record with citizen context
   * @param {string} applicationId
   */
  getApplication: async (applicationId) => {
    const text = `
      SELECT 
        a.*, 
        c.full_name as citizen_name, 
        c.aadhaar_virtual_id,
        c.district,
        c.state
      FROM applications a
      LEFT JOIN citizens c ON a.citizen_id = c.citizen_id
      WHERE a.application_id = $1
    `;
    const result = await query(text, [applicationId]);
    return result.rows[0] || null;
  },

  /**
   * Get all runtime step instances for an application ordered sequentially
   * @param {string} applicationId
   */
  getStepInstances: async (applicationId) => {
    const text = `
      SELECT * FROM workflow_steps
      WHERE application_id = $1
      ORDER BY step_number ASC
    `;
    const result = await query(text, [applicationId]);
    return result.rows;
  },

  /**
   * Get single step instance by application ID and step number
   * @param {string} applicationId
   * @param {number} stepNumber
   */
  getStepInstance: async (applicationId, stepNumber) => {
    const text = `
      SELECT * FROM workflow_steps
      WHERE application_id = $1 AND step_number = $2
    `;
    const result = await query(text, [applicationId, stepNumber]);
    return result.rows[0] || null;
  },

  /**
   * Upsert a runtime step instance
   * @param {Object} stepData
   */
  upsertStepInstance: async ({
    applicationId,
    stepNumber,
    stepIdentifier,
    stepName,
    departmentCode,
    status = 'PENDING',
    requestPayload = {},
    responsePayload = {},
    errorDetails = null,
    executionTimeMs = null,
    retryCount = 0,
    attempts = 0,
    startedAt = null,
    completedAt = null,
  }) => {
    const text = `
      INSERT INTO workflow_steps (
        application_id, step_number, step_identifier, step_name,
        department_code, status, request_payload, response_payload,
        error_details, execution_time_ms, retry_count, attempts,
        started_at, completed_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (application_id, step_number) DO UPDATE SET
        step_identifier = EXCLUDED.step_identifier,
        step_name = EXCLUDED.step_name,
        department_code = EXCLUDED.department_code,
        status = EXCLUDED.status,
        request_payload = EXCLUDED.request_payload,
        response_payload = EXCLUDED.response_payload,
        error_details = EXCLUDED.error_details,
        execution_time_ms = EXCLUDED.execution_time_ms,
        retry_count = EXCLUDED.retry_count,
        attempts = EXCLUDED.attempts,
        started_at = COALESCE(EXCLUDED.started_at, workflow_steps.started_at),
        completed_at = EXCLUDED.completed_at
      RETURNING *
    `;
    const values = [
      applicationId,
      stepNumber,
      stepIdentifier,
      stepName,
      departmentCode,
      status,
      JSON.stringify(requestPayload || {}),
      JSON.stringify(responsePayload || {}),
      errorDetails,
      executionTimeMs,
      retryCount,
      attempts,
      startedAt,
      completedAt,
    ];
    const result = await query(text, values);
    return result.rows[0];
  },

  /**
   * Update application workflow execution status
   * @param {string} applicationId
   * @param {Object} updates
   */
  updateApplicationStatus: async (applicationId, { status, currentStep, remarks, approvalDate = null, workflowCode = null, workflowVersion = null }) => {
    const text = `
      UPDATE applications
      SET 
        status = COALESCE($2, status),
        current_step = COALESCE($3, current_step),
        remarks = COALESCE($4, remarks),
        approval_date = COALESCE($5, approval_date),
        workflow_code = COALESCE($6, workflow_code),
        workflow_version = COALESCE($7, workflow_version),
        updated_at = CURRENT_TIMESTAMP
      WHERE application_id = $1
      RETURNING *
    `;
    const values = [applicationId, status, currentStep, remarks, approvalDate, workflowCode, workflowVersion];
    const result = await query(text, values);
    return result.rows[0] || null;
  },

  /**
   * Reset all steps for an application to pristine PENDING state (used for testing or re-running)
   * @param {string} applicationId
   */
  resetSteps: async (applicationId) => {
    const text = 'DELETE FROM workflow_steps WHERE application_id = $1';
    await query(text, [applicationId]);
    await query(
      `UPDATE applications 
       SET status = 'SUBMITTED', current_step = 'APPLICATION_RECEIVED', remarks = 'Workflow reset', approval_date = NULL 
       WHERE application_id = $1`,
      [applicationId]
    );
  },

  /**
   * Get single step definition by ID
   */
  getStepDefinitionById: async (stepId) => {
    const text = `SELECT * FROM workflow_definition_steps WHERE id::text = $1 LIMIT 1`;
    const result = await query(text, [stepId]);
    return result.rows[0] || null;
  },

  /**
   * Create a new workflow definition or new version
   */
  createDefinition: async ({ workflowCode, name, description, version = '1.0.0', isActive = false, copyFromVersion = null }) => {
    const defRes = await query(
      `INSERT INTO workflow_definitions (workflow_code, name, description, version, is_active)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (workflow_code, version) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         is_active = EXCLUDED.is_active
       RETURNING *`,
      [workflowCode, name, description, version, isActive]
    );

    if (copyFromVersion) {
      const srcSteps = await WorkflowModel.getDefinitionSteps(workflowCode, copyFromVersion);
      for (const step of srcSteps) {
        await query(
          `INSERT INTO workflow_definition_steps (
            workflow_code, workflow_version, step_order, step_identifier, step_name,
            department_code, connector_type, connector_config, is_mandatory, is_enabled,
            timeout_seconds, retry_policy
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            workflowCode,
            version,
            step.step_order,
            step.step_identifier,
            step.step_name,
            step.department_code,
            step.connector_type || 'REST',
            JSON.stringify(step.connector_config || {}),
            step.is_mandatory !== false,
            step.is_enabled !== false,
            step.timeout_seconds || 30,
            JSON.stringify(step.retry_policy || { maxRetries: 3, backoffMs: 1000 }),
          ]
        );
      }
    }

    return defRes.rows[0];
  },

  /**
   * Activate a specific workflow version (and deactivate all other versions)
   */
  activateDefinition: async (workflowCode, version) => {
    await query(
      `UPDATE workflow_definitions SET is_active = FALSE WHERE workflow_code = $1`,
      [workflowCode]
    );
    const res = await query(
      `UPDATE workflow_definitions SET is_active = TRUE WHERE workflow_code = $1 AND version = $2 RETURNING *`,
      [workflowCode, version]
    );
    return res.rows[0] || null;
  },

  /**
   * Add a single step to a workflow definition
   */
  addDefinitionStep: async (workflowCode, version, stepData) => {
    let stepOrder = stepData.step_order || stepData.stepOrder;
    if (!stepOrder) {
      const maxOrderRes = await query(
        `SELECT COALESCE(MAX(step_order), 0) + 1 as next_order FROM workflow_definition_steps WHERE workflow_code = $1 AND workflow_version = $2`,
        [workflowCode, version]
      );
      stepOrder = parseInt(maxOrderRes.rows[0]?.next_order || '1', 10);
    } else {
      stepOrder = parseInt(stepOrder, 10);
      // If order is already occupied, shift existing steps >= stepOrder downwards in descending order to avoid unique collisions
      const existingStepsToShift = await query(
        `SELECT id, step_order FROM workflow_definition_steps WHERE workflow_code = $1 AND workflow_version = $2 AND step_order >= $3 ORDER BY step_order DESC`,
        [workflowCode, version, stepOrder]
      );
      for (const s of existingStepsToShift.rows) {
        await query(
          `UPDATE workflow_definition_steps SET step_order = $1 WHERE id = $2`,
          [s.step_order + 1, s.id]
        );
      }
    }

    const res = await query(
      `INSERT INTO workflow_definition_steps (
        workflow_code, workflow_version, step_order, step_identifier, step_name,
        department_code, connector_type, connector_config, is_mandatory, is_enabled,
        timeout_seconds, retry_policy
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        workflowCode,
        version,
        stepOrder,
        stepData.step_identifier || stepData.stepIdentifier,
        stepData.step_name || stepData.stepName,
        stepData.department_code || stepData.departmentCode || 'INTEROP',
        stepData.connector_type || stepData.connectorType || 'REST',
        JSON.stringify(stepData.connector_config || stepData.connectorConfig || {}),
        stepData.is_mandatory !== false && stepData.isMandatory !== false,
        stepData.is_enabled !== false && stepData.isEnabled !== false,
        parseInt(stepData.timeout_seconds || stepData.timeoutSeconds || 30, 10),
        JSON.stringify(stepData.retry_policy || stepData.retryPolicy || { maxRetries: 3, backoffMs: 1000 }),
      ]
    );
    return res.rows[0];
  },

  /**
   * Update step details
   */
  updateDefinitionStep: async (stepId, stepData) => {
    const res = await query(
      `UPDATE workflow_definition_steps
       SET
         step_identifier = COALESCE($2, step_identifier),
         step_name = COALESCE($3, step_name),
         department_code = COALESCE($4, department_code),
         connector_type = COALESCE($5, connector_type),
         connector_config = CASE WHEN $6::text IS NOT NULL THEN $6::jsonb ELSE connector_config END,
         is_mandatory = COALESCE($7, is_mandatory),
         is_enabled = COALESCE($8, is_enabled),
         timeout_seconds = COALESCE($9, timeout_seconds),
         retry_policy = CASE WHEN $10::text IS NOT NULL THEN $10::jsonb ELSE retry_policy END,
         step_order = COALESCE($11, step_order)
       WHERE id::text = $1
       RETURNING *`,
      [
        stepId,
        stepData.step_identifier || stepData.stepIdentifier,
        stepData.step_name || stepData.stepName,
        stepData.department_code || stepData.departmentCode,
        stepData.connector_type || stepData.connectorType,
        stepData.connector_config || stepData.connectorConfig ? JSON.stringify(stepData.connector_config || stepData.connectorConfig) : null,
        stepData.is_mandatory !== undefined ? stepData.is_mandatory : stepData.isMandatory,
        stepData.is_enabled !== undefined ? stepData.is_enabled : stepData.isEnabled,
        stepData.timeout_seconds || stepData.timeoutSeconds,
        stepData.retry_policy || stepData.retryPolicy ? JSON.stringify(stepData.retry_policy || stepData.retryPolicy) : null,
        stepData.step_order || stepData.stepOrder,
      ]
    );
    return res.rows[0] || null;
  },

  /**
   * Delete step and re-index orders
   */
  deleteDefinitionStep: async (stepId) => {
    const existing = await query(`SELECT * FROM workflow_definition_steps WHERE id::text = $1`, [stepId]);
    if (!existing.rows[0]) return false;
    const { workflow_code, workflow_version, step_order } = existing.rows[0];

    await query(`DELETE FROM workflow_definition_steps WHERE id::text = $1`, [stepId]);
    await query(
      `UPDATE workflow_definition_steps
       SET step_order = step_order - 1
       WHERE workflow_code = $1 AND workflow_version = $2 AND step_order > $3`,
      [workflow_code, workflow_version, step_order]
    );
    return true;
  },

  /**
   * Toggle enabled/disabled on step
   */
  toggleStepEnabled: async (stepId, isEnabled = null) => {
    let sql;
    let params;
    if (isEnabled === null || isEnabled === undefined) {
      sql = `UPDATE workflow_definition_steps SET is_enabled = NOT is_enabled WHERE id::text = $1 RETURNING *`;
      params = [stepId];
    } else {
      sql = `UPDATE workflow_definition_steps SET is_enabled = $2 WHERE id::text = $1 RETURNING *`;
      params = [stepId, Boolean(isEnabled)];
    }
    const res = await query(sql, params);
    return res.rows[0] || null;
  },

  /**
   * Reorder steps in workflow version
   */
  reorderDefinitionSteps: async (workflowCode, version, stepIdsInOrder) => {
    for (let i = 0; i < stepIdsInOrder.length; i++) {
      const stepId = stepIdsInOrder[i];
      await query(
        `UPDATE workflow_definition_steps SET step_order = $2 WHERE id::text = $1`,
        [stepId, (i + 1) * 1000]
      );
    }
    for (let i = 0; i < stepIdsInOrder.length; i++) {
      const stepId = stepIdsInOrder[i];
      await query(
        `UPDATE workflow_definition_steps SET step_order = $2 WHERE id::text = $1`,
        [stepId, i + 1]
      );
    }
    return await WorkflowModel.getDefinitionSteps(workflowCode, version);
  },

  /**
   * Save full step sequence (atomic replace of steps for workflow version)
   */
  saveAllDefinitionSteps: async (workflowCode, version, steps) => {
    await query(
      `DELETE FROM workflow_definition_steps WHERE workflow_code = $1 AND workflow_version = $2`,
      [workflowCode, version]
    );

    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      await query(
        `INSERT INTO workflow_definition_steps (
          workflow_code, workflow_version, step_order, step_identifier, step_name,
          department_code, connector_type, connector_config, is_mandatory, is_enabled,
          timeout_seconds, retry_policy
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          workflowCode,
          version,
          i + 1,
          s.step_identifier || s.stepIdentifier,
          s.step_name || s.stepName,
          s.department_code || s.departmentCode || 'INTEROP',
          s.connector_type || s.connectorType || 'REST',
          JSON.stringify(s.connector_config || s.connectorConfig || {}),
          s.is_mandatory !== false && s.isMandatory !== false,
          s.is_enabled !== false && s.isEnabled !== false,
          parseInt(s.timeout_seconds || s.timeoutSeconds || 30, 10),
          JSON.stringify(s.retry_policy || s.retryPolicy || { maxRetries: 3, backoffMs: 1000 }),
        ]
      );
    }

    return await WorkflowModel.getDefinitionSteps(workflowCode, version);
  },
};

export default WorkflowModel;
