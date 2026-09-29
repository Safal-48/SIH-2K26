import React, { useState, useEffect } from 'react';
import adminService from '../../services/adminService';
import { 
  Play, 
  AlertOctagon, 
  CheckCircle2, 
  Clock, 
  FileWarning, 
  Copy, 
  RotateCcw, 
  Activity, 
  Zap, 
  ShieldCheck, 
  RefreshCw, 
  Server, 
  ArrowRight, 
  Check, 
  X, 
  Terminal, 
  Sparkles,
  Sliders
} from 'lucide-react';

export default function DemoControlsPage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeAction, setActiveAction] = useState(null);
  const [lastActionResult, setLastActionResult] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Injected delay state for slow income control
  const [injectedDelay, setInjectedDelay] = useState(2500);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await adminService.getDemoStatus();
      setStatus(res);
    } catch (err) {
      console.error('Failed to fetch demo status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const executeControl = async (actionKey, actionFn, label) => {
    try {
      setActiveAction(actionKey);
      setError(null);
      setLastActionResult(null);

      const result = await actionFn();
      setLastActionResult({
        key: actionKey,
        label,
        timestamp: new Date().toISOString(),
        data: result,
      });

      setSuccessMsg(`Action "${label}" executed successfully.`);
      await fetchStatus();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      console.error(`Demo control ${actionKey} failed:`, err);
      setError(err.message || `Execution failed for ${label}`);
    } finally {
      setActiveAction(null);
    }
  };

  // 1. Run Full Success
  const handleRunFullSuccess = () =>
    executeControl('full_success', () => adminService.runFullSuccess(), 'Run Full Success');

  // 2. Fail Bank API
  const handleFailBank = () =>
    executeControl('fail_bank', () => adminService.failBankApi(), 'Fail Bank API (503)');

  // 3. Recover Bank API
  const handleRecoverBank = () =>
    executeControl('recover_bank', () => adminService.recoverBankApi(), 'Recover Bank API');

  // 4. Slow Income API
  const handleSlowIncome = () =>
    executeControl('slow_income', () => adminService.slowIncomeApi(injectedDelay), `Slow Income API (${injectedDelay}ms)`);

  // 5. Invalid Income
  const handleInvalidIncome = () =>
    executeControl('invalid_income', () => adminService.invalidIncome(), 'Invalid Income Certificate');

  // 6. Duplicate Application
  const handleDuplicate = () =>
    executeControl('duplicate', () => adminService.triggerDuplicate(), 'Duplicate Application Detection');

  // 7. Reset Demo
  const handleResetDemo = () =>
    executeControl('reset_demo', () => adminService.resetDemo(), 'Reset Platform to Baseline');

  const bankIsHealthy = status?.mockState?.bank?.healthy ?? true;
  const incomeDelay = status?.mockState?.income?.delayMs ?? 0;
  const incomeIsInvalid = status?.mockState?.income?.invalid ?? false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card border border-white/10 rounded-2xl p-6 sm:p-7 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-2 bg-teal-500/10 border border-teal-500/30 text-teal-300 px-3 py-1 rounded-full text-xs font-mono font-semibold">
              <Sliders className="w-3.5 h-3.5" />
              <span>SCENARIO CONTROLS</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Platform Demo Controls
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Deterministic operational controls for evaluating cross-agency orchestration. Each action triggers real backend execution and persists updated state to PostgreSQL.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-xl transition flex items-center space-x-2 text-xs font-semibold shadow-xs cursor-pointer"
              title="Refresh Control Status"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-400' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={handleResetDemo}
              disabled={activeAction !== null}
              className="bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 hover:border-rose-500/50 font-semibold text-xs px-4 py-2.5 rounded-xl transition flex items-center space-x-2 shadow-xs cursor-pointer"
            >
              <RotateCcw className={`w-4 h-4 ${activeAction === 'reset_demo' ? 'animate-spin' : ''}`} />
              <span>Reset to Baseline</span>
            </button>
          </div>
        </div>

        {/* Current State Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-white/10">
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wide block">Bank Gateway</span>
            <div className="flex items-center space-x-1.5 mt-1">
              <span className={`w-2 h-2 rounded-full ${bankIsHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <span className={`font-mono text-sm font-bold ${bankIsHealthy ? 'text-emerald-300' : 'text-rose-400'}`}>
                {bankIsHealthy ? 'Healthy' : 'Failed (503)'}
              </span>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wide block">Revenue Latency</span>
            <span className="font-mono text-sm font-bold text-amber-300 block mt-1">
              {incomeDelay > 0 ? `+${incomeDelay}ms` : 'Normal'}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wide block">Income Certificate</span>
            <span className={`font-mono text-sm font-bold block mt-1 ${incomeIsInvalid ? 'text-rose-400' : 'text-emerald-300'}`}>
              {incomeIsInvalid ? 'Invalid' : 'Valid'}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wide block">Queued Exceptions</span>
            <span className="font-mono text-sm font-bold text-white block mt-1">
              {status?.activeExceptionsCount ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 px-4 py-3 rounded-xl flex items-center space-x-3 text-xs font-mono shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-500/15 border border-rose-500/30 text-rose-200 px-4 py-3 rounded-xl flex items-center space-x-3 text-xs font-mono shadow-lg">
          <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Last Action Result */}
      {lastActionResult && (
        <div className="glass-card border border-white/10 rounded-2xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-teal-400" />
              <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Execution Result
              </h3>
            </div>
            <button
              onClick={() => setLastActionResult(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <span className="text-teal-300 font-semibold">{lastActionResult.label}</span>
              <span className="text-slate-400">{new Date(lastActionResult.timestamp).toLocaleTimeString()}</span>
            </div>
            <p className="text-xs text-slate-300">
              {lastActionResult.data?.message || 'Operation completed.'}
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-white/10 font-mono text-[11px] text-teal-300 overflow-x-auto max-h-48 shadow-inner">
            <pre>{JSON.stringify(lastActionResult.data, null, 2)}</pre>
          </div>
        </div>
      )}

      {/* Control Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Control 1: Run Full Success */}
        <div className="glass-card border border-emerald-500/30 hover:border-emerald-400/60 rounded-2xl p-5 transition flex flex-col justify-between space-y-4 shadow-xl bg-emerald-500/5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shadow-md">
                <Play className="w-4 h-4 ml-0.5" />
              </div>
              <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                GOLDEN PATH
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-white">1. Run Full Success</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Restores known-good state and executes the entire 7-stage workflow from submission to completion.
              </p>
            </div>
          </div>

          <button
            onClick={handleRunFullSuccess}
            disabled={activeAction !== null}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition flex items-center justify-center space-x-2 shadow-md shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
          >
            {activeAction === 'full_success' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            <span>Execute Golden Path</span>
          </button>
        </div>

        {/* Control 2: Fail Bank API */}
        <div className="glass-card border border-rose-500/30 hover:border-rose-400/60 rounded-2xl p-5 transition flex flex-col justify-between space-y-4 shadow-xl bg-rose-500/5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300 shadow-md">
                <AlertOctagon className="w-4 h-4" />
              </div>
              <span className="bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                SIMULATE 503
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-white">2. Fail Bank API</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Configures the Banking gateway to return HTTP 503. Transitions workflow into Retrying and Queued state.
              </p>
            </div>
          </div>

          <button
            onClick={handleFailBank}
            disabled={activeAction !== null}
            className="w-full bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition flex items-center justify-center space-x-2 shadow-md shadow-rose-500/20 disabled:opacity-50 cursor-pointer"
          >
            {activeAction === 'fail_bank' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <AlertOctagon className="w-4 h-4" />}
            <span>Fail Bank API (503)</span>
          </button>
        </div>

        {/* Control 3: Recover Bank API */}
        <div className="glass-card border border-teal-500/30 hover:border-teal-400/60 rounded-2xl p-5 transition flex flex-col justify-between space-y-4 shadow-xl bg-teal-500/5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 shadow-md">
                <Activity className="w-4 h-4" />
              </div>
              <span className="bg-teal-500/15 text-teal-300 border border-teal-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                RECOVERY
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-white">3. Recover Bank API</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Marks Bank healthy and resumes pending queued workflows automatically without citizen resubmission.
              </p>
            </div>
          </div>

          <button
            onClick={handleRecoverBank}
            disabled={activeAction !== null}
            className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition flex items-center justify-center space-x-2 shadow-md shadow-teal-500/20 disabled:opacity-50 cursor-pointer"
          >
            {activeAction === 'recover_bank' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>Recover Bank & Resume</span>
          </button>
        </div>

        {/* Control 4: Slow Income API */}
        <div className="glass-card border border-amber-500/30 hover:border-amber-400/60 rounded-2xl p-5 transition flex flex-col justify-between space-y-4 shadow-xl bg-amber-500/5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-md">
                <Clock className="w-4 h-4" />
              </div>
              <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                LATENCY INJECTION
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-white">4. Slow Income API</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Injects simulated delay into Revenue API. Persists actual measured round-trip latency to PostgreSQL.
              </p>
            </div>

            <div className="pt-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>Injected Delay:</span>
                <span className="text-amber-300 font-bold">{injectedDelay} ms</span>
              </div>
              <input
                type="range"
                min="1000"
                max="4000"
                step="500"
                value={injectedDelay}
                onChange={(e) => setInjectedDelay(Number(e.target.value))}
                className="w-full accent-teal-500 cursor-pointer"
              />
            </div>
          </div>

          <button
            onClick={handleSlowIncome}
            disabled={activeAction !== null}
            className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition flex items-center justify-center space-x-2 shadow-md shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
          >
            {activeAction === 'slow_income' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
            <span>Inject Latency</span>
          </button>
        </div>

        {/* Control 5: Invalid Income */}
        <div className="glass-card border border-rose-500/30 hover:border-rose-400/60 rounded-2xl p-5 transition flex flex-col justify-between space-y-4 shadow-xl bg-rose-500/5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300 shadow-md">
                <FileWarning className="w-4 h-4" />
              </div>
              <span className="bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                REJECTION ROUTING
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-white">5. Invalid Income</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Returns an invalid/revoked certificate response. Workflow halts and routes to rejection path.
              </p>
            </div>
          </div>

          <button
            onClick={handleInvalidIncome}
            disabled={activeAction !== null}
            className="w-full bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition flex items-center justify-center space-x-2 shadow-md shadow-rose-500/20 disabled:opacity-50 cursor-pointer"
          >
            {activeAction === 'invalid_income' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileWarning className="w-4 h-4" />}
            <span>Simulate Invalid Certificate</span>
          </button>
        </div>

        {/* Control 6: Duplicate Application */}
        <div className="glass-card border border-white/10 hover:border-white/25 rounded-2xl p-5 transition flex flex-col justify-between space-y-4 shadow-xl">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-slate-300 shadow-md">
                <Copy className="w-4 h-4" />
              </div>
              <span className="bg-slate-800 text-slate-300 border border-white/10 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                HTTP 409
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-white">6. Duplicate Application</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Submits an application for an already-enrolled citizen. Verifies HTTP 409 rejection from the server.
              </p>
            </div>
          </div>

          <button
            onClick={handleDuplicate}
            disabled={activeAction !== null}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition flex items-center justify-center space-x-2 shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {activeAction === 'duplicate' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
            <span>Trigger Duplicate Check</span>
          </button>
        </div>
      </div>

      {/* Control 7: Reset Demo — Full Width Banner */}
      <div className="glass-card border border-rose-500/30 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-xl bg-rose-500/5">
        <div className="flex items-start space-x-4">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300 shrink-0 shadow-md">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">7. Reset Demo to Pristine Baseline</h3>
            <p className="text-xs text-slate-300 max-w-xl mt-1 leading-relaxed">
              Clears transient demo runs, restores canonical records (SCH-2026-001 through 005), and resets all mock departmental services. Guarantees deterministic repeatability.
            </p>
          </div>
        </div>

        <button
          onClick={handleResetDemo}
          disabled={activeAction !== null}
          className="bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-semibold text-xs py-2.5 px-5 rounded-xl transition flex items-center justify-center space-x-2 shrink-0 shadow-lg shadow-rose-600/20 disabled:opacity-50 cursor-pointer"
        >
          {activeAction === 'reset_demo' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
          <span>Reset Demo Platform</span>
        </button>
      </div>
    </div>
  );
}
