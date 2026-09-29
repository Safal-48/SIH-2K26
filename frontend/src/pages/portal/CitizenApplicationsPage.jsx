import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  GraduationCap,
  PlusCircle,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  Filter
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import citizenService from '../../services/citizenService';

export default function CitizenApplicationsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const citizenId = user?.citizenId || 'CZN-1001';
      const appsData = await citizenService.getApplications(citizenId);
      setApplications(appsData || []);
    } catch (err) {
      setError(err.message || 'Unable to retrieve applications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.citizenId]);

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
        return (
          <span className="status-chip status-chip-sla-breach">
            <AlertCircle className="w-3 h-3 mr-1 text-rose-700" />
            SLA Breach
          </span>
        );
      default:
        return (
          <span className="status-chip status-chip-pending">
            <Clock className="w-3 h-3 mr-1 text-blue-600" />
            Pending
          </span>
        );
    }
  };

  let displayedApps = applications;
  if (statusFilter !== 'ALL') {
    displayedApps = displayedApps.filter((a) => {
      if (statusFilter === 'COMPLETED') return a.status === 'SUCCESS' || a.status === 'APPROVED' || a.status === 'COMPLETED';
      if (statusFilter === 'PENDING') return a.status === 'SUBMITTED' || a.status === 'RUNNING' || a.status === 'PENDING' || a.status === 'PENDING_CONSENT';
      if (statusFilter === 'FAILED') return a.status === 'FAILED' || a.status === 'QUEUED';
      return a.status === statusFilter;
    });
  }

  if (searchTerm.trim()) {
    const q = searchTerm.toLowerCase();
    displayedApps = displayedApps.filter(
      (a) =>
        a.application_id?.toLowerCase().includes(q) ||
        a.scheme_name?.toLowerCase().includes(q) ||
        a.student_id?.toLowerCase().includes(q) ||
        a.income_certificate_no?.toLowerCase().includes(q)
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
            <Link to="/portal" className="hover:text-teal-300 transition">Citizen Portal</Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-slate-200 font-semibold">My Applications</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center space-x-2.5 font-heading">
            <FileText className="w-6 h-6 text-teal-400" />
            <span>My Welfare & Scholarship Applications</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track verification progress, consent status, and multi-department service resolution
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing || loading}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <Link
            to="/portal/apply"
            className="flex items-center space-x-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-bold text-xs sm:text-sm px-4 py-2 rounded-xl shadow-lg shadow-teal-500/20 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Application</span>
          </Link>
        </div>
      </div>

      {/* Main List Section */}
      <section className="glass-card p-6 space-y-5 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/60 p-1.5 rounded-xl border border-white/10">
            {[
              { id: 'ALL', label: 'All', count: applications.length },
              { id: 'PENDING', label: 'In Progress', count: applications.filter((a) => a.status === 'SUBMITTED' || a.status === 'RUNNING' || a.status === 'PENDING' || a.status === 'PENDING_CONSENT').length },
              { id: 'COMPLETED', label: 'Completed', count: applications.filter((a) => a.status === 'SUCCESS' || a.status === 'APPROVED' || a.status === 'COMPLETED').length },
              { id: 'FAILED', label: 'Exceptions', count: applications.filter((a) => a.status === 'FAILED' || a.status === 'QUEUED').length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition flex items-center space-x-1.5 cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-teal-500/20 text-teal-300 font-bold border border-teal-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  statusFilter === tab.id ? 'bg-teal-500/30 text-teal-200 border border-teal-500/40 font-bold' : 'bg-white/10 text-slate-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ID, scheme..."
              className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-teal-400"
            />
          </div>
        </div>

        {/* Applications List */}
        <div className="space-y-3">
          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 text-teal-400 animate-spin mx-auto mb-2" />
              <p className="text-xs">Loading applications...</p>
            </div>
          ) : displayedApps.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <FileText className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">No applications match criteria</p>
              <Link
                to="/portal/apply"
                className="inline-flex items-center space-x-1.5 text-xs font-semibold text-teal-300 hover:text-teal-200"
              >
                <span>Submit a new application</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            displayedApps.map((app) => (
              <div
                key={app.application_id}
                className="bg-slate-950/60 border border-slate-800 hover:border-teal-500/40 rounded-xl p-5 shadow-lg transition duration-200 group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-teal-500/15 text-teal-300 flex items-center justify-center font-bold text-xs border border-teal-500/25">
                      <GraduationCap className="w-5 h-5 text-teal-400" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-white text-base">
                          {app.application_id}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
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
                    Current Step: <strong className="text-slate-200 font-mono">{app.current_step?.replace(/_/g, ' ') || 'Intake'}</strong>
                  </div>

                  <Link
                    to={`/portal/applications/${app.application_id}`}
                    className="inline-flex items-center space-x-1.5 text-xs font-semibold text-teal-400 hover:text-teal-300 group-hover:translate-x-0.5 transition"
                  >
                    <span>View Verification Timeline & Deep Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
