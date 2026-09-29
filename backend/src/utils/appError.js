/**
 * Standard Operational Application Error
 * Extends Error to include HTTP status codes and operational classification.
 */
export class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code (default: 500)
   * @param {string} [errorCode='INTERNAL_ERROR'] - Application-specific error code
   * @param {any} [details=null] - Additional validation or contextual error details
   */
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, errorCode = 'BAD_REQUEST', details = null) {
    return new AppError(message, 400, errorCode, details);
  }

  static notFound(message, errorCode = 'NOT_FOUND', details = null) {
    return new AppError(message, 404, errorCode, details);
  }

  static unauthorized(message = 'Authentication required', errorCode = 'UNAUTHORIZED', details = null) {
    return new AppError(message, 401, errorCode, details);
  }

  static forbidden(message = 'Access forbidden', errorCode = 'FORBIDDEN', details = null) {
    return new AppError(message, 403, errorCode, details);
  }
}

export default AppError;
