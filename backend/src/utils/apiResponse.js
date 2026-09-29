/**
 * Standardized API Response Utilities
 * Ensures consistent response shapes across all endpoints in the platform.
 */
export const ApiResponse = {
  /**
   * Send a successful JSON response
   * @param {import('express').Response} res - Express response object
   * @param {Object} options
   * @param {any} [options.data=null] - Payload to return
   * @param {string} [options.message='Success'] - User-friendly success message
   * @param {number} [options.statusCode=200] - HTTP status code
   * @param {Object} [options.meta=null] - Optional pagination or metadata
   */
  success: (res, { data = null, message = 'Success', statusCode = 200, meta = null } = {}) => {
    const payload = {
      success: true,
      statusCode,
      message,
      data,
      timestamp: new Date().toISOString(),
    };

    if (meta) {
      payload.meta = meta;
    }

    return res.status(statusCode).json(payload);
  },

  /**
   * Send a 201 Created JSON response
   */
  created: (res, { data = null, message = 'Resource created successfully', meta = null } = {}) => {
    return ApiResponse.success(res, { data, message, statusCode: 201, meta });
  },

  /**
   * Send an error JSON response
   * @param {import('express').Response} res - Express response object
   * @param {Object} options
   * @param {string} options.message - Error message
   * @param {number} [options.statusCode=500] - HTTP status code
   * @param {string} [options.errorCode='INTERNAL_ERROR'] - Machine-readable error code
   * @param {any} [options.details=null] - Validation errors or extra context
   */
  error: (res, { message = 'Internal Server Error', statusCode = 500, errorCode = 'INTERNAL_ERROR', details = null } = {}) => {
    return res.status(statusCode).json({
      success: false,
      statusCode,
      error: {
        code: errorCode,
        message,
        details,
      },
      timestamp: new Date().toISOString(),
    });
  },
};

export default ApiResponse;
