import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Server,
  Cpu,
  Database,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  Play,
  RotateCcw,
  Zap,
  TrendingUp,
  ShieldAlert,
  ArrowUpRight,
  ChevronRight,
  Layers,
  Terminal,
  FileText,
  Users,
  Copy,
  Check,
  Bell,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import adminService from '../../services/adminService';

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [operationalNotifs, setOperationalNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [error, setError] = useState('');

  const loadDashboard = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const [dashboard, notifs] = await Promise.all([
        adminService.getDashboard(),
        adminService.getNotifications({ limit: 10 }),
      ]);
      setData(dashboard);
      setOperationalNotifs(notifs || []);
    } catch (err) {
      setError(err.message || 'Failed to retrieve admin telemetry');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    let timer;
    if (autoRefresh) {
      timer = setInterval(() => {
        loadDashboard(true);
      }, 10000);
    }
    return () => clearInterval(timer);
  }, [autoRefresh]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center p-24 space-y-4">
        <RefreshCw className="w-8 h-8 text-teal-400 animate-spin" />
        <p className="text-sm font-semibold text-slate-300">Loading Grid Operational Telemetry from PostgreSQL...</p>
      </div>
    );
  }

  const {
    overview = {},
    serviceHealth = [],
    activeWorkflows = [],
    completedWorkflows = [],
    pendingWorkflows = [],
    failedWorkflows = [],
    slaMonitoring = {},
    recentExceptions = [],
    recentAuditEvents = [],
    liveEvents = [],
  } = data || {};

  const totalExceptions = failedWorkflows.length + recentExceptions.length;

  return (
    <div className="space-y-8">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
              <Activity className="w-6 h-6 text-teal-400" />
              <span>Admin Control Center</span>
            </h1>
            <span className="text-xs font-mono bg-teal-500/10 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded font-semibold">
              EXECUTIVE OVERVIEW
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative Cross-Department Telemetry, Subsystems Launchpad & Operational Monitoring
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
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
            className="flex items-center space-x-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-white/10 px-3 py-1.5 rounded-xl transition disabled:opacity-50 shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-teal-400' : 'text-slate-400'}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Executive Key Performance Indicators Grid */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center space-x-2">
            <span>Direct PostgreSQL Aggregations</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* Total Applications */}
          <Link
            to="/admin/workflows"
            className="glass-card hover:border-teal-500/50 border border-white/10 rounded-xl p-4 space-y-1 shadow-lg transition group block"
          >
            <span className="text-[10px] font-mono uppercase text-slate-400 block truncate group-hover:text-teal-400">Total Applications</span>
            <span className="text-2xl font-bold text-white font-mono">{overview.totalApplications ?? 0}</span>
            <div className="text-[10px] text-teal-400 flex items-center space-x-1 pt-1 font-semibold">
              <span>View Grid</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
            </div>
          </Link>

          {/* Active Workflows */}
          <Link
            to="/admin/workflows"
            className="glass-card hover:border-teal-400 border border-teal-500/30 rounded-xl p-4 space-y-1 shadow-lg bg-teal-500/10 transition group block"
          >
            <span className="text-[10px] font-mono uppercase text-teal-300 block truncate font-semibold">Active Workflows</span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-bold text-teal-200 font-mono">{overview.activeWorkflows ?? 0}</span>
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            </div>
            <div className="text-[10px] text-teal-300 flex items-center space-x-1 pt-1 font-semibold">
              <span>Inspect Active</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
            </div>
          </Link>

          {/* Completed Workflows */}
          <Link
            to="/admin/workflows"
            className="glass-card hover:border-emerald-400 border border-emerald-500/30 rounded-xl p-4 space-y-1 shadow-lg bg-emerald-500/10 transition group block"
          >
            <span className="text-[10px] font-mono uppercase text-emerald-300 block truncate font-semibold">Sanctioned</span>
            <span className="text-2xl font-bold text-emerald-200 font-mono">{overview.completedWorkflows ?? 0}</span>
            <div className="text-[10px] text-emerald-300 flex items-center space-x-1 pt-1 font-semibold">
              <span>Full Clearance</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
            </div>
          </Link>

          {/* Failed / Exceptions */}
          <Link
            to="/admin/exceptions"
            className="glass-card hover:border-rose-400 border border-rose-500/30 rounded-xl p-4 space-y-1 shadow-lg bg-rose-500/10 transition group block"
          >
            <span className="text-[10px] font-mono uppercase text-rose-300 block truncate font-semibold">Exception Queue</span>
            <span className="text-2xl font-bold text-rose-300 font-mono">{overview.failedWorkflows ?? 0}</span>
            <div className="text-[10px] text-rose-300 flex items-center space-x-1 pt-1 font-semibold">
              <span>Manage Retries</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
            </div>
          </Link>

          {/* Avg Gateway Latency */}
          <Link
            to="/admin/sla"
            className="glass-card hover:border-teal-500/50 border border-white/10 rounded-xl p-4 space-y-1 shadow-lg transition group block"
          >
            <span className="text-[10px] font-mono uppercase text-slate-400 block truncate group-hover:text-teal-400">Avg Latency</span>
            <span className="text-2xl font-bold text-teal-300 font-mono">{overview.averageLatencyMs ?? 0}ms</span>
            <div className="text-[10px] text-slate-400 flex items-center space-x-1 pt-1">
              <span>Telemetry Mesh</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
            </div>
          </Link>

          {/* SLA Compliance */}
          <Link
            to="/admin/sla"
            className="glass-card hover:border-emerald-400 border border-white/10 rounded-xl p-4 space-y-1 shadow-lg transition group block"
          >
            <span className="text-[10px] font-mono uppercase text-slate-400 block truncate group-hover:text-emerald-400">SLA Target 48h</span>
            <span className="text-2xl font-bold text-emerald-300 font-mono">{overview.slaComplianceRate ?? 100}%</span>
            <div className="text-[10px] text-emerald-400 flex items-center space-x-1 pt-1 font-semibold">
              <span>View SLA Report</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
            </div>
          </Link>
        </div>
      </section>

      {/* 3. Primary Subsystem Launchpad (Dedicated Pages Navigation) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Layers className="w-5 h-5 text-teal-400" />
              <span>Dedicated Operational Subsystems & Functions</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select any function or section to open its dedicated page with deep filters, logs, and controls
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Workflows Orchestration Grid */}
          <Link
            to="/admin/workflows"
            className="glass-card border border-white/10 rounded-2xl p-5 shadow-xl hover:border-teal-500/50 hover:bg-slate-800/80 transition flex flex-col justify-between space-y-3 group cursor-pointer"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-300 shadow-md group-hover:scale-105 transition">
                  <Layers className="w-5 h-5 text-teal-300" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30">
                  {overview.totalApplications ?? 0} INSTANCES
                </span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-teal-300 transition flex items-center justify-between">
                <span>Workflows Orchestration Grid</span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Inspect, search, and monitor active, completed, pending, and failed workflow instances. Trigger instant manual resumes.
              </p>
            </div>
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-teal-400 group-hover:text-teal-300">
              <span className="font-mono text-[11px] text-slate-500">/admin/workflows</span>
              <span className="flex items-center space-x-1">
                <span>Open Workflows Page</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
              </span>
            </div>
          </Link>

          {/* 2. SLA & Gateway Latency Telemetry */}
          <Link
            to="/admin/sla"
            className="glass-card border border-white/10 rounded-2xl p-5 shadow-xl hover:border-teal-500/50 hover:bg-slate-800/80 transition flex flex-col justify-between space-y-3 group cursor-pointer"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shadow-md group-hover:scale-105 transition">
                  <TrendingUp className="w-5 h-5 text-emerald-300" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  {overview.slaComplianceRate ?? 100}% MET
                </span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition">
                SLA & Latency Telemetry
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Track 48-hour SLA adherence, approaching deadlines, and evaluate automated SLA alerts across department connectors.
              </p>
            </div>
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-emerald-400 group-hover:text-emerald-300">
              <span className="font-mono text-[11px] text-slate-500">/admin/sla</span>
              <span className="flex items-center space-x-1">
                <span>Open SLA Page</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
              </span>
            </div>
          </Link>

          {/* 3. Exception Queue & Recovery Controls */}
          <Link
            to="/admin/exceptions"
            className="glass-card border border-white/10 rounded-2xl p-5 shadow-xl hover:border-rose-500/50 hover:bg-slate-800/80 transition flex flex-col justify-between space-y-3 group cursor-pointer"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-300 shadow-md group-hover:scale-105 transition">
                  <ShieldAlert className="w-5 h-5 text-rose-300" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30">
                  {recentExceptions.length} CAUGHT
                </span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-rose-300 transition">
                Exception Queue & Recovery
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Step halts, transient error retries, backoff queue processing, and automated recovery actions.
              </p>
            </div>
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-rose-400 group-hover:text-rose-300">
              <span className="font-mono text-[11px] text-slate-500">/admin/exceptions</span>
              <span className="flex items-center space-x-1">
                <span>Manage Exceptions</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
              </span>
            </div>
          </Link>

          {/* 4. Immutable Audit Trail & Live Events */}
          <Link
            to="/admin/audit"
            className="glass-card border border-white/10 rounded-2xl p-5 shadow-xl hover:border-teal-500/50 hover:bg-slate-800/80 transition flex flex-col justify-between space-y-3 group cursor-pointer"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-300 shadow-md group-hover:scale-105 transition">
                  <Terminal className="w-5 h-5 text-teal-300" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/10">
                  {recentAuditEvents.length} LOGS
                </span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-teal-300 transition">
                Audit Trail & Live Events Bus
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Cryptographically verifiable record of cross-department operations, citizen consents, and real-time event stream.
              </p>
            </div>
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-teal-400 group-hover:text-teal-300">
              <span className="font-mono text-[11px] text-slate-500">/admin/audit</span>
              <span className="flex items-center space-x-1">
                <span>Inspect Logs</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
              </span>
            </div>
          </Link>

          {/* 5. Operational Notifications Feed */}
          <Link
            to="/admin/notifications"
            className="glass-card border border-white/10 rounded-2xl p-5 shadow-xl hover:border-teal-500/50 hover:bg-slate-800/80 transition flex flex-col justify-between space-y-3 group cursor-pointer"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-300 shadow-md group-hover:scale-105 transition">
                  <Bell className="w-5 h-5 text-blue-300" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30">
                  {operationalNotifs.length} DISPATCHES
                </span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition">
                Operational Notifications Feed
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                PostgreSQL persisted alerts across all 9 triggers: verifications, retries, officer actions, and SLA breaches.
              </p>
            </div>
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-blue-400 group-hover:text-blue-300">
              <span className="font-mono text-[11px] text-slate-500">/admin/notifications</span>
              <span className="flex items-center space-x-1">
                <span>Open Notifications</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
              </span>
            </div>
          </Link>

          {/* 6. Departmental Service Registry */}
          <Link
            to="/admin/services"
            className="glass-card border border-white/10 rounded-2xl p-5 shadow-xl hover:border-teal-500/50 hover:bg-slate-800/80 transition flex flex-col justify-between space-y-3 group cursor-pointer"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-300 shadow-md group-hover:scale-105 transition">
                  <Server className="w-5 h-5 text-teal-300" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30">
                  {serviceHealth.filter((s) => s.healthStatus === 'HEALTHY').length} / {serviceHealth.length} ONLINE
                </span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-teal-300 transition">
                Service Mesh & Connectors
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Direct heartbeat telemetry, response latency, and health probes across Higher Ed, Revenue, and PFMS adapters.
              </p>
            </div>
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-teal-400 group-hover:text-teal-300">
              <span className="font-mono text-[11px] text-slate-500">/admin/services</span>
              <span className="flex items-center space-x-1">
                <span>Open Service Registry</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
              </span>
            </div>
          </Link>

          {/* 7. Canonical Data Mappings */}
          <Link
            to="/admin/mappings"
            className="glass-card border border-white/10 rounded-2xl p-5 shadow-xl hover:border-purple-500/50 hover:bg-slate-800/80 transition flex flex-col justify-between space-y-3 group cursor-pointer"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300 shadow-md group-hover:scale-105 transition">
                  <Database className="w-5 h-5 text-purple-300" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30">
                  CANONICAL
                </span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition">
                Canonical Data Mappings
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Configure field mapping transformations, uppercase/currency normalizations, and live test transformation rules.
              </p>
            </div>
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-purple-400 group-hover:text-purple-300">
              <span className="font-mono text-[11px] text-slate-500">/admin/mappings</span>
              <span className="flex items-center space-x-1">
                <span>Open Data Mappings</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
              </span>
            </div>
          </Link>

          {/* 8. Visual Workflow Builder */}
          <Link
            to="/admin/workflows/builder"
            className="glass-card border border-white/10 rounded-2xl p-5 shadow-xl hover:border-teal-500/50 hover:bg-slate-800/80 transition flex flex-col justify-between space-y-3 group cursor-pointer"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-300 shadow-md group-hover:scale-105 transition">
                  <Cpu className="w-5 h-5 text-teal-300" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30">
                  VISUAL DB ENGINE
                </span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-teal-300 transition">
                Visual Workflow Builder
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Interactive step topology: drag, add, enable/disable connectors, and publish versioned definitions in PostgreSQL.
              </p>
            </div>
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-teal-400 group-hover:text-teal-300">
              <span className="font-mono text-[11px] text-slate-500">/admin/workflows/builder</span>
              <span className="flex items-center space-x-1">
                <span>Open Builder</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
              </span>
            </div>
          </Link>

          {/* 9. Interactive Demo Simulator */}
          <Link
            to="/admin/demo"
            className="glass-card border border-amber-500/30 rounded-2xl p-5 shadow-xl hover:border-amber-400 hover:bg-amber-500/5 transition flex flex-col justify-between space-y-3 group cursor-pointer"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-md group-hover:scale-105 transition">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  JUDGE DEMO
                </span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition">
                Demo Scenario Simulator
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                One-click test suite: inject Bank 503 outage, verify retry backoff, queue transitions, and execute recovery.
              </p>
            </div>
            <div className="pt-3 border-t border-amber-500/20 flex items-center justify-between text-xs font-semibold text-amber-400 group-hover:text-amber-300">
              <span className="font-mono text-[11px] text-amber-500">/admin/demo</span>
              <span className="flex items-center space-x-1">
                <span>Launch Simulator</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* 4. Concise Operational Highlights: Recent Workflows & Critical Dispatches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Workflows Snapshot */}
        <div className="glass-card border border-white/10 rounded-2xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Layers className="w-4 h-4 text-teal-400" />
                <span>Recent Workflows Snapshot</span>
              </h3>
              <p className="text-xs text-slate-400">Most recent executions across the mediation grid</p>
            </div>
            <Link
              to="/admin/workflows"
              className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center space-x-1"
            >
              <span>View All ({overview.totalApplications ?? 0})</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="divide-y divide-white/5">
            {activeWorkflows.concat(completedWorkflows).slice(0, 5).map((wf) => (
              <div key={wf.application_id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-mono font-bold text-teal-300">{wf.application_id}</span>
                  <span className="text-slate-400 ml-2 font-sans">{wf.scheme_name || 'Post-Matric Scheme'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-[10px] text-slate-400">{wf.current_step || 'Completed'}</span>
                  <Link
                    to={`/portal/applications/${wf.application_id}`}
                    className="text-teal-400 hover:text-teal-300 font-semibold"
                  >
                    Inspect
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Dispatches Snapshot */}
        <div className="glass-card border border-white/10 rounded-2xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Bell className="w-4 h-4 text-teal-400" />
                <span>Live Dispatch Alerts</span>
              </h3>
              <p className="text-xs text-slate-400">Latest operational notices in PostgreSQL</p>
            </div>
            <Link
              to="/admin/notifications"
              className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="divide-y divide-white/5">
            {operationalNotifs.slice(0, 5).map((n) => (
              <div key={n.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="space-y-0.5 max-w-[80%]">
                  <p className="font-semibold text-white truncate">{n.title}</p>
                  <p className="text-[11px] text-slate-400 truncate">{n.message}</p>
                </div>
                <span className="text-[10px] text-slate-500 font-mono shrink-0">
                  {n.created_at ? new Date(n.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
