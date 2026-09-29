import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  ChevronRight,
  ArrowUpRight,
  Clock,
  ShieldAlert
} from 'lucide-react';
import adminService from '../../services/adminService';

export default function AdminNotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const loadNotifications = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const notifs = await adminService.getNotifications({ limit: 100 });
      setNotifications(notifs || []);
    } catch (err) {
      console.error('Failed to load operational notifications', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    let timer;
    if (autoRefresh) {
      timer = setInterval(() => {
        loadNotifications(true);
      }, 10000);
    }
    return () => clearInterval(timer);
  }, [autoRefresh]);

  const getNotificationBadge = (type) => {
    const t = String(type || '').toUpperCase().replace(/\s+/g, '_');
    switch (t) {
      case 'APPLICATION_SUBMITTED':
        return { label: 'Application Submitted', bg: 'bg-blue-500/15 text-blue-300 border-blue-500/30' };
      case 'VERIFICATION_COMPLETED':
        return { label: 'Verification Completed', bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
      case 'SERVICE_UNAVAILABLE':
        return { label: 'Service Unavailable', bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
      case 'RETRY_SUCCEEDED':
        return { label: 'Retry Succeeded', bg: 'bg-teal-500/15 text-teal-300 border-teal-500/30' };
      case 'OFFICER_ACTION_REQUIRED':
        return { label: 'Action Required', bg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' };
      case 'ELIGIBLE':
        return { label: 'Eligible', bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
      case 'NOT_ELIGIBLE':
        return { label: 'Not Eligible', bg: 'bg-rose-500/15 text-rose-300 border-rose-500/30' };
      case 'SLA_APPROACHING':
        return { label: 'SLA Approaching', bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
      case 'SLA_BREACHED':
        return { label: 'SLA Breached', bg: 'bg-rose-500/15 text-rose-300 border-rose-500/30' };
      default:
        return { label: t || 'System Notice', bg: 'bg-slate-800 text-slate-300 border-white/10' };
    }
  };

  const notificationTypes = [
    { id: 'ALL', label: 'All Types' },
    { id: 'APPLICATION_SUBMITTED', label: 'Submitted' },
    { id: 'VERIFICATION_COMPLETED', label: 'Verified' },
    { id: 'SERVICE_UNAVAILABLE', label: 'Unavailable' },
    { id: 'RETRY_SUCCEEDED', label: 'Retried' },
    { id: 'OFFICER_ACTION_REQUIRED', label: 'Action Req' },
    { id: 'ELIGIBLE', label: 'Eligible' },
    { id: 'NOT_ELIGIBLE', label: 'Not Eligible' },
    { id: 'SLA_APPROACHING', label: 'SLA Approaching' },
    { id: 'SLA_BREACHED', label: 'SLA Breached' },
  ];

  let displayedNotifs = notifications;
  if (typeFilter !== 'ALL') {
    displayedNotifs = displayedNotifs.filter((n) => n.type === typeFilter);
  }

  if (searchTerm.trim()) {
    const q = searchTerm.toLowerCase();
    displayedNotifs = displayedNotifs.filter(
      (n) =>
        n.title?.toLowerCase().includes(q) ||
        n.message?.toLowerCase().includes(q) ||
        n.application_id?.toLowerCase().includes(q) ||
        n.citizen_id?.toLowerCase().includes(q)
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
            <Link to="/admin" className="hover:text-teal-400 transition">Admin Console</Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-white font-semibold">Operational Notifications</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <Bell className="w-6 h-6 text-teal-400" />
            <span>Operational Notifications & System Dispatch Log</span>
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Live alerts across all 9 workflow triggers: submissions, verifications, failures, retries, officer actions, eligibility, and SLA alerts
          </p>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center space-x-1.5 text-xs font-mono px-3 py-1.5 rounded-xl border transition shadow-md ${
              autoRefresh
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 font-bold shadow-teal-900/30'
                : 'glass-card bg-slate-800/80 text-slate-300 border-white/10 hover:text-white hover:bg-slate-700/80'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-teal-400 animate-ping' : 'bg-slate-500'}`} />
            <span>Auto (10s)</span>
          </button>

          <button
            onClick={() => loadNotifications(true)}
            disabled={refreshing}
            className="flex items-center space-x-1.5 text-xs font-semibold text-slate-200 glass-card bg-slate-800/80 hover:bg-slate-700/80 hover:text-white border border-white/10 px-3.5 py-1.5 rounded-xl transition disabled:opacity-50 shadow-md cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-teal-400' : 'text-slate-400'}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Card */}
      <section className="glass-card border border-white/10 rounded-2xl p-5 space-y-4 shadow-2xl">
        {/* Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-white/10">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-xl border border-white/10 font-mono text-[11px]">
            {notificationTypes.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTypeFilter(tab.id)}
                className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  typeFilter === tab.id
                    ? 'bg-teal-600 text-white font-bold shadow-md shadow-teal-900/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title, message, application..."
              className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-inner"
            />
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-2.5">
          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 text-teal-400 animate-spin mx-auto mb-2" />
              <p className="text-xs">Loading operational dispatches from database...</p>
            </div>
          ) : displayedNotifs.length === 0 ? (
            <p className="text-center py-12 text-slate-400 text-xs">No notifications recorded matching this filter.</p>
          ) : (
            displayedNotifs.map((n) => {
              const badge = getNotificationBadge(n.type);

              return (
                <div
                  key={n.id}
                  className="p-4 bg-slate-900/80 border border-white/10 rounded-xl text-xs space-y-1.5 hover:border-white/20 transition shadow-lg"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badge.bg}`}>
                        {badge.label}
                      </span>
                      <span className="font-bold text-white text-sm font-sans">{n.title}</span>
                    </div>

                    <span className="text-[10px] text-slate-400 font-mono">
                      {n.created_at ? new Date(n.created_at).toLocaleString('en-IN') : 'Recent'}
                    </span>
                  </div>

                  <p className="text-slate-300 leading-relaxed font-sans">{n.message}</p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-white/10 font-mono">
                    <div className="flex items-center space-x-3">
                      {n.application_id && (
                        <span>App: <strong className="text-teal-300">{n.application_id}</strong></span>
                      )}
                      {n.citizen_id && (
                        <span>Citizen: <strong className="text-slate-200">{n.citizen_id}</strong></span>
                      )}
                    </div>

                    {n.application_id && (
                      <Link
                        to={`/portal/applications/${n.application_id}`}
                        className="text-teal-400 hover:text-teal-300 hover:underline flex items-center space-x-1 font-semibold"
                      >
                        <span>Inspect Application</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
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
