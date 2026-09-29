import { Router } from 'express';
import { 
  login, 
  register, 
  sendOtp, 
  verifyOtp, 
  forgotPassword, 
  resetPassword, 
  logout, 
  getMe 
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import { authSchemas } from '../validators/schemas.js';

const router = Router();

/**
 * Public authentication login endpoint with Zod validation
 * Supports Email, Citizen ID, or Username + Password
 */
router.post('/login', validateRequest({ body: authSchemas.login }), login);

/**
 * Public user registration endpoint with Email
 */
router.post('/register', validateRequest({ body: authSchemas.register }), register);

/**
 * Send 6-digit email OTP for passwordless sign-in
 */
router.post('/send-otp', validateRequest({ body: authSchemas.sendOtp }), sendOtp);

/**
 * Verify 6-digit email OTP and authenticate
 */
router.post('/verify-otp', validateRequest({ body: authSchemas.verifyOtp }), verifyOtp);

/**
 * Request password reset token for email
 */
router.post('/forgot-password', validateRequest({ body: authSchemas.forgotPassword }), forgotPassword);

/**
 * Reset password using token
 */
router.post('/reset-password', validateRequest({ body: authSchemas.resetPassword }), resetPassword);

/**
 * Authenticated logout endpoint
 * Records immutable USER_LOGOUT audit event
 */
router.post('/logout', authenticate, logout);

/**
 * Authenticated session inspection endpoint
 */
router.get('/me', authenticate, getMe);

export default router;
