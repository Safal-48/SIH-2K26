import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Building2, 
  GraduationCap, 
  FileText, 
  Landmark, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Clock,
  ArrowRight,
  ChevronRight,
  Info,
  Lock,
  Sparkles
} from 'lucide-react';
import citizenService from '../../services/citizenService';

export default function ConsentScreenPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [granting, setGranting] = useState(false);
  const [error, setError] = useState('');
  const [alreadyGranted, setAlreadyGranted] = useState(false);

  useEffect(() => {
    async function fetchApp() {
      setLoading(true);
      setError('');
      try {
        const data = await citizenService.getApplicationById(id);
        setApplication(data.application);
        if (data.consent && data.consent.status === 'GRANTED') {
          setAlreadyGranted(true);
        }
      } catch (err) {
        setError(err.message || 'Unable to retrieve application details for consent verification');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchApp();
    }
  }, [id]);

  const handleGrantConsent = async () => {
    setGranting(true);
    setError('');

    try {
      // 1. Post digital consent grant to backend API
      await citizenService.grantConsent(id, {
        purpose: 'Scholarship Eligibility Verification',
        scope: [
          'Higher education enrollment verification',
          'Income certificate and annual threshold verification',
          'Direct Benefit Transfer (DBT) bank account validation'
        ],
      });

      // 2. Trigger automated workflow execution now that consent requirement is satisfied
      await citizenService.runWorkflow(id).catch((runErr) => {
        // Even if async workflow queues or takes a moment, proceed to application details
        console.warn('Workflow execution triggered:', runErr);
      });

      // 3. Navigate to application details
      navigate(`/portal/applications/${id}`);
    } catch (err) {
      setError(err.message || 'Consent could not be registered. Please try again.');
      setGranting(false);
    }
  };

  const handleCancel = () => {
    navigate(`/portal/applications/${id}`);
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-12 text-center glass-card">
        <Clock className="w-8 h-8 text-teal-400 animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-200">Loading Consent Mandate...</p>
        <p className="text-xs text-slate-400 mt-1 font-mono">{id}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-xs text-slate-400">
        <Link to="/portal" className="hover:text-teal-300 transition">Citizen Home</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
        <Link to={`/portal/applications/${id}`} className="hover:text-teal-300 font-mono transition">
          {id}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
        <span className="text-slate-200 font-semibold">Consent Authorization</span>
      </div>

      {/* Main Consent Authorization Card */}
      <div className="glass-card overflow-hidden shadow-2xl">
        {/* Header Block */}
        <div className="p-6 sm:p-8 border-b border-white/10 relative overflow-hidden bg-slate-950/40">
          <div className="absolute top-0 right-0 w-72 h-28 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center shadow-lg shadow-teal-500/10">
                <ShieldCheck className="w-5 h-5 text-teal-300" />
              </div>
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase text-teal-300 bg-teal-500/15 px-2.5 py-0.5 rounded-full border border-teal-500/30 font-mono inline-block mb-1">
                  DPDP Act Compliant Mandate
                </span>
                <span className="text-xs text-slate-400 block font-mono">
                  Application Reference: <span className="text-white font-bold">{id}</span>
                </span>
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-heading">
              Scholarship Eligibility Verification Consent
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
              In accordance with digital data protection principles, your explicit digital consent is required before government departments can verify your eligibility records electronically.
            </p>
          </div>
        </div>

        {/* Notice if already granted */}
        {alreadyGranted && (
          <div className="p-4 bg-emerald-500/10 border-b border-emerald-500/30 flex items-center space-x-3 text-xs text-emerald-300 backdrop-blur-md">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold text-emerald-200">Active Digital Consent on File:</span> Digital consent for this application has already been granted and is currently active.
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-4 bg-rose-500/10 border-b border-rose-500/30 flex items-center space-x-3 text-xs text-rose-300 backdrop-blur-md">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-6 sm:p-8 space-y-6">
          {/* 1. Purpose */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
              <span className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center font-bold text-xs font-mono">
                1
              </span>
              <span className="text-slate-200 font-heading">Purpose of Verification</span>
            </h3>
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs leading-relaxed text-slate-300 shadow-inner">
              <p className="font-semibold text-white mb-1">
                Automated Verification for Merit-cum-Means Financial Assistance
              </p>
              <p className="text-slate-400 leading-relaxed">
                To evaluate eligibility for the financial benefit sanction (₹25,000 per annum) under the Post-Matric Scholarship Scheme for Academic Year {application?.academic_year || '2025-2026'}. This replaces physical paperwork with automated inter-departmental verification.
              </p>
            </div>
          </div>

          {/* 2. Requested Information */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
              <span className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center font-bold text-xs font-mono">
                2
              </span>
              <span className="text-slate-200 font-heading">Requested Information & Scope</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div className="p-4 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl space-y-1.5 transition">
                <div className="flex items-center space-x-2 text-teal-400 font-semibold text-xs">
                  <GraduationCap className="w-4 h-4" />
                  <span>Academic Standing</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Verification of active student enrollment, course details, and accredited institute code ({application?.student_id || 'STU-1001'}).
                </p>
              </div>

              <div className="p-4 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl space-y-1.5 transition">
                <div className="flex items-center space-x-2 text-amber-400 font-semibold text-xs">
                  <FileText className="w-4 h-4" />
                  <span>Income Standing</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Authentication of certified family income certificate ({application?.income_certificate_no || 'INC-5001'}) under the ₹2,50,000 annual ceiling.
                </p>
              </div>

              <div className="p-4 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl space-y-1.5 transition">
                <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs">
                  <Landmark className="w-4 h-4" />
                  <span>Direct Benefit Transfer</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Validation of bank account holder match and active Aadhaar bridge seeding ({application?.account_reference || 'BANK-7001'}).
                </p>
              </div>
            </div>
          </div>

          {/* 3. Who the Information Will Be Shared With */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
              <span className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center font-bold text-xs font-mono">
                3
              </span>
              <span className="text-slate-200 font-heading">Authorized Verification Authorities</span>
            </h3>

            <div className="border border-slate-800 rounded-xl divide-y divide-slate-800 bg-slate-950/60 overflow-hidden text-xs">
              <div className="p-4 flex items-start space-x-3.5">
                <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">Department of Higher Education</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Authority responsible for verifying academic enrollment and institutional recognition.
                  </p>
                </div>
              </div>

              <div className="p-4 flex items-start space-x-3.5">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">Revenue & Land Administration Department</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Competent authority issuing household income certifications and EWS verification.
                  </p>
                </div>
              </div>

              <div className="p-4 flex items-start space-x-3.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">Public Financial Management & DBT Mission</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Centralized direct disbursement cell ensuring accounts are ready for electronic fund transfer.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Citizen Legal Rights & Privacy Statement */}
          <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-xl flex items-start space-x-3 text-xs text-teal-300">
            <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
            <p className="text-teal-200/90 leading-relaxed">
              Your digital consent is recorded as a tamper-evident cryptographic audit token. You may inspect or revoke your consent at any time from your Citizen Portal. Without active consent, no cross-department data sharing will take place.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-slate-950/70 px-6 sm:px-8 py-5 border-t border-white/10 flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleCancel}
            disabled={granting}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition cursor-pointer"
          >
            Cancel & Return
          </button>

          <button
            type="button"
            onClick={handleGrantConsent}
            disabled={granting}
            className="w-full sm:w-auto bg-gradient-to-r from-teal-500 via-teal-600 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-bold px-7 py-3 rounded-xl text-xs sm:text-sm shadow-xl shadow-teal-500/25 transition duration-200 transform hover:-translate-y-0.5 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-teal-200" />
            <span>{granting ? 'Authorizing & Starting Verification...' : 'Grant Digital Consent'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
