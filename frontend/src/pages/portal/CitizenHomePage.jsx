import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  FileText, 
  Bell, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowRight, 
  ShieldCheck, 
  TrendingUp, 
  Building2,
  Landmark,
  RefreshCw,
  PlusCircle,
  FileCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import citizenService from '../../services/citizenService';

export default function CitizenHomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [applications, setApplications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const citizenId = user?.citizenId || 'CZN-1001';
      const [appsData, notifsData] = await Promise.all([
        citizenService.getApplications(citizenId),
        citizenService.getNotifications(citizenId),
      ]);

      setApplications(appsData);
      setNotifications(notifsData);
    } catch (err) {
      setError(err.message || 'Unable to retrieve citizen records from portal services');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.citizenId]);

  // Derived simple metrics
  const totalApps = applications.length;
  const approvedApps = applications.filter((a) => a.status === 'SUCCESS' || a.status === 'APPROVED').length;

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await citizenService.markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true, read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await citizenService.markAllNotificationsAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read: true }))
      );
    } catch (err) {
      console.error('Failed to mark all notifications read', err);
    }
  };

  const getNotificationBadge = (type) => {
    const t = String(type || '').toUpperCase().replace(/\s+/g, '_');
    switch (t) {
      case 'APPLICATION_SUBMITTED':
        return { label: 'Application Submitted', bg: 'bg-blue-500/15 text-blue-300 border border-blue-500/30' };
      case 'VERIFICATION_COMPLETED':
        return { label: 'Verification Completed', bg: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' };
      case 'SERVICE_UNAVAILABLE':
        return { label: 'Service Unavailable', bg: 'bg-amber-500/15 text-amber-300 border border-amber-500/30' };
      case 'RETRY_SUCCEEDED':
        return { label: 'Retry Succeeded', bg: 'bg-teal-500/15 text-teal-300 border border-teal-500/30' };
      case 'OFFICER_ACTION_REQUIRED':
        return { label: 'Action Required', bg: 'bg-purple-500/15 text-purple-300 border border-purple-500/30' };
      case 'ELIGIBLE':
        return { label: 'Eligible', bg: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' };
      case 'NOT_ELIGIBLE':
        return { label: 'Not Eligible', bg: 'bg-rose-500/15 text-rose-300 border border-rose-500/30' };
      case 'SLA_APPROACHING':
        return { label: 'SLA Approaching', bg: 'bg-amber-500/15 text-amber-300 border border-amber-500/30' };
      case 'SLA_BREACHED':
        return { label: 'SLA Follow-up', bg: 'bg-rose-500/15 text-rose-300 border border-rose-500/30' };
      default:
        return { label: 'System Notice', bg: 'bg-slate-800 text-slate-300 border border-white/10' };
    }
  };
  const inProgressApps = applications.filter((a) => a.status === 'SUBMITTED' || a.status === 'RUNNING' || a.status === 'PENDING').length;
  const totalBenefitSanctioned = applications
    .filter((a) => a.status === 'SUCCESS' || a.status === 'APPROVED')
    .reduce((sum, a) => sum + (Number(a.benefit_amount) || 0), 0);

  // Helper for clean PRD status badges
  const renderStatusBadge = (status, currentStep) => {
    switch (status) {
      case 'SUCCESS':
      case 'APPROVED':
      case 'COMPLETED':
        return (
          <span className="status-chip status-chip-completed">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
            Completed
          </span>
        );
      case 'VERIFIED':
        return (
          <span className="status-chip status-chip-verified">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
            Verified
          </span>
        );
      case 'RETRYING':
        return (
          <span className="status-chip status-chip-retrying">
            <RefreshCw className="w-3 h-3 mr-1 text-amber-600 animate-spin" />
            Retrying
          </span>
        );
      case 'QUEUED':
        return (
          <span className="status-chip status-chip-queued">
            <Clock className="w-3 h-3 mr-1 text-amber-700" />
            Queued
          </span>
        );
      case 'FAILED':
        return (
          <span className="status-chip status-chip-failed">
            <AlertCircle className="w-3 h-3 mr-1 text-rose-600" />
            Failed
          </span>
        );
      case 'SLA_BREACH':
      case 'BREACHED':
      case 'SLA BREACH':
        return (
          <span className="status-chip status-chip-sla-breach">
            <AlertCircle className="w-3 h-3 mr-1 text-rose-700" />
            SLA Breach
          </span>
        );
      case 'PENDING':
      case 'PENDING_CONSENT':
      case 'SUBMITTED':
      case 'RUNNING':
      default:
        return (
          <span className="status-chip status-chip-pending">
            <Clock className="w-3 h-3 mr-1 text-blue-600" />
            Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Citizen Welcome & Quick Summary Banner */}
      <div className="clean-card p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 bg-teal-500/15 px-2.5 py-0.5 rounded-full border border-teal-500/30">
              Citizen Dashboard
            </span>
            <span className="text-xs text-slate-400">
              Master Civil ID: <span className="font-mono font-semibold text-slate-200">{user?.citizenId || 'CZN-1001'}</span>
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Welcome, {user?.fullName || 'Aarav Sharma'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Track active scholarship welfare requests, consent authorizations, and multi-department service verifications.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing || loading}
            title="Refresh application data"
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Records'}</span>
          </button>

          <Link
            to="/portal/apply"
            className="flex items-center space-x-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold text-xs sm:text-sm px-4 py-2 rounded-xl shadow-lg shadow-teal-500/20 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Application</span>
          </Link>
        </div>
      </div>

      {/* 2. Simple Status Information Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="clean-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Applications
            </span>
            <FileText className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{totalApps}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Recorded in civil registry</p>
        </div>

        <div className="clean-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              In Verification
            </span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400 mt-2">{inProgressApps}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Across departmental systems</p>
        </div>

        <div className="clean-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Sanction Approved
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-2">{approvedApps}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Full multi-dept clearance</p>
        </div>

        <div className="clean-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              DBT Benefit Sanctioned
            </span>
            <Landmark className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-2xl font-bold text-teal-400 mt-2">
            ₹{totalBenefitSanctioned.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Disbursed via Aadhaar Bridge</p>
        </div>
      </div>

      {/* 3. Primary Service Discovery Card */}
      <div className="glass-card border-l-4 border-l-teal-500 p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-32 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-2">
              <span className="bg-teal-500/15 text-teal-300 border border-teal-500/30 text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider font-mono">
                Flagship Scheme 2025–2026
              </span>
              <span className="text-xs text-slate-400">
                Department of Higher Education & DBT Mission
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-heading">
              Post-Matric Merit-cum-Means Financial Assistance Scheme
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Provides direct financial support of ₹25,000 annually to enrolled higher education students. Zero physical document visits required — your academic status, income certificate, and bank account are verified electronically through interoperable government departments upon your consent.
            </p>
            <div className="flex flex-wrap gap-4 pt-2 text-xs text-slate-300">
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                <span>Annual Family Income ≤ ₹2,50,000</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                <span>Active Aadhaar-Seeded Bank Account</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                <span>Certified Higher Education Enrollment</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-center shrink-0 gap-3">
            <div className="text-left lg:text-right">
              <span className="text-xs text-slate-400">Assistance Amount</span>
              <div className="text-2xl sm:text-3xl font-bold text-teal-300 font-mono">
                ₹25,000 <span className="text-xs font-normal text-slate-400">/ Year</span>
              </div>
            </div>
            <Link
              to="/portal/apply"
              className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-bold px-6 py-3 rounded-xl text-sm shadow-lg shadow-teal-500/20 transition flex items-center space-x-2 cursor-pointer"
            >
              <span>Apply Online</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* 4. Applications List & Notifications Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Current Applications */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div>
              <h3 className="text-base font-bold text-white">Your Applications</h3>
              <p className="text-xs text-slate-400">Track current status and unified service verification progression</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-teal-300 bg-teal-500/10 border border-teal-500/20 px-2.5 py-1 rounded-md font-mono">
                {applications.length} Found
              </span>
              <Link
                to="/portal/applications"
                className="text-xs font-bold text-teal-400 hover:text-teal-300 flex items-center space-x-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center glass-card rounded-2xl">
              <RefreshCw className="w-6 h-6 text-teal-400 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-400">Loading your applications from civil records...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="p-8 text-center glass-card rounded-2xl space-y-3">
              <div className="w-12 h-12 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">No applications on record yet</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                You have not submitted any applications for this citizen identity. Apply now to initiate automated verification.
              </p>
              <Link
                to="/portal/apply"
                className="inline-flex items-center space-x-1.5 text-xs font-semibold text-teal-300 hover:text-teal-200 pt-1"
              >
                <span>Submit Scholarship Application</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => (
                <div
                  key={app.application_id}
                  className="glass-card hover:border-teal-500/40 rounded-xl p-5 shadow-lg transition duration-200 group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-lg bg-teal-500/15 text-teal-300 flex items-center justify-center font-bold text-xs border border-teal-500/25">
                        <GraduationCap className="w-5 h-5 text-teal-400" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-white text-sm">
                            {app.application_id}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            • {app.academic_year}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-slate-300">
                          {app.scheme_name}
                        </h4>
                      </div>
                    </div>

                    <div>{renderStatusBadge((app.sla_breached || app.is_sla_breached) ? 'SLA_BREACH' : app.status, app.current_step)}</div>
                  </div>

                  {/* Summary Attributes */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-3 text-xs text-slate-400">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Student ID</span>
                      <span className="font-mono font-semibold text-slate-200">{app.student_id || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Income Cert</span>
                      <span className="font-mono font-semibold text-slate-200">{app.income_certificate_no || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Benefit</span>
                      <span className="font-semibold text-teal-300 font-mono">₹{Number(app.benefit_amount || 25000).toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Submitted</span>
                      <span className="text-slate-200">
                        {app.submission_date ? new Date(app.submission_date).toLocaleDateString('en-IN') : 'Recent'}
                      </span>
                    </div>
                  </div>

                  {/* Action Link Footer */}
                  <div className="pt-2 flex items-center justify-between border-t border-white/5">
                    <div className="text-[11px] text-slate-400">
                      Step: <span className="font-semibold text-slate-300 font-mono">{app.current_step?.replace(/_/g, ' ')}</span>
                    </div>

                    <Link
                      to={`/portal/applications/${app.application_id}`}
                      className="inline-flex items-center space-x-1.5 text-xs font-semibold text-teal-400 hover:text-teal-300 group-hover:translate-x-0.5 transition"
                    >
                      <span>View Details & Timeline</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column (1 Col): Notifications & Alerts Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-teal-400" />
              <h3 className="text-base font-bold text-white">Notifications</h3>
            </div>
            <div className="flex items-center space-x-2">
              {notifications.some((n) => !n.is_read && !n.read) && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[11px] text-teal-400 hover:underline font-medium cursor-pointer"
                >
                  Mark read
                </button>
              )}
              <Link
                to="/portal/notifications"
                className="text-xs font-bold text-teal-400 hover:text-teal-300 flex items-center space-x-1"
              >
                <span>View All ({notifications.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="glass-card divide-y divide-white/5 shadow-xl max-h-[520px] overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-xs text-slate-400">Loading alerts...</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No new notification alerts at this time.
              </div>
            ) : (
              notifications.map((notif, index) => {
                const badge = getNotificationBadge(notif.type);
                const isUnread = notif.is_read === false || notif.read === false;

                return (
                  <div
                    key={notif.id || index}
                    className={`p-4 transition text-xs relative ${
                      isUnread ? 'bg-teal-500/5 hover:bg-teal-500/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg}`}>
                          {badge.label}
                        </span>
                        {isUnread && (
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" title="Unread alert" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                        {notif.created_at
                          ? new Date(notif.created_at).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Recent'}
                      </span>
                    </div>

                    <p className="text-white font-semibold leading-relaxed">
                      {notif.title || notif.message}
                    </p>

                    {notif.title && notif.message && notif.title !== notif.message && (
                      <p className="text-slate-300 mt-1 text-[11px] leading-relaxed">
                        {notif.message}
                      </p>
                    )}

                    <div className="mt-2.5 flex items-center justify-between pt-1.5 border-t border-white/5 text-[11px]">
                      {notif.application_id ? (
                        <Link
                          to={`/portal/applications/${notif.application_id}`}
                          className="text-teal-400 hover:text-teal-300 font-semibold font-mono"
                        >
                          {notif.application_id} &rarr;
                        </Link>
                      ) : (
                        <span className="text-slate-500 font-mono text-[10px]">CITIZEN NOTICE</span>
                      )}

                      {isUnread && notif.id && (
                        <button
                          onClick={(e) => handleMarkAsRead(notif.id, e)}
                          className="text-[10px] text-slate-400 hover:text-white font-medium cursor-pointer"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Citizen Privacy Assurance Box */}
          <div className="p-4 bg-teal-500/10 border border-teal-500/25 rounded-2xl text-xs space-y-1.5 text-teal-300 backdrop-blur-md">
            <div className="flex items-center space-x-2 font-bold text-teal-200">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>Consent-Driven Sovereign Data Access</span>
            </div>
            <p className="text-[11px] text-teal-200/80 leading-relaxed">
              Departments verify only the specific fields authorized in your digital consent. Verification occurs electronically without paper dossiers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
