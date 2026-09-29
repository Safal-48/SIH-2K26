import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ROLES } from '../services/auth.service.js';
import { query } from '../config/database.js';

/**
 * JWT Authentication Middleware
 * Verifies Bearer tokens in Authorization headers.
 */
export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return ApiResponse.error(res, {
      message: 'Authorization token missing or malformed',
      statusCode: 401,
      errorCode: 'UNAUTHORIZED',
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (error) {
    return ApiResponse.error(res, {
      message: 'Invalid or expired token',
      statusCode: 401,
      errorCode: 'INVALID_TOKEN',
      details: error.message,
    });
  }
};

/**
 * Role-Based Access Control (RBAC) Middleware
 * @param  {...string} allowedRoles - List of permitted roles
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return ApiResponse.error(res, {
        message: `Access forbidden: Role '${req.user?.role || 'ANONYMOUS'}' does not have sufficient permissions for this resource`,
        statusCode: 403,
        errorCode: 'FORBIDDEN',
        details: {
          requiredRoles: allowedRoles,
          userRole: req.user?.role || null,
        },
      });
    }
    next();
  };
};

/**
 * Authorize Citizen Ownership
 * Ensures a citizen can only inspect, submit, or manage their OWN applications and records.
 * ADMIN and SYSTEM roles bypass this restriction.
 * @param {string} paramKey - URL parameter containing application_id or citizen_id
 */
export const authorizeCitizenOwnership = (paramKey = 'id') => {
  return async (req, res, next) => {
    if (!req.user) {
      return ApiResponse.error(res, {
        message: 'Authentication required',
        statusCode: 401,
        errorCode: 'UNAUTHORIZED',
      });
    }

    // Admins and System services have global operational clearance
    if ([ROLES.ADMIN, ROLES.SYSTEM].includes(req.user.role)) {
      return next();
    }

    if (req.user.role !== ROLES.CITIZEN) {
      return ApiResponse.error(res, {
        message: 'Access forbidden: Insufficient permissions for citizen resource',
        statusCode: 403,
        errorCode: 'FORBIDDEN',
      });
    }

    const resourceId = req.params[paramKey] || req.body[paramKey] || req.query[paramKey] || req.body.applicationId;
    if (!resourceId) {
      return next();
    }

    // Check if resourceId matches citizen_id directly
    if (resourceId === req.user.citizenId) {
      return next();
    }

    // Check if resourceId is an application_id belonging to this citizen
    try {
      const appResult = await query(
        `SELECT citizen_id FROM applications WHERE application_id = $1 LIMIT 1`,
        [resourceId]
      );

      if (appResult.rows.length === 0) {
        return ApiResponse.error(res, {
          message: `Application '${resourceId}' not found`,
          statusCode: 404,
          errorCode: 'APPLICATION_NOT_FOUND',
        });
      }

      if (appResult.rows[0].citizen_id !== req.user.citizenId) {
        return ApiResponse.error(res, {
          message: 'Access forbidden: You cannot access or manage another citizen\'s application or records',
          statusCode: 403,
          errorCode: 'FORBIDDEN_OWNERSHIP',
          details: {
            applicationId: resourceId,
            requesterCitizenId: req.user.citizenId,
          },
        });
      }

      next();
    } catch (err) {
      return ApiResponse.error(res, {
        message: 'Failed to verify resource ownership',
        statusCode: 500,
        errorCode: 'INTERNAL_ERROR',
        details: err.message,
      });
    }
  };
};

/**
 * Citizen Consent Verification Middleware
 * Validates that an active, non-revoked consent artifact exists for cross-departmental data lookup
 */
export const verifyCitizenConsent = async (req, res, next) => {
  const applicationId = req.params.id || req.body.applicationId || req.headers['x-application-id'];
  if (!applicationId) {
    return ApiResponse.error(res, {
      message: 'Application ID is required to verify citizen consent',
      statusCode: 400,
      errorCode: 'APPLICATION_ID_REQUIRED',
    });
  }

  const { ConsentModel } = await import('../models/consent.model.js');
  const activeConsent = await ConsentModel.getActiveConsent(applicationId);

  if (!activeConsent) {
    return ApiResponse.error(res, {
      message: 'Cross-department verification blocked: Active citizen consent required',
      statusCode: 403,
      errorCode: 'CONSENT_REQUIRED',
      details: { applicationId },
    });
  }

  req.consent = activeConsent;
  next();
};

export default {
  authenticate,
  authorizeRoles,
  authorizeCitizenOwnership,
  verifyCitizenConsent,
};
