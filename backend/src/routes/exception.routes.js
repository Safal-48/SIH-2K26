import { Router } from 'express';
import { ExceptionService } from '../services/exception.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { ROLES } from '../services/auth.service.js';
import logger from '../utils/logger.js';

const router = Router();

// Allow optional or explicit authentication: ADMIN and SYSTEM can manage exceptions
// Authenticated ADMIN/SYSTEM or internal service-to-service
router.use(authenticate, authorizeRoles(ROLES.ADMIN, ROLES.SYSTEM));

/**
 * 1. List Exceptions with Filters
 * GET /api/exceptions
 * Query params: ?status=QUEUED&department=DBT&retryable=true&search=SCH-2026&limit=50
 */
router.get('/', async (req, res, next) => {
  try {
    const { status, department, retryable, search, limit } = req.query;
    const result = await ExceptionService.getExceptions({
      status,
      department,
      retryable,
      search,
      limit,
    });

    return ApiResponse.success(res, {
      message: 'Operational exceptions retrieved successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 2. Get Queue Summary Metrics
 * GET /api/exceptions/queue/summary
 */
router.get('/queue/summary', async (req, res, next) => {
  try {
    const summary = await ExceptionService.getQueueSummary();
    return ApiResponse.success(res, {
      message: 'Queue summary retrieved successfully',
      data: summary,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 3. Process Local Deterministic Queue Batch
 * POST /api/exceptions/queue/process
 */
router.post('/queue/process', async (req, res, next) => {
  try {
    const result = await ExceptionService.processQueue(req.body);
    return ApiResponse.success(res, {
      message: `Processed ${result.processedCount} queued workflows`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 4. Get Exception by ID or Application ID
 * GET /api/exceptions/:id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const exception = await ExceptionService.getExceptionById(id);

    if (!exception) {
      return ApiResponse.error(res, {
        message: `Exception record [${id}] not found`,
        statusCode: 404,
        errorCode: 'EXCEPTION_NOT_FOUND',
      });
    }

    return ApiResponse.success(res, {
      message: 'Exception details retrieved successfully',
      data: exception,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 5. Retry Exception
 * POST /api/exceptions/:id/retry
 */
router.post('/:id/retry', async (req, res, next) => {
  try {
    const { id } = req.params;
    const actorId = req.user?.username || req.user?.citizen_id || 'ADMIN';
    const actorType = req.user?.role || 'ADMIN';

    const result = await ExceptionService.retryException(id, {
      ...req.body,
      actorId,
      actorType,
    });

    const statusCode = result.success ? 200 : 202;

    return ApiResponse.success(res, {
      message: result.message,
      data: result.data,
      statusCode,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
