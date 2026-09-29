import React, { useState, useEffect } from 'react';
import adminService from '../../services/adminService';
import { 
  GitBranch, 
  ArrowRight, 
  Search, 
  Filter, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Zap, 
  Code2, 
  Database,
  Sliders,
  Check,
  X,
  FileText,
  Sparkles
} from 'lucide-react';

export default function DataMappingsPage() {
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Interactive State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMapping, setEditingMapping] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    sourceSystem: 'Education',
    sourceField: '',
    canonicalField: '',
    transformationRule: 'direct',
    departmentCode: 'EDU',
    description: '',
    isActive: true,
  });

  // Interactive Live Transformation Tester
  const [showTester, setShowTester] = useState(false);
  const [testInput, setTestInput] = useState('₹ 1,80,000.00');
  const [testRule, setTestRule] = useState('number');
  const [testResult, setTestResult] = useState(null);
  const [testingRule, setTestingRule] = useState(false);

  // Department code lookup for system names
  const SYSTEM_DEPTS = {
    Education: 'EDU',
    Income: 'REV',
    Bank: 'DBT',
    Legacy: 'LEG',
    General: 'GEN',
  };

  const TRANSFORMATION_PRESETS = [
    'direct',
    'VERIFIED / NOT_VERIFIED',
    'number',
    'boolean',
    'VALID / EXPIRED',
    'TRIM',
    'TO_UPPERCASE',
  ];

  const fetchMappings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getMappings();
      setMappings(data);
    } catch (err) {
      console.error('Failed to load data mappings:', err);
      setError(err.message || 'Failed to load canonical data mappings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMappings();
  }, []);

  const handleOpenAdd = () => {
    setEditingMapping(null);
    setFormData({
      sourceSystem: 'Education',
      sourceField: '',
      canonicalField: '',
      transformationRule: 'direct',
      departmentCode: 'EDU',
      description: '',
      isActive: true,
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (m) => {
    setEditingMapping(m);
    setFormData({
      sourceSystem: m.sourceSystem || m.source_system,
      sourceField: m.sourceField || m.source_field,
      canonicalField: m.canonicalField || m.canonical_field,
      transformationRule: m.transformationRule || m.transformation_rule,
      departmentCode: m.departmentCode || m.department_code || 'GEN',
      description: m.description || '',
      isActive: m.isActive !== undefined ? m.isActive : true,
    });
    setShowAddModal(true);
  };

  const handleSaveMapping = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      if (editingMapping) {
        await adminService.updateMapping(editingMapping.id, formData);
        setSuccessMsg(`Successfully updated mapping for "${formData.sourceField}"`);
      } else {
        await adminService.createMapping(formData);
        setSuccessMsg(`Successfully registered new mapping "${formData.sourceField} -> ${formData.canonicalField}"`);
      }

      setShowAddModal(false);
      await fetchMappings();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err.message || 'Failed to save data mapping');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this data mapping rule?')) return;
    try {
      setDeletingId(id);
      await adminService.deleteMapping(id);
      setSuccessMsg('Mapping rule deleted successfully');
      await fetchMappings();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to delete mapping');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (m) => {
    try {
      const nextActive = !m.isActive;
      await adminService.updateMapping(m.id, { isActive: nextActive });
      setMappings((prev) =>
        prev.map((item) => (item.id === m.id ? { ...item, isActive: nextActive, is_active: nextActive } : item))
      );
    } catch (err) {
      setError(err.message || 'Failed to toggle mapping status');
    }
  };

  const handleTestTransformation = async () => {
    try {
      setTestingRule(true);
      const res = await adminService.testMappingRule(testInput, testRule);
      setTestResult(res.data);
    } catch (err) {
      setTestResult({ error: err.message });
    } finally {
      setTestingRule(false);
    }
  };

  // Filtered List
  const filteredMappings = mappings.filter((m) => {
    const sys = (m.sourceSystem || m.source_system || '').toLowerCase();
    const sf = (m.sourceField || m.source_field || '').toLowerCase();
    const cf = (m.canonicalField || m.canonical_field || '').toLowerCase();
    const tr = (m.transformationRule || m.transformation_rule || '').toLowerCase();

    const matchesSource =
      sourceFilter === 'ALL' || sys.includes(sourceFilter.toLowerCase());

    const matchesSearch =
      !searchQuery ||
      sys.includes(searchQuery.toLowerCase()) ||
      sf.includes(searchQuery.toLowerCase()) ||
      cf.includes(searchQuery.toLowerCase()) ||
      tr.includes(searchQuery.toLowerCase());

    return matchesSource && matchesSearch;
  });

  const uniqueSystems = ['ALL', 'Education', 'Income', 'Bank', 'Legacy'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card border border-white/10 rounded-2xl p-6 sm:p-7 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-2 bg-teal-500/10 border border-teal-500/30 text-teal-300 px-3 py-1 rounded-full text-xs font-mono font-semibold">
              <Database className="w-3.5 h-3.5" />
              <span>DATA MAPPINGS</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Canonical Data Mappings
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Standardizes disparate departmental fields into uniform platform contracts. Incoming payloads from Education, Revenue, and PFMS are converted before workflow engine evaluation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setShowTester(!showTester)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-2 border shadow-lg ${
                showTester
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-900/20'
                  : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border-white/10'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{showTester ? 'Hide Tester' : 'Rule Tester'}</span>
            </button>

            <button
              onClick={handleOpenAdd}
              className="bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition flex items-center space-x-2 shadow-lg shadow-teal-900/40"
            >
              <Plus className="w-4 h-4" />
              <span>Add Mapping</span>
            </button>
          </div>
        </div>

        {/* Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-white/10">
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wide block">Registered Rules</span>
            <span className="text-xl font-bold text-white">{mappings.length}</span>
          </div>
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wide block">Active</span>
            <span className="text-xl font-bold text-emerald-400">
              {mappings.filter((m) => m.isActive).length}
            </span>
          </div>
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wide block">Source Systems</span>
            <span className="text-xl font-bold text-teal-300">
              {new Set(mappings.map((m) => m.sourceSystem)).size}
            </span>
          </div>
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wide block">Store</span>
            <span className="text-sm font-bold text-slate-300 flex items-center space-x-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>PostgreSQL</span>
            </span>
          </div>
        </div>
      </div>

      {/* Success & Error Alerts */}
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl flex items-center space-x-3 text-xs font-mono shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-xl flex items-center space-x-3 text-xs font-mono shadow-lg">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Live Interactive Transformation Tester Panel */}
      {showTester && (
        <div className="glass-card border border-amber-500/30 bg-slate-900/90 rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Live Backend Transformation Engine Probe</h3>
                <p className="text-xs text-slate-300">Test how the backend engine coerces heterogeneous departmental inputs</p>
              </div>
            </div>
            <button
              onClick={() => setShowTester(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="text-[11px] font-mono text-slate-300 block mb-1.5 uppercase">Test Raw Input</label>
              <input
                type="text"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="e.g. ₹ 1,80,000.00"
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-inner"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-300 block mb-1.5 uppercase">Transformation Rule</label>
              <select
                value={testRule}
                onChange={(e) => setTestRule(e.target.value)}
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-inner"
              >
                {TRANSFORMATION_PRESETS.map((p) => (
                  <option key={p} value={p} className="bg-slate-900 text-white">{p}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleTestTransformation}
                disabled={testingRule}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition flex items-center justify-center space-x-2 shadow-lg shadow-amber-900/30"
              >
                {testingRule ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                <span>{testingRule ? 'Evaluating...' : 'Evaluate in Backend'}</span>
              </button>
            </div>
          </div>

          {testResult && (
            <div className="mt-4 p-4 rounded-xl bg-slate-950/70 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-mono">
              <div className="space-y-1">
                <span className="text-slate-400 block text-[10px]">RAW INPUT VALUE</span>
                <span className="text-white font-bold">{testResult.input}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-400 hidden sm:block shrink-0" />
              <div className="space-y-1">
                <span className="text-slate-400 block text-[10px]">RULE APPLIED</span>
                <span className="text-amber-300 font-bold">{testResult.rule}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-400 hidden sm:block shrink-0" />
              <div className="space-y-1">
                <span className="text-slate-400 block text-[10px]">CANONICAL OUTPUT ({testResult.type})</span>
                <span className="text-emerald-300 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  {typeof testResult.output === 'object' ? JSON.stringify(testResult.output) : String(testResult.output)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Control & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Source System Filter Tabs */}
        <div className="flex items-center space-x-1 glass-card border border-white/10 p-1.5 rounded-xl overflow-x-auto shadow-lg">
          {uniqueSystems.map((sys) => (
            <button
              key={sys}
              onClick={() => setSourceFilter(sys)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                sourceFilter === sys
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-900/40'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {sys}
            </button>
          ))}
        </div>

        {/* Search Input & Refresh */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search fields or rules..."
              className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-inner"
            />
          </div>

          <button
            onClick={fetchMappings}
            disabled={loading}
            className="p-2 glass-card border border-white/10 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition shadow-lg"
            title="Refresh Mappings"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Data Mappings Table */}
      <div className="glass-card border border-white/10 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-teal-400" />
            <p className="text-xs">Loading canonical data mappings from PostgreSQL...</p>
          </div>
        ) : filteredMappings.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <FileText className="w-8 h-8 mx-auto text-slate-500" />
            <p className="text-sm font-semibold text-slate-200">No data mappings found</p>
            <p className="text-xs text-slate-400">Adjust your search or filter criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 border-b border-white/10 text-[11px] font-mono text-slate-300 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Source System</th>
                  <th className="py-3.5 px-4">Source Field</th>
                  <th className="py-3.5 px-4">
                    <span className="flex items-center space-x-1.5">
                      <ArrowRight className="w-3.5 h-3.5 text-teal-400" />
                      <span>Canonical Field</span>
                    </span>
                  </th>
                  <th className="py-3.5 px-4">Transformation Rule</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredMappings.map((m) => {
                  const sys = m.sourceSystem || m.source_system;
                  const sf = m.sourceField || m.source_field;
                  const cf = m.canonicalField || m.canonical_field;
                  const rule = m.transformationRule || m.transformation_rule;
                  const dept = m.departmentCode || m.department_code;

                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-slate-800/50 transition group text-slate-300"
                    >
                      {/* Source System */}
                      <td className="py-3.5 px-4 sm:px-6 font-semibold text-white">
                        <div className="flex items-center space-x-2">
                          <span className="w-2 h-2 rounded-full bg-teal-400" />
                          <span>{sys}</span>
                          {dept && (
                            <span className="bg-slate-800 text-teal-300 border border-teal-500/20 text-[10px] font-mono px-1.5 py-0.5 rounded">
                              {dept}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Source Field */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-md text-xs font-semibold">
                          {sf}
                        </span>
                      </td>

                      {/* Canonical Field */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2">
                          <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-teal-400 transition" />
                          <span className="font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-md text-xs font-semibold">
                            {cf}
                          </span>
                        </div>
                      </td>

                      {/* Transformation Rule */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-1 rounded-md">
                          {rule}
                        </span>
                      </td>

                      {/* Enabled State */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleToggleActive(m)}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold transition ${
                            m.isActive
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border border-white/10'
                          }`}
                        >
                          {m.isActive ? 'ENABLED' : 'DISABLED'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => {
                              setTestRule(rule);
                              setTestInput(sf === 'annual_income' ? '180000' : 'sample_value');
                              setShowTester(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 border border-white/10 text-slate-300 hover:text-amber-400 hover:bg-slate-700 transition shadow-sm"
                            title="Test Rule"
                          >
                            <Zap className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenEdit(m)}
                            className="p-1.5 rounded-lg bg-slate-800 border border-white/10 text-slate-300 hover:text-white hover:bg-slate-700 transition shadow-sm"
                            title="Edit Mapping"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDelete(m.id)}
                            disabled={deletingId === m.id}
                            className="p-1.5 rounded-lg bg-slate-800 border border-white/10 text-slate-300 hover:text-rose-400 hover:bg-rose-500/20 transition shadow-sm"
                            title="Delete Mapping"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Mapping Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card bg-slate-900/95 border border-white/15 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-bold text-white">
                  {editingMapping ? 'Edit Data Mapping Rule' : 'Add Canonical Field Mapping'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMapping} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-mono text-slate-300 block mb-1 uppercase">Source System</label>
                  <select
                    value={formData.sourceSystem}
                    onChange={(e) => {
                      const sys = e.target.value;
                      setFormData({
                        ...formData,
                        sourceSystem: sys,
                        departmentCode: SYSTEM_DEPTS[sys] || 'GEN',
                      });
                    }}
                    className="w-full bg-slate-950/90 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-inner"
                  >
                    <option value="Education" className="bg-slate-900 text-white">Education</option>
                    <option value="Income" className="bg-slate-900 text-white">Income</option>
                    <option value="Bank" className="bg-slate-900 text-white">Bank</option>
                    <option value="Legacy" className="bg-slate-900 text-white">Legacy</option>
                    <option value="General" className="bg-slate-900 text-white">General</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-300 block mb-1 uppercase">Department Code</label>
                  <input
                    type="text"
                    value={formData.departmentCode}
                    onChange={(e) => setFormData({ ...formData, departmentCode: e.target.value })}
                    className="w-full bg-slate-950/90 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-inner"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-300 block mb-1 uppercase">Source Field (Vendor JSON Key)</label>
                <input
                  type="text"
                  value={formData.sourceField}
                  onChange={(e) => setFormData({ ...formData, sourceField: e.target.value })}
                  placeholder="e.g. student_id, annual_income, holder_match"
                  className="w-full bg-slate-950/90 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-inner"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-300 block mb-1 uppercase">Canonical Target Field</label>
                <input
                  type="text"
                  value={formData.canonicalField}
                  onChange={(e) => setFormData({ ...formData, canonicalField: e.target.value })}
                  placeholder="e.g. studentId, annualIncome, accountHolderMatch"
                  className="w-full bg-slate-950/90 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-inner"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-300 block mb-1 uppercase">Transformation Rule</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.transformationRule}
                    onChange={(e) => setFormData({ ...formData, transformationRule: e.target.value })}
                    placeholder="e.g. direct, number, boolean, VERIFIED / NOT_VERIFIED"
                    className="flex-1 bg-slate-950/90 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-inner"
                    required
                  />
                  <select
                    onChange={(e) => setFormData({ ...formData, transformationRule: e.target.value })}
                    className="bg-slate-950/90 border border-white/10 rounded-xl px-2 py-2 text-xs text-white shadow-inner"
                    defaultValue=""
                  >
                    <option value="" disabled className="bg-slate-900 text-slate-400">Presets</option>
                    {TRANSFORMATION_PRESETS.map((p) => (
                      <option key={p} value={p} className="bg-slate-900 text-white">{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-300 block mb-1 uppercase">Description / Operational Note</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  placeholder="Optional operational details on normalization..."
                  className="w-full bg-slate-950/90 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-inner"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <label className="flex items-center space-x-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-teal-600 bg-slate-900 border-white/20 focus:ring-teal-500"
                  />
                  <span>Active & Enabled in Engine</span>
                </label>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs py-2 px-5 rounded-xl shadow-lg shadow-teal-900/40 transition flex items-center space-x-1.5"
                  >
                    {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editingMapping ? 'Save Changes' : 'Create Mapping'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
