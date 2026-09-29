import { AppError } from '../utils/appError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';
import config from '../config/env.js';

/**
 * Global Centralized Error Handling Middleware
 * Intercepts all unhandled synchronous and asynchronous Express errors.
 */
export const errorHandler = (err, req, res, next) => {
  // Handle Zod Validation Errors
  if (err?.name === 'ZodError') {
    const formattedErrors = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));

    logger.warn(`Validation Error on ${req.method} ${req.originalUrl}:`, formattedErrors);
    return ApiResponse.error(res, {
      message: 'Request payload validation failed',
      statusCode: 400,
      errorCode: 'VALIDATION_ERROR',
      details: formattedErrors,
    });
  }

  // Handle JSON Syntax Errors (malformed request body)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    logger.warn(`Malformed JSON body on ${req.method} ${req.originalUrl}`);
    return ApiResponse.error(res, {
      message: 'Malformed JSON payload in request body',
      statusCode: 400,
      errorCode: 'INVALID_JSON',
    });
  }

  // Handle Known Operational AppErrors
  if (err instanceof AppError) {
    logger.warn(`Operational Error [${err.errorCode}]: ${err.message} (${req.method} ${req.originalUrl})`);
    return ApiResponse.error(res, {
      message: err.message,
      statusCode: err.statusCode,
      errorCode: err.errorCode,
      details: err.details,
    });
  }

  // Handle PostgreSQL Client Errors
  if (err?.code && typeof err.code === 'string' && err.code.startsWith('23')) {
    // 23xxx are integrity constraint violations
    logger.error(`Database Constraint Violation: ${err.message}`, { code: err.code });
    return ApiResponse.error(res, {
      message: 'A data conflict or constraint violation occurred during processing.',
      statusCode: 409,
      errorCode: 'DB_CONSTRAINT_ERROR',
      details: null,
    });
  }

  // Unhandled / Unexpected Errors (500)
  const incidentId = `INC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  logger.error(`Unhandled Server Error [${incidentId}] on ${req.method} ${req.originalUrl}:`, {
    incidentId,
    message: err.message,
    stack: err.stack,
  });

  // Never expose raw stack traces to citizens or API consumers
  return ApiResponse.error(res, {
    message: 'An internal server error occurred. The incident has been safely logged for audit review.',
    statusCode: 500,
    errorCode: 'INTERNAL_SERVER_ERROR',
    details: { incidentId },
  });
};

export default errorHandler;
