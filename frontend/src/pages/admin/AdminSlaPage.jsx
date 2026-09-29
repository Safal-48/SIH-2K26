import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Server,
  Activity
} from 'lucide-react';
import adminService from '../../services/adminService';

export default function AdminSlaPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [evaluatingSla, setEvaluatingSla] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);
  const [error, setError] = useState('');
  const [slaData, setSlaData] = useState({});

  const loadSlaData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const data = await adminService.getDashboard();
      setSlaData(data?.slaMonitoring || {});
    } catch (err) {
      setError(err.message || 'Failed to retrieve SLA monitoring telemetry');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSlaData();
  }, []);

  useEffect(() => {
    let timer;
    if (autoRefresh) {
      timer = setInterval(() => {
        loadSlaData(true);
      }, 10000);
    }
    return () => clearInterval(timer);
  }, [autoRefresh]);

  const handleEvaluateSlaAlerts = async () => {
    try {
      setEvaluatingSla(true);
      setActionNotice({ type: 'info', message: 'Evaluating 48-hour SLA metrics across all active workflows...' });
      const res = await adminService.evaluateSla(48);
      setActionNotice({
        type: 'success',
        message: `SLA Evaluation Complete: ${res.alertsCreated} alert(s) dispatched (${res.breachedCount} breached, ${res.approachingCount} approaching, target: 48h).`,
      });
      await loadSlaData(true);
    } catch (err) {
      setActionNotice({
        type: 'error',
        message: `SLA Evaluation failed: ${err.message}`,
      });
    } finally {
      setEvaluatingSla(false);
    }
  };

  const { applicationSla = {}, distribution = {}, departments = [] } = slaData;

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
            <Link to="/admin" className="hover:text-teal-300 transition">Admin Console</Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-white font-semibold">SLA Monitoring & Gateway Latency</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <TrendingUp className="w-6 h-6 text-teal-400" />
            <span>End-to-End Application SLA & Connector Latency Telemetry</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Standard Demo Target: 48 Hours. Automated SLA compliance computed from actual PostgreSQL timestamps.
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
            onClick={() => loadSlaData(true)}
            disabled={refreshing}
            className="flex items-center space-x-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-white/10 px-3 py-1.5 rounded-xl transition disabled:opacity-50 shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-teal-400' : 'text-slate-400'}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleEvaluateSlaAlerts}
            disabled={evaluatingSla}
            className="px-3.5 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-mono text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shadow-md shadow-teal-500/20 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${evaluatingSla ? 'animate-spin' : ''}`} />
            <span>{evaluatingSla ? 'Evaluating...' : 'Evaluate SLA Alerts'}</span>
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
              : 'bg-rose-500/15 border-rose-500/30 text-rose-200'
          }`}
        >
          <span className="font-medium">{actionNotice.message}</span>
          <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-white font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Real-time Calculated SLA Metric KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono">
        <div className="p-4 glass-card rounded-xl border border-white/10 shadow-lg">
          <span className="text-[10px] text-slate-400 block font-sans">Applications Evaluated</span>
          <span className="text-2xl font-bold text-white">{applicationSla?.totalApplications || 0}</span>
          <span className="text-[10px] text-slate-500 block font-sans">Total processed cases</span>
        </div>

        <div className="p-4 glass-card rounded-xl border border-emerald-500/30 bg-emerald-500/10 shadow-lg">
          <span className="text-[10px] text-emerald-300 block font-sans flex items-center space-x-1 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>SLA Met (≤ 36h)</span>
          </span>
          <span className="text-2xl font-bold text-emerald-200">{applicationSla?.metCount || 0}</span>
          <span className="text-[10px] text-emerald-400/80 block font-sans">Within primary threshold</span>
        </div>

        <div className="p-4 glass-card rounded-xl border border-amber-500/30 bg-amber-500/10 shadow-lg">
          <span className="text-[10px] text-amber-300 block font-sans flex items-center space-x-1 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Approaching (36h-48h)</span>
          </span>
          <span className="text-2xl font-bold text-amber-200">{applicationSla?.approachingCount || 0}</span>
          <span className="text-[10px] text-amber-400/80 block font-sans">Near 48h limit</span>
        </div>

        <div className="p-4 glass-card rounded-xl border border-rose-500/30 bg-rose-500/10 shadow-lg">
          <span className="text-[10px] text-rose-300 block font-sans flex items-center space-x-1 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>SLA Breached (&gt; 48h)</span>
          </span>
          <span className="text-2xl font-bold text-rose-200">{applicationSla?.breachedCount || 0}</span>
          <span className="text-[10px] text-rose-400/80 block font-sans">Over 48h deadline</span>
        </div>

        <div className="p-4 glass-card rounded-xl border border-white/10 shadow-lg">
          <span className="text-[10px] text-slate-400 block font-sans">Avg Turnaround Time</span>
          <span className="text-2xl font-bold text-teal-300">
            {applicationSla?.avgTurnaroundHours || 0}h
          </span>
          <span className="text-[10px] text-slate-400 block font-sans">
            Compliance: <strong className="text-teal-400 font-semibold">{applicationSla?.complianceRate ?? 100}%</strong>
          </span>
        </div>
      </div>

      {/* Dual Layout: Application SLA Breakdown & Connector Latency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Section: Application SLA Details Table */}
        <div className="glass-card border border-white/10 rounded-2xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Clock className="w-4 h-4 text-teal-400" />
                <span>Application SLA Breakdown</span>
              </h3>
              <p className="text-xs text-slate-400">Calculated from actual database timestamps</p>
            </div>
            <span className="text-[11px] text-teal-300 font-mono bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/30">
              {applicationSla?.applications?.length || 0} applications
            </span>
          </div>

          <div className="overflow-x-auto max-h-[420px] overflow-y-auto border border-white/10 rounded-xl bg-slate-900/90">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-300 font-semibold text-[10px] bg-slate-950/80 sticky top-0 backdrop-blur-xs">
                  <th className="py-2.5 px-3">Application ID</th>
                  <th className="py-2.5 px-2">Submitted</th>
                  <th className="py-2.5 px-2 text-right">Elapsed</th>
                  <th className="py-2.5 px-3 text-right">SLA Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                {(!applicationSla?.applications || applicationSla.applications.length === 0) ? (
                  <tr>
                    <td colSpan="4" className="py-12 text-center text-slate-400 font-sans">
                      No application records found for SLA computation.
                    </td>
                  </tr>
                ) : (
                  applicationSla.applications.map((app) => {
                    const isBreach = app.slaStatus === 'BREACHED';
                    const isApproaching = app.slaStatus === 'APPROACHING';

                    return (
                      <tr key={app.applicationId} className="hover:bg-slate-800/50 transition">
                        <td className="py-2.5 px-3 font-bold text-teal-300">
                          <div>
                            <Link to={`/portal/applications/${app.applicationId}`} className="hover:underline">
                              {app.applicationId}
                            </Link>
                            <span className="text-[10px] text-slate-400 block font-normal">{app.citizenId}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-slate-400 text-[10px]">
                          {app.submissionDate ? new Date(app.submissionDate).toLocaleDateString('en-IN') : 'Recent'}
                        </td>
                        <td className="py-2.5 px-2 text-right font-bold text-slate-200">
                          {app.elapsedHours}h
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {isBreach ? (
                            <span className="status-chip status-chip-sla-breach text-[10px]">
                              SLA Breach ({app.elapsedHours}h)
                            </span>
                          ) : isApproaching ? (
                            <span className="status-chip status-chip-retrying text-[10px]">
                              Approaching ({app.elapsedHours}h)
                            </span>
                          ) : (
                            <span className="status-chip status-chip-verified text-[10px]">
                              SLA Met ({app.elapsedHours}h)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Section: Connector Gateway Latency Breakdown */}
        <div className="glass-card border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Server className="w-4 h-4 text-teal-400" />
                <span>Department Gateway Latency & Breaches</span>
              </h3>
              <p className="text-xs text-slate-400">Threshold: 1000ms SLA target</p>
            </div>
            <span className="text-[11px] font-mono text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
              {applicationSla?.complianceRate ?? 100}% Grid Compliance
            </span>
          </div>

          {/* Latency Distribution Buckets */}
          <div className="grid grid-cols-3 gap-2 text-center font-mono">
            <div className="p-3 bg-slate-900/80 rounded-xl border border-white/10">
              <span className="text-[10px] text-slate-400 block font-sans">&lt; 100ms</span>
              <span className="text-lg font-bold text-emerald-300">{distribution?.under100ms || 0}</span>
              <span className="text-[10px] text-slate-500 block font-sans">Fast Responses</span>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-white/10">
              <span className="text-[10px] text-slate-400 block font-sans">100 - 500ms</span>
              <span className="text-lg font-bold text-teal-300">{distribution?.between100And500ms || 0}</span>
              <span className="text-[10px] text-slate-500 block font-sans">Standard Latency</span>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-white/10">
              <span className="text-[10px] text-slate-400 block font-sans">&gt; 500ms</span>
              <span className="text-lg font-bold text-amber-300">{distribution?.over500ms || 0}</span>
              <span className="text-[10px] text-slate-500 block font-sans">Elevated / Slow</span>
            </div>
          </div>

          {/* Department Breakdown Table */}
          <div className="overflow-x-auto border border-white/10 rounded-xl bg-slate-900/90">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-300 font-semibold text-[10px] bg-slate-950/80">
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-2 text-right">Avg Latency</th>
                  <th className="py-2.5 px-2 text-right">Breaches</th>
                  <th className="py-2.5 px-3 text-right">Compliance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                {departments?.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-slate-500 font-sans">
                      No departmental latency data recorded yet.
                    </td>
                  </tr>
                ) : (
                  departments.map((d) => (
                    <tr key={d.department} className="hover:bg-slate-800/50">
                      <td className="py-2.5 px-3 font-semibold text-white">
                        {d.department} - {d.serviceName?.split('&')[0]}
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-300">{d.avgLatencyMs}ms</td>
                      <td className="py-2.5 px-2 text-right font-bold text-rose-400">{d.breachCount}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`font-bold ${d.complianceRate >= 95 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {d.complianceRate}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
