import assert from 'assert';
import { 
  authenticateUser, 
  registerUser, 
  sendOtp, 
  verifyOtp, 
  forgotPassword, 
  resetPassword 
} from '../services/auth.service.js';
import logger from '../utils/logger.js';

async function runEmailAuthVerification() {
  logger.info('===========================================================');
  logger.info('Running Direct Email Auth Services Verification');
  logger.info('===========================================================');

  // Test 1: Direct Email & Password Login for existing user
  logger.info('\n1. Testing Email & Password Authentication for existing user...');
  const session1 = await authenticateUser({
    email: 'aarav.sharma@demo-gov.in',
    password: 'demo123'
  });
  assert(session1.token, 'Must return signed JWT token');
  assert.strictEqual(session1.user.email, 'aarav.sharma@demo-gov.in', 'User email must match');
  logger.info(`[PASS] Logged in as: ${session1.user.fullName} (${session1.user.email})`);

  // Test 2: Register a new citizen with email
  const testEmail = `rahul.test.${Date.now()}@test-citizen.in`;
  logger.info(`\n2. Testing Citizen Registration for new email: ${testEmail}...`);
  const session2 = await registerUser({
    email: testEmail,
    password: 'MyPassword@123',
    fullName: 'Rahul Test Citizen',
    citizenId: `CZN-${Math.floor(2000 + Math.random() * 5000)}`
  });
  assert(session2.token, 'Must return JWT token after registration');
  assert.strictEqual(session2.user.email, testEmail);
  logger.info(`[PASS] Registered citizen: ${session2.user.fullName} [${session2.user.citizenId}]`);

  // Test 3: Send Email OTP
  logger.info(`\n3. Testing Send OTP to email: ${testEmail}...`);
  const otpRes = await sendOtp(testEmail);
  assert(otpRes.success, 'OTP dispatch response must be true');
  assert(otpRes.demoOtp, 'Must return generated demoOtp for verification');
  logger.info(`[PASS] OTP dispatched: ${otpRes.demoOtp}`);

  // Test 4: Verify OTP code
  logger.info('\n4. Testing OTP verification and session creation...');
  const session3 = await verifyOtp(testEmail, otpRes.demoOtp);
  assert(session3.token, 'Must return JWT session after OTP verification');
  assert.strictEqual(session3.user.email, testEmail);
  logger.info(`[PASS] OTP verified for: ${session3.user.email}`);

  // Test 5: Forgot Password Token Request
  logger.info('\n5. Testing Forgot Password token dispatch...');
  const forgotRes = await forgotPassword(testEmail);
  assert(forgotRes.success, 'Forgot password response must be true');
  assert(forgotRes.demoToken, 'Must generate reset token');
  logger.info(`[PASS] Reset token generated: ${forgotRes.demoToken}`);

  // Test 6: Reset Password
  const newPass = 'UpdatedPassword@456';
  logger.info('\n6. Testing Reset Password with token...');
  const resetRes = await resetPassword(testEmail, forgotRes.demoToken, newPass);
  assert(resetRes.success, 'Password reset must succeed');
  logger.info('[PASS] Password successfully reset');

  // Test 7: Verify Login with New Password
  logger.info('\n7. Verifying login with updated password...');
  const session4 = await authenticateUser({
    email: testEmail,
    password: newPass
  });
  assert(session4.token, 'Must login successfully with new password');
  logger.info(`[PASS] Re-authenticated with updated password! User: ${session4.user.fullName}`);

  logger.info('\n===========================================================');
  logger.info('ALL 7 EMAIL AUTH VERIFICATION TESTS PASSED SUCCESSFULLY! ✅');
  logger.info('===========================================================');
}

runEmailAuthVerification().catch((err) => {
  logger.error(`Email Auth Verification Failed: ${err.message}`);
  console.error(err);
  process.exit(1);
});
