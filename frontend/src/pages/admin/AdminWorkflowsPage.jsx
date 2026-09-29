import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  Search,
  Filter,
  RefreshCw,
  Play,
  ArrowUpRight,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight
} from 'lucide-react';
import adminService from '../../services/adminService';

export default function AdminWorkflowsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [error, setError] = useState('');
  const [actionNotice, setActionNotice] = useState(null);
  const [resumingAppId, setResumingAppId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Data states
  const [activeWorkflows, setActiveWorkflows] = useState([]);
  const [completedWorkflows, setCompletedWorkflows] = useState([]);
  const [pendingWorkflows, setPendingWorkflows] = useState([]);
  const [failedWorkflows, setFailedWorkflows] = useState([]);

  // Filter & Search states
  const [workflowTab, setWorkflowTab] = useState('ALL'); // ALL, ACTIVE, COMPLETED, PENDING, FAILED
  const [searchTerm, setSearchTerm] = useState('');

  const loadWorkflows = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const data = await adminService.getDashboard();
      setActiveWorkflows(data?.activeWorkflows || []);
      setCompletedWorkflows(data?.completedWorkflows || []);
      setPendingWorkflows(data?.pendingWorkflows || []);
      setFailedWorkflows(data?.failedWorkflows || []);
    } catch (err) {
      setError(err.message || 'Failed to retrieve workflow instances');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadWorkflows();
  }, []);

  useEffect(() => {
    let timer;
    if (autoRefresh) {
      timer = setInterval(() => {
        loadWorkflows(true);
      }, 10000);
    }
    return () => clearInterval(timer);
  }, [autoRefresh]);

  const handleResumeWorkflow = async (applicationId) => {
    setResumingAppId(applicationId);
    setActionNotice(null);
    try {
      const res = await adminService.resumeWorkflow(applicationId);
      setActionNotice({
        type: res.success ? 'success' : 'warning',
        message: `Workflow ${applicationId} resumed: Status [${res.status || 'PROCESSED'}]`,
      });
      await loadWorkflows(true);
    } catch (err) {
      setActionNotice({
        type: 'error',
        message: `Failed to resume workflow ${applicationId}: ${err.message}`,
      });
    } finally {
      setResumingAppId(null);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Combine workflows for filtered display
  const allWorkflows = [
    ...activeWorkflows.map((w) => ({ ...w, category: 'ACTIVE' })),
    ...completedWorkflows.map((w) => ({ ...w, category: 'COMPLETED' })),
    ...pendingWorkflows.map((w) => ({ ...w, category: 'PENDING' })),
    ...failedWorkflows.map((w) => ({ ...w, category: 'FAILED' })),
  ];

  let displayedWorkflows = allWorkflows;
  if (workflowTab !== 'ALL') {
    displayedWorkflows = displayedWorkflows.filter((w) => w.category === workflowTab);
  }

  if (searchTerm.trim()) {
    const q = searchTerm.toLowerCase();
    displayedWorkflows = displayedWorkflows.filter(
      (w) =>
        w.application_id?.toLowerCase().includes(q) ||
        w.citizen_id?.toLowerCase().includes(q) ||
        w.scheme_name?.toLowerCase().includes(q) ||
        w.correlation_id?.toLowerCase().includes(q) ||
        w.failed_step_name?.toLowerCase().includes(q) ||
        w.error_details?.toLowerCase().includes(q)
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
            <Link to="/admin" className="hover:text-teal-300 transition">Admin Console</Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-white font-semibold">Workflows Orchestration Grid</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <Layers className="w-6 h-6 text-teal-400" />
            <span>Workflows Orchestration Grid</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Inspect, filter, monitor, and resume multi-step departmental workflow instances loaded from PostgreSQL
          </p>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center space-x-1.5 text-xs font-mono px-3 py-1.5 rounded-xl border transition ${
              autoRefresh
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 font-bold shadow-xs'
                : 'bg-slate-900/90 text-slate-300 border-white/10 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-teal-400 animate-ping' : 'bg-slate-500'}`} />
            <span>Auto (10s)</span>
          </button>

          <button
            onClick={() => loadWorkflows(true)}
            disabled={refreshing}
            className="flex items-center space-x-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-white/10 px-3 py-1.5 rounded-xl transition disabled:opacity-50 shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-teal-400' : 'text-slate-400'}`} />
            <span>Refresh</span>
          </button>

          <Link
            to="/admin/workflows/builder"
            className="flex items-center space-x-1.5 text-xs font-semibold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 px-3.5 py-1.5 rounded-xl transition shadow-md shadow-teal-500/20"
          >
            <span>Visual Builder</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionNotice && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between shadow-lg ${
            actionNotice.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
              : actionNotice.type === 'warning'
              ? 'bg-amber-500/15 border-amber-500/30 text-amber-200'
              : 'bg-rose-500/15 border-rose-500/30 text-rose-200'
          }`}
        >
          <span className="font-medium">{actionNotice.message}</span>
          <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-white font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="glass-card border border-white/10 rounded-xl p-3.5 shadow-lg">
          <span className="text-[10px] font-mono uppercase text-slate-400 block truncate">Total Workflows</span>
          <span className="text-2xl font-bold text-white font-mono">{allWorkflows.length}</span>
          <div className="text-[10px] text-slate-400">All registered instances</div>
        </div>

        <div className="glass-card border border-teal-500/30 rounded-xl p-3.5 shadow-lg bg-teal-500/10">
          <span className="text-[10px] font-mono uppercase text-teal-300 block truncate font-semibold">Active Running</span>
          <span className="text-2xl font-bold text-teal-200 font-mono">{activeWorkflows.length}</span>
          <div className="text-[10px] text-teal-300">In progression</div>
        </div>

        <div className="glass-card border border-emerald-500/30 rounded-xl p-3.5 shadow-lg bg-emerald-500/10">
          <span className="text-[10px] font-mono uppercase text-emerald-300 block truncate font-semibold">Completed</span>
          <span className="text-2xl font-bold text-emerald-200 font-mono">{completedWorkflows.length}</span>
          <div className="text-[10px] text-emerald-300">Fully sanctioned</div>
        </div>

        <div className="glass-card border border-amber-500/30 rounded-xl p-3.5 shadow-lg bg-amber-500/10">
          <span className="text-[10px] font-mono uppercase text-amber-300 block truncate">Pending Consent</span>
          <span className="text-2xl font-bold text-amber-200 font-mono">{pendingWorkflows.length}</span>
          <div className="text-[10px] text-amber-400/80">Awaiting citizen action</div>
        </div>

        <div className="glass-card border border-rose-500/30 rounded-xl p-3.5 shadow-lg bg-rose-500/10">
          <span className="text-[10px] font-mono uppercase text-rose-300 block truncate font-semibold">Exceptions / Failed</span>
          <span className="text-2xl font-bold text-rose-200 font-mono">{failedWorkflows.length}</span>
          <div className="text-[10px] text-rose-300">Requires recovery</div>
        </div>
      </div>

      {/* Main Workflows Table Card */}
      <section className="glass-card border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-white/10">
          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-white/10">
            {[
              { id: 'ALL', label: 'All', count: allWorkflows.length },
              { id: 'ACTIVE', label: 'Active', count: activeWorkflows.length },
              { id: 'COMPLETED', label: 'Completed', count: completedWorkflows.length },
              { id: 'PENDING', label: 'Pending', count: pendingWorkflows.length },
              { id: 'FAILED', label: 'Failed', count: failedWorkflows.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setWorkflowTab(tab.id)}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition flex items-center space-x-1.5 cursor-pointer ${
                  workflowTab === tab.id
                    ? 'bg-teal-500/20 text-teal-300 font-bold border border-teal-500/40 shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  workflowTab === tab.id ? 'bg-teal-500/30 text-teal-200 font-bold' : 'bg-slate-800 text-slate-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-400 font-medium">
            Showing <strong className="text-white">{displayedWorkflows.length}</strong> instances
          </div>
        </div>

        {/* Search & Filter Input */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Application ID, Citizen ID, Correlation ID, Step, or Error message..."
              className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition shadow-inner"
            />
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-xs text-slate-400 hover:text-white font-medium cursor-pointer"
            >
              Clear filter
            </button>
          )}
        </div>

        {/* Workflow Instances Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-300 font-semibold text-[11px] bg-slate-900/90">
                <th className="py-2.5 px-3">Application ID</th>
                <th className="py-2.5 px-3">Citizen ID</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Current Step</th>
                <th className="py-2.5 px-3">Correlation ID</th>
                <th className="py-2.5 px-3">Attempts / Retries</th>
                <th className="py-2.5 px-3">Operational Diagnostics</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 font-sans">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <RefreshCw className="w-6 h-6 text-teal-400 animate-spin" />
                      <p className="text-xs font-semibold text-white">Loading workflow instances from database...</p>
                    </div>
                  </td>
                </tr>
              ) : displayedWorkflows.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 font-sans">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Search className="w-6 h-6 text-slate-500" />
                      <p className="text-sm font-semibold text-white">No workflows match the selected criteria</p>
                      <p className="text-xs text-slate-400">Try adjusting your search query or status filter tab.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedWorkflows.map((wf) => {
                  const isFailed = wf.status === 'FAILED' || wf.status === 'QUEUED';
                  const isCompleted = wf.status === 'SUCCESS' || wf.status === 'APPROVED' || wf.status === 'COMPLETED';
                  const isBreached = wf.is_sla_breached || wf.sla_breached;

                  return (
                    <tr key={wf.application_id} className="hover:bg-slate-800/50 transition">
                      <td className="py-3 px-3 font-bold text-teal-300">
                        <div className="flex items-center space-x-1.5">
                          <span>{wf.application_id}</span>
                          <button
                            onClick={() => copyToClipboard(wf.application_id)}
                            title="Copy ID"
                            className="text-slate-400 hover:text-white"
                          >
                            {copiedId === wf.application_id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-300 font-sans">{wf.citizen_id}</td>
                      <td className="py-3 px-3 font-sans">
                        {(() => {
                          const s = (wf.status || 'PENDING').toUpperCase();
                          if (isBreached || s === 'SLA_BREACH' || s === 'BREACHED') {
                            return (
                              <span className="status-chip status-chip-sla-breach text-[10px]">
                                SLA Breach
                              </span>
                            );
                          }
                          if (s === 'SUCCESS' || s === 'APPROVED' || s === 'COMPLETED') {
                            return (
                              <span className="status-chip status-chip-completed text-[10px]">
                                Completed
                              </span>
                            );
                          }
                          if (s === 'VERIFIED') {
                            return (
                              <span className="status-chip status-chip-verified text-[10px]">
                                Verified
                              </span>
                            );
                          }
                          if (s === 'RETRYING') {
                            return (
                              <span className="status-chip status-chip-retrying text-[10px]">
                                Retrying
                              </span>
                            );
                          }
                          if (s === 'QUEUED') {
                            return (
                              <span className="status-chip status-chip-queued text-[10px]">
                                Queued
                              </span>
                            );
                          }
                          if (s === 'FAILED') {
                            return (
                              <span className="status-chip status-chip-failed text-[10px]">
                                Failed
                              </span>
                            );
                          }
                          return (
                            <span className="status-chip status-chip-pending text-[10px]">
                              Pending
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-3 text-slate-300 font-sans">
                        {wf.current_step || wf.failed_step_name || 'Intake'}
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-[10px]">
                        {wf.correlation_id ? (
                          <div className="flex items-center space-x-1">
                            <span className="truncate max-w-[140px]">{wf.correlation_id}</span>
                            <button
                              onClick={() => copyToClipboard(wf.correlation_id)}
                              title="Copy Correlation ID"
                              className="text-slate-500 hover:text-white"
                            >
                              {copiedId === wf.correlation_id ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-400">
                        {wf.attempts !== undefined ? `Att: ${wf.attempts} / Ret: ${wf.retry_count || 0}` : '—'}
                      </td>
                      <td className="py-3 px-3 font-sans text-[11px] max-w-xs">
                        {wf.error_details ? (
                          <span className="text-rose-400 font-mono text-[10px] line-clamp-1" title={wf.error_details}>
                            {wf.error_details}
                          </span>
                        ) : wf.remarks ? (
                          <span className="text-slate-400 line-clamp-1">{wf.remarks}</span>
                        ) : isCompleted ? (
                          <span className="text-emerald-400 font-semibold">Sanctioned ₹{Number(wf.benefit_amount || 25000).toLocaleString('en-IN')}</span>
                        ) : (
                          <span className="text-slate-500">In sequence</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {isFailed ? (
                          <button
                            onClick={() => handleResumeWorkflow(wf.application_id)}
                            disabled={resumingAppId === wf.application_id}
                            className="inline-flex items-center space-x-1 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-[10px] px-3 py-1 rounded-lg transition disabled:opacity-50 shadow-xs cursor-pointer"
                          >
                            <Play className="w-2.5 h-2.5 fill-white" />
                            <span>{resumingAppId === wf.application_id ? 'Resuming...' : 'Resume'}</span>
                          </button>
                        ) : (
                          <Link
                            to={`/portal/applications/${wf.application_id}`}
                            className="inline-flex items-center space-x-1 text-teal-400 hover:text-teal-300 font-semibold text-[11px]"
                          >
                            <span>Inspect</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
