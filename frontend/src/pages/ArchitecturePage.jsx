import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Layers, 
  Server, 
  Cpu, 
  GitBranch, 
  Database, 
  Check, 
  ShieldCheck, 
  ShieldAlert, 
  ArrowRight, 
  Code,
  FileText,
  Activity,
  AlertTriangle,
  Clock,
  RefreshCw,
  Terminal,
  Sparkles,
  Lock,
  ChevronRight,
  Landmark,
  Building2,
  GraduationCap
} from 'lucide-react';
import useHealthCheck from '../hooks/useHealthCheck';
import { formatUptime, formatTimestamp } from '../utils/formatters';

export default function ArchitecturePage() {
  const { data: health, loading, error, refetch, lastChecked } = useHealthCheck(15000);
  const [showRawHealth, setShowRawHealth] = useState(false);

  const isConnected = !!health?.status;
  const isDbConnected = !!health?.database?.connected;

  const techStackTiers = [
    {
      title: '1. Presentation Tier (Frontend UI)',
      tag: 'React 18 + Vite SPA',
      icon: Layers,
      color: 'teal',
      technologies: ['React 18', 'Vite 5', 'Tailwind CSS', 'React Router v6', 'Lucide Icons'],
      description: 'Single Page Application engineered with client-side sub-routing, instant state updates without full-page refreshes, and responsive Deep Midnight Glassmorphism.',
      highlights: [
        'Modular multi-view Citizen & Admin layouts',
        'Stateful authentication context with Email OTP & demo switcher',
        'Accessibility compliance with font scaler and high-contrast tokens'
      ]
    },
    {
      title: '2. API Gateway & Security Tier',
      tag: 'Express REST Gateway',
      icon: Server,
      color: 'indigo',
      technologies: ['Node.js', 'Express.js', 'Helmet.js', 'CORS', 'Zod Validation'],
      description: 'Centralized API Gateway implementing strict request sanitization, cryptographic helmet security headers, and domain origin isolation.',
      highlights: [
        'Zod schema validation on all incoming payload bodies',
        'Standardized JSON envelope ({ success, statusCode, data, timestamp })',
        'Centralized error propagation and audit logging middleware'
      ]
    },
    {
      title: '3. Interoperability & Orchestration Engine',
      tag: 'Core Orchestrator',
      icon: Cpu,
      color: 'sky',
      technologies: ['Finite State Machine', 'Canonical Data Mapper', 'DPDP Consent Engine', 'RBAC Guard'],
      description: 'Multi-step state machine orchestrating cross-department workflows, canonical schema normalization, and digital consent verification.',
      highlights: [
        'Canonical JSON schema translator decoupling heterogeneous department formats',
        'DPDP Act cryptographic consent mandate validation before data access',
        'Stateful 7-stage workflow transition manager with immutable timestamps'
      ]
    },
    {
      title: '4. Connector Adapter Layer',
      tag: 'Decoupled Adapters',
      icon: GitBranch,
      color: 'amber',
      technologies: ['Higher Ed Adapter', 'Revenue Adapter', 'PFMS DBT Adapter', 'Legacy Flatfile Adapter'],
      description: 'Isolated connector micro-adapters that translate sovereign canonical requests into department-specific protocols without coupling.',
      highlights: [
        'Education Connector: Queries ABC / Academic Bank of Credits & AISHE registry',
        'Revenue Connector: Authenticates Tehsildar & Sub-Divisional Magistrate income certificates',
        'PFMS DBT Connector: Validates Aadhaar bridge bank account seeding and mandate'
      ]
    },
    {
      title: '5. Relational Grid & Event Store',
      tag: 'PostgreSQL Relational DB',
      icon: Database,
      color: 'emerald',
      technologies: ['PostgreSQL Pool', 'Embedded PGlite Engine', 'ACID Transactions', 'SHA-256 Hashing'],
      description: 'High-integrity persistence layer housing civil identity registries, workflow state histories, and immutable cryptographic audit trails.',
      highlights: [
        'Embedded PGlite zero-config database fallback for instant portable execution',
        'Encapsulated model functions with strict parameterized queries (zero raw SQL in controllers)',
        'SHA-256 tamper-evident digital tokens for consent and audit events'
      ]
    },
    {
      title: '6. Telemetry & SLA Assurance',
      tag: 'SLA Engine',
      icon: Clock,
      color: 'rose',
      technologies: ['Exponential Backoff', 'Dead-Letter Queue', 'SLA Breacher Monitor', 'Live Health Probes'],
      description: 'Statutory 48-hour service level agreement telemetry with automated retry policies and officer exception queues.',
      highlights: [
        'Background jittered exponential backoff for transient network timeouts',
        'Automatic routing of chronic failures to departmental officer review queues',
        'Real-time SLA countdown telemetry with automated breach flagging'
      ]
    }
  ];

  const architecturalRules = [
    { title: 'No Distributed Microservices Overhead', desc: 'Single cohesive modular runtime avoids unnecessary distributed network hops, complex distributed sagas, and service mesh operational debt.' },
    { title: 'Zero-Touch Disruption to Existing Portals', desc: 'Connects and orchestrates legacy department databases via canonical adapter mappings without requiring participating departments to rewrite their core software.' },
    { title: 'DPDP Act Consent Gating', desc: 'No inter-departmental query can execute unless an active, cryptographically signed digital consent token has been granted by the citizen.' },
    { title: 'Department Connector Isolation', desc: 'Departmental adapters are strictly decoupled from core workflow business logic; replacing an adapter never breaks the state engine.' },
    { title: 'Database Model Encapsulation', desc: 'Controllers never execute raw SQL; all queries are strictly encapsulated in dedicated database models.' },
    { title: 'Deterministic Simulation Suite', desc: 'Comprehensive mock suite replicating heterogeneous legacy responses, SLA breaches, and edge cases for evaluation and training.' },
  ];

  return (
    <div className="space-y-8">
      {/* 1. Header & Problem Statement Alignment */}
      <div className="glass-card border-l-4 border-l-teal-500 p-6 sm:p-9 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-32 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl">
          <div className="flex items-center space-x-2.5 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 bg-teal-500/15 px-2.5 py-0.5 rounded-full border border-teal-500/30 font-mono">
              SIH 2026 Technical Specifications
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Problem Statement: Cross-Department Service Interoperability & Orchestration
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight font-heading">
            PRAGATI Technical Architecture & Technology Stack
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
            Architectural blueprint and full-stack specification of PRAGATI — a sovereign Digital Public Infrastructure (DPI) platform engineered to interconnect heterogeneous government databases with zero-touch automation, canonical data mapping, and strict DPDP Act digital consent enforcement.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mr-1">
              Core Stack:
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-teal-500/15 text-teal-300 border border-teal-500/30 font-mono font-semibold">
              React 18 + Vite
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-mono font-semibold">
              Node.js + Express
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono font-semibold">
              PostgreSQL / PGlite
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/30 font-mono font-semibold">
              Tailwind CSS
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono font-semibold">
              Zod & JWT
            </span>
          </div>
        </div>
      </div>

      {/* 2. Full-Stack Technology Stack Matrix */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight font-heading flex items-center space-x-2.5">
            <Code className="w-5 h-5 text-teal-400" />
            <span>Full-Stack Architecture & Subsystem Tiers</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Comprehensive breakdown of libraries, frameworks, design patterns, and engineering rationale across all 6 tiers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {techStackTiers.map((tier) => {
            const Icon = tier.icon;
            return (
              <div key={tier.title} className="glass-card p-6 flex flex-col justify-between space-y-4 shadow-xl hover:border-teal-500/40 transition group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-300 border border-teal-500/25 flex items-center justify-center shadow-lg group-hover:scale-105 transition">
                      <Icon className="w-5 h-5 text-teal-400" />
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10">
                      {tier.tag}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-white text-base font-heading">{tier.title}</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{tier.description}</p>
                  </div>

                  {/* Technology Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {tier.technologies.map((tech) => (
                      <span
                        key={tech}
                        className="px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-slate-950/70 text-teal-300 border border-teal-500/20"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>

                  {/* Key Implementation Highlights */}
                  <div className="pt-2 border-t border-white/5 space-y-1.5 text-xs text-slate-300">
                    {tier.highlights.map((h, idx) => (
                      <div key={idx} className="flex items-start space-x-2">
                        <Check className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                        <span className="text-[11px] leading-relaxed text-slate-400">{h}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Live System Telemetry Probe & JSON Inspector */}
      <div className="glass-card p-6 sm:p-7 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
          <div className="flex items-center space-x-2.5">
            <Activity className="w-5 h-5 text-teal-400" />
            <div>
              <h3 className="font-bold text-white text-base font-heading">Live Telemetry & Connectivity Probe</h3>
              <p className="text-xs text-slate-400">Real-time health status of backend API gateway, PostgreSQL pool, and background queues</p>
            </div>
          </div>
          <div className="flex items-center space-x-2.5">
            <span className="text-xs font-mono text-teal-300 bg-teal-500/15 border border-teal-500/30 px-2.5 py-1 rounded-lg">
              GET /api/v1/health
            </span>
            <button
              onClick={() => setShowRawHealth(!showRawHealth)}
              className="text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1 rounded-lg transition cursor-pointer"
            >
              {showRawHealth ? 'Hide Raw JSON' : 'Inspect JSON Response'}
            </button>
          </div>
        </div>

        {error ? (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <p className="font-semibold text-rose-200">Backend Gateway Unreachable</p>
              <p className="text-[11px] text-rose-300 mt-0.5">{error}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Gateway Status</span>
                <p className="font-bold text-emerald-400 mt-0.5 font-mono text-sm">{health?.status || 'ONLINE'}</p>
                <span className="text-[10px] text-slate-400">HTTP 200 OK Response</span>
              </div>
              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">PostgreSQL Grid</span>
                <p className="font-bold text-teal-300 mt-0.5 font-mono text-sm">{health?.database?.status || 'CONNECTED'}</p>
                <span className="text-[10px] text-slate-400">{health?.database?.latencyMs ? `${health.database.latencyMs}ms query latency` : 'Resilient pool'}</span>
              </div>
              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Runtime Environment</span>
                <p className="font-bold text-white mt-0.5 font-mono text-sm">{health?.environment || 'development'}</p>
                <span className="text-[10px] text-slate-400">Node.js / Express</span>
              </div>
              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Server Uptime</span>
                <p className="font-bold text-teal-300 mt-0.5 font-mono text-sm">{health?.uptimeSeconds ? formatUptime(health.uptimeSeconds) : '0s'}</p>
                <span className="text-[10px] text-slate-400">Auto-polling every 15s</span>
              </div>
            </div>

            {showRawHealth && (
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-teal-300 overflow-x-auto shadow-inner">
                {JSON.stringify(health || { message: 'Fetching health payload...' }, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* 4. Core Architectural Invariants */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white tracking-tight font-heading flex items-center space-x-2.5">
          <ShieldCheck className="w-5 h-5 text-teal-400" />
          <span>Core Architectural Governance Principles</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {architecturalRules.map((rule) => (
            <div key={rule.title} className="glass-card p-5 space-y-2 shadow-lg">
              <div className="flex items-center space-x-2 text-teal-300 font-semibold text-sm">
                <span className="w-2 h-2 rounded-full bg-teal-400" />
                <span>{rule.title}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {rule.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Directory Hierarchy Breakdown */}
      <div className="glass-card p-6 sm:p-7 shadow-xl space-y-4">
        <h2 className="text-xl font-bold text-white tracking-tight font-heading flex items-center space-x-2.5">
          <Terminal className="w-5 h-5 text-teal-400" />
          <span>Repository Boundary Hierarchy</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-mono">
          <div className="bg-slate-950/80 rounded-xl p-5 border border-slate-800 space-y-1 shadow-inner">
            <span className="text-teal-300 font-bold block mb-2 font-sans text-sm">Frontend Package (/frontend)</span>
            <div className="text-slate-500">├── src/</div>
            <div className="text-slate-300">│   ├── pages/         <span className="text-slate-500 font-sans"># Route views (Overview, Citizen, Admin)</span></div>
            <div className="text-slate-300">│   ├── components/    <span className="text-slate-500 font-sans"># Reusable atomic UI elements (Timeline, Badges)</span></div>
            <div className="text-slate-300">│   ├── layouts/       <span className="text-slate-500 font-sans"># Navigation shell, header, footer</span></div>
            <div className="text-slate-300">│   ├── services/      <span className="text-slate-500 font-sans"># HTTP client & API dispatchers</span></div>
            <div className="text-slate-300">│   ├── context/       <span className="text-slate-500 font-sans"># AuthContext (Email auth, OTP, Personas)</span></div>
            <div className="text-slate-300">│   ├── hooks/         <span className="text-slate-500 font-sans"># Custom stateful hooks (useHealthCheck)</span></div>
            <div className="text-slate-300">│   └── utils/         <span className="text-slate-500 font-sans"># Formatters & transformation helpers</span></div>
          </div>

          <div className="bg-slate-950/80 rounded-xl p-5 border border-slate-800 space-y-1 shadow-inner">
            <span className="text-indigo-300 font-bold block mb-2 font-sans text-sm">Backend Gateway & Orchestrator (/backend)</span>
            <div className="text-slate-500">├── src/</div>
            <div className="text-slate-300">│   ├── controllers/   <span className="text-slate-500 font-sans"># HTTP handlers, validation dispatch</span></div>
            <div className="text-slate-300">│   ├── routes/        <span className="text-slate-500 font-sans"># Express API gateway routing tree</span></div>
            <div className="text-slate-300">│   ├── services/      <span className="text-slate-500 font-sans"># Interop data mapper & business services</span></div>
            <div className="text-slate-300">│   ├── connectors/    <span className="text-slate-500 font-sans"># Department adapters (Edu, Rev, PFMS)</span></div>
            <div className="text-slate-300">│   ├── workflow/      <span className="text-slate-500 font-sans"># Multi-step state orchestration engine</span></div>
            <div className="text-slate-300">│   ├── middleware/    <span className="text-slate-500 font-sans"># Error, 404, JWT Auth, Consent & RBAC</span></div>
            <div className="text-slate-300">│   └── models/        <span className="text-slate-500 font-sans"># SQL query encapsulation</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
