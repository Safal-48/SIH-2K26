import { ApiResponse } from '../utils/apiResponse.js';

/**
 * 404 Route Not Found Middleware
 * Intercepts requests that do not match any registered routes.
 */
export const notFoundHandler = (req, res) => {
  return ApiResponse.error(res, {
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
    statusCode: 404,
    errorCode: 'ROUTE_NOT_FOUND',
  });
};

export default notFoundHandler;
