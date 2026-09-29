import mockDepartmentService from '../services/mockDepartment.service.js';
import logger from '../utils/logger.js';

/**
 * Controller for Mock Departmental APIs
 * Implements deterministic responses, validation failure, timeout, service failure,
 * retryable / non-retryable failure, and state control.
 */
export const mockDepartmentController = {
  /**
   * POST /api/education/verify
   */
  verifyEducation: async (req, res) => {
    const correlationId = mockDepartmentService.getCorrelationId(
      req.headers['x-correlation-id'] || req.headers['correlation-id'] || req.body?.correlation_id
    );
    const mockMode = req.headers['x-mock-mode'] || req.query?.mock_mode || null;

    logger.info(`[${correlationId}] Mock Education Verification request received`, { body: req.body, mockMode });

    const { citizen_id, student_id, institution_code } = req.body || {};

    // 1. Validation Check
    if (!citizen_id || typeof citizen_id !== 'string' || !citizen_id.trim()) {
      return res.status(400).json({
        status: 'FAILED',
        error_code: 'VALIDATION_ERROR',
        message: 'Missing or invalid required field: citizen_id',
        retryable: false,
        correlation_id: correlationId,
      });
    }

    if (!student_id || typeof student_id !== 'string' || !student_id.trim()) {
      return res.status(400).json({
        status: 'FAILED',
        error_code: 'VALIDATION_ERROR',
        message: 'Missing or invalid required field: student_id',
        retryable: false,
        correlation_id: correlationId,
      });
    }

    if (!institution_code || typeof institution_code !== 'string' || !institution_code.trim()) {
      return res.status(400).json({
        status: 'FAILED',
        error_code: 'VALIDATION_ERROR',
        message: 'Missing or invalid required field: institution_code',
        retryable: false,
        correlation_id: correlationId,
      });
    }

    // 2. Execute verification through service
    const result = await mockDepartmentService.verifyEducation(
      { citizen_id, student_id, institution_code },
      { mockMode, correlationId }
    );

    if (result.error) {
      return res.status(result.httpStatus).json(result.error);
    }

    return res.status(result.httpStatus).json(result.data);
  },

  /**
   * POST /api/income/verify
   */
  verifyIncome: async (req, res) => {
    const correlationId = mockDepartmentService.getCorrelationId(
      req.headers['x-correlation-id'] || req.headers['correlation-id'] || req.body?.correlation_id
    );
    const mockMode = req.headers['x-mock-mode'] || req.query?.mock_mode || null;
    const requestDelay = parseInt(req.headers['x-mock-delay'] || req.query?.delay || '0', 10);

    logger.info(`[${correlationId}] Mock Income Verification request received`, { body: req.body, mockMode });

    const { citizen_id, income_certificate_no } = req.body || {};

    // 1. Validation Check
    if (!citizen_id || typeof citizen_id !== 'string' || !citizen_id.trim()) {
      return res.status(400).json({
        status: 'FAILED',
        error_code: 'VALIDATION_ERROR',
        message: 'Missing or invalid required field: citizen_id',
        retryable: false,
        correlation_id: correlationId,
      });
    }

    if (!income_certificate_no || typeof income_certificate_no !== 'string' || !income_certificate_no.trim()) {
      return res.status(400).json({
        status: 'FAILED',
        error_code: 'VALIDATION_ERROR',
        message: 'Missing or invalid required field: income_certificate_no',
        retryable: false,
        correlation_id: correlationId,
      });
    }

    // 2. Execute verification through service
    const result = await mockDepartmentService.verifyIncome(
      { citizen_id, income_certificate_no },
      { mockMode, correlationId, requestDelay }
    );

    if (result.error) {
      return res.status(result.httpStatus).json(result.error);
    }

    return res.status(result.httpStatus).json(result.data);
  },

  /**
   * POST /api/bank/verify
   */
  verifyBank: async (req, res) => {
    const correlationId = mockDepartmentService.getCorrelationId(
      req.headers['x-correlation-id'] || req.headers['correlation-id'] || req.body?.correlation_id
    );
    const mockMode = req.headers['x-mock-mode'] || req.query?.mock_mode || null;

    logger.info(`[${correlationId}] Mock Bank Verification request received`, { body: req.body, mockMode });

    const { citizen_id, account_reference } = req.body || {};

    // 1. Validation Check
    if (!citizen_id || typeof citizen_id !== 'string' || !citizen_id.trim()) {
      return res.status(400).json({
        status: 'FAILED',
        error_code: 'VALIDATION_ERROR',
        message: 'Missing or invalid required field: citizen_id',
        retryable: false,
        correlation_id: correlationId,
      });
    }

    if (!account_reference || typeof account_reference !== 'string' || !account_reference.trim()) {
      return res.status(400).json({
        status: 'FAILED',
        error_code: 'VALIDATION_ERROR',
        message: 'Missing or invalid required field: account_reference',
        retryable: false,
        correlation_id: correlationId,
      });
    }

    // 2. Execute verification through service
    const result = await mockDepartmentService.verifyBank(
      { citizen_id, account_reference },
      { mockMode, correlationId }
    );

    if (result.error) {
      return res.status(result.httpStatus).json(result.error);
    }

    return res.status(result.httpStatus).json(result.data);
  },

  // --- Runtime Control Handlers ---

  /**
   * GET /api/mock/status
   */
  getStatus: (req, res) => {
    return res.json({
      status: 'ONLINE',
      services: mockDepartmentService.getStateSummary(),
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * POST /api/mock/reset
   */
  resetControl: (req, res) => {
    const summary = mockDepartmentService.resetAll();
    return res.json({
      message: 'All mock departmental services reset to healthy baseline',
      services: summary,
    });
  },

  /**
   * POST /api/bank/control
   * Controllable between healthy and failed states
   */
  setBankControl: (req, res) => {
    const { healthy, errorCode, message, retryable, httpStatus } = req.body || {};
    const updated = mockDepartmentService.setBankControl({
      healthy,
      errorCode,
      message,
      retryable,
      httpStatus,
    });

    return res.json({
      message: `Bank API state set to: ${updated.healthy ? 'HEALTHY' : 'FAILED'}`,
      state: updated,
    });
  },

  /**
   * GET /api/bank/control
   */
  getBankControl: (req, res) => {
    return res.json(mockDepartmentService.getBankControl());
  },

  /**
   * POST /api/income/control
   * Supports simulated slow responses
   */
  setIncomeControl: (req, res) => {
    const { delayMs } = req.body || {};
    const updated = mockDepartmentService.setIncomeControl({ delayMs });
    return res.json({
      message: `Income API simulated delay set to ${updated.delayMs}ms`,
      state: updated,
    });
  },

  /**
   * GET /api/income/control
   */
  getIncomeControl: (req, res) => {
    return res.json(mockDepartmentService.getIncomeControl());
  },
};

export default mockDepartmentController;
