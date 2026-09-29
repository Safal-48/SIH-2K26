import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  GraduationCap, 
  FileText, 
  Landmark, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ShieldCheck, 
  ArrowRight, 
  RefreshCw,
  User,
  Calendar,
  DollarSign,
  ChevronRight,
  Play
} from 'lucide-react';
import citizenService from '../../services/citizenService';
import UnifiedServiceTimeline from '../../components/UnifiedServiceTimeline';

export default function ApplicationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [application, setApplication] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [consent, setConsent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [runningWorkflow, setRunningWorkflow] = useState(false);
  const [error, setError] = useState('');

  const loadData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const [appData, timelineData] = await Promise.all([
        citizenService.getApplicationById(id),
        citizenService.getTimeline(id).catch(() => ({ timeline: [] })),
      ]);

      setApplication(appData.application);
      setConsent(appData.consent);
      setTimeline(timelineData?.timeline || appData.steps || []);
    } catch (err) {
      setError(err.message || 'Unable to retrieve application details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const handleRunVerification = async () => {
    setRunningWorkflow(true);
    try {
      await citizenService.runWorkflow(id);
      await loadData(true);
    } catch (err) {
      console.warn('Workflow execution notification:', err.message);
      await loadData(true);
    } finally {
      setRunningWorkflow(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center glass-card border border-white/10 rounded-xl shadow-xl">
        <RefreshCw className="w-8 h-8 text-teal-400 animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold text-white">Retrieving Application File...</p>
        <p className="text-xs text-slate-400 mt-1 font-mono">{id}</p>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="max-w-4xl mx-auto p-8 glass-card border border-white/10 rounded-xl shadow-xl text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h3 className="text-base font-bold text-white">Application Record Not Found</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          {error || `The requested application reference '${id}' could not be located in the current civil registry session.`}
        </p>
        <Link
          to="/portal"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-teal-400 hover:text-teal-300"
        >
          <span>Return to Citizen Home</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  const isConsentGranted = consent && consent.status === 'GRANTED';
  const isApproved = application.status === 'SUCCESS' || application.status === 'APPROVED';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-xs text-slate-400">
        <Link to="/portal" className="hover:text-teal-300 transition">Citizen Home</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
        <span className="text-slate-200 font-semibold font-mono">{application.application_id}</span>
      </div>

      {/* 1. Official Header & Status Banner */}
      <div className="glass-card p-6 sm:p-8 shadow-2xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/10">
          <div>
            <div className="flex items-center space-x-2.5 mb-2">
              <span className="text-xs font-mono font-bold text-teal-300 bg-teal-500/15 px-2.5 py-0.5 rounded-full border border-teal-500/30">
                {application.application_id}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Academic Year {application.academic_year}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-heading">
              {application.scheme_name}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Ministry of Higher Education & DBT Mission • Electronic Sanction Pipeline
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-2.5 shrink-0">
            {/* Status Pill */}
            {isApproved ? (
              <span className="status-chip status-chip-completed">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                Completed
              </span>
            ) : (application.sla_breached || application.is_sla_breached) ? (
              <span className="status-chip status-chip-sla-breach">
                <AlertCircle className="w-3.5 h-3.5 mr-1 text-rose-400" />
                SLA Breach
              </span>
            ) : !isConsentGranted ? (
              <span className="status-chip status-chip-pending">
                <Clock className="w-3.5 h-3.5 mr-1 text-amber-400" />
                Pending Consent
              </span>
            ) : application.status === 'FAILED' ? (
              <span className="status-chip status-chip-failed">
                <AlertCircle className="w-3.5 h-3.5 mr-1 text-rose-400" />
                Failed
              </span>
            ) : application.status === 'RETRYING' ? (
              <span className="status-chip status-chip-retrying">
                <RefreshCw className="w-3.5 h-3.5 mr-1 text-amber-400 animate-spin" />
                Retrying
              </span>
            ) : application.status === 'QUEUED' ? (
              <span className="status-chip status-chip-queued">
                <Clock className="w-3.5 h-3.5 mr-1 text-amber-400" />
                Queued
              </span>
            ) : (
              <span className="status-chip status-chip-pending">
                <Clock className="w-3.5 h-3.5 mr-1 text-blue-400 animate-pulse" />
                Pending
              </span>
            )}

            <div className="flex items-center space-x-2">
              <button
                onClick={() => loadData(true)}
                disabled={refreshing}
                title="Refresh latest status"
                className="flex items-center space-x-1.5 text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-xl transition disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              {isConsentGranted && !isApproved && (
                <button
                  onClick={handleRunVerification}
                  disabled={runningWorkflow}
                  title="Run verification"
                  className="flex items-center space-x-1.5 text-xs font-semibold text-white bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 px-3.5 py-1.5 rounded-xl transition shadow-lg shadow-teal-500/20 disabled:opacity-50 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>{runningWorkflow ? 'Verifying...' : 'Check Verification'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Highlight Metadata Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-medium">Applicant Name</span>
            <span className="font-semibold text-white text-sm">{application.citizen_name || 'Aarav Sharma'}</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-medium">Master Civil ID</span>
            <span className="font-mono font-semibold text-white text-sm">{application.citizen_id}</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-medium">Submission Date</span>
            <span className="font-semibold text-white text-sm">
              {application.submission_date ? new Date(application.submission_date).toLocaleDateString('en-IN') : 'Recent'}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-medium">Sanction Benefit</span>
            <span className="font-bold text-teal-300 font-mono text-sm">
              ₹{Number(application.benefit_amount || 25000).toLocaleString('en-IN')}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-medium">Service SLA (48h)</span>
            {(() => {
              const subMs = application.submission_date ? new Date(application.submission_date).getTime() : Date.now();
              const endMs = (application.status === 'SUCCESS' || application.status === 'APPROVED') && application.approval_date
                ? new Date(application.approval_date).getTime()
                : Date.now();
              const elapsed = Math.max(0, Math.round(((endMs - subMs) / (1000 * 60 * 60)) * 10) / 10);
              const isBreach = elapsed > 48;
              const isApproaching = elapsed >= 36 && elapsed <= 48;

              if (isBreach) {
                return (
                  <span className="status-chip status-chip-sla-breach mt-0.5">
                    SLA Breach ({elapsed}h)
                  </span>
                );
              }
              if (isApproaching) {
                return (
                  <span className="status-chip status-chip-retrying mt-0.5">
                    Approaching ({elapsed}h)
                  </span>
                );
              }
              return (
                <span className="status-chip status-chip-verified mt-0.5">
                  SLA Met ({elapsed}h)
                </span>
              );
            })()}
          </div>
        </div>
      </div>

      {/* 2. Consent Status Banner */}
      {!isConsentGranted ? (
        <div className="p-5 bg-amber-500/10 border border-amber-500/25 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-md">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-200">
                Action Required: Digital Consent Authorization
              </h4>
              <p className="text-xs text-amber-200/80 mt-0.5 leading-relaxed">
                Inter-departmental verification is paused. Government departments cannot inspect your academic, income, or bank records without your explicit digital consent.
              </p>
            </div>
          </div>

          <Link
            to={`/portal/applications/${application.application_id}/consent`}
            className="shrink-0 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center space-x-2 cursor-pointer"
          >
            <span>Review & Grant Consent</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl shadow-xl flex items-center justify-between text-xs text-emerald-300 backdrop-blur-md">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold text-emerald-200">Active Digital Consent Granted: </span>
              <span className="text-emerald-200/80">
                Authorized for Scholarship Eligibility Verification across Higher Education, Revenue, and PFMS departments.
              </span>
            </div>
          </div>

          <Link
            to={`/portal/applications/${application.application_id}/consent`}
            className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 underline shrink-0 ml-2"
          >
            View Consent Mandate &rarr;
          </Link>
        </div>
      )}

      {/* 3. Submitted Information Card */}
      <div className="glass-card p-6 sm:p-7 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2 font-heading">
            <FileText className="w-4 h-4 text-teal-400" />
            <span>Authoritative Departmental Identifiers</span>
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">5 Official References</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
          <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-500 block uppercase font-medium">1. Citizen Identity</span>
            <span className="font-mono font-bold text-white text-sm">{application.citizen_id}</span>
            <p className="text-[10px] text-slate-400 mt-0.5">Master Civil Registry</p>
          </div>

          <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-500 block uppercase font-medium">2. Student Enrollment</span>
            <span className="font-mono font-bold text-white text-sm">{application.student_id || 'STU-1001'}</span>
            <p className="text-[10px] text-slate-400 mt-0.5">Department of Higher Education</p>
          </div>

          <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-500 block uppercase font-medium">3. Educational Institution</span>
            <span className="font-mono font-bold text-white text-sm">{application.institution_code || 'INST-NIT-04'}</span>
            <p className="text-[10px] text-slate-400 mt-0.5">AISHE Institution Registry</p>
          </div>

          <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-500 block uppercase font-medium">4. Income Certificate Reference</span>
            <span className="font-mono font-bold text-white text-sm">{application.income_certificate_no || 'INC-5001'}</span>
            <p className="text-[10px] text-slate-400 mt-0.5">Revenue Department</p>
          </div>

          <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl sm:col-span-2 lg:col-span-2">
            <span className="text-[10px] text-slate-500 block uppercase font-medium">5. DBT Bank Account Reference</span>
            <span className="font-mono font-bold text-white text-sm">{application.account_reference || 'BANK-7001'}</span>
            <p className="text-[10px] text-slate-400 mt-0.5">Public Financial Management / DBT Mandate</p>
          </div>
        </div>
      </div>

      {/* 4. Unified Service Timeline */}
      <UnifiedServiceTimeline
        timeline={timeline}
        onRetry={handleRunVerification}
        isRetrying={runningWorkflow}
        canRetry={isConsentGranted && !isApproved}
      />
    </div>
  );
}
