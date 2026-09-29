import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Power,
  ArrowUp,
  ArrowDown,
  Play,
  Save,
  Check,
  Server,
  Zap,
  AlertTriangle,
  RotateCcw,
  Clock,
  Settings2,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
  Sliders,
  Radio
} from 'lucide-react';
import adminService from '../../services/adminService';

const AVAILABLE_DEPARTMENTS = [
  { code: 'INTEROP', name: 'Interoperability Gateway' },
  { code: 'EDU', name: 'Higher Education Department' },
  { code: 'REV', name: 'Revenue / Land Records Department' },
  { code: 'DBT', name: 'Public Financial / DBT Mission' },
];

const CONNECTOR_TYPES = ['REST', 'MOCK', 'SANDBOX', 'SOAP'];

export default function WorkflowBuilderPage() {
  const [definitions, setDefinitions] = useState([]);
  const [selectedWorkflowCode, setSelectedWorkflowCode] = useState('WF-SCHOLARSHIP-V1');
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [workflowData, setWorkflowData] = useState(null);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  // Modals & Step Editing
  const [editingStep, setEditingStep] = useState(null);
  const [isAddStepModalOpen, setIsAddStepModalOpen] = useState(false);
  const [isNewVersionModalOpen, setIsNewVersionModalOpen] = useState(false);
  const [newVersionInput, setNewVersionInput] = useState('');
  const [newVersionName, setNewVersionName] = useState('');

  // Step Form State
  const [stepForm, setStepForm] = useState({
    step_name: '',
    step_identifier: '',
    department_code: 'EDU',
    connector_type: 'REST',
    is_mandatory: true,
    is_enabled: true,
    timeout_seconds: 30,
    retry_policy: { maxRetries: 3, backoffMs: 1000 },
  });

  // Test Run Execution Panel
  const [testAppId, setTestAppId] = useState('SCH-2026-001');
  const [executingTest, setExecutingTest] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const loadWorkflowData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const allDefs = await adminService.getWorkflowDefinitions();
      setDefinitions(allDefs);

      const code = selectedWorkflowCode || 'WF-SCHOLARSHIP-V1';
      const details = await adminService.getWorkflowDefinition(code, selectedVersion);
      setWorkflowData(details);
      setSteps(details.steps || []);
      if (!selectedVersion && details.definition) {
        setSelectedVersion(details.definition.version);
      }
    } catch (err) {
      console.error('Failed to load workflow data', err);
      setActionNotice({ type: 'error', message: err.message || 'Failed to load workflow definition from PostgreSQL' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadWorkflowData();
  }, [selectedWorkflowCode, selectedVersion]);

  // Step Reordering Handlers (Move Up / Down)
  const handleMoveStep = async (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= steps.length) return;

    const newSteps = [...steps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIndex];
    newSteps[targetIndex] = temp;

    // Recalculate step orders locally
    const updatedWithOrder = newSteps.map((s, idx) => ({ ...s, stepOrder: idx + 1 }));
    setSteps(updatedWithOrder);

    // Save new order to backend PostgreSQL
    try {
      const stepIds = updatedWithOrder.map((s) => s.id);
      await adminService.reorderWorkflowSteps(
        workflowData.definition.workflowCode,
        workflowData.definition.version,
        stepIds
      );
      setActionNotice({
        type: 'success',
        message: `Step order updated in PostgreSQL: "${temp.stepName}" moved to position #${targetIndex + 1}`,
      });
    } catch (err) {
      console.error('Failed to reorder steps', err);
      setActionNotice({ type: 'error', message: err.message || 'Failed to update step order' });
      await loadWorkflowData(true);
    }
  };

  // Toggle Step Enabled / Disabled
  const handleToggleEnabled = async (step) => {
    try {
      const newStatus = !step.isEnabled;
      await adminService.toggleWorkflowStep(
        workflowData.definition.workflowCode,
        workflowData.definition.version,
        step.id,
        newStatus
      );
      setSteps((prev) =>
        prev.map((s) => (s.id === step.id ? { ...s, isEnabled: newStatus } : s))
      );
      setActionNotice({
        type: 'success',
        message: `Step "${step.stepName}" is now ${newStatus ? 'ENABLED' : 'DISABLED (will be skipped during execution)'} in PostgreSQL`,
      });
    } catch (err) {
      console.error('Failed to toggle step', err);
      setActionNotice({ type: 'error', message: err.message || 'Failed to toggle step enabled state' });
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (step) => {
    setEditingStep(step);
    setStepForm({
      step_name: step.stepName,
      step_identifier: step.stepIdentifier,
      department_code: step.departmentCode,
      connector_type: step.connectorType || 'REST',
      is_mandatory: step.isMandatory,
      is_enabled: step.isEnabled,
      timeout_seconds: step.timeoutSeconds || 30,
      retry_policy: step.retryPolicy || { maxRetries: 3, backoffMs: 1000 },
    });
  };

  // Save Step Edit
  const handleSaveStepEdit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await adminService.updateWorkflowStep(
        workflowData.definition.workflowCode,
        workflowData.definition.version,
        editingStep.id,
        stepForm
      );
      setActionNotice({
        type: 'success',
        message: `Step "${stepForm.step_name}" updated successfully in PostgreSQL`,
      });
      setEditingStep(null);
      await loadWorkflowData(true);
    } catch (err) {
      console.error('Failed to update step', err);
      setActionNotice({ type: 'error', message: err.message || 'Failed to update step' });
    } finally {
      setSaving(false);
    }
  };

  // Delete Step
  const handleDeleteStep = async (stepId, stepName) => {
    if (!window.confirm(`Are you sure you want to delete step "${stepName}"? Subsequent steps will be renumbered in PostgreSQL.`)) {
      return;
    }

    try {
      await adminService.deleteWorkflowStep(
        workflowData.definition.workflowCode,
        workflowData.definition.version,
        stepId
      );
      setActionNotice({
        type: 'success',
        message: `Step "${stepName}" deleted and order re-indexed in PostgreSQL`,
      });
      await loadWorkflowData(true);
    } catch (err) {
      console.error('Failed to delete step', err);
      setActionNotice({ type: 'error', message: err.message || 'Failed to delete step' });
    }
  };

  // Add New Step
  const handleAddStepSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await adminService.addWorkflowStep(
        workflowData.definition.workflowCode,
        workflowData.definition.version,
        stepForm
      );
      setActionNotice({
        type: 'success',
        message: `Step "${stepForm.step_name}" added to PostgreSQL pipeline definition`,
      });
      setIsAddStepModalOpen(false);
      setStepForm({
        step_name: '',
        step_identifier: '',
        department_code: 'EDU',
        connector_type: 'REST',
        is_mandatory: true,
        is_enabled: true,
        timeout_seconds: 30,
        retry_policy: { maxRetries: 3, backoffMs: 1000 },
      });
      await loadWorkflowData(true);
    } catch (err) {
      console.error('Failed to add step', err);
      setActionNotice({ type: 'error', message: err.message || 'Failed to add step' });
    } finally {
      setSaving(false);
    }
  };

  // Activate Version
  const handleActivateVersion = async () => {
    if (!workflowData?.definition) return;
    const { workflowCode, version } = workflowData.definition;

    try {
      setActivating(true);
      const res = await adminService.activateWorkflowVersion(workflowCode, version);
      setActionNotice({
        type: 'success',
        message: `Version ${version} is now the ACTIVE workflow in PostgreSQL! The backend workflow engine will immediately execute this definition.`,
      });
      await loadWorkflowData(true);
    } catch (err) {
      console.error('Failed to activate version', err);
      setActionNotice({ type: 'error', message: err.message || 'Failed to activate workflow version' });
    } finally {
      setActivating(false);
    }
  };

  // Create New Version
  const handleCreateNewVersion = async (e) => {
    e.preventDefault();
    if (!newVersionInput) return;

    try {
      setSaving(true);
      const res = await adminService.createWorkflowVersion({
        workflowCode: selectedWorkflowCode,
        name: newVersionName || `Scholarship Pipeline v${newVersionInput}`,
        version: newVersionInput,
        copyFromVersion: workflowData?.definition?.version || '1.0.0',
        isActive: false,
      });

      setActionNotice({
        type: 'success',
        message: `New workflow version v${newVersionInput} created in PostgreSQL with cloned steps from v${workflowData?.definition?.version || '1.0.0'}.`,
      });

      setSelectedVersion(newVersionInput);
      setIsNewVersionModalOpen(false);
      setNewVersionInput('');
      setNewVersionName('');
      await loadWorkflowData(true);
    } catch (err) {
      console.error('Failed to create version', err);
      setActionNotice({ type: 'error', message: err.message || 'Failed to create workflow version' });
    } finally {
      setSaving(false);
    }
  };

  // Test Run Against Active Backend Engine
  const handleExecuteTestRun = async () => {
    try {
      setExecutingTest(true);
      setTestResult(null);
      const res = await adminService.resumeWorkflow(testAppId);
      setTestResult(res);
      setActionNotice({
        type: 'success',
        message: `Workflow engine executed against [${testAppId}] using active PostgreSQL workflow configuration!`,
      });
    } catch (err) {
      console.error('Test run error', err);
      setTestResult({ error: err.message });
      setActionNotice({
        type: 'error',
        message: `Execution failed: ${err.message}`,
      });
    } finally {
      setExecutingTest(false);
    }
  };

  const activeVersionObj = workflowData?.availableVersions?.find((v) => v.isActive);

  return (
    <div className="space-y-6">
      {/* 1. Header & Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 mb-1">
            <Link to="/admin" className="hover:text-teal-400 transition">Operational Control</Link>
            <span>/</span>
            <span className="text-white font-semibold">Workflow Builder</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5">
            <Layers className="w-6 h-6 text-teal-400" />
            <span>Workflow Engine & Step Orchestrator</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            PostgreSQL-backed pipeline definitions — connector binding, step reordering, and version activation.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => loadWorkflowData(true)}
            disabled={refreshing}
            className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white font-mono text-xs font-medium rounded-xl transition border border-white/10 flex items-center space-x-1.5 shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Sync DB</span>
          </button>

          <button
            onClick={() => setIsNewVersionModalOpen(true)}
            className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white font-mono text-xs font-bold rounded-xl transition border border-white/10 flex items-center space-x-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-teal-400" />
            <span>New Version</span>
          </button>

          <button
            onClick={() => setIsAddStepModalOpen(true)}
            className="px-3.5 py-1.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-mono text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shadow-lg shadow-teal-500/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Step</span>
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionNotice && (
        <div
          className={`px-4 py-3 rounded-xl border text-xs font-mono flex items-center justify-between gap-3 shadow-xs ${
            actionNotice.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            {actionNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{actionNotice.message}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-slate-400 hover:text-white ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Workflow Meta & Version Controls Card */}
      {workflowData && (
        <div className="glass-card p-5 sm:p-6 space-y-4 border border-white/10 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <div className="flex items-center space-x-2 mb-1 flex-wrap gap-y-1">
                <span className="font-mono text-xs font-bold text-teal-300 bg-teal-500/15 px-2 py-0.5 rounded border border-teal-500/30">
                  {workflowData.definition.workflowCode}
                </span>
                <span className="text-slate-500">·</span>
                <span className="text-xs text-slate-300 font-semibold">
                  v{workflowData.definition.version}
                </span>
                {workflowData.definition.isActive ? (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>ACTIVE</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-white/10 font-mono">
                    <span>INACTIVE</span>
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {workflowData.definition.name}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                {workflowData.definition.description || 'Sequential multi-department workflow specification.'}
              </p>
            </div>

            {/* Version Selector & Activation Controls */}
            <div className="flex items-center space-x-2 shrink-0">
              <div className="flex items-center space-x-1.5 bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-white/10 text-xs font-mono">
                <span className="text-slate-400">Version:</span>
                <select
                  value={workflowData.definition.version}
                  onChange={(e) => setSelectedVersion(e.target.value)}
                  className="bg-transparent text-white font-bold focus:outline-hidden"
                >
                  {workflowData.availableVersions?.map((v) => (
                    <option key={v.version} value={v.version} className="bg-slate-900 text-white">
                      v{v.version} {v.isActive ? '(Active)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {!workflowData.definition.isActive && (
                <button
                  onClick={handleActivateVersion}
                  disabled={activating}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-mono text-xs font-bold rounded-xl transition flex items-center space-x-1.5 disabled:opacity-50 shadow-lg shadow-teal-500/20 cursor-pointer"
                  title="Make this version the active execution configuration in PostgreSQL"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{activating ? 'Activating...' : 'Activate Version'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 bg-slate-900/90 rounded-xl border border-white/10">
              <span className="text-[10px] text-slate-400 block uppercase tracking-wide mb-0.5">Total Steps</span>
              <span className="text-sm font-bold text-white">{steps.length}</span>
            </div>
            <div className="p-3 bg-slate-900/90 rounded-xl border border-white/10">
              <span className="text-[10px] text-slate-400 block uppercase tracking-wide mb-0.5">Enabled</span>
              <span className="text-sm font-bold text-emerald-400">{steps.filter((s) => s.isEnabled).length}</span>
            </div>
            <div className="p-3 bg-slate-900/90 rounded-xl border border-white/10">
              <span className="text-[10px] text-slate-400 block uppercase tracking-wide mb-0.5">Disabled</span>
              <span className="text-sm font-bold text-amber-400">{steps.filter((s) => !s.isEnabled).length}</span>
            </div>
            <div className="p-3 bg-slate-900/90 rounded-xl border border-white/10">
              <span className="text-[10px] text-slate-400 block uppercase tracking-wide mb-0.5">Source of Truth</span>
              <span className="text-sm font-bold text-teal-400">PostgreSQL</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Ordered Workflow Steps Flow */}
      <div className="glass-card p-5 sm:p-6 space-y-4 border border-white/10 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-teal-400" />
              <span>Pipeline Step Sequence</span>
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Loaded from <code className="text-teal-300 font-mono text-[11px] bg-teal-500/15 px-1 py-0.5 rounded border border-teal-500/25">workflow_definition_steps</code> in PostgreSQL
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {steps.length} {steps.length === 1 ? 'stage' : 'stages'}
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs font-mono text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-400" />
            Loading PostgreSQL workflow definition...
          </div>
        ) : steps.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 space-y-2">
            <p>No steps configured for this workflow version.</p>
            <button
              onClick={() => setIsAddStepModalOpen(true)}
              className="text-teal-400 hover:underline font-bold cursor-pointer"
            >
              + Add First Step
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {steps.map((step, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === steps.length - 1;

              return (
                <div
                  key={step.id || idx}
                  className={`p-4 bg-slate-900/80 border rounded-xl transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    step.isEnabled
                      ? 'border-white/10 hover:border-teal-500/40'
                      : 'border-white/5 opacity-50'
                  }`}
                >
                  {/* Step Order Badge & Details */}
                  <div className="flex items-start sm:items-center space-x-3.5">
                    <div className="flex flex-col items-center">
                      <span className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/30 text-teal-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                        {step.stepOrder}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="text-sm font-semibold text-white">
                          {step.stepName}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-white/10 text-slate-300">
                          {step.stepIdentifier}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {step.departmentCode}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                          {step.connectorType || 'REST'}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center space-x-3 font-mono">
                        <span>Timeout: {step.timeoutSeconds}s</span>
                        <span>•</span>
                        <span>Retries: {step.retryPolicy?.maxRetries ?? 3}</span>
                        <span>•</span>
                        <span>Mandatory: {step.isMandatory ? 'Yes' : 'No'}</span>
                        <span>•</span>
                        <span className={step.isEnabled ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                          {step.isEnabled ? 'ENABLED' : 'DISABLED (SKIPPED)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Operational Controls: Reorder, Toggle, Edit, Delete */}
                  <div className="flex items-center space-x-1.5 shrink-0 self-end sm:self-auto">
                    {/* Move Up */}
                    <button
                      onClick={() => handleMoveStep(idx, 'up')}
                      disabled={isFirst}
                      title="Move Step Up"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>

                    {/* Move Down */}
                    <button
                      onClick={() => handleMoveStep(idx, 'down')}
                      disabled={isLast}
                      title="Move Step Down"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    {/* Enable / Disable Toggle */}
                    <button
                      onClick={() => handleToggleEnabled(step)}
                      title={step.isEnabled ? 'Disable Step (will skip)' : 'Enable Step'}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center space-x-1 border transition shadow-xs cursor-pointer ${
                        step.isEnabled
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                      }`}
                    >
                      <Power className="w-3 h-3" />
                      <span>{step.isEnabled ? 'Enabled' : 'Disabled'}</span>
                    </button>

                    {/* Edit Step */}
                    <button
                      onClick={() => handleOpenEditModal(step)}
                      title="Edit Step Configuration"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-teal-300 border border-white/10 transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Step */}
                    <button
                      onClick={() => handleDeleteStep(step.id, step.stepName)}
                      title="Delete Step"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-white/10 hover:border-rose-500/30 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Live Workflow Execution Test Harness */}
      <div className="glass-card p-5 sm:p-6 space-y-4 border border-white/10 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Play className="w-4 h-4 text-teal-400" />
              <span>Backend Execution Verification</span>
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Trigger the workflow engine against the active PostgreSQL configuration
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono text-slate-400">Application ID:</span>
            <input
              type="text"
              value={testAppId}
              onChange={(e) => setTestAppId(e.target.value)}
              className="bg-slate-900 border border-white/10 text-white font-mono text-xs px-2.5 py-1.5 rounded-xl focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500 w-36 shadow-xs"
            />
            <button
              onClick={handleExecuteTestRun}
              disabled={executingTest}
              className="px-3.5 py-1.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-mono text-xs font-bold rounded-xl transition flex items-center space-x-1.5 disabled:opacity-50 shadow-lg shadow-teal-500/20 cursor-pointer"
            >
              <Play className={`w-3.5 h-3.5 ${executingTest ? 'animate-spin' : ''}`} />
              <span>{executingTest ? 'Executing...' : 'Run Test'}</span>
            </button>
          </div>
        </div>

        {testResult && (
          <div className="p-3.5 bg-slate-900/90 border border-white/10 rounded-xl font-mono text-xs text-slate-300 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 uppercase text-[10px] tracking-wide">Execution Output</span>
              <span className={`text-[10px] font-bold ${testResult.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                {testResult.success ? 'SUCCESS' : 'FAILED'}
              </span>
            </div>
            <pre className="text-[11px] overflow-x-auto text-teal-300 bg-slate-950 p-3 rounded-lg border border-white/10">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Edit Step Modal */}
      {editingStep && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/15 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white">
                Edit Step: {editingStep.stepName}
              </h3>
              <button
                onClick={() => setEditingStep(null)}
                className="text-slate-400 hover:text-white font-bold p-1 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStepEdit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-300 mb-1">Step Name</label>
                <input
                  type="text"
                  required
                  value={stepForm.step_name}
                  onChange={(e) => setStepForm({ ...stepForm, step_name: e.target.value })}
                  className="w-full bg-slate-800/90 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-inner"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Step Identifier (UPPERCASE)</label>
                <input
                  type="text"
                  required
                  value={stepForm.step_identifier}
                  onChange={(e) => setStepForm({ ...stepForm, step_identifier: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                  className="w-full bg-slate-800/90 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-inner"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Department</label>
                  <select
                    value={stepForm.department_code}
                    onChange={(e) => setStepForm({ ...stepForm, department_code: e.target.value })}
                    className="w-full bg-slate-800/90 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-inner"
                  >
                    {AVAILABLE_DEPARTMENTS.map((dept) => (
                      <option key={dept.code} value={dept.code} className="bg-slate-900 text-white">
                        {dept.code} - {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Connector Type</label>
                  <select
                    value={stepForm.connector_type}
                    onChange={(e) => setStepForm({ ...stepForm, connector_type: e.target.value })}
                    className="w-full bg-slate-800/90 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-inner"
                  >
                    {CONNECTOR_TYPES.map((ct) => (
                      <option key={ct} value={ct} className="bg-slate-900 text-white">
                        {ct}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Timeout (seconds)</label>
                  <input
                    type="number"
                    min="1"
                    max="300"
                    value={stepForm.timeout_seconds}
                    onChange={(e) => setStepForm({ ...stepForm, timeout_seconds: parseInt(e.target.value, 10) })}
                    className="w-full bg-slate-800/90 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Max Retries</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={stepForm.retry_policy?.maxRetries ?? 3}
                    onChange={(e) =>
                      setStepForm({
                        ...stepForm,
                        retry_policy: { ...stepForm.retry_policy, maxRetries: parseInt(e.target.value, 10) },
                      })
                    }
                    className="w-full bg-slate-800/90 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-inner"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-6 pt-2">
                <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stepForm.is_enabled}
                    onChange={(e) => setStepForm({ ...stepForm, is_enabled: e.target.checked })}
                    className="rounded bg-slate-800 border-white/20 text-teal-500 focus:ring-teal-500"
                  />
                  <span>Step Enabled</span>
                </label>

                <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stepForm.is_mandatory}
                    onChange={(e) => setStepForm({ ...stepForm, is_mandatory: e.target.checked })}
                    className="rounded bg-slate-800 border-white/20 text-teal-500 focus:ring-teal-500"
                  />
                  <span>Mandatory Step</span>
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingStep(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold rounded-xl transition disabled:opacity-50 shadow-md shadow-teal-500/20"
                >
                  {saving ? 'Saving...' : 'Save Step in PostgreSQL'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Step Modal */}
      {isAddStepModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/15 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white">
                Add Step to Pipeline ({workflowData?.definition?.version})
              </h3>
              <button
                onClick={() => setIsAddStepModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold p-1 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddStepSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-300 mb-1">Step Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fraud Risk Analysis"
                  value={stepForm.step_name}
                  onChange={(e) => setStepForm({ ...stepForm, step_name: e.target.value })}
                  className="w-full bg-slate-800/90 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-inner"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Step Identifier (UPPERCASE)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FRAUD_RISK_ANALYSIS"
                  value={stepForm.step_identifier}
                  onChange={(e) => setStepForm({ ...stepForm, step_identifier: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                  className="w-full bg-slate-800/90 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-inner"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Department</label>
                  <select
                    value={stepForm.department_code}
                    onChange={(e) => setStepForm({ ...stepForm, department_code: e.target.value })}
                    className="w-full bg-slate-800/90 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-inner"
                  >
                    {AVAILABLE_DEPARTMENTS.map((dept) => (
                      <option key={dept.code} value={dept.code} className="bg-slate-900 text-white">
                        {dept.code} - {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Connector Type</label>
                  <select
                    value={stepForm.connector_type}
                    onChange={(e) => setStepForm({ ...stepForm, connector_type: e.target.value })}
                    className="w-full bg-slate-800/90 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-inner"
                  >
                    {CONNECTOR_TYPES.map((ct) => (
                      <option key={ct} value={ct} className="bg-slate-900 text-white">
                        {ct}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Timeout (seconds)</label>
                  <input
                    type="number"
                    min="1"
                    max="300"
                    value={stepForm.timeout_seconds}
                    onChange={(e) => setStepForm({ ...stepForm, timeout_seconds: parseInt(e.target.value, 10) })}
                    className="w-full bg-slate-800/90 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Max Retries</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={stepForm.retry_policy?.maxRetries ?? 3}
                    onChange={(e) =>
                      setStepForm({
                        ...stepForm,
                        retry_policy: { ...stepForm.retry_policy, maxRetries: parseInt(e.target.value, 10) },
                      })
                    }
                    className="w-full bg-slate-800/90 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-inner"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-6 pt-2">
                <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stepForm.is_enabled}
                    onChange={(e) => setStepForm({ ...stepForm, is_enabled: e.target.checked })}
                    className="rounded bg-slate-800 border-white/20 text-teal-500 focus:ring-teal-500"
                  />
                  <span>Step Enabled</span>
                </label>

                <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stepForm.is_mandatory}
                    onChange={(e) => setStepForm({ ...stepForm, is_mandatory: e.target.checked })}
                    className="rounded bg-slate-800 border-white/20 text-teal-500 focus:ring-teal-500"
                  />
                  <span>Mandatory Step</span>
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddStepModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold rounded-xl transition disabled:opacity-50 shadow-md shadow-teal-500/20"
                >
                  {saving ? 'Adding...' : 'Add Step to Pipeline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Version Modal */}
      {isNewVersionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/15 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white">
                Create New Workflow Version
              </h3>
              <button
                onClick={() => setIsNewVersionModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold p-1 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewVersion} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-300 mb-1">Semantic Version (e.g. 1.1.0 or 2.0.0)</label>
                <input
                  type="text"
                  required
                  placeholder="1.1.0"
                  value={newVersionInput}
                  onChange={(e) => setNewVersionInput(e.target.value)}
                  className="w-full bg-slate-800/90 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-mono shadow-inner"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Version Title</label>
                <input
                  type="text"
                  placeholder="e.g. Post-Matric Scholarship Pipeline v1.1"
                  value={newVersionName}
                  onChange={(e) => setNewVersionName(e.target.value)}
                  className="w-full bg-slate-800/90 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-inner"
                />
              </div>

              <p className="text-[11px] text-slate-400">
                Steps will be automatically cloned from version <strong className="text-teal-400 font-semibold">v{workflowData?.definition?.version || '1.0.0'}</strong> into the new version in PostgreSQL.
              </p>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsNewVersionModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold rounded-xl transition disabled:opacity-50 shadow-md shadow-teal-500/20"
                >
                  {saving ? 'Creating...' : 'Create Version in PostgreSQL'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
