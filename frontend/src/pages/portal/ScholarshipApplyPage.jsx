import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  GraduationCap, 
  Building2, 
  Landmark, 
  FileText, 
  User, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import citizenService from '../../services/citizenService';

export default function ScholarshipApplyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    citizen_id: user?.citizenId || 'CZN-1001',
    student_id: 'STU-1001',
    institution_code: 'INST-NIT-04',
    income_certificate_no: 'INC-5001',
    account_reference: 'BANK-7001',
    academic_year: '2025-2026',
    declared_income: 180000,
    scheme_name: 'Post-Matric Merit-cum-Means Financial Assistance Scheme',
    benefit_amount: 25000,
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorDetails, setErrorDetails] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setErrorMessage('');
    setErrorDetails(null);
  };

  // Helper to load standard demo applicant data
  const handleLoadDemoData = (preset = 'CZN-1001') => {
    if (preset === 'CZN-1002') {
      setFormData({
        citizen_id: 'CZN-1002',
        student_id: 'STU-1002',
        institution_code: 'INST-SUT-12',
        income_certificate_no: 'INC-5002',
        account_reference: 'BANK-7002',
        academic_year: '2025-2026',
        declared_income: 210000,
        scheme_name: 'Post-Matric Merit-cum-Means Financial Assistance Scheme',
        benefit_amount: 25000,
      });
    } else {
      setFormData({
        citizen_id: 'CZN-1001',
        student_id: 'STU-1001',
        institution_code: 'INST-NIT-04',
        income_certificate_no: 'INC-5001',
        account_reference: 'BANK-7001',
        academic_year: '2025-2026',
        declared_income: 180000,
        scheme_name: 'Post-Matric Merit-cum-Means Financial Assistance Scheme',
        benefit_amount: 25000,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage('');
    setErrorDetails(null);

    try {
      // 1. Submit application to backend API
      const result = await citizenService.submitApplication({
        ...formData,
        declared_income: Number(formData.declared_income),
        benefit_amount: Number(formData.benefit_amount),
      });

      const appId = result.applicationId;
      // 2. Automatically navigate to mandatory Consent Screen for this application
      navigate(`/portal/applications/${appId}/consent`);
    } catch (err) {
      setErrorMessage(err.message || 'Application submission was rejected by the portal verification gateway.');
      setErrorDetails(err.details || null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center space-x-2 text-xs text-slate-400">
        <Link to="/portal" className="hover:text-teal-300 transition">Citizen Home</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
        <span className="text-slate-200 font-semibold">Direct Benefit Scheme Application</span>
      </div>

      {/* Official Form Header */}
      <div className="glass-card p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 w-80 h-32 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center space-x-2.5 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 bg-teal-500/15 px-2.5 py-0.5 rounded-full border border-teal-500/30 font-mono">
              Direct Benefit Transfer
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Form SCH-2026-A
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-heading">
            Post-Matric Merit-cum-Means Financial Assistance
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed max-w-2xl">
            Please enter your five official government departmental references. The system will verify your credentials electronically across institutions without physical documentation.
          </p>
        </div>

        {/* Quick Demo Pre-Fill Button */}
        <div className="shrink-0 flex items-center relative z-10">
          <button
            type="button"
            onClick={() => handleLoadDemoData('CZN-1001')}
            className="flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold text-teal-300 bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/40 rounded-xl transition duration-200 shadow-lg shadow-teal-500/10 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-teal-400" />
            <span>Load Demo (CZN-1001)</span>
          </button>
        </div>
      </div>

      {/* Error / Alert Box */}
      {errorMessage && (
        <div className="p-5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start space-x-3 text-xs text-rose-300 backdrop-blur-md shadow-lg">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-rose-200">Submission Blocked by Validation Gateway</h4>
            <p>{errorMessage}</p>
            {errorDetails?.existingApplicationId && (
              <p className="mt-1 text-slate-300">
                Existing application on record:{' '}
                <Link
                  to={`/portal/applications/${errorDetails.existingApplicationId}`}
                  className="font-mono font-bold text-teal-400 underline hover:text-teal-300"
                >
                  {errorDetails.existingApplicationId}
                </Link>
              </p>
            )}
            {errorDetails?.missingFields && (
              <p className="mt-1 text-rose-300 font-mono">
                Missing required fields: {errorDetails.missingFields.join(', ')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main Intake Form */}
      <form onSubmit={handleSubmit} className="glass-card overflow-hidden">
        <div className="p-6 sm:p-9 space-y-8">
          
          {/* Section 1: The 5 Required Identifiers */}
          <div className="space-y-5">
            <div className="pb-3 border-b border-white/10 flex items-center space-x-3">
              <span className="w-7 h-7 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs flex items-center justify-center font-bold font-mono shrink-0">
                1
              </span>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-heading">
                  Authoritative Departmental Identifiers
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  These five authoritative reference numbers enable zero-touch cross-department verification.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* 1. Citizen ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                  1. Master Civil Citizen ID <span className="text-rose-400">*</span>
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-400 transition">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    name="citizen_id"
                    required
                    value={formData.citizen_id}
                    onChange={handleChange}
                    placeholder="e.g. CZN-1001"
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-950/60 border border-slate-700/80 hover:border-slate-600 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 rounded-xl font-mono text-white placeholder-slate-500 transition shadow-inner"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-mono">Format: CZN-XXXX (Master Civil Registry identifier)</p>
              </div>

              {/* 2. Student ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                  2. Student Enrollment Reference <span className="text-rose-400">*</span>
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-400 transition">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    name="student_id"
                    required
                    value={formData.student_id}
                    onChange={handleChange}
                    placeholder="e.g. STU-1001"
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-950/60 border border-slate-700/80 hover:border-slate-600 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 rounded-xl font-mono text-white placeholder-slate-500 transition shadow-inner"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-mono">Format: STU-XXXX (Higher Education enrollment number)</p>
              </div>

              {/* 3. Institution Code */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                  3. Educational Institution Code <span className="text-rose-400">*</span>
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-400 transition">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    name="institution_code"
                    required
                    value={formData.institution_code}
                    onChange={handleChange}
                    placeholder="e.g. INST-NIT-04 or COL-001"
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-950/60 border border-slate-700/80 hover:border-slate-600 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 rounded-xl font-mono text-white placeholder-slate-500 transition shadow-inner"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-mono">Format: INST-XXXX or COL-XXX (AISHE accredited institute)</p>
              </div>

              {/* 4. Income Certificate Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                  4. Revenue Income Certificate No. <span className="text-rose-400">*</span>
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-400 transition">
                    <FileText className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    name="income_certificate_no"
                    required
                    value={formData.income_certificate_no}
                    onChange={handleChange}
                    placeholder="e.g. INC-5001"
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-950/60 border border-slate-700/80 hover:border-slate-600 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 rounded-xl font-mono text-white placeholder-slate-500 transition shadow-inner"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-mono">Format: INC-XXXX (Issued by Sub-Divisional Magistrate / Tehsildar)</p>
              </div>

              {/* 5. Bank Reference / Account Reference */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                  5. Bank Account / DBT Mandate Reference <span className="text-rose-400">*</span>
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-400 transition">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    name="account_reference"
                    required
                    value={formData.account_reference}
                    onChange={handleChange}
                    placeholder="e.g. BANK-7001"
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-950/60 border border-slate-700/80 hover:border-slate-600 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 rounded-xl font-mono text-white placeholder-slate-500 transition shadow-inner"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-mono">Format: BANK-XXXX (Direct Benefit Transfer Aadhaar-seeded account token)</p>
              </div>
            </div>
          </div>

          {/* Section 2: Scheme & Academic Details */}
          <div className="space-y-5">
            <div className="pb-3 border-b border-white/10 flex items-center space-x-3">
              <span className="w-7 h-7 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs flex items-center justify-center font-bold font-mono shrink-0">
                2
              </span>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-heading">
                  Academic & Financial Details
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Confirm the targeted academic year and declared household income for tier validation.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">Academic Year</label>
                <input
                  type="text"
                  name="academic_year"
                  required
                  value={formData.academic_year}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 text-sm bg-slate-950/60 border border-slate-700/80 hover:border-slate-600 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 rounded-xl font-mono text-white transition shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">Declared Annual Income (₹)</label>
                <input
                  type="number"
                  name="declared_income"
                  required
                  value={formData.declared_income}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 text-sm bg-slate-950/60 border border-slate-700/80 hover:border-slate-600 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 rounded-xl font-mono text-white transition shadow-inner"
                />
                <p className="text-[11px] text-slate-400 mt-1 font-mono">Threshold: ≤ ₹2,50,000</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">Assistance Benefit Amount</label>
                <div className="px-4 py-2.5 text-sm bg-slate-900/80 border border-slate-800 rounded-xl text-teal-300 font-semibold font-mono">
                  ₹25,000.00 / Academic Year
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Disbursed directly via DBT</p>
              </div>
            </div>
          </div>

          {/* Privacy & Submission Notice */}
          <div className="p-4 sm:p-5 bg-teal-500/10 border border-teal-500/25 rounded-2xl text-xs text-teal-300 space-y-1.5 backdrop-blur-md">
            <div className="flex items-center space-x-2 font-bold text-teal-200">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>Next Step: Official Digital Consent Authorization</span>
            </div>
            <p className="text-teal-200/80 text-xs leading-relaxed">
              Upon clicking "Save & Proceed to Consent", a unique application reference (e.g. <code className="bg-teal-900/50 px-1 py-0.5 rounded font-mono text-teal-200">SCH-2026-XXX</code>) will be created. You will then review the data-sharing purpose and grant digital consent before any inter-departmental verification commences.
            </p>
          </div>
        </div>

        {/* Submit Actions Footer */}
        <div className="bg-slate-950/70 px-6 sm:px-9 py-5 border-t border-white/10 flex items-center justify-between">
          <Link
            to="/portal"
            className="text-xs font-semibold text-slate-400 hover:text-white transition flex items-center space-x-1"
          >
            <span>&larr; Cancel & Return</span>
          </Link>

          <button
            type="submit"
            disabled={submitting}
            className="bg-gradient-to-r from-teal-500 via-teal-600 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-bold px-7 py-3 rounded-xl text-xs sm:text-sm shadow-xl shadow-teal-500/25 transition duration-200 transform hover:-translate-y-0.5 flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            <span>{submitting ? 'Registering Application...' : 'Save & Proceed to Consent'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
