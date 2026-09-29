import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Server, 
  Database, 
  Cpu, 
  ShieldCheck, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Clock, 
  ArrowRight, 
  GitBranch, 
  FileCheck,
  Building2,
  Landmark,
  GraduationCap,
  HardDrive,
  Sparkles,
  User,
  Mail,
  TrendingUp,
  ShieldAlert,
  Terminal,
  Bell
} from 'lucide-react';
import useHealthCheck from '../hooks/useHealthCheck';
import { formatUptime, formatTimestamp } from '../utils/formatters';

export default function HomePage() {
  const { data: health, loading, error, refetch, lastChecked } = useHealthCheck(15000);
  const isConnected = !!health?.status;
  const isDbConnected = !!health?.database?.connected;

  return (
    <div className="space-y-8">
      {/* 1. Authoritative Sovereign Platform Header Card & Motto */}
      <div className="relative overflow-hidden glass-card border-l-4 border-l-teal-500 rounded-2xl p-6 sm:p-9 shadow-2xl">
        {/* Subtle Sovereign Interoperability Network Background Watermark */}
        <div className="absolute right-0 top-0 bottom-0 w-96 opacity-[0.05] pointer-events-none flex items-center justify-center overflow-hidden">
          <svg viewBox="0 0 200 200" className="w-full h-full text-teal-400">
            <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
            <circle cx="100" cy="100" r="60" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="100" cy="100" r="25" fill="none" stroke="currentColor" strokeWidth="3" />
            {Array.from({ length: 24 }).map((_, i) => {
              const angle = (i * 360) / 24;
              const rad = (angle * Math.PI) / 180;
              const x1 = 100 + 25 * Math.cos(rad);
              const y1 = 100 + 25 * Math.sin(rad);
              const x2 = 100 + 60 * Math.cos(rad);
              const y2 = 100 + 60 * Math.sin(rad);
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="1.5" />;
            })}
          </svg>
        </div>

        <div className="max-w-4xl relative z-10">
          {/* PRAGATI Official Logo & Sovereign Authority Badges */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="shrink-0">
              <img 
                src="/pragati-logo-dark.png" 
                alt="PRAGATI - Seamless Services • Stronger India" 
                className="h-12 sm:h-14 w-auto object-contain hover:scale-105 transition"
              />
            </div>
            <div className="h-8 w-px bg-white/10 hidden sm:block" />
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono">
                <span>🏛️</span>
                <span className="tracking-wide uppercase text-[11px]">Digital Public Infrastructure (DPI)</span>
              </span>
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/15 text-teal-300 border border-teal-500/30 font-mono">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>National Cross-Department Mediation Grid</span>
              </span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight font-heading">
            PRAGATI <span className="text-teal-400 font-normal text-2xl sm:text-4xl">(प्रगति)</span>
          </h1>
          <p className="text-base sm:text-lg font-bold text-teal-300 tracking-wide mt-1">
            Seamless Services &bull; Stronger India
          </p>

          {/* The Official Platform Motto */}
          <div className="mt-3.5 p-3 rounded-xl bg-slate-900/60 border border-amber-500/30 backdrop-blur-sm">
            <div className="flex items-start sm:items-center space-x-2.5">
              <span className="text-amber-400 text-lg sm:text-xl font-bold">“</span>
              <p className="text-sm sm:text-base font-semibold text-amber-200 tracking-wide font-heading">
                Connect, orchestrate and monitor — without replacing existing systems.
              </p>
              <span className="text-amber-400 text-lg sm:text-xl font-bold">”</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-300 pl-4 font-mono">
              न्यूनतम हस्तक्षेप, अधिकतम एकीकरण • Zero Disruption to Existing Legacy Portals • Asynchronous Fault Isolation
            </p>
          </div>

          <p className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
            A resilient government-grade mediation grid interconnecting departmental registries (Higher Education, Revenue, and PFMS/DBT)
            via standardized connectors, canonical schema mapping, citizen consent gating, and automated recovery queues.
          </p>

          {/* 3 Department Connectors Highway Pills */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mr-1">
              Active Connectors:
            </span>
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-950/40 text-amber-300 border border-amber-700/50">
              <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
              <span>1. Higher Education (ABC/NAD)</span>
            </span>
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-sky-950/40 text-sky-300 border border-sky-700/50">
              <Building2 className="w-3.5 h-3.5 text-sky-400" />
              <span>2. Revenue Administration</span>
            </span>
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-950/40 text-emerald-300 border border-emerald-700/50">
              <Landmark className="w-3.5 h-3.5 text-emerald-400" />
              <span>3. PFMS / DBT Banking</span>
            </span>
          </div>
        </div>

        {/* Live Sovereign System Metric Badges */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
          <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">National Mediation Grid</span>
            <div className="mt-1 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-white font-mono">
                ACTIVE (3/3 MESH)
              </span>
            </div>
            <span className="text-[10px] text-teal-400/90 mt-0.5 block">Inter-departmental Hub</span>
          </div>

          <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Consent Framework</span>
            <div className="mt-1 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-bold text-white font-mono">
                DPDP COMPLIANT
              </span>
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Cryptographic Tokens
            </span>
          </div>

          <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Service Delivery SLA</span>
            <div className="mt-1 flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-xs font-bold text-white font-mono">
                48-HOUR GUARANTEE
              </span>
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Automated Escalation
            </span>
          </div>

          <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Benefit Transfer</span>
            <div className="mt-1 flex items-center space-x-1.5">
              <Landmark className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-bold text-white font-mono">
                DIRECT DBT READY
              </span>
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Zero-Paperwork Sanction</span>
          </div>
        </div>
      </div>

      {/* 2. Direct Navigation Portal Gateway Cards (8-Card Modular Grid) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Layers className="w-5 h-5 text-teal-400" />
            <span>Platform Gateways & Subsystems</span>
          </h2>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Direct navigation to all dedicated interfaces, monitoring pages, and simulators
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Citizen Portal Entry Card */}
          <div className="glass-card p-5 hover:border-teal-500/40 hover:bg-slate-800/80 transition flex flex-col justify-between space-y-3 group border border-white/10 shadow-lg">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 shadow-xs group-hover:scale-105 transition">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 bg-teal-500/15 px-2 py-0.5 rounded border border-teal-500/30 font-mono">
                  Citizen
                </span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-teal-300 transition">
                Citizen Portal
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Submit scholarship requests, grant explicit digital consent, and follow the 7-stage verification journey.
              </p>
            </div>
            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">/portal</span>
              <Link
                to="/portal"
                className="inline-flex items-center space-x-1 text-xs font-bold text-teal-400 hover:text-teal-300 transition"
              >
                <span>Launch</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* 2. Admin Console Entry Card */}
          <div className="glass-card p-5 hover:border-teal-500/40 hover:bg-slate-800/80 transition flex flex-col justify-between space-y-3 group border border-white/10 shadow-lg">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 shadow-xs group-hover:scale-105 transition">
                  <Activity className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 bg-teal-500/15 px-2 py-0.5 rounded border border-teal-500/30 font-mono">
                  Admin
                </span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-teal-300 transition">
                Control Center
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Executive operational KPIs, system connectivity health, and launchpad across all platform subsystems.
              </p>
            </div>
            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">/admin</span>
              <Link
                to="/admin"
                className="inline-flex items-center space-x-1 text-xs font-bold text-teal-400 hover:text-teal-300 transition"
              >
                <span>Overview</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* 3. Workflows Orchestration Grid */}
          <div className="glass-card p-5 hover:border-teal-500/40 hover:bg-slate-800/80 transition flex flex-col justify-between space-y-3 group border border-white/10 shadow-lg">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-300 shadow-xs group-hover:scale-105 transition">
                  <Layers className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-300 bg-sky-500/15 px-2 py-0.5 rounded border border-sky-500/30 font-mono">
                  Orchestrator
                </span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-teal-300 transition">
                Workflows Grid
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Dedicated page for all active, completed, pending, and failed workflows with instant manual resume actions.
              </p>
            </div>
            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">/admin/workflows</span>
              <Link
                to="/admin/workflows"
                className="inline-flex items-center space-x-1 text-xs font-bold text-teal-400 hover:text-teal-300 transition"
              >
                <span>Workflows</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* 4. SLA Monitoring & Telemetry */}
          <div className="glass-card p-5 hover:border-teal-500/40 hover:bg-slate-800/80 transition flex flex-col justify-between space-y-3 group border border-white/10 shadow-lg">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shadow-xs group-hover:scale-105 transition">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30 font-mono">
                  48H Target
                </span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-teal-300 transition">
                SLA Telemetry
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Automated 48-hour SLA tracking, approaching deadline alerts, and department gateway latency distribution.
              </p>
            </div>
            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">/admin/sla</span>
              <Link
                to="/admin/sla"
                className="inline-flex items-center space-x-1 text-xs font-bold text-teal-400 hover:text-teal-300 transition"
              >
                <span>SLA Monitor</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* 5. Exception Queue & Recovery */}
          <div className="glass-card p-5 hover:border-rose-500/40 hover:bg-slate-800/80 transition flex flex-col justify-between space-y-3 group border border-white/10 shadow-lg">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-300 shadow-xs group-hover:scale-105 transition">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 bg-rose-500/15 px-2 py-0.5 rounded border border-rose-500/30 font-mono">
                  Exceptions
                </span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-rose-300 transition">
                Exception Queue
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Step halts, backoff retry queues, batch queue processing, and one-click diagnostic recovery controls.
              </p>
            </div>
            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">/admin/exceptions</span>
              <Link
                to="/admin/exceptions"
                className="inline-flex items-center space-x-1 text-xs font-bold text-rose-400 hover:text-rose-300 transition"
              >
                <span>Recover</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* 6. Immutable Audit Trail & Logs */}
          <div className="glass-card p-5 hover:border-teal-500/40 hover:bg-slate-800/80 transition flex flex-col justify-between space-y-3 group border border-white/10 shadow-lg">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 shadow-xs group-hover:scale-105 transition">
                  <Terminal className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded border border-indigo-500/30 font-mono">
                  Audit
                </span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-teal-300 transition">
                Audit Trail & Logs
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Cryptographically verifiable audit records, actor tracking, entity changes, and live operational event bus.
              </p>
            </div>
            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">/admin/audit</span>
              <Link
                to="/admin/audit"
                className="inline-flex items-center space-x-1 text-xs font-bold text-teal-400 hover:text-teal-300 transition"
              >
                <span>Audit Logs</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* 7. Dynamic Workflow Builder Entry Card */}
          <div className="glass-card p-5 hover:border-purple-500/40 hover:bg-slate-800/80 transition flex flex-col justify-between space-y-3 group border border-white/10 shadow-lg">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shadow-xs group-hover:scale-105 transition">
                  <GitBranch className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded border border-purple-500/30 font-mono">
                  Visual Engine
                </span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition">
                Workflow Builder
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Database-driven visual pipeline: configure step topologies, toggle connectors, and publish versioned definitions.
              </p>
            </div>
            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">/admin/workflows/builder</span>
              <Link
                to="/admin/workflows/builder"
                className="inline-flex items-center space-x-1 text-xs font-bold text-purple-400 hover:text-purple-300 transition"
              >
                <span>Builder</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* 8. Interactive Demo Simulator Entry Card */}
          <div className="glass-card p-5 hover:border-amber-500/60 hover:bg-slate-800/80 transition flex flex-col justify-between space-y-3 group border border-amber-500/30 shadow-lg shadow-amber-500/5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-xs group-hover:scale-105 transition">
                  <Sparkles className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40 font-mono">
                  Judge Demo
                </span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition">
                Demo Simulator
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                One-click test suite: trigger Bank 503 outage, verify retry backoff, queue transitions, and execute recovery.
              </p>
            </div>
            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-amber-400 font-mono">/admin/demo</span>
              <Link
                to="/admin/demo"
                className="inline-flex items-center space-x-1 text-xs font-bold text-amber-400 hover:text-amber-300 transition"
              >
                <span>Simulate</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 2B. Demo Personas & Email Credentials Directory */}
      <div className="glass-card p-5 sm:p-6 space-y-4 border border-white/10 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <User className="w-4 h-4 text-teal-400" />
              <span>Verified Demo Personas & Email Authentication</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              All accounts pre-seeded with JWT & RBAC access. Universal demo password:{' '}
              <span className="font-mono font-semibold text-teal-300 bg-slate-800 px-1.5 py-0.5 rounded border border-white/10">demo123</span>
            </p>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white px-3.5 py-1.5 rounded-xl shadow-lg shadow-teal-500/20 transition cursor-pointer"
          >
            <span>Go to Login Screen</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="p-3 bg-slate-900/90 rounded-xl border border-white/10 hover:border-teal-500/30 text-xs space-y-1 transition">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">Aarav Sharma</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-teal-500/20 text-teal-300 rounded border border-teal-500/30 font-semibold">CITIZEN</span>
            </div>
            <p className="text-slate-300 font-mono text-[11px] truncate">aarav.sharma@demo-gov.in</p>
            <p className="text-[10px] text-slate-400">ID: CZN-1001 (Eligible)</p>
          </div>

          <div className="p-3 bg-slate-900/90 rounded-xl border border-white/10 hover:border-teal-500/30 text-xs space-y-1 transition">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">Platform Admin</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded border border-purple-500/30 font-semibold">ADMIN</span>
            </div>
            <p className="text-slate-300 font-mono text-[11px] truncate">admin@platform.demo-gov.in</p>
            <p className="text-[10px] text-slate-400">Full Control & Mappings</p>
          </div>

          <div className="p-3 bg-slate-900/90 rounded-xl border border-white/10 hover:border-teal-500/30 text-xs space-y-1 transition">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">Dr. Ramesh Kumar</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded border border-blue-500/30 font-semibold">EDU</span>
            </div>
            <p className="text-slate-300 font-mono text-[11px] truncate">ramesh.kumar@edu.demo-gov.in</p>
            <p className="text-[10px] text-slate-400">Higher Ed Reviewer</p>
          </div>

          <div className="p-3 bg-slate-900/90 rounded-xl border border-white/10 hover:border-teal-500/30 text-xs space-y-1 transition">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">Smt. Sunita Devi</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30 font-semibold">REV</span>
            </div>
            <p className="text-slate-300 font-mono text-[11px] truncate">sunita.devi@rev.demo-gov.in</p>
            <p className="text-[10px] text-slate-400">Revenue & Caste/Income</p>
          </div>

          <div className="p-3 bg-slate-900/90 rounded-xl border border-white/10 hover:border-teal-500/30 text-xs space-y-1 transition">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">Vikram Malhotra</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30 font-semibold">DBT</span>
            </div>
            <p className="text-slate-300 font-mono text-[11px] truncate">vikram.malhotra@pfms.demo-gov.in</p>
            <p className="text-[10px] text-slate-400">PFMS / NPCI Seeding</p>
          </div>
        </div>
      </div>

      {/* 3. Sovereign Service Delivery Pipeline (The Real National Workflow) */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-teal-300 bg-teal-500/15 px-2.5 py-0.5 rounded-full border border-teal-500/30 font-mono">
              National Service Pipeline
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-heading flex items-center space-x-2.5">
            <Layers className="w-6 h-6 text-teal-400" />
            <span>End-to-End Interoperable Service Workflow</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            How PRAGATI coordinates zero-touch citizen welfare sanctions without physical notary visits or manual paperwork.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
          <div className="glass-card p-5 space-y-2 border-t-2 border-t-teal-500">
            <span className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/40 text-xs flex items-center justify-center font-bold font-mono">
              1
            </span>
            <h4 className="text-sm font-bold text-white">Reference Intake</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Citizen authenticates and submits 5 departmental reference identifiers across Education, Revenue, and Banking.
            </p>
          </div>

          <div className="glass-card p-5 space-y-2 border-t-2 border-t-indigo-500">
            <span className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs flex items-center justify-center font-bold font-mono">
              2
            </span>
            <h4 className="text-sm font-bold text-white">Digital Consent</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Citizen grants explicit, purpose-limited digital consent under the DPDP Act before any verification queries execute.
            </p>
          </div>

          <div className="glass-card p-5 space-y-2 border-t-2 border-t-sky-500">
            <span className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/40 text-xs flex items-center justify-center font-bold font-mono">
              3
            </span>
            <h4 className="text-sm font-bold text-white">Cross-Dept Queries</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Decoupled connectors simultaneously query Higher Ed (AISHE), Revenue (Tehsildar), and PFMS via canonical mapping.
            </p>
          </div>

          <div className="glass-card p-5 space-y-2 border-t-2 border-t-amber-500">
            <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs flex items-center justify-center font-bold font-mono">
              4
            </span>
            <h4 className="text-sm font-bold text-white">SLA Safeguards</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automated retry queues and escalation logic ensure strict compliance with the statutory 48-hour service guarantee.
            </p>
          </div>

          <div className="glass-card p-5 space-y-2 border-t-2 border-t-emerald-500">
            <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs flex items-center justify-center font-bold font-mono">
              5
            </span>
            <h4 className="text-sm font-bold text-white">Automated DBT</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upon tripartite departmental clearance, the scholarship sanction is issued and DBT disbursement is queued directly.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Dedicated Technical Architecture & Evaluation Link */}
      <div className="glass-card p-6 sm:p-7 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 border-l-indigo-500">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-500/15 px-2.5 py-0.5 rounded-full border border-indigo-500/30 font-mono">
              SIH 2026 Technical Documentation
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight font-heading">
            System Architecture, Technology Stack & Telemetry
          </h3>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Detailed technical documentation for hackathon evaluators: Full-stack implementation (React 18, Node.js, PostgreSQL/PGlite, Zod, JWT), connector adapter boundaries, and live system diagnostics probe.
          </p>
        </div>

        <Link
          to="/architecture"
          className="shrink-0 bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-300 hover:text-white border border-indigo-500/40 px-5 py-2.5 rounded-xl text-xs font-semibold transition flex items-center space-x-2 cursor-pointer shadow-lg shadow-indigo-500/10"
        >
          <span>View Architecture & Tech Stack</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
