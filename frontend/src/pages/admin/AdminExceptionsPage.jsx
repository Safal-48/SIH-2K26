import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Filter,
  Search,
  ArrowUpRight
} from 'lucide-react';
import exceptionService from '../../services/exceptionService';
import adminService from '../../services/adminService';

export default function AdminExceptionsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);
  const [resumingAppId, setResumingAppId] = useState(null);
  const [exceptions, setExceptions] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, QUEUED, RETRYING, NON_RETRYABLE, FAILED
  const [searchTerm, setSearchTerm] = useState('');

  const loadExceptions = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await adminService.getDashboard();
      setExceptions(data?.recentExceptions || []);
    } catch (err) {
      setActionNotice({
        type: 'error',
        message: err.message || 'Failed to retrieve exception queue telemetry',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadExceptions();
  }, []);

  useEffect(() => {
    let timer;
    if (autoRefresh) {
      timer = setInterval(() => {
        loadExceptions(true);
      }, 10000);
    }
    return () => clearInterval(timer);
  }, [autoRefresh]);

  const handleRetryException = async (idOrAppId) => {
    try {
      setResumingAppId(idOrAppId);
      setActionNotice({ type: 'info', message: `Executing automated retry for exception [${idOrAppId}]...` });
      const result = await exceptionService.retryException(idOrAppId);
      setActionNotice({
        type: result.success ? 'success' : 'warn',
        message: result.message || `Retry processed for [${idOrAppId}]`,
      });
      await loadExceptions(true);
    } catch (err) {
      setActionNotice({
        type: 'error',
        message: err.message || `Failed to retry exception [${idOrAppId}]`,
      });
    } finally {
      setResumingAppId(null);
    }
  };

  const handleProcessQueue = async () => {
    try {
      setRefreshing(true);
      setActionNotice({ type: 'info', message: 'Processing local queued workflows...' });
      const result = await exceptionService.processQueue();
      setActionNotice({
        type: 'success',
        message: `Processed ${result.processedCount} queued items (${result.successCount} succeeded, ${result.failedCount} remaining in queue)`,
      });
      await loadExceptions(true);
    } catch (err) {
      setActionNotice({
        type: 'error',
        message: err.message || 'Failed to process queue batch',
      });
    } finally {
      setRefreshing(false);
    }
  };

  let displayedExceptions = exceptions;
  if (statusFilter !== 'ALL') {
    displayedExceptions = displayedExceptions.filter((ex) => {
      if (statusFilter === 'NON_RETRYABLE') return ex.status === 'NON_RETRYABLE' || ex.retryable === false;
      return ex.status === statusFilter;
    });
  }

  if (searchTerm.trim()) {
    const q = searchTerm.toLowerCase();
    displayedExceptions = displayedExceptions.filter(
      (ex) =>
        ex.application_id?.toLowerCase().includes(q) ||
        ex.step_name?.toLowerCase().includes(q) ||
        ex.error_details?.toLowerCase().includes(q) ||
        ex.correlation_id?.toLowerCase().includes(q) ||
        ex.department_code?.toLowerCase().includes(q)
    );
  }

  const queuedCount = exceptions.filter((e) => e.status === 'QUEUED').length;
  const retryingCount = exceptions.filter((e) => e.status === 'RETRYING').length;
  const nonRetryableCount = exceptions.filter((e) => e.status === 'NON_RETRYABLE' || e.retryable === false).length;

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
            <Link to="/admin" className="hover:text-teal-300 transition">Admin Console</Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-white font-semibold">Exception Queue & Recovery</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <ShieldAlert className="w-6 h-6 text-rose-400" />
            <span>Exception Queue & Diagnostic Telemetry</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Active workflow step halts, transient errors, retry backoff queue, and recovery controls
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
            onClick={() => loadExceptions(true)}
            disabled={refreshing}
            className="flex items-center space-x-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-white/10 px-3 py-1.5 rounded-xl transition disabled:opacity-50 shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-teal-400' : 'text-slate-400'}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleProcessQueue}
            disabled={refreshing}
            className="px-3.5 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-mono text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shadow-md shadow-teal-500/20 disabled:opacity-50 cursor-pointer"
            title="Process local deterministic retry queue"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Process Queue</span>
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionNotice && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between shadow-lg ${
            actionNotice.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
              : actionNotice.type === 'info'
              ? 'bg-sky-500/15 border-sky-500/30 text-sky-200'
              : actionNotice.type === 'warn'
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card border border-white/10 rounded-xl p-3.5 shadow-lg">
          <span className="text-[10px] font-mono uppercase text-slate-400 block truncate">Total Caught</span>
          <span className="text-2xl font-bold text-white font-mono">{exceptions.length}</span>
          <div className="text-[10px] text-slate-400">Exceptions recorded</div>
        </div>

        <div className="glass-card border border-amber-500/30 rounded-xl p-3.5 shadow-lg bg-amber-500/10">
          <span className="text-[10px] font-mono uppercase text-amber-300 block truncate font-semibold">Queued Backoff</span>
          <span className="text-2xl font-bold text-amber-200 font-mono">{queuedCount}</span>
          <div className="text-[10px] text-amber-400/80">Awaiting retry window</div>
        </div>

        <div className="glass-card border border-teal-500/30 rounded-xl p-3.5 shadow-lg bg-teal-500/10">
          <span className="text-[10px] font-mono uppercase text-teal-300 block truncate font-semibold">In Active Retry</span>
          <span className="text-2xl font-bold text-teal-200 font-mono">{retryingCount}</span>
          <div className="text-[10px] text-teal-300">Re-dispatching</div>
        </div>

        <div className="glass-card border border-rose-500/30 rounded-xl p-3.5 shadow-lg bg-rose-500/10">
          <span className="text-[10px] font-mono uppercase text-rose-300 block truncate">Non-Retryable</span>
          <span className="text-2xl font-bold text-rose-200 font-mono">{nonRetryableCount}</span>
          <div className="text-[10px] text-rose-400/80">Officer intervention needed</div>
        </div>
      </div>

      {/* Exceptions List Card */}
      <section className="glass-card border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-white/10">
            {[
              { id: 'ALL', label: 'All', count: exceptions.length },
              { id: 'QUEUED', label: 'Queued', count: queuedCount },
              { id: 'RETRYING', label: 'Retrying', count: retryingCount },
              { id: 'NON_RETRYABLE', label: 'Non-Retryable', count: nonRetryableCount },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition flex items-center space-x-1.5 cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-teal-500/20 text-teal-300 font-bold border border-teal-500/40 shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  statusFilter === tab.id ? 'bg-teal-500/30 text-teal-200 font-bold' : 'bg-slate-800 text-slate-400'
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
              placeholder="Search exceptions..."
              className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition shadow-inner"
            />
          </div>
        </div>

        {/* Exceptions Grid / List */}
        <div className="space-y-3">
          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 text-teal-400 animate-spin mx-auto mb-2" />
              <p className="text-xs">Loading exception records...</p>
            </div>
          ) : displayedExceptions.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-sm font-semibold text-white">Zero Exceptions in Queue</p>
              <p className="text-xs text-slate-400">All connector adapters and workflow executions are operating normally.</p>
            </div>
          ) : (
            displayedExceptions.map((ex) => {
              const isNonRetryable = ex.status === 'NON_RETRYABLE' || ex.retryable === false;
              const isQueued = ex.status === 'QUEUED';
              const isRetrying = ex.status === 'RETRYING';
              const targetRef = ex.id || ex.application_id;
              const isOperating = resumingAppId === targetRef;

              return (
                <div
                  key={ex.id || ex.application_id}
                  className={`p-4 bg-slate-900/80 border rounded-2xl space-y-2.5 text-xs font-mono transition shadow-lg ${
                    isQueued
                      ? 'border-amber-500/30 hover:border-amber-400/50 bg-amber-500/5'
                      : isNonRetryable
                      ? 'border-white/10 hover:border-white/20'
                      : 'border-rose-500/30 hover:border-rose-400/50 bg-rose-500/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-rose-400 text-sm">{ex.application_id}</span>
                      <span className="text-slate-300 text-[11px] font-sans">({ex.step_name})</span>
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300">
                        {ex.department_code || 'GRID'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {isQueued && (
                        <span className="status-chip status-chip-queued text-[10px]">
                          QUEUED
                        </span>
                      )}
                      {isRetrying && (
                        <span className="status-chip status-chip-retrying text-[10px] animate-pulse">
                          RETRYING
                        </span>
                      )}
                      {isNonRetryable && (
                        <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-full border border-white/10 font-bold">
                          NON_RETRYABLE
                        </span>
                      )}
                      {!isQueued && !isRetrying && !isNonRetryable && (
                        <span className="status-chip status-chip-failed text-[10px]">
                          {ex.status}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-rose-200 font-sans text-xs leading-relaxed bg-slate-950/80 p-3 rounded-xl border border-rose-500/20 shadow-inner">
                    {ex.error_details || 'Verification paused due to connection reset or department response timeout.'}
                  </p>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-slate-400 pt-1">
                    <div className="flex items-center space-x-3">
                      <span>Attempts: <strong className="text-white">{ex.attempts || 1}</strong> / Retries: <strong className="text-white">{ex.retry_count || 0}</strong></span>
                      <span>•</span>
                      <span>Corr: <strong className="text-slate-300">{ex.correlation_id || 'N/A'}</strong></span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/portal/applications/${ex.application_id}`}
                        className="text-teal-400 hover:text-teal-300 flex items-center space-x-1 font-semibold"
                      >
                        <span>Inspect Application</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>

                      {isNonRetryable ? (
                        <span className="text-[10px] text-slate-400 italic bg-slate-800 px-2 py-1 rounded-lg border border-white/10">
                          Non-Retryable Error
                        </span>
                      ) : (
                        <button
                          onClick={() => handleRetryException(targetRef)}
                          disabled={isOperating}
                          className="px-3 py-1 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 disabled:opacity-50 transition shadow-md shadow-teal-500/20 cursor-pointer"
                        >
                          <RotateCcw className={`w-3 h-3 ${isOperating ? 'animate-spin' : ''}`} />
                          <span>{isOperating ? 'Retrying...' : 'Retry Step'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
