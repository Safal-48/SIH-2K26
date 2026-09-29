import ConsentModel from '../models/consent.model.js';
import AuditLogModel from '../models/auditLog.model.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';

export const grantConsent = async (req, res, next) => {
  try {
    const applicationId = req.params.id;
    if (!applicationId) {
      return ApiResponse.error(res, {
        message: 'Application ID is required in URL parameters',
        statusCode: 400,
        errorCode: 'APPLICATION_ID_REQUIRED',
      });
    }

    // Lookup application to get citizen_id
    const appResult = await query(
      `SELECT application_id, citizen_id FROM applications WHERE application_id = $1 LIMIT 1`,
      [applicationId]
    );

    if (appResult.rows.length === 0) {
      return ApiResponse.error(res, {
        message: `Application '${applicationId}' not found`,
        statusCode: 404,
        errorCode: 'APPLICATION_NOT_FOUND',
      });
    }

    const application = appResult.rows[0];
    const citizenId = application.citizen_id;

    // Body parameters with required defaults
    const purpose = req.body.purpose || 'Scholarship eligibility verification';
    const scope = req.body.scope || [
      'Education verification',
      'Income verification',
      'Bank verification status',
    ];
    const allowedDepartments = req.body.allowedDepartments || ['EDU', 'REV', 'DBT'];

    const consent = await ConsentModel.grantConsent({
      applicationId,
      citizenId,
      purpose,
      allowedDepartments,
      dataScopes: scope,
      ipAddress: req.ip || '127.0.0.1',
    });

    // Record Immutable Audit Log
    await AuditLogModel.log({
      requestId: `REQ-CNS-${Date.now().toString().slice(-6)}`,
      actorType: req.user?.role || 'CITIZEN',
      actorId: req.user?.username || citizenId,
      departmentCode: 'INTEROP',
      action: 'CONSENT_GRANTED',
      entityType: 'APPLICATION',
      entityId: applicationId,
      status: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
      metadata: {
        consentId: consent.consent_id,
        purpose: consent.purpose,
        scope: consent.data_scopes,
        granted_at: consent.granted_at || consent.valid_from,
      },
    });

    return ApiResponse.success(res, {
      message: 'Citizen consent granted successfully for cross-departmental verification',
      data: {
        consentId: consent.consent_id,
        applicationId: consent.application_id,
        citizenId: consent.citizen_id,
        purpose: consent.purpose,
        scope: consent.data_scopes,
        status: consent.status,
        granted_at: consent.granted_at || consent.valid_from,
        revoked_at: consent.revoked_at || null,
        valid_until: consent.valid_until,
      },
    });
  } catch (error) {
    logger.error('Error granting citizen consent:', error);
    next(error);
  }
};

export const revokeConsent = async (req, res, next) => {
  try {
    const applicationId = req.params.id;
    if (!applicationId) {
      return ApiResponse.error(res, {
        message: 'Application ID is required in URL parameters',
        statusCode: 400,
        errorCode: 'APPLICATION_ID_REQUIRED',
      });
    }

    const consent = await ConsentModel.revokeConsent(applicationId);
    if (!consent) {
      return ApiResponse.error(res, {
        message: `No active consent record found for application '${applicationId}' to revoke`,
        statusCode: 404,
        errorCode: 'CONSENT_NOT_FOUND',
      });
    }

    // Record Immutable Audit Log
    await AuditLogModel.log({
      requestId: `REQ-CNS-REV-${Date.now().toString().slice(-6)}`,
      actorType: req.user?.role || 'CITIZEN',
      actorId: req.user?.username || consent.citizen_id,
      departmentCode: 'INTEROP',
      action: 'CONSENT_REVOKED',
      entityType: 'APPLICATION',
      entityId: applicationId,
      status: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
      metadata: {
        consentId: consent.consent_id,
        revoked_at: consent.revoked_at,
      },
    });

    return ApiResponse.success(res, {
      message: 'Citizen consent revoked successfully. Cross-department verification is now blocked.',
      data: {
        consentId: consent.consent_id,
        applicationId: consent.application_id,
        citizenId: consent.citizen_id,
        purpose: consent.purpose,
        scope: consent.data_scopes,
        status: consent.status,
        granted_at: consent.granted_at || consent.valid_from,
        revoked_at: consent.revoked_at,
      },
    });
  } catch (error) {
    logger.error('Error revoking citizen consent:', error);
    next(error);
  }
};

export const getConsent = async (req, res, next) => {
  try {
    const applicationId = req.params.id;
    const consent = await ConsentModel.getByApplicationId(applicationId);

    if (!consent) {
      return ApiResponse.error(res, {
        message: `No consent found for application '${applicationId}'`,
        statusCode: 404,
        errorCode: 'CONSENT_NOT_FOUND',
      });
    }

    return ApiResponse.success(res, {
      message: 'Citizen consent record retrieved',
      data: {
        consentId: consent.consent_id,
        applicationId: consent.application_id,
        citizenId: consent.citizen_id,
        purpose: consent.purpose,
        scope: consent.data_scopes,
        status: consent.status,
        granted_at: consent.granted_at || consent.valid_from,
        revoked_at: consent.revoked_at || null,
        valid_until: consent.valid_until,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  grantConsent,
  revokeConsent,
  getConsent,
};
