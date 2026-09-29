import { ApiResponse } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

/**
 * Express Request Validation Middleware using Zod
 * Validates request body, query parameters, and URL path parameters.
 * Produces deterministic, safe 400 responses with field-level details
 * without leaking raw system stack traces.
 *
 * @param {Object} schemas - Validation schemas { body, query, params }
 */
export const validateRequest = (schemas = {}) => {
  return (req, res, next) => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      return next();
    } catch (err) {
      if (err?.name === 'ZodError') {
        const details = err.errors.map((e) => ({
          field: e.path.join('.') || 'root',
          message: e.message,
          rule: e.code,
        }));

        logger.warn(`Zod Validation Failure on ${req.method} ${req.originalUrl}:`, details);

        return ApiResponse.error(res, {
          message: `Request validation failed: ${details.map((d) => d.message).join('; ')}`,
          statusCode: 400,
          errorCode: 'VALIDATION_ERROR',
          details,
        });
      }
      return next(err);
    }
  };
};

export default validateRequest;
