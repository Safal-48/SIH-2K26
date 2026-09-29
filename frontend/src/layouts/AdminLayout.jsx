import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, 
  Server, 
  Activity, 
  Lock, 
  LogOut, 
  User, 
  ExternalLink,
  Cpu,
  Layers,
  Database,
  Sparkles,
  ChevronRight,
  TrendingUp,
  ShieldAlert,
  Terminal,
  Bell,
  Menu,
  X
} from 'lucide-react';
import GovHeaderStrip from '../components/GovHeaderStrip';

export default function AdminLayout() {
  const { user, logout, loginAsDemoAdmin, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const adminNavItems = [
    { to: '/admin', label: 'Overview', icon: Activity, exact: true },
    { to: '/admin/workflows', label: 'Workflows', icon: Layers, exact: true },
    { to: '/admin/sla', label: 'SLA Telemetry', icon: TrendingUp },
    { to: '/admin/exceptions', label: 'Exceptions', icon: ShieldAlert },
    { to: '/admin/audit', label: 'Audit Trail', icon: Terminal },
    { to: '/admin/notifications', label: 'Notifications', icon: Bell },
    { to: '/admin/services', label: 'Services', icon: Server },
    { to: '/admin/mappings', label: 'Mappings', icon: Database },
    { to: '/admin/workflows/builder', label: 'Builder', icon: Cpu },
    { to: '/admin/demo', label: 'Demo Simulator', icon: Sparkles, highlight: true },
  ];

  // If not admin, render access control guard
  if (!isAdmin) {
    return (
      <div className="min-h-screen gov-pattern-bg text-slate-100 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full clean-card p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-rose-500/15 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto text-rose-400 shadow-lg shadow-rose-500/10">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-white">
              Restricted Access: ADMIN Role Required
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              The Admin Control Center is restricted to authorized platform administrators and system orchestrators. Your current role ({user?.role || 'UNAUTHENTICATED'}) cannot access admin operations.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={async () => {
                await loginAsDemoAdmin();
              }}
              disabled={loading}
              className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-lg shadow-teal-500/20 transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{loading ? 'Authenticating...' : 'Authenticate as Demo Administrator'}</span>
            </button>

            <Link
              to="/portal"
              className="w-full bg-white/5 hover:bg-white/10 text-slate-200 font-semibold text-xs py-2.5 px-4 rounded-xl transition flex items-center justify-center space-x-2 border border-white/10"
            >
              <span>Return to Citizen Portal</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isNavActive = (item) => {
    if (item.exact) {
      return location.pathname === item.to;
    }
    return location.pathname.startsWith(item.to);
  };

  return (
    <div className="min-h-screen gov-pattern-bg text-slate-100 flex flex-col font-sans selection:bg-teal-500/30 selection:text-teal-200">
      {/* Official Government Top Utility Strip with Tricolor */}
      <GovHeaderStrip />

      {/* Top Header Bar */}
      <header className="bg-slate-900/85 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Branding & Subsystem */}
            <div className="flex items-center shrink-0">
              <Link to="/admin" className="flex items-center gap-3.5 group">
                <img 
                  src="/pragati-logo-dark.png" 
                  alt="PRAGATI - Seamless Services • Stronger India" 
                  className="h-9 sm:h-10 w-auto object-contain transition duration-200 group-hover:brightness-110"
                />
                <div className="h-7 w-px bg-white/10 hidden sm:block" />
                <div className="hidden sm:flex flex-col justify-center">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold tracking-wider uppercase text-indigo-400 font-sans">
                      Admin Control
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-mono font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mr-1 animate-pulse" />
                      SYSTEM MESH
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-normal">
                    Cross-Department Orchestration Console
                  </p>
                </div>
              </Link>
            </div>

            {/* Quick Actions & Session Controls */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Mesh State Badge */}
              <div className="hidden sm:flex items-center space-x-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-2.5 py-1 rounded-full text-xs font-mono font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>GRID: ONLINE</span>
              </div>

              {/* Citizen Portal Link */}
              <Link
                to="/portal"
                className="hidden lg:flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white transition bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 font-medium"
              >
                <span>Citizen View</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </Link>

              {/* Current Admin User Badge */}
              <div className="flex items-center space-x-2 pl-2 border-l border-white/10">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 border border-white/10 flex items-center justify-center text-white shadow-xs">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="hidden sm:block text-left">
                  <span className="text-xs font-semibold text-white block leading-tight">
                    {user?.fullName || 'Administrator'}
                  </span>
                  <span className="text-[10px] font-mono text-indigo-300 uppercase">
                    {user?.role}
                  </span>
                </div>

                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  title="Sign out"
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-white/5 rounded-lg transition ml-1 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile menu hamburger button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="xl:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 focus:outline-hidden cursor-pointer"
                aria-label="Toggle admin navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Sub-Navbar with all 10 Dedicated Pages (Desktop) */}
        <div className="hidden xl:block bg-slate-950/60 backdrop-blur-md border-t border-white/5 py-1.5 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <nav className="flex items-center space-x-1 overflow-x-auto">
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                const active = isNavActive(item);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                      active
                        ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold shadow-md shadow-teal-500/20'
                        : item.highlight
                        ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : item.highlight ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <span className="text-[11px] font-mono text-slate-400">
              NATIONAL INTEROPERABILITY GRID • v1.0
            </span>
          </div>
        </div>

        {/* Mobile Navigation Drawer for Admin */}
        {mobileMenuOpen && (
          <div className="xl:hidden py-3 px-4 border-t border-white/10 space-y-1 bg-slate-900/95 backdrop-blur-xl">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const active = isNavActive(item);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                    active
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold'
                      : item.highlight
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <div className="pt-2 border-t border-white/10">
              <Link
                to="/portal"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-white/5"
              >
                <span>Switch to Citizen Portal</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Outlet />
      </main>

      {/* Admin Footer */}
      <footer className="border-t border-white/10 bg-slate-950/90 text-slate-400 py-6 text-xs mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <img src="/pragati-logo-dark.png" alt="PRAGATI" className="h-7 w-auto object-contain" />
            <div className="h-5 w-px bg-white/10 hidden sm:block" />
            <span className="font-mono text-slate-300">
              PRAGATI Interoperability Orchestrator &bull; Production Ready
            </span>
          </div>
          <div className="flex items-center space-x-4 text-[11px] text-slate-400">
            <Link to="/admin/workflows" className="hover:text-white transition">Workflows</Link>
            <span>&bull;</span>
            <Link to="/admin/sla" className="hover:text-white transition">SLA Matrix</Link>
            <span>&bull;</span>
            <Link to="/admin/audit" className="hover:text-white transition">Audit Logs</Link>
            <span>&bull;</span>
            <Link to="/admin/demo" className="hover:text-amber-300 text-amber-400 font-semibold transition">Simulator</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
