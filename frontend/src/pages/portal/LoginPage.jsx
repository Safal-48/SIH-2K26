import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Building2, 
  ShieldCheck, 
  Lock, 
  User, 
  Mail,
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  KeyRound,
  GraduationCap,
  Landmark,
  Sparkles,
  Eye,
  EyeOff,
  Send,
  UserPlus,
  ChevronLeft
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { 
    login, 
    register, 
    sendOtp, 
    verifyOtp, 
    forgotPassword, 
    resetPassword, 
    loading 
  } = useAuth();

  // Active view: 'credentials' | 'otp' | 'register' | 'forgot' | 'quick_personas'
  const [activeTab, setActiveTab] = useState('credentials');
  
  // Credentials Login State
  const [identifier, setIdentifier] = useState('aarav.sharma@demo-gov.in');
  const [password, setPassword] = useState('demo123');
  const [showPassword, setShowPassword] = useState(false);

  // OTP Login State
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [demoOtpHint, setDemoOtpHint] = useState('');

  // Register State
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regCitizenId, setRegCitizenId] = useState('');

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState(1);
  const [demoTokenHint, setDemoTokenHint] = useState('');

  // Global feedback
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const personas = [
    {
      id: 'citizen',
      name: 'Aarav Sharma',
      email: 'aarav.sharma@demo-gov.in',
      role: 'Citizen / Beneficiary',
      badge: 'CZN-1001',
      icon: User,
      color: 'border-teal-500/20 hover:border-teal-500/40 bg-teal-500/10',
      badgeColor: 'bg-teal-500/20 text-teal-300 border border-teal-500/30',
      target: '/portal'
    },
    {
      id: 'admin',
      name: 'Platform Administrator',
      email: 'admin@platform.demo-gov.in',
      role: 'System Admin / Orchestrator',
      badge: 'ADMIN',
      icon: ShieldCheck,
      color: 'border-purple-500/20 hover:border-purple-500/40 bg-purple-500/10',
      badgeColor: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
      target: '/admin'
    },
    {
      id: 'edu_officer',
      name: 'Dr. Ramesh Kumar',
      email: 'ramesh.kumar@edu.demo-gov.in',
      role: 'Higher Education Reviewer',
      badge: 'EDU_OFFICER',
      icon: GraduationCap,
      color: 'border-blue-500/20 hover:border-blue-500/40 bg-blue-500/10',
      badgeColor: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
      target: '/admin'
    },
    {
      id: 'rev_officer',
      name: 'Smt. Sunita Devi',
      email: 'sunita.devi@rev.demo-gov.in',
      role: 'Revenue & Tehsil Officer',
      badge: 'REV_OFFICER',
      icon: Building2,
      color: 'border-amber-500/20 hover:border-amber-500/40 bg-amber-500/10',
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
      target: '/admin'
    },
    {
      id: 'bank_officer',
      name: 'Vikram Malhotra',
      email: 'vikram.malhotra@pfms.demo-gov.in',
      role: 'PFMS / NPCI DBT Clearing',
      badge: 'BANK_OFFICER',
      icon: Landmark,
      color: 'border-emerald-500/20 hover:border-emerald-500/40 bg-emerald-500/10',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
      target: '/admin'
    }
  ];

  const clearFeedback = () => {
    setError('');
    setSuccessMsg('');
  };

  const handleTabSwitch = (tab) => {
    clearFeedback();
    setActiveTab(tab);
  };

  // 1. Handle Email & Password Login
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    clearFeedback();
    setSubmitting(true);
    try {
      const res = await login(identifier, password);
      if (res?.user?.role === 'ADMIN' || res?.user?.role?.includes('OFFICER')) {
        navigate('/admin');
      } else {
        navigate('/portal');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Handle Send OTP
  const handleSendOtp = async (e) => {
    e?.preventDefault?.();
    if (!otpEmail) {
      setError('Please provide a valid email address');
      return;
    }
    clearFeedback();
    setSubmitting(true);
    try {
      const res = await sendOtp(otpEmail);
      setOtpSent(true);
      setSuccessMsg(res?.message || `6-digit verification code dispatched to ${otpEmail}`);
      if (res?.demoOtp) {
        setDemoOtpHint(res.demoOtp);
      }
    } catch (err) {
      setError(err.message || 'Could not send verification code.');
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Handle Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length < 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    clearFeedback();
    setSubmitting(true);
    try {
      const res = await verifyOtp(otpEmail, otpCode.trim());
      if (res?.user?.role === 'ADMIN' || res?.user?.role?.includes('OFFICER')) {
        navigate('/admin');
      } else {
        navigate('/portal');
      }
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP code.');
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Handle Citizen Register with Email
  const handleRegister = async (e) => {
    e.preventDefault();
    clearFeedback();

    if (!regFullName.trim() || !regEmail.trim() || !regPassword) {
      setError('Please fill in all mandatory fields.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError('Password and Confirm Password do not match.');
      return;
    }

    if (regPassword.length < 6) {
      setError('Password should be at least 6 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      await register({
        fullName: regFullName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        citizenId: regCitizenId.trim() || undefined,
      });
      navigate('/portal');
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // 5. Handle Forgot Password Token Request
  const handleForgotRequest = async (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      setError('Please enter your registered email address.');
      return;
    }
    clearFeedback();
    setSubmitting(true);
    try {
      const res = await forgotPassword(forgotEmail);
      setForgotStep(2);
      setSuccessMsg(res?.message || 'Password reset token generated.');
      if (res?.demoToken) {
        setDemoTokenHint(res.demoToken);
      }
    } catch (err) {
      setError(err.message || 'Account not found with this email.');
    } finally {
      setSubmitting(false);
    }
  };

  // 6. Handle Reset Password Submission
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!resetToken || !newPassword) {
      setError('Please provide reset token and your new password.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    clearFeedback();
    setSubmitting(true);
    try {
      const res = await resetPassword(forgotEmail, resetToken, newPassword);
      setSuccessMsg(res?.message || 'Password reset successfully! Please sign in with your new password.');
      setIdentifier(forgotEmail);
      setPassword(newPassword);
      setActiveTab('credentials');
      setForgotStep(1);
      setDemoTokenHint('');
    } catch (err) {
      setError(err.message || 'Password reset failed. Invalid token.');
    } finally {
      setSubmitting(false);
    }
  };

  // 7. Handle Quick Demo Personas
  const handleQuickPersona = async (persona) => {
    clearFeedback();
    setSubmitting(true);
    try {
      await login(persona.id, 'demo123');
      navigate(persona.target);
    } catch (err) {
      setError(err.message || 'Persona authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[82vh] flex flex-col justify-center items-center px-4 py-8">
      {/* Official Government Portal Login Card */}
      <div className="w-full max-w-lg clean-card overflow-hidden shadow-2xl">
        {/* Luminous Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-teal-500 via-emerald-400 to-indigo-500" />
        
        <div className="p-6 sm:p-8">
          {/* PRAGATI Official Identity & Portal Title */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <img 
                src="/pragati-logo-dark.png" 
                alt="PRAGATI - Seamless Services • Stronger India" 
                className="h-16 sm:h-20 w-auto object-contain hover:scale-105 transition duration-300"
              />
            </div>
            <div className="block">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-teal-300 bg-teal-500/15 py-0.5 px-3 rounded-full inline-block border border-teal-500/30 mb-2 font-mono">
                National Interoperability & Service Grid
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-heading">
              Single Sign-On Authentication
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              Access citizen services, schemes & approvals via Verified Email, Passwordless OTP, or Departmental SSO
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          {activeTab !== 'forgot' && (
            <div className="grid grid-cols-4 gap-1 border border-white/10 rounded-xl p-1 bg-slate-900/80 mb-5 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => handleTabSwitch('credentials')}
                className={`py-2 px-1 rounded-lg transition flex flex-col sm:flex-row items-center justify-center sm:space-x-1 cursor-pointer text-center ${
                  activeTab === 'credentials'
                    ? 'bg-slate-800 text-teal-300 border border-teal-500/40 font-bold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Mail className="w-3.5 h-3.5 mb-0.5 sm:mb-0" />
                <span>Password</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabSwitch('otp')}
                className={`py-2 px-1 rounded-lg transition flex flex-col sm:flex-row items-center justify-center sm:space-x-1 cursor-pointer text-center ${
                  activeTab === 'otp'
                    ? 'bg-slate-800 text-teal-300 border border-teal-500/40 font-bold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5 mb-0.5 sm:mb-0 text-teal-400" />
                <span>Email OTP</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabSwitch('register')}
                className={`py-2 px-1 rounded-lg transition flex flex-col sm:flex-row items-center justify-center sm:space-x-1 cursor-pointer text-center ${
                  activeTab === 'register'
                    ? 'bg-slate-800 text-teal-300 border border-teal-500/40 font-bold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5 mb-0.5 sm:mb-0 text-emerald-400" />
                <span>Register</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabSwitch('quick_personas')}
                className={`py-2 px-1 rounded-lg transition flex flex-col sm:flex-row items-center justify-center sm:space-x-1 cursor-pointer text-center ${
                  activeTab === 'quick_personas'
                    ? 'bg-slate-800 text-amber-300 border border-amber-500/40 font-bold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 mb-0.5 sm:mb-0 text-amber-400" />
                <span>1-Click Demo</span>
              </button>
            </div>
          )}

          {/* Error Notice */}
          {error && (
            <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl flex items-start space-x-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Notice */}
          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-start space-x-2 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. CREDENTIALS TAB */}
          {activeTab === 'credentials' && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Address / Citizen ID / Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. aarav.sharma@demo-gov.in"
                    className="w-full pl-9 pr-3 py-2 text-sm"
                  />
                </div>
                {/* Fast Fill Chips */}
                <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] text-slate-500 font-medium">Quick Fill:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIdentifier('aarav.sharma@demo-gov.in');
                      setPassword('demo123');
                    }}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-teal-300 px-2 py-0.5 rounded-md border border-white/10 transition cursor-pointer"
                  >
                    aarav.sharma@demo-gov.in
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIdentifier('admin@platform.demo-gov.in');
                      setPassword('demo123');
                    }}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-teal-300 px-2 py-0.5 rounded-md border border-white/10 transition cursor-pointer"
                  >
                    admin@platform.demo-gov.in
                  </button>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      clearFeedback();
                      setForgotEmail(identifier.includes('@') ? identifier : '');
                      setActiveTab('forgot');
                    }}
                    className="text-[11px] text-teal-400 hover:text-teal-300 font-medium hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                  Default evaluator password: demo123
                </span>
              </div>

              <button
                type="submit"
                disabled={submitting || loading}
                className="w-full mt-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-teal-500/25 text-sm flex items-center justify-center space-x-2 transition disabled:opacity-50 cursor-pointer"
              >
                <span>{submitting ? 'Verifying Identity...' : 'Sign In with Email'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2 text-center text-xs text-slate-400">
                Prefer passwordless login?{' '}
                <button
                  type="button"
                  onClick={() => handleTabSwitch('otp')}
                  className="text-teal-400 font-semibold hover:underline cursor-pointer"
                >
                  Sign in with Email OTP
                </button>
              </div>
            </form>
          )}

          {/* 2. EMAIL OTP TAB */}
          {activeTab === 'otp' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Your Registered Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={otpEmail}
                    onChange={(e) => setOtpEmail(e.target.value)}
                    placeholder="e.g. aarav.sharma@demo-gov.in"
                    className="w-full pl-9 pr-3 py-2 text-sm"
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setOtpEmail('aarav.sharma@demo-gov.in')}
                    className="text-[10px] text-teal-400 hover:underline cursor-pointer"
                  >
                    Use Aarav Sharma demo email
                  </button>
                  <button
                    type="button"
                    disabled={submitting || !otpEmail}
                    onClick={handleSendOtp}
                    className="text-xs bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 font-semibold px-3 py-1 rounded-lg border border-teal-500/30 transition disabled:opacity-50 flex items-center space-x-1 cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                    <span>{otpSent ? 'Resend Code' : 'Send Code'}</span>
                  </button>
                </div>
              </div>

              {demoOtpHint && (
                <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center justify-between">
                  <div>
                    <span className="font-semibold">Demo OTP generated: </span>
                    <span className="font-mono font-bold bg-amber-500/25 px-1.5 py-0.5 rounded text-amber-200 ml-1">
                      {demoOtpHint}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOtpCode(demoOtpHint)}
                    className="text-[11px] bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded-md hover:bg-amber-300 transition cursor-pointer"
                  >
                    Auto Fill
                  </button>
                </div>
              )}

              {otpSent && (
                <form onSubmit={handleVerifyOtp} className="space-y-4 pt-1">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        6-Digit Verification Code (OTP)
                      </label>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Fallback Master Code: 123456
                      </span>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        className="w-full pl-9 pr-3 py-2.5 text-center text-lg tracking-widest font-mono font-bold"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || loading || otpCode.length < 6}
                    className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-teal-500/25 text-sm flex items-center justify-center space-x-2 transition disabled:opacity-50 cursor-pointer"
                  >
                    <span>{submitting ? 'Verifying Code...' : 'Verify & Sign In'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          )}

          {/* 3. CITIZEN REGISTRATION TAB */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="e.g. Ramesh Chandra"
                    className="w-full pl-9 pr-3 py-1.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="e.g. ramesh.chandra@example.in"
                    className="w-full pl-9 pr-3 py-1.5 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-3 py-1.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Citizen ID <span className="text-slate-500 font-normal">(Optional - auto-generated if empty)</span>
                </label>
                <input
                  type="text"
                  value={regCitizenId}
                  onChange={(e) => setRegCitizenId(e.target.value)}
                  placeholder="e.g. CZN-2045"
                  className="w-full px-3 py-1.5 text-sm font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || loading}
                className="w-full mt-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-emerald-500/25 text-sm flex items-center justify-center space-x-2 transition disabled:opacity-50 cursor-pointer"
              >
                <span>{submitting ? 'Creating Citizen Account...' : 'Create Citizen Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-1 text-center text-xs text-slate-400">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => handleTabSwitch('credentials')}
                  className="text-teal-400 font-semibold hover:underline cursor-pointer"
                >
                  Sign In with Password
                </button>
              </div>
            </form>
          )}

          {/* 4. FORGOT / RESET PASSWORD VIEW */}
          {activeTab === 'forgot' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-white/10">
                <button
                  type="button"
                  onClick={() => handleTabSwitch('credentials')}
                  className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h3 className="text-sm font-bold text-white">
                  Password Recovery via Email
                </h3>
              </div>

              {forgotStep === 1 ? (
                <form onSubmit={handleForgotRequest} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Enter Account Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="aarav.sharma@demo-gov.in"
                        className="w-full pl-9 pr-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || loading}
                    className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-teal-500/25 text-sm flex items-center justify-center space-x-2 transition disabled:opacity-50 cursor-pointer"
                  >
                    <span>{submitting ? 'Generating Reset Token...' : 'Send Password Reset Code'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetSubmit} className="space-y-4">
                  {demoTokenHint && (
                    <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center justify-between">
                      <div>
                        <span className="font-semibold">Reset token: </span>
                        <span className="font-mono font-bold bg-amber-500/25 px-1.5 py-0.5 rounded text-amber-200 ml-1">
                          {demoTokenHint}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setResetToken(demoTokenHint)}
                        className="text-[11px] bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded-md hover:bg-amber-300 transition cursor-pointer"
                      >
                        Auto Fill
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Reset Token / Verification Code
                    </label>
                    <input
                      type="text"
                      required
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      placeholder="e.g. 6-digit code or 123456"
                      className="w-full px-3 py-2 text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new strong password"
                      className="w-full px-3 py-2 text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || loading}
                    className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-teal-500/25 text-sm flex items-center justify-center space-x-2 transition disabled:opacity-50 cursor-pointer"
                  >
                    <span>{submitting ? 'Updating Password...' : 'Save New Password & Sign In'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          )}

          {/* 5. QUICK PERSONAS TAB */}
          {activeTab === 'quick_personas' && (
            <div className="space-y-2.5">
              <p className="text-xs text-slate-400 mb-2">
                Click any persona to log in instantly with their verified role and credentials:
              </p>
              {personas.map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleQuickPersona(p)}
                    disabled={submitting}
                    className={`w-full text-left p-3 border rounded-xl transition flex items-center justify-between group cursor-pointer ${p.color}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 border border-white/10 flex items-center justify-center text-teal-400 shadow-xs group-hover:scale-105 transition shrink-0">
                        <Icon className="w-4 h-4 text-teal-400" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs text-white">{p.name}</span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${p.badgeColor}`}>
                            {p.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">{p.email}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Privacy & Compliance Assurance */}
          <div className="mt-6 pt-4 border-t border-white/10 text-center">
            <div className="flex items-center justify-center space-x-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Protected by Signed JWT & Departmental RBAC Access Policies</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
