import { 
  authenticateUser, 
  registerUser, 
  sendOtp as sendOtpService, 
  verifyOtp as verifyOtpService,
  forgotPassword as forgotPasswordService,
  resetPassword as resetPasswordService
} from '../services/auth.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import AuditLogModel from '../models/auditLog.model.js';
import logger from '../utils/logger.js';

export const login = async (req, res, next) => {
  const { identifier, username, email, password } = req.body;
  const loginId = email || identifier || username;

  try {
    if (!loginId || !password) {
      return ApiResponse.error(res, {
        message: 'Email, Username or Citizen ID and password are required',
        statusCode: 400,
        errorCode: 'VALIDATION_ERROR',
      });
    }

    const session = await authenticateUser({ identifier: loginId, email, password });

    // Record Audit Log for successful login
    await AuditLogModel.log({
      requestId: `REQ-AUTH-${Date.now().toString().slice(-6)}`,
      actorType: session.user.role,
      actorId: session.user.email || session.user.username,
      departmentCode: session.user.departmentCode || 'INTEROP',
      action: 'USER_LOGIN',
      entityType: 'USER_SESSION',
      entityId: session.user.id,
      status: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
      metadata: { role: session.user.role, citizenId: session.user.citizenId, email: session.user.email },
    });

    return ApiResponse.success(res, {
      message: 'Authentication successful',
      data: session,
    });
  } catch (error) {
    logger.warn(`Login failed for [${loginId}]: ${error.message}`);

    // Audit log failed login attempt
    try {
      await AuditLogModel.log({
        requestId: `REQ-AUTH-FAIL-${Date.now().toString().slice(-6)}`,
        actorType: 'ANONYMOUS',
        actorId: loginId || 'UNKNOWN',
        departmentCode: 'INTEROP',
        action: 'USER_LOGIN_FAILED',
        entityType: 'USER_SESSION',
        entityId: null,
        status: 'FAILED',
        ipAddress: req.ip || '127.0.0.1',
        metadata: { attemptedIdentifier: loginId, reason: error.message },
      });
    } catch (auditErr) {
      logger.warn(`Could not persist login failure audit log: ${auditErr.message}`);
    }

    return ApiResponse.error(res, {
      message: error.message,
      statusCode: 401,
      errorCode: 'AUTHENTICATION_FAILED',
    });
  }
};

export const register = async (req, res, next) => {
  const { email, password, fullName, citizenId } = req.body;

  try {
    const session = await registerUser({ email, password, fullName, citizenId });

    // Audit log registration
    await AuditLogModel.log({
      requestId: `REQ-REG-${Date.now().toString().slice(-6)}`,
      actorType: session.user.role,
      actorId: session.user.email,
      departmentCode: 'CITIZEN',
      action: 'USER_REGISTER',
      entityType: 'USER_ACCOUNT',
      entityId: session.user.id,
      status: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
      metadata: { citizenId: session.user.citizenId, email: session.user.email },
    });

    return ApiResponse.success(res, {
      message: 'Registration successful',
      statusCode: 201,
      data: session,
    });
  } catch (error) {
    logger.warn(`Registration failed for [${email}]: ${error.message}`);
    return ApiResponse.error(res, {
      message: error.message,
      statusCode: 400,
      errorCode: 'REGISTRATION_FAILED',
    });
  }
};

export const sendOtp = async (req, res, next) => {
  const { email } = req.body;

  try {
    const result = await sendOtpService(email);

    // Audit log OTP request
    await AuditLogModel.log({
      requestId: `REQ-OTP-${Date.now().toString().slice(-6)}`,
      actorType: 'ANONYMOUS',
      actorId: email,
      departmentCode: 'CITIZEN',
      action: 'DISPATCH_EMAIL_OTP',
      entityType: 'AUTH_VERIFICATION',
      entityId: null,
      status: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
      metadata: { email },
    });

    return ApiResponse.success(res, {
      message: result.message,
      data: result,
    });
  } catch (error) {
    logger.warn(`OTP dispatch failed for [${email}]: ${error.message}`);
    return ApiResponse.error(res, {
      message: error.message,
      statusCode: 400,
      errorCode: 'OTP_DISPATCH_FAILED',
    });
  }
};

export const verifyOtp = async (req, res, next) => {
  const { email, otp } = req.body;

  try {
    const session = await verifyOtpService(email, otp);

    // Audit log OTP verification
    await AuditLogModel.log({
      requestId: `REQ-OTP-VERIFY-${Date.now().toString().slice(-6)}`,
      actorType: session.user.role,
      actorId: session.user.email,
      departmentCode: session.user.departmentCode || 'CITIZEN',
      action: 'USER_LOGIN_OTP',
      entityType: 'USER_SESSION',
      entityId: session.user.id,
      status: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
      metadata: { method: 'EMAIL_OTP', citizenId: session.user.citizenId },
    });

    return ApiResponse.success(res, {
      message: 'Email verification successful. Session created.',
      data: session,
    });
  } catch (error) {
    logger.warn(`OTP verification failed for [${email}]: ${error.message}`);
    return ApiResponse.error(res, {
      message: error.message,
      statusCode: 401,
      errorCode: 'INVALID_OTP',
    });
  }
};

export const forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  try {
    const result = await forgotPasswordService(email);
    return ApiResponse.success(res, {
      message: result.message,
      data: result,
    });
  } catch (error) {
    return ApiResponse.error(res, {
      message: error.message,
      statusCode: 400,
      errorCode: 'FORGOT_PASSWORD_FAILED',
    });
  }
};

export const resetPassword = async (req, res, next) => {
  const { email, token, newPassword } = req.body;

  try {
    const result = await resetPasswordService(email, token, newPassword);

    await AuditLogModel.log({
      requestId: `REQ-PW-RESET-${Date.now().toString().slice(-6)}`,
      actorType: 'CITIZEN',
      actorId: email,
      departmentCode: 'INTEROP',
      action: 'PASSWORD_RESET',
      entityType: 'USER_ACCOUNT',
      entityId: null,
      status: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
      metadata: { email },
    });

    return ApiResponse.success(res, {
      message: result.message,
      data: result,
    });
  } catch (error) {
    return ApiResponse.error(res, {
      message: error.message,
      statusCode: 400,
      errorCode: 'RESET_PASSWORD_FAILED',
    });
  }
};

export const logout = async (req, res, next) => {
  try {
    if (req.user) {
      // Audit log user logout
      await AuditLogModel.log({
        requestId: `REQ-LOGOUT-${Date.now().toString().slice(-6)}`,
        actorType: req.user.role || 'CITIZEN',
        actorId: req.user.email || req.user.username || 'ANONYMOUS',
        departmentCode: req.user.departmentCode || 'INTEROP',
        action: 'USER_LOGOUT',
        entityType: 'USER_SESSION',
        entityId: req.user.userId || null,
        status: 'SUCCESS',
        ipAddress: req.ip || '127.0.0.1',
        metadata: { role: req.user.role },
      });
    }

    return ApiResponse.success(res, {
      message: 'Logged out successfully',
      data: { loggedOut: true },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    if (!req.user) {
      return ApiResponse.error(res, {
        message: 'Not authenticated',
        statusCode: 401,
        errorCode: 'UNAUTHORIZED',
      });
    }

    return ApiResponse.success(res, {
      message: 'Current authenticated session context',
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  login,
  register,
  sendOtp,
  verifyOtp,
  forgotPassword,
  resetPassword,
  logout,
  getMe,
};
