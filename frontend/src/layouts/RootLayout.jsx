import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Layers, Activity, ShieldCheck, Database, RefreshCw, Building2, Menu, X, Sparkles, GitBranch } from 'lucide-react';
import useHealthCheck from '../hooks/useHealthCheck';
import GovHeaderStrip from '../components/GovHeaderStrip';

export default function RootLayout() {
  const location = useLocation();
  const { data: health, loading, error, refetch } = useHealthCheck(15000);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isConnected = !!health?.status;
  const isDbConnected = !!health?.database?.connected;

  const navLinks = [
    { to: '/', label: 'Overview & Status', icon: Activity },
    { to: '/architecture', label: 'Architecture', icon: Layers },
    { to: '/portal', label: 'Citizen Portal', icon: Building2 },
    { to: '/admin', label: 'Admin Console', icon: ShieldCheck },
    { to: '/admin/workflows/builder', label: 'Workflow Builder', icon: GitBranch },
    { to: '/admin/demo', label: 'Demo Simulator', icon: Sparkles, highlight: true },
  ];

  return (
    <div className="min-h-screen gov-pattern-bg text-slate-100 flex flex-col font-sans">
      {/* Official Government Top Utility Strip with Tricolor */}
      <GovHeaderStrip />

      {/* Top Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-900/85 backdrop-blur-xl shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo / Brand */}
          <Link to="/" className="flex items-center gap-3.5 shrink-0 group">
            <img 
              src="/pragati-logo-dark.png" 
              alt="PRAGATI - Seamless Services • Stronger India" 
              className="h-9 sm:h-10 w-auto object-contain transition duration-200 group-hover:brightness-110"
            />
            <div className="h-7 w-px bg-white/10 hidden sm:block" />
            <div className="hidden sm:flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider uppercase text-teal-400 font-sans">
                  Sovereign Mesh
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-mono font-medium bg-teal-500/15 text-teal-300 border border-teal-500/25">
                  CORE GRID
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-normal">
                Cross-Department Service & Consent Gateway
              </p>
            </div>
          </Link>

          {/* Navigation Items (Desktop) */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    isActive
                      ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30 font-semibold shadow-xs'
                      : link.highlight
                      ? 'bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-300 border border-amber-500/30 hover:from-amber-500/25 hover:to-orange-500/25 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${link.highlight ? 'text-amber-400' : 'text-teal-400'}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center space-x-3">
            {/* Sovereign Mesh Indicator */}
            <div className="flex items-center space-x-2">
              <Link
                to="/architecture"
                title="Inspect System Architecture & Live Grid Telemetry"
                className="flex items-center space-x-2 bg-slate-800/80 hover:bg-slate-800 border border-white/10 hover:border-teal-500/40 px-3 py-1.5 rounded-xl text-xs shadow-xs transition group cursor-pointer"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse' : 'bg-rose-500'
                  }`}
                />
                <span className="text-slate-200 font-medium text-[11px] tracking-wide group-hover:text-teal-300 transition">
                  {loading ? 'SYNCING...' : isConnected ? 'SOVEREIGN MESH • ACTIVE' : 'GRID OFFLINE'}
                </span>
              </Link>

              <button
                onClick={refetch}
                disabled={loading}
                title="Refresh Mesh Status"
                className="text-slate-400 hover:text-white disabled:opacity-50 p-1.5 rounded-lg border border-white/10 bg-slate-800/50 hover:bg-slate-800 transition cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

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
          <div className="md:hidden py-3 px-4 border-t border-white/10 space-y-1 bg-slate-900/95 backdrop-blur-xl">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-teal-500/15 text-teal-300 font-semibold border border-teal-500/30'
                      : link.highlight
                      ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${link.highlight ? 'text-amber-400' : 'text-teal-400'}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-950/90 py-6 text-xs text-slate-400 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <img src="/pragati-logo-dark.png" alt="PRAGATI" className="h-7 w-auto object-contain" />
            <div className="h-5 w-px bg-white/10 hidden sm:block" />
            <div>
              <p className="text-slate-200 font-semibold">
                PRAGATI — National Data Interoperability Grid & Digital Infrastructure
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Seamless Services &bull; Stronger India &bull; Ministry of Electronics & IT
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4 text-[11px] text-slate-400">
            <Link to="/portal" className="hover:text-white transition">Citizen Portal</Link>
            <span>&bull;</span>
            <Link to="/admin" className="hover:text-white transition">Admin Console</Link>
            <span>&bull;</span>
            <Link to="/architecture" className="hover:text-white transition">Architecture</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
