import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  RefreshCw,
  Search,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import citizenService from '../../services/citizenService';

export default function CitizenNotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterTab, setFilterTab] = useState('ALL'); // ALL, UNREAD, READ
  const [searchTerm, setSearchTerm] = useState('');

  const loadNotifications = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const citizenId = user?.citizenId || 'CZN-1001';
      const data = await citizenService.getNotifications(citizenId);
      setNotifications(data || []);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [user?.citizenId]);

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

  let displayedNotifs = notifications;
  if (filterTab === 'UNREAD') {
    displayedNotifs = displayedNotifs.filter((n) => !n.is_read && !n.read);
  } else if (filterTab === 'READ') {
    displayedNotifs = displayedNotifs.filter((n) => n.is_read || n.read);
  }

  if (searchTerm.trim()) {
    const q = searchTerm.toLowerCase();
    displayedNotifs = displayedNotifs.filter(
      (n) =>
        n.title?.toLowerCase().includes(q) ||
        n.message?.toLowerCase().includes(q) ||
        n.application_id?.toLowerCase().includes(q)
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read && !n.read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
            <Link to="/portal" className="hover:text-teal-400 transition">Citizen Portal</Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-white font-semibold">Notifications & Alerts</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center space-x-2.5">
            <Bell className="w-6 h-6 text-teal-400" />
            <span>Notifications & Dispatches Inbox</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time updates regarding application progression, verification milestones, and consent events
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-teal-300 bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 rounded-xl transition cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}

          <button
            onClick={() => loadNotifications(true)}
            disabled={refreshing || loading}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Main Section */}
      <section className="glass-card p-5 sm:p-6 space-y-4 border border-white/10 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/10">
          <div className="flex items-center space-x-1.5 bg-slate-900/80 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setFilterTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                filterTab === 'ALL'
                  ? 'bg-slate-800 text-teal-300 border border-teal-500/40 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({notifications.length})
            </button>

            <button
              onClick={() => setFilterTab('UNREAD')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                filterTab === 'UNREAD'
                  ? 'bg-slate-800 text-teal-300 border border-teal-500/40 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Unread ({unreadCount})
            </button>

            <button
              onClick={() => setFilterTab('READ')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                filterTab === 'READ'
                  ? 'bg-slate-800 text-teal-300 border border-teal-500/40 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Read ({notifications.length - unreadCount})
            </button>
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search notifications..."
              className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 text-teal-400 animate-spin mx-auto mb-2" />
              <p className="text-xs">Loading alerts...</p>
            </div>
          ) : displayedNotifs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Bell className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-semibold text-white">No notifications found</p>
              <p className="text-xs text-slate-400">All alerts and notices will appear here automatically.</p>
            </div>
          ) : (
            displayedNotifs.map((notif, index) => {
              const badge = getNotificationBadge(notif.type);
              const isUnread = notif.is_read === false || notif.read === false;

              return (
                <div
                  key={notif.id || index}
                  className={`p-4 border rounded-xl transition text-xs relative ${
                    isUnread
                      ? 'bg-teal-500/10 border-teal-500/30 hover:bg-teal-500/15'
                      : 'bg-slate-900/70 border-white/10 hover:bg-slate-900/90'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${badge.bg}`}>
                        {badge.label}
                      </span>
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse shrink-0" title="Unread alert" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {notif.created_at
                        ? new Date(notif.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                        : 'Recent'}
                    </span>
                  </div>

                  <p className="text-white font-semibold text-sm leading-relaxed">
                    {notif.title || notif.message}
                  </p>

                  {notif.title && notif.message && notif.title !== notif.message && (
                    <p className="text-slate-300 mt-1 text-xs leading-relaxed">
                      {notif.message}
                    </p>
                  )}

                  <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-white/10 text-xs">
                    {notif.application_id ? (
                      <Link
                        to={`/portal/applications/${notif.application_id}`}
                        className="text-teal-400 hover:text-teal-300 font-semibold font-mono flex items-center space-x-1"
                      >
                        <span>View Application {notif.application_id}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <span className="text-slate-500 font-mono text-[10px]">CITIZEN NOTICE</span>
                    )}

                    {isUnread && notif.id && (
                      <button
                        onClick={(e) => handleMarkAsRead(notif.id, e)}
                        className="text-xs text-teal-400 hover:text-teal-300 font-medium cursor-pointer"
                      >
                        Mark as read
                      </button>
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
