import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  Building2, 
  GraduationCap, 
  FileText, 
  Bell, 
  User, 
  LogOut, 
  ExternalLink,
  Menu,
  X,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GovHeaderStrip from '../components/GovHeaderStrip';

export default function CitizenLayout() {
  const location = useLocation();
  const { user, logout, switchDemoCitizen } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { to: '/portal', label: 'Citizen Home', icon: Building2, exact: true },
    { to: '/portal/applications', label: 'My Applications', icon: FileText },
    { to: '/portal/apply', label: 'Apply Online', icon: GraduationCap },
    { to: '/portal/notifications', label: 'Notifications', icon: Bell },
  ];

  const isNavActive = (item) => {
    if (item.exact) {
      return location.pathname === item.to;
    }
    return location.pathname.startsWith(item.to);
  };

  return (
    <div className="min-h-screen gov-pattern-bg text-slate-100 flex flex-col font-sans">
      {/* Official Government Top Utility Strip with Tricolor */}
      <GovHeaderStrip />

      {/* Main Citizen Portal Header */}
      <header className="bg-slate-900/85 backdrop-blur-xl border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18">
            {/* Title Block */}
            <div className="flex items-center shrink-0">
              <Link to="/portal" className="flex items-center gap-3.5 group">
                <img 
                  src="/pragati-logo-dark.png" 
                  alt="PRAGATI - Seamless Services • Stronger India" 
                  className="h-9 sm:h-10 w-auto object-contain transition duration-200 group-hover:brightness-110"
                />
                <div className="h-7 w-px bg-white/10 hidden sm:block" />
                <div className="hidden sm:flex flex-col justify-center">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold tracking-wider uppercase text-teal-400 font-sans">
                      Citizen Services
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-mono font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
                      LIVE
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-normal">
                    Direct Benefit Transfer & Welfare Portal
                  </p>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation & Citizen Profile Session */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Desktop Nav Links */}
              <nav className="hidden md:flex items-center space-x-1">
                {navLinks.map((item) => {
                  const Icon = item.icon;
                  const active = isNavActive(item);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition ${
                        active
                          ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30 font-semibold shadow-xs'
                          : 'text-slate-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon className="w-4 h-4 text-teal-400" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="h-6 w-px bg-white/10 hidden md:block" />

              {/* Citizen Identity Chip */}
              {user ? (
                <div className="flex items-center space-x-2 bg-slate-800/80 border border-white/10 px-2.5 py-1 rounded-xl text-xs shadow-xs">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    {user.fullName?.charAt(0) || 'C'}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="font-semibold text-white leading-none">{user.fullName}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{user.citizenId}</p>
                  </div>
                  
                  {/* Demo Switcher Quick Menu */}
                  <select
                    title="Switch Demo Citizen"
                    value={user.citizenId}
                    onChange={(e) => switchDemoCitizen(e.target.value)}
                    aria-label="Switch Demo Citizen"
                    className="ml-1 bg-slate-900 border border-white/15 text-slate-200 rounded px-1.5 py-0.5 text-[11px] font-medium focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="CZN-1001">Aarav (CZN-1001)</option>
                    <option value="CZN-1002">Pooja (CZN-1002)</option>
                  </select>

                  <button
                    onClick={logout}
                    title="Log Out"
                    aria-label="Log Out"
                    className="text-slate-400 hover:text-rose-400 p-1 transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl shadow-lg shadow-teal-500/20 transition"
                >
                  Citizen Sign In
                </Link>
              )}

              {/* Demo Controls Direct Link */}
              <Link
                to="/admin/demo"
                title="Open Interactive Demo Controls & Failure Simulator"
                className="hidden sm:flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/15 to-orange-500/15 hover:from-amber-500/25 hover:to-orange-500/25 text-amber-300 border border-amber-500/30 transition shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Demo Controls</span>
              </Link>

              {/* Admin Console Direct Link */}
              <Link
                to="/admin"
                title="Open Admin Control Center"
                className="hidden lg:flex items-center space-x-1.5 text-slate-300 hover:text-white text-xs px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 transition border border-white/10 font-semibold"
              >
                <span>Admin Console</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </Link>

              {/* Mobile menu button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 focus:outline-hidden"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Drawer */}
          {mobileMenuOpen && (
            <div className="md:hidden py-3 border-t border-white/10 space-y-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const active = isNavActive(item);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                      active
                        ? 'bg-teal-500/15 text-teal-300 font-semibold border border-teal-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-teal-400" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              <div className="pt-2 border-t border-white/5 space-y-1">
                <Link
                  to="/admin/demo"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20"
                >
                  <span className="flex items-center space-x-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Demo Controls</span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                </Link>
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 bg-white/5 border border-white/10"
                >
                  <span>Admin Console</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Page Body Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Outlet />
      </main>

      {/* Official PRAGATI Footer */}
      <footer className="border-t border-white/10 bg-slate-950/90 text-slate-400 py-6 text-xs mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <img src="/pragati-logo-dark.png" alt="PRAGATI" className="h-7 w-auto object-contain" />
            <div className="h-5 w-px bg-white/10 hidden sm:block" />
            <div>
              <p className="text-slate-200 font-semibold">
                PRAGATI — National Data Interoperability Grid & Consent Gateway
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Seamless Services &bull; Stronger India &bull; Ministry of Electronics & IT
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4 text-[11px] text-slate-400">
            <Link to="/" className="hover:text-white transition">Platform Overview</Link>
            <span>•</span>
            <Link to="/architecture" className="hover:text-white transition">Architecture</Link>
            <span>•</span>
            <Link to="/admin" className="hover:text-white transition">Control Center</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
