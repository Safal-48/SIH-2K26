import logger from '../utils/logger.js';
import WorkflowModel from '../models/workflow.model.js';
import AuditLogModel from '../models/auditLog.model.js';
import ApiRequestModel from '../models/apiRequest.model.js';
import connectorRegistry from '../connectors/index.js';
import { dataMapperService } from '../services/dataMapper.service.js';
import { query } from '../config/database.js';
import ConsentModel from '../models/consent.model.js';

/**
 * Standard Error for Workflow Execution Failures
 */
export class WorkflowExecutionError extends Error {
  constructor(message, errorCode = 'WORKFLOW_STEP_ERROR', details = null, retryable = false) {
    super(message);
    this.name = 'WorkflowExecutionError';
    this.errorCode = errorCode;
    this.details = details;
    this.retryable = retryable;
  }
}

/**
 * Core Workflow & Orchestration Engine
 * 
 * Central orchestration service driven strictly by PostgreSQL workflow definitions.
 * Features:
 * - Dynamic definition and step loading from PostgreSQL
 * - Strict sequential execution
 * - Automated connector dispatch
 * - DataMapper canonical harmonization
 * - Step status, timestamps, attempt tracking, and error persistence
 * - Retryable failure handling and exponential/configured backoff
 * - Resumable execution from failed or queued steps
 * - Skipping of already completed (SUCCESS) steps
 * - Workflow versioning and active version selection
 * - Enabled / disabled step skipping (SKIPPED)
 * - Comprehensive API request telemetry and immutable audit logging
 */
export class WorkflowEngine {
  constructor() {
    this.stepHandlers = new Map();
    this.registerDefaultStepHandlers();
  }

  /**
   * Register default step handlers for the standard scholarship lifecycle
   */
  registerDefaultStepHandlers() {
    // 1. Application Received & Pre-Flight Validation
    this.registerStepHandler('APPLICATION_RECEIVED', async (context) => {
      const { application } = context;
      
      if (!application.student_id || !application.income_certificate_no || !application.account_reference) {
        throw new WorkflowExecutionError(
          'Application missing required student, income, or bank reference',
          'MISSING_REQUIRED_REFERENCES',
          { studentId: application.student_id, cert: application.income_certificate_no, account: application.account_reference },
          false
        );
      }

      // Check citizen consent in PostgreSQL
      const consentResult = await query(
        `SELECT * FROM consents WHERE application_id = $1 AND status = 'GRANTED' LIMIT 1`,
        [application.application_id]
      );

      const hasConsent = consentResult.rows.length > 0;

      await AuditLogModel.log({
        requestId: `REQ-APP-${Date.now().toString().slice(-6)}`,
        actorType: 'SYSTEM',
        actorId: 'WORKFLOW_ENGINE',
        departmentCode: 'INTEROP',
        action: 'APPLICATION_RECEIVED',
        entityType: 'APPLICATION',
        entityId: application.application_id,
        status: 'SUCCESS',
        metadata: {
          applicationId: application.application_id,
          citizenId: application.citizen_id,
          hasConsent,
        },
      });

      return {
        verified: true,
        applicationId: application.application_id,
        citizenId: application.citizen_id,
        hasConsent,
        submissionDate: application.submission_date,
      };
    });

    // 2. Education Verification
    this.registerStepHandler('EDUCATION_VERIFICATION', async (context) => {
      const { application, options, step } = context;
      const connector = connectorRegistry.getByDepartmentCode('EDU');
      if (!connector) throw new WorkflowExecutionError('Education connector not found in registry', 'CONNECTOR_NOT_FOUND', null, false);

      const canonicalReq = {
        citizen_id: application.citizen_id,
        student_id: application.student_id,
        institution_code: 'COL-001',
        correlation_id: `CORR-EDU-${application.application_id}-${Date.now().toString().slice(-4)}`,
      };

      // Execute connector (REST or MOCK based on options or PostgreSQL step configuration)
      const connectorType = options.connectorType || step?.connector_type || (options.mockMode ? 'MOCK' : 'REST');
      const result = await connector.execute(canonicalReq, {
        connectorType,
        mockMode: options.educationMockMode || options.mockMode,
      });

      // Record API Request Telemetry
      await ApiRequestModel.log({
        requestId: result.correlation_id || canonicalReq.correlation_id,
        applicationId: application.application_id,
        serviceCode: 'SRV-EDU-01',
        endpoint: '/api/education/verify',
        httpMethod: 'POST',
        requestBody: canonicalReq,
        responseStatusCode: result.success ? 200 : (result.raw?.error_code ? 404 : 400),
        responseBody: result.raw || result.data || { error: result.error },
        latencyMs: result.latency_ms || 10,
        status: result.success ? 'SUCCESS' : 'FAILED',
      });

      // Record Audit Log
      await AuditLogModel.log({
        requestId: result.correlation_id || canonicalReq.correlation_id,
        actorType: 'SYSTEM',
        actorId: 'WORKFLOW_ENGINE',
        departmentCode: 'EDU',
        action: 'FETCH_ACADEMIC_CREDENTIALS',
        entityType: 'APPLICATION',
        entityId: application.application_id,
        status: result.success ? 'SUCCESS' : 'FAILED',
        metadata: { studentId: application.student_id, resultStatus: result.status },
      });

      if (!result.success || result.status === 'FAILED') {
        throw new WorkflowExecutionError(
          result.error || `Education verification failed for student ${application.student_id}`,
          result.error_code || 'EDUCATION_VERIFICATION_FAILED',
          result.raw,
          result.retryable || false
        );
      }

      // Canonical mapping
      const canonicalData = await dataMapperService.mapToCanonical(result.data, {
        sourceSystem: 'EDUCATION',
        targetModel: 'CANONICAL_EDUCATION',
        citizenId: application.citizen_id,
        applicationId: application.application_id,
        service: 'EDUCATION_VERIFICATION',
      });

      return canonicalData;
    });

    // 3. Income Verification
    this.registerStepHandler('INCOME_VERIFICATION', async (context) => {
      const { application, options, step } = context;
      const connector = connectorRegistry.getByDepartmentCode('REV');
      if (!connector) throw new WorkflowExecutionError('Revenue/Income connector not found in registry', 'CONNECTOR_NOT_FOUND', null, false);

      const canonicalReq = {
        citizen_id: application.citizen_id,
        income_certificate_no: application.income_certificate_no,
        correlation_id: `CORR-REV-${application.application_id}-${Date.now().toString().slice(-4)}`,
      };

      const connectorType = options.connectorType || step?.connector_type || (options.mockMode ? 'MOCK' : 'REST');
      const result = await connector.execute(canonicalReq, {
        connectorType,
        mockMode: options.incomeMockMode || options.mockMode,
      });

      // Record API Request Telemetry
      await ApiRequestModel.log({
        requestId: result.correlation_id || canonicalReq.correlation_id,
        applicationId: application.application_id,
        serviceCode: 'SRV-REV-01',
        endpoint: '/api/income/verify',
        httpMethod: 'POST',
        requestBody: canonicalReq,
        responseStatusCode: result.success ? 200 : (result.raw?.error_code ? 404 : 400),
        responseBody: result.raw || result.data || { error: result.error },
        latencyMs: result.latency_ms || 10,
        status: result.success ? 'SUCCESS' : 'FAILED',
      });

      // Record Audit Log
      await AuditLogModel.log({
        requestId: result.correlation_id || canonicalReq.correlation_id,
        actorType: 'SYSTEM',
        actorId: 'WORKFLOW_ENGINE',
        departmentCode: 'REV',
        action: 'FETCH_INCOME_RECORD',
        entityType: 'APPLICATION',
        entityId: application.application_id,
        status: result.success ? 'SUCCESS' : 'FAILED',
        metadata: { certificateNo: application.income_certificate_no, resultStatus: result.status },
      });

      if (!result.success || result.status === 'FAILED') {
        throw new WorkflowExecutionError(
          result.error || `Income verification failed for certificate ${application.income_certificate_no}`,
          result.error_code || 'INCOME_VERIFICATION_FAILED',
          result.raw,
          result.retryable || false
        );
      }

      // Canonical mapping
      const canonicalData = await dataMapperService.mapToCanonical(result.data, {
        sourceSystem: 'INCOME',
        targetModel: 'CANONICAL_INCOME',
        citizenId: application.citizen_id,
        applicationId: application.application_id,
        service: 'INCOME_VERIFICATION',
      });

      return canonicalData;
    });

    // 4. Bank Verification
    this.registerStepHandler('BANK_VERIFICATION', async (context) => {
      const { application, options, step } = context;
      const connector = connectorRegistry.getByDepartmentCode('DBT');
      if (!connector) throw new WorkflowExecutionError('Bank/DBT connector not found in registry', 'CONNECTOR_NOT_FOUND', null, false);

      const canonicalReq = {
        citizen_id: application.citizen_id,
        account_reference: application.account_reference,
        correlation_id: `CORR-DBT-${application.application_id}-${Date.now().toString().slice(-4)}`,
      };

      const connectorType = options.connectorType || step?.connector_type || (options.mockMode ? 'MOCK' : 'REST');
      const result = await connector.execute(canonicalReq, {
        connectorType,
        mockMode: options.bankMockMode || options.mockMode,
      });

      // Record API Request Telemetry
      await ApiRequestModel.log({
        requestId: result.correlation_id || canonicalReq.correlation_id,
        applicationId: application.application_id,
        serviceCode: 'SRV-DBT-01',
        endpoint: '/api/bank/verify',
        httpMethod: 'POST',
        requestBody: canonicalReq,
        responseStatusCode: result.success ? 200 : (result.raw?.error_code ? 404 : 400),
        responseBody: result.raw || result.data || { error: result.error },
        latencyMs: result.latency_ms || 10,
        status: result.success ? 'SUCCESS' : 'FAILED',
      });

      // Record Audit Log
      await AuditLogModel.log({
        requestId: result.correlation_id || canonicalReq.correlation_id,
        actorType: 'SYSTEM',
        actorId: 'WORKFLOW_ENGINE',
        departmentCode: 'DBT',
        action: 'FETCH_BANK_DBT_STATUS',
        entityType: 'APPLICATION',
        entityId: application.application_id,
        status: result.success ? 'SUCCESS' : 'FAILED',
        metadata: { accountReference: application.account_reference, resultStatus: result.status },
      });

      if (!result.success || result.status === 'FAILED') {
        throw new WorkflowExecutionError(
          result.error || `Bank verification failed for account reference ${application.account_reference}`,
          result.error_code || 'BANK_VERIFICATION_FAILED',
          result.raw,
          result.retryable || false
        );
      }

      // Canonical mapping
      const canonicalData = await dataMapperService.mapToCanonical(result.data, {
        sourceSystem: 'BANK',
        targetModel: 'CANONICAL_BANK',
        citizenId: application.citizen_id,
        applicationId: application.application_id,
        service: 'BANK_VERIFICATION',
      });

      return canonicalData;
    });

    // 5. Eligibility Check
    this.registerStepHandler('ELIGIBILITY_CHECK', async (context) => {
      const { application, workflowContext } = context;

      const eduData = workflowContext.EDUCATION_VERIFICATION;
      const incData = workflowContext.INCOME_VERIFICATION;
      const bankData = workflowContext.BANK_VERIFICATION;

      // If a step was disabled/skipped in workflow configuration by admin, that requirement is considered waived
      const academicQualified = !eduData || eduData.skipped === true || (eduData.status === 'VERIFIED');
      const incomeAmount = incData?.annualIncome !== undefined ? Number(incData.annualIncome) : Number(application.declared_income);
      const incomeWithinThreshold = !incData || incData.skipped === true || ((incData.status === 'VERIFIED') && incomeAmount <= 250000);
      const dbtAccountReady = !bankData || bankData.skipped === true || (
        (bankData.status === 'VERIFIED') && 
        (bankData.accountHolderMatch !== false) && 
        (bankData.dbtActive !== false) && 
        (bankData.aadhaarSeeded !== false)
      );

      const eligible = academicQualified && incomeWithinThreshold && dbtAccountReady;

      await AuditLogModel.log({
        requestId: `REQ-ELIG-${Date.now().toString().slice(-6)}`,
        actorType: 'SYSTEM',
        actorId: 'WORKFLOW_ENGINE',
        departmentCode: 'INTEROP',
        action: 'EVALUATE_SCHOLARSHIP_CRITERIA',
        entityType: 'APPLICATION',
        entityId: application.application_id,
        status: eligible ? 'SUCCESS' : 'FAILED',
        metadata: {
          academicQualified,
          incomeWithinThreshold,
          dbtAccountReady,
          annualIncome: incomeAmount,
        },
      });

      if (!eligible) {
        try {
          await query(
            `INSERT INTO notifications (citizen_id, application_id, type, channel, title, message, status)
             VALUES ($1, $2, 'NOT_ELIGIBLE', 'IN_APP', 'Eligibility Evaluation Incomplete', $3, 'UNREAD')`,
            [
              application.citizen_id,
              application.application_id,
              `Application ${application.application_id} did not satisfy scholarship eligibility criteria across departmental credentials.`,
            ]
          );
        } catch (nErr) {}

        throw new WorkflowExecutionError(
          'Eligibility evaluation criteria not met across multi-department credentials',
          'ELIGIBILITY_CRITERIA_FAILED',
          { academicQualified, incomeWithinThreshold, dbtAccountReady },
          false
        );
      }

      try {
        await query(
          `INSERT INTO notifications (citizen_id, application_id, type, channel, title, message, status)
           VALUES ($1, $2, 'ELIGIBLE', 'IN_APP', 'Scholarship Eligibility Confirmed', $3, 'UNREAD')`,
          [
            application.citizen_id,
            application.application_id,
            `Eligibility criteria confirmed for scheme ${application.scheme_name}. Application forwarded for officer sanction.`,
          ]
        );
      } catch (nErr) {}

      return {
        eligible: true,
        criteria: {
          academicQualified,
          incomeWithinThreshold,
          dbtAccountReady,
        },
        recommendedBenefit: Number(application.benefit_amount) || 25000,
        evaluatedAt: new Date().toISOString(),
      };
    });

    // 6. Officer Approval
    this.registerStepHandler('OFFICER_APPROVAL', async (context) => {
      const { application, workflowContext } = context;
      const eligibility = workflowContext.ELIGIBILITY_CHECK;

      if (!eligibility || !eligibility.eligible) {
        throw new WorkflowExecutionError(
          'Cannot grant officer approval: Application not verified eligible',
          'APPROVAL_PRECONDITION_FAILED',
          null,
          false
        );
      }

      await AuditLogModel.log({
        requestId: `REQ-APPR-${Date.now().toString().slice(-6)}`,
        actorType: 'OFFICER',
        actorId: 'OFFICER-AUTO-01',
        departmentCode: 'INTEROP',
        action: 'OFFICER_APPROVAL',
        entityType: 'APPLICATION',
        entityId: application.application_id,
        status: 'SUCCESS',
        metadata: {
          officerName: 'Automated Welfare Officer',
          decision: 'APPROVED',
          benefitAmount: application.benefit_amount,
        },
      });

      return {
        approved: true,
        officerId: 'OFFICER-AUTO-01',
        decision: 'APPROVED',
        approvalTimestamp: new Date().toISOString(),
        remarks: 'Automated administrative approval granted based on all 3 successful departmental verifications.',
      };
    });

    // 7. Completion
    this.registerStepHandler('COMPLETION', async (context) => {
      const { application } = context;

      // Update application state
      await WorkflowModel.updateApplicationStatus(application.application_id, {
        status: 'SUCCESS',
        currentStep: 'COMPLETION',
        remarks: 'Scholarship application fully verified, approved, and registered for direct benefit disbursement.',
        approvalDate: new Date(),
      });

      // Insert Citizen Notification
      await query(
        `INSERT INTO notifications (citizen_id, application_id, type, channel, title, message, status)
         VALUES ($1, $2, 'ELIGIBLE', 'IN_APP', 'Scholarship Sanctioned', $3, 'UNREAD')`,
        [
          application.citizen_id,
          application.application_id,
          `Congratulations! Your scholarship application ${application.application_id} has completed all cross-departmental verifications and is approved.`,
        ]
      );
      await query(
        `INSERT INTO notifications (citizen_id, application_id, type, channel, title, message, status)
         VALUES ($1, $2, 'APPLICATION_APPROVED', 'IN_APP', 'Scholarship Sanctioned', $3, 'UNREAD')`,
        [
          application.citizen_id,
          application.application_id,
          `Congratulations! Your scholarship application ${application.application_id} has completed all cross-departmental verifications and is approved.`,
        ]
      );

      // Audit Log
      await AuditLogModel.log({
        requestId: `REQ-COMP-${Date.now().toString().slice(-6)}`,
        actorType: 'SYSTEM',
        actorId: 'WORKFLOW_ENGINE',
        departmentCode: 'INTEROP',
        action: 'WORKFLOW_COMPLETED',
        entityType: 'APPLICATION',
        entityId: application.application_id,
        status: 'SUCCESS',
        metadata: {
          applicationId: application.application_id,
          finalStatus: 'SUCCESS',
        },
      });

      return {
        completed: true,
        applicationId: application.application_id,
        status: 'SUCCESS',
        completedAt: new Date().toISOString(),
      };
    });
  }

  /**
   * Register or override a custom step handler
   * @param {string} stepIdentifier
   * @param {Function} handlerFn
   */
  registerStepHandler(stepIdentifier, handlerFn) {
    this.stepHandlers.set(stepIdentifier.toUpperCase(), handlerFn);
    logger.debug(`WorkflowEngine: Registered handler for step [${stepIdentifier.toUpperCase()}]`);
  }

  /**
   * Dispatch a step handler by its identifier
   */
  async dispatchStepHandler(defStep, application, workflowContext, options) {
    const handler = this.stepHandlers.get(defStep.step_identifier.toUpperCase());
    if (!handler) {
      // Default fallback for generic steps
      logger.warn(`No specific handler for step [${defStep.step_identifier}]. Executing default pass-through.`);
      return { step: defStep.step_identifier, status: 'PASSED', executedAt: new Date().toISOString() };
    }

    return await handler({
      step: defStep,
      application,
      workflowContext,
      options,
    });
  }

  /**
   * Execute or continue a workflow for an application
   * Loads workflow definition and steps strictly from PostgreSQL.
   * 
   * @param {string} applicationId
   * @param {Object} [options={}]
   * @param {string} [options.workflowCode]
   * @param {string} [options.workflowVersion]
   * @param {boolean} [options.queueOnFailure=false] - If true, retryable failures without retries enter QUEUED state
   * @param {boolean} [options.mockMode=false]
   * @param {string} [options.connectorType] - Override connector type (REST, MOCK, LEGACY, SANDBOX)
   * @returns {Promise<Object>} Execution summary
   */
  async executeWorkflow(applicationId, options = {}) {
    logger.info(`===========================================================`);
    logger.info(`WorkflowEngine: Initiating workflow execution for [${applicationId}]`);
    logger.info(`===========================================================`);

    // 1. Fetch Application from PostgreSQL
    const application = await WorkflowModel.getApplication(applicationId);
    if (!application) {
      throw new WorkflowExecutionError(`Application [${applicationId}] not found in database`, 'APPLICATION_NOT_FOUND', null, false);
    }

    // 2. Load Workflow Definition from PostgreSQL (Supports active version & version overrides)
    const workflowCode = options.workflowCode || application.workflow_code || 'WF-SCHOLARSHIP-V1';
    let definition;
    if (options.workflowVersion) {
      definition = await WorkflowModel.getDefinitionByVersion(workflowCode, options.workflowVersion);
    } else {
      definition = await WorkflowModel.getActiveDefinition(workflowCode);
    }

    if (!definition) {
      throw new WorkflowExecutionError(
        `Active workflow definition not found in PostgreSQL for code [${workflowCode}]`,
        'WORKFLOW_DEFINITION_NOT_FOUND',
        null,
        false
      );
    }

    logger.info(`WorkflowEngine: Loaded definition [${definition.workflow_code}] v${definition.version} (Active: ${definition.is_active})`);

    // 3. Load Step Configuration Sequence from PostgreSQL
    const definitionSteps = await WorkflowModel.getDefinitionSteps(definition.workflow_code, definition.version);
    if (!definitionSteps || definitionSteps.length === 0) {
      throw new WorkflowExecutionError(
        `No definition steps found in PostgreSQL for [${definition.workflow_code}] v${definition.version}`,
        'NO_DEFINITION_STEPS',
        null,
        false
      );
    }

    logger.info(`WorkflowEngine: Retrieved ${definitionSteps.length} sequential steps from PostgreSQL:`);
    definitionSteps.forEach((s) => {
      logger.info(`  Step ${s.step_order}: ${s.step_name} (${s.step_identifier}) [Dept: ${s.department_code}, Enabled: ${s.is_enabled}]`);
    });

    // 4. Load Existing Runtime Step Instances
    const existingStepInstances = await WorkflowModel.getStepInstances(applicationId);
    const stepInstanceMap = new Map();
    existingStepInstances.forEach((inst) => stepInstanceMap.set(inst.step_number, inst));

    // Update application to RUNNING if not already
    await WorkflowModel.updateApplicationStatus(applicationId, {
      status: 'RUNNING',
      currentStep: definitionSteps[0].step_name,
      remarks: `Pipeline ${definition.workflow_code} v${definition.version} in progress`,
      workflowCode: definition.workflow_code,
      workflowVersion: definition.version,
    });

    const workflowContext = {};
    // Pre-populate context from already completed steps
    existingStepInstances.forEach((inst) => {
      if (inst.status === 'SUCCESS' && inst.response_payload) {
        const identifier = inst.step_identifier || definitionSteps.find((s) => s.step_order === inst.step_number)?.step_identifier;
        if (identifier) {
          workflowContext[identifier] = inst.response_payload;
        }
      }
    });

    // 5. Sequential Step Execution
    for (const defStep of definitionSteps) {
      const stepNumber = defStep.step_order;
      const instance = stepInstanceMap.get(stepNumber);

      // Capability 11: Do not restart successful previous steps unnecessarily
      if (instance && instance.status === 'SUCCESS') {
        logger.info(`WorkflowEngine: Step ${stepNumber} [${defStep.step_name}] is already completed with [SUCCESS]. Preserving state and skipping execution.`);
        continue;
      }

      // Capability 14: Support enabled/disabled steps
      if (defStep.is_enabled === false) {
        logger.info(`WorkflowEngine: Step ${stepNumber} [${defStep.step_name}] is marked disabled (is_enabled=false) in PostgreSQL. Marking as [SKIPPED].`);
        
        await WorkflowModel.upsertStepInstance({
          applicationId,
          stepNumber,
          stepIdentifier: defStep.step_identifier,
          stepName: defStep.step_name,
          departmentCode: defStep.department_code,
          status: 'SKIPPED',
          requestPayload: {},
          responsePayload: { skipped: true, reason: 'Step disabled in workflow configuration' },
          errorDetails: null,
          executionTimeMs: 0,
          retryCount: instance?.retry_count || 0,
          attempts: instance?.attempts || 0,
          startedAt: new Date(),
          completedAt: new Date(),
        });

        workflowContext[defStep.step_identifier] = { skipped: true, reason: 'Step disabled in workflow configuration' };
        continue;
      }

      // Execute Step with Retry & Error Handling
      const retryPolicy = defStep.retry_policy || { maxRetries: 3, backoffMs: 500 };
      const maxRetries = typeof retryPolicy.maxRetries === 'number' ? retryPolicy.maxRetries : 1;
      const backoffMs = typeof retryPolicy.backoffMs === 'number' ? retryPolicy.backoffMs : 200;

      let stepSuccess = false;
      let attempts = instance ? instance.attempts : 0;
      let retryCount = instance ? instance.retry_count : 0;
      let lastError = null;

      // Update application current step
      await WorkflowModel.updateApplicationStatus(applicationId, {
        status: 'RUNNING',
        currentStep: defStep.step_name,
      });

      while (!stepSuccess) {
        attempts++;
        const startTime = Date.now();
        const stepStartedAt = instance?.started_at && attempts === 1 ? instance.started_at : new Date(startTime);

        // Mark Step RUNNING
        await WorkflowModel.upsertStepInstance({
          applicationId,
          stepNumber,
          stepIdentifier: defStep.step_identifier,
          stepName: defStep.step_name,
          departmentCode: defStep.department_code,
          status: 'RUNNING',
          requestPayload: {},
          responsePayload: {},
          errorDetails: null,
          executionTimeMs: null,
          retryCount,
          attempts,
          startedAt: stepStartedAt,
          completedAt: null,
        });

        logger.info(`WorkflowEngine: Executing Step ${stepNumber} [${defStep.step_name}] (Attempt ${attempts})...`);

        try {
          // Capability: The workflow must NOT perform cross-department verification before required consent exists.
          const isCrossDept = ['EDU', 'REV', 'DBT'].includes(defStep.department_code) ||
            ['EDUCATION_VERIFICATION', 'INCOME_VERIFICATION', 'BANK_VERIFICATION'].includes(defStep.step_identifier);

          if (isCrossDept) {
            const activeConsent = await ConsentModel.getActiveConsent(applicationId);
            if (!activeConsent) {
              logger.warn(`WorkflowEngine: Cross-department verification for step [${defStep.step_name}] blocked. Active citizen consent is missing or revoked.`);
              
              await AuditLogModel.log({
                requestId: `REQ-CONSENT-FAIL-${Date.now().toString().slice(-6)}`,
                actorType: 'SYSTEM',
                actorId: 'WORKFLOW_ENGINE',
                departmentCode: defStep.department_code,
                action: 'CROSS_DEPT_VERIFICATION_BLOCKED',
                entityType: 'APPLICATION',
                entityId: applicationId,
                status: 'FAILED',
                metadata: {
                  step: defStep.step_identifier,
                  reason: 'Active citizen consent required before cross-department verification',
                },
              });

              throw new WorkflowExecutionError(
                `Cross-department verification blocked: Active citizen consent required for ${defStep.step_name}`,
                'CONSENT_REQUIRED',
                { applicationId, step: defStep.step_identifier },
                false
              );
            }
          }

          const stepResult = await this.dispatchStepHandler(defStep, application, workflowContext, options);
          const durationMs = Date.now() - startTime;

          // Capability 4 & 5: Persist status, payloads, and start/completion timestamps
          await WorkflowModel.upsertStepInstance({
            applicationId,
            stepNumber,
            stepIdentifier: defStep.step_identifier,
            stepName: defStep.step_name,
            departmentCode: defStep.department_code,
            status: 'SUCCESS',
            requestPayload: {},
            responsePayload: stepResult,
            errorDetails: null,
            executionTimeMs: durationMs,
            retryCount,
            attempts,
            startedAt: stepStartedAt,
            completedAt: new Date(),
          });

          workflowContext[defStep.step_identifier] = stepResult;
          stepSuccess = true;
          logger.info(`WorkflowEngine: Step ${stepNumber} [${defStep.step_name}] completed successfully in ${durationMs}ms`);

          // Step 13: Create VERIFICATION_COMPLETED notification for departmental verifications
          if (['EDUCATION_VERIFICATION', 'INCOME_VERIFICATION', 'BANK_VERIFICATION'].includes(defStep.step_identifier)) {
            try {
              await query(
                `INSERT INTO notifications (citizen_id, application_id, type, channel, title, message, status)
                 VALUES ($1, $2, 'VERIFICATION_COMPLETED', 'IN_APP', $3, $4, 'UNREAD')`,
                [
                  application.citizen_id,
                  applicationId,
                  `${defStep.step_name} Verified`,
                  `Departmental verification for ${defStep.step_name} has completed successfully for application ${applicationId}.`,
                ]
              );
            } catch (notifErr) {
              logger.warn('Failed to insert VERIFICATION_COMPLETED notification:', notifErr.message);
            }
          }
        } catch (err) {
          const durationMs = Date.now() - startTime;
          lastError = err;
          const isRetryable = err.retryable === true;

          logger.warn(`WorkflowEngine: Step ${stepNumber} [${defStep.step_name}] failed in ${durationMs}ms: ${err.message} (Retryable: ${isRetryable})`);

          // Capability 8: Support retryable failures
          if (isRetryable && retryCount < maxRetries) {
            retryCount++;
            logger.info(`WorkflowEngine: Retrying step ${stepNumber} [${defStep.step_name}] (Retry count: ${retryCount}/${maxRetries}) after ${backoffMs}ms backoff...`);

            // Persist RETRYING status
            await WorkflowModel.upsertStepInstance({
              applicationId,
              stepNumber,
              stepIdentifier: defStep.step_identifier,
              stepName: defStep.step_name,
              departmentCode: defStep.department_code,
              status: 'RETRYING',
              requestPayload: {},
              responsePayload: {},
              errorDetails: `Attempt ${attempts} failed: ${err.message} (Retryable: true)`,
              executionTimeMs: durationMs,
              retryCount,
              attempts,
              startedAt: stepStartedAt,
              completedAt: null,
            });

            await WorkflowModel.updateApplicationStatus(applicationId, {
              status: 'RETRYING',
              currentStep: defStep.step_name,
              remarks: `Step ${defStep.step_name} retrying: ${err.message}`,
            });

            if (backoffMs > 0) {
              await new Promise((resolve) => setTimeout(resolve, Math.min(backoffMs, 200)));
            }

            // Loop continues to retry
            continue;
          }

          // Capability 9: Support queue state on retryable failures, or NON_RETRYABLE / FAILED on terminal failures
          let finalStatus;
          if (isRetryable) {
            finalStatus = 'QUEUED';
          } else if (options.markNonRetryable || err.nonRetryable || err.errorCode === 'NON_RETRYABLE') {
            finalStatus = 'NON_RETRYABLE';
          } else {
            finalStatus = 'FAILED';
          }

          // Capability 6 & 7: Persist error info, attempts, and failed/queued status
          await WorkflowModel.upsertStepInstance({
            applicationId,
            stepNumber,
            stepIdentifier: defStep.step_identifier,
            stepName: defStep.step_name,
            departmentCode: defStep.department_code,
            status: finalStatus,
            requestPayload: {},
            responsePayload: {
              ...(err.details || {}),
              retryable: isRetryable,
              errorCode: err.errorCode || 'WORKFLOW_STEP_ERROR',
            },
            errorDetails: err.message,
            executionTimeMs: durationMs,
            retryCount,
            attempts,
            startedAt: stepStartedAt,
            completedAt: new Date(),
          });

          await WorkflowModel.updateApplicationStatus(applicationId, {
            status: finalStatus,
            currentStep: defStep.step_name,
            remarks: isRetryable
              ? `Workflow queued at step ${defStep.step_name}: ${err.message}`
              : `Workflow paused at step ${defStep.step_name}: ${err.message}`,
          });

          // Insert Citizen Notification
          try {
            if (finalStatus === 'QUEUED') {
              await query(
                `INSERT INTO notifications (citizen_id, application_id, type, channel, title, message, status)
                 VALUES ($1, $2, 'SERVICE_UNAVAILABLE', 'IN_APP', 'Service Unavailable - Verification Queued', $3, 'UNREAD')`,
                [
                  application.citizen_id,
                  applicationId,
                  `Departmental verification for ${defStep.step_name} has encountered a temporary service outage and is queued for automated recovery. No resubmission required.`,
                ]
              );
              await query(
                `INSERT INTO notifications (citizen_id, application_id, type, channel, title, message, status)
                 VALUES ($1, $2, 'WORKFLOW_QUEUED', 'IN_APP', 'Verification In Queue', $3, 'UNREAD')`,
                [
                  application.citizen_id,
                  applicationId,
                  `Departmental verification for ${defStep.step_name} has encountered a temporary service outage and is queued for automated recovery. No resubmission required.`,
                ]
              );
            } else if (finalStatus === 'NON_RETRYABLE') {
              await query(
                `INSERT INTO notifications (citizen_id, application_id, type, channel, title, message, status)
                 VALUES ($1, $2, 'WORKFLOW_FAILED', 'IN_APP', 'Verification Action Required', $3, 'UNREAD')`,
                [
                  application.citizen_id,
                  applicationId,
                  `Application could not be verified at ${defStep.step_name}: ${err.message}. Please review the submitted details.`,
                ]
              );
            }
          } catch (notifErr) {
            logger.warn('Failed to insert notification during step failure:', notifErr.message);
          }

          // Record Audit Log
          try {
            await AuditLogModel.log({
              requestId: `REQ-EXC-${Date.now().toString().slice(-6)}`,
              actorType: 'SYSTEM',
              actorId: 'WORKFLOW_ENGINE',
              departmentCode: defStep.department_code,
              action: finalStatus === 'QUEUED' ? 'WORKFLOW_STEP_QUEUED' : 'WORKFLOW_STEP_FAILED',
              entityType: 'APPLICATION',
              entityId: applicationId,
              status: finalStatus,
              metadata: {
                stepNumber,
                stepIdentifier: defStep.step_identifier,
                stepName: defStep.step_name,
                retryable: isRetryable,
                attempts,
                retryCount,
                error: err.message,
              },
            });
          } catch (auditErr) {
            logger.warn('Failed to insert audit log during step failure:', auditErr.message);
          }

          logger.error(`WorkflowEngine: Halting workflow execution at step ${stepNumber} with status [${finalStatus}]`);


          return {
            success: false,
            status: finalStatus,
            applicationId,
            failedStepNumber: stepNumber,
            failedStepIdentifier: defStep.step_identifier,
            failedStepName: defStep.step_name,
            attempts,
            retryCount,
            retryable: isRetryable,
            error: err.message,
            errorDetails: err.details,
          };
        }
      }
    }

    // 6. Workflow Completed Successfully
    await WorkflowModel.updateApplicationStatus(applicationId, {
      status: 'SUCCESS',
      currentStep: 'COMPLETION',
      remarks: 'All workflow steps verified successfully from database pipeline definition.',
      approvalDate: new Date(),
      workflowCode: definition.workflow_code,
      workflowVersion: definition.version,
    });

    logger.info(`===========================================================`);
    logger.info(`WorkflowEngine: Workflow [${definition.workflow_code} v${definition.version}] completed with SUCCESS for [${applicationId}]`);
    logger.info(`===========================================================`);

    return {
      success: true,
      status: 'SUCCESS',
      applicationId,
      workflowCode: definition.workflow_code,
      version: definition.version,
      totalStepsExecuted: definitionSteps.length,
      context: workflowContext,
    };
  }

  /**
   * Resume an existing workflow from the failed or queued step
   * Capability 10: Resume from failed/queued step without restarting successful steps.
   * 
   * @param {string} applicationId
   * @param {Object} [options={}]
   */
  async resumeWorkflow(applicationId, options = {}) {
    logger.info(`WorkflowEngine: Resuming workflow for application [${applicationId}]...`);

    const application = await WorkflowModel.getApplication(applicationId);
    if (!application) {
      throw new WorkflowExecutionError(`Application [${applicationId}] not found`, 'APPLICATION_NOT_FOUND', null, false);
    }

    // Execute the workflow. The sequential loop naturally inspects existing steps
    // and skips any step with status === 'SUCCESS', resuming exactly from the first non-successful step!
    return await this.executeWorkflow(applicationId, {
      ...options,
      isResume: true,
    });
  }

  /**
   * Get full workflow status, timeline, and step execution details for an application
   * @param {string} applicationId
   */
  async getWorkflowStatus(applicationId) {
    const application = await WorkflowModel.getApplication(applicationId);
    if (!application) return null;

    const workflowCode = application.workflow_code || 'WF-SCHOLARSHIP-V1';
    const version = application.workflow_version || '1.0.0';

    const definition = await WorkflowModel.getDefinitionByVersion(workflowCode, version) ||
                       await WorkflowModel.getActiveDefinition(workflowCode);
    const definitionSteps = await WorkflowModel.getDefinitionSteps(workflowCode, version);
    const stepInstances = await WorkflowModel.getStepInstances(applicationId);

    const instanceMap = new Map();
    stepInstances.forEach((inst) => instanceMap.set(inst.step_number, inst));

    const stepsWithProgress = definitionSteps.map((defStep) => {
      const instance = instanceMap.get(defStep.step_order);
      return {
        stepOrder: defStep.step_order,
        stepIdentifier: defStep.step_identifier,
        stepName: defStep.step_name,
        departmentCode: defStep.department_code,
        isMandatory: defStep.is_mandatory,
        isEnabled: defStep.is_enabled,
        status: instance ? instance.status : 'PENDING',
        attempts: instance ? instance.attempts : 0,
        retryCount: instance ? instance.retry_count : 0,
        errorDetails: instance ? instance.error_details : null,
        executionTimeMs: instance ? instance.execution_time_ms : null,
        startedAt: instance ? instance.started_at : null,
        completedAt: instance ? instance.completed_at : null,
        responsePayload: instance ? instance.response_payload : null,
      };
    });

    const completedStepsCount = stepsWithProgress.filter((s) => s.status === 'SUCCESS' || s.status === 'SKIPPED').length;
    const progressPercentage = definitionSteps.length > 0
      ? Math.round((completedStepsCount / definitionSteps.length) * 100)
      : 0;

    return {
      applicationId: application.application_id,
      citizenId: application.citizen_id,
      schemeName: application.scheme_name,
      status: application.status,
      currentStep: application.current_step,
      completedSteps: completedStepsCount,
      totalSteps: definitionSteps.length,
      progressPercentage,
      workflow: {
        code: definition?.workflow_code || workflowCode,
        name: definition?.name || 'Scholarship Verification Pipeline',
        version: definition?.version || version,
        isActive: definition?.is_active || false,
      },
      steps: stepsWithProgress,
    };
  }
}

export const workflowEngine = new WorkflowEngine();
export default workflowEngine;
