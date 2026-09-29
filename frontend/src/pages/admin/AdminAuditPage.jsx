import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Terminal,
  Zap,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Clock
} from 'lucide-react';
import adminService from '../../services/adminService';

export default function AdminAuditPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [viewTab, setViewTab] = useState('AUDIT'); // 'AUDIT' or 'LIVE_EVENTS'
  const [searchTerm, setSearchTerm] = useState('');

  const [auditLogs, setAuditLogs] = useState([]);
  const [liveEvents, setLiveEvents] = useState([]);

  const loadLogs = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await adminService.getDashboard();
      setAuditLogs(data?.recentAuditEvents || []);
      setLiveEvents(data?.liveEvents || []);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    let timer;
    if (autoRefresh) {
      timer = setInterval(() => {
        loadLogs(true);
      }, 10000);
    }
    return () => clearInterval(timer);
  }, [autoRefresh]);

  let displayedLogs = auditLogs;
  if (searchTerm.trim()) {
    const q = searchTerm.toLowerCase();
    displayedLogs = displayedLogs.filter(
      (log) =>
        log.action?.toLowerCase().includes(q) ||
        log.actor_id?.toLowerCase().includes(q) ||
        log.actor_type?.toLowerCase().includes(q) ||
        log.entity_id?.toLowerCase().includes(q) ||
        log.department_code?.toLowerCase().includes(q) ||
        log.request_id?.toLowerCase().includes(q)
    );
  }

  let displayedEvents = liveEvents;
  if (searchTerm.trim()) {
    const q = searchTerm.toLowerCase();
    displayedEvents = displayedEvents.filter(
      (evt) =>
        evt.description?.toLowerCase().includes(q) ||
        evt.reference?.toLowerCase().includes(q) ||
        evt.actor?.toLowerCase().includes(q) ||
        evt.event_type?.toLowerCase().includes(q)
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
            <span className="text-white font-semibold">Audit Trail & Telemetry Logs</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <Terminal className="w-6 h-6 text-teal-400" />
            <span>Immutable Audit Trail & Live Events Bus</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Cryptographically verifiable record of cross-department operations, citizen consents, and system dispatches
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
            onClick={() => loadLogs(true)}
            disabled={refreshing}
            className="flex items-center space-x-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-white/10 px-3 py-1.5 rounded-xl transition disabled:opacity-50 shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-teal-400' : 'text-slate-400'}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* View Switcher Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 bg-slate-900/90 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setViewTab('AUDIT')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              viewTab === 'AUDIT'
                ? 'bg-teal-500/20 text-teal-300 font-bold shadow-xs border border-teal-500/40'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Audit Trail Logs ({auditLogs.length})</span>
          </button>

          <button
            onClick={() => setViewTab('LIVE_EVENTS')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              viewTab === 'LIVE_EVENTS'
                ? 'bg-teal-500/20 text-teal-300 font-bold shadow-xs border border-teal-500/40'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Live Operational Bus ({liveEvents.length})</span>
          </button>
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={viewTab === 'AUDIT' ? 'Search by actor, action, entity, request ID...' : 'Search live events stream...'}
            className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition shadow-inner"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {viewTab === 'AUDIT' ? (
        <section className="glass-card border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                <span>Immutable Cryptographic Audit Trail</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Full compliance record: actor identification, department codes, action payloads, and execution results
              </p>
            </div>
            <span className="text-xs font-mono text-teal-300 bg-teal-500/10 border border-teal-500/30 px-2.5 py-1 rounded-full font-medium">
              {displayedLogs.length} Records
            </span>
          </div>

          <div className="space-y-2.5">
            {loading ? (
              <div className="py-12 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 text-teal-400 animate-spin mx-auto mb-2" />
                <p className="text-xs">Loading cryptographic audit trail...</p>
              </div>
            ) : displayedLogs.length === 0 ? (
              <p className="text-center py-12 text-slate-400 text-xs">No audit logs matching search criteria.</p>
            ) : (
              displayedLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 bg-slate-900/80 border border-white/10 rounded-xl text-xs font-mono space-y-1.5 hover:border-white/20 transition shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white font-sans text-sm">{log.action}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300">
                        {log.department_code || 'GRID'}
                      </span>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      log.status === 'SUCCESS' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    }`}>
                      {log.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300 font-sans">
                    <span>Actor: <strong className="text-white font-mono">{log.actor_id}</strong> ({log.actor_type})</span>
                    <span>•</span>
                    <span>Target Entity: <strong className="text-white font-mono">{log.entity_id}</strong></span>
                    <span>•</span>
                    <span>Request ID: <span className="font-mono text-slate-400">{log.request_id || 'N/A'}</span></span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-white/5">
                    <span>Log ID: {log.id}</span>
                    <span>{new Date(log.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      ) : (
        <section className="glass-card border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <Zap className="w-4 h-4 text-teal-400" />
                <span>Live Operational Event Bus</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time operational stream merging audit events and API telemetry
              </p>
            </div>
            <span className="flex items-center space-x-1.5 text-[10px] font-mono font-bold text-teal-300 bg-teal-500/10 px-2.5 py-1 rounded-full border border-teal-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
              <span>LIVE FEED</span>
            </span>
          </div>

          <div className="space-y-2">
            {loading ? (
              <div className="py-12 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 text-teal-400 animate-spin mx-auto mb-2" />
                <p className="text-xs">Loading live event stream...</p>
              </div>
            ) : displayedEvents.length === 0 ? (
              <p className="text-center py-12 text-slate-400 text-xs">No live events recorded matching query.</p>
            ) : (
              displayedEvents.map((evt, idx) => (
                <div
                  key={`${evt.id}-${idx}`}
                  className="p-3 bg-slate-900/80 border border-white/10 rounded-xl text-xs font-mono flex items-start justify-between gap-3 hover:bg-slate-800/60 transition shadow-md"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        evt.event_type === 'AUDIT' ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' : 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                      }`}>
                        {evt.event_type}
                      </span>
                      <span className="text-white font-sans font-semibold text-xs">{evt.description}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-sans flex items-center space-x-2">
                      <span>Ref: <strong className="font-mono text-slate-300">{evt.reference || 'SYSTEM'}</strong></span>
                      <span>•</span>
                      <span>Actor: <strong className="text-slate-300">{evt.actor}</strong></span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      evt.status === 'SUCCESS' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    }`}>
                      {evt.status}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      {new Date(evt.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}
