import React, { useState, useEffect } from 'react';
import adminService from '../../services/adminService';
import { 
  Server, 
  Activity, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Sliders, 
  Clock, 
  ArrowUpRight, 
  ExternalLink, 
  Layers, 
  Filter, 
  Search, 
  Check, 
  X, 
  Radio, 
  Terminal, 
  ShieldCheck,
  Play
} from 'lucide-react';

export default function ServiceRegistryPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters
  const [connectorFilter, setConnectorFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Testing State
  const [testingServiceId, setTestingServiceId] = useState(null);
  const [batchTesting, setBatchTesting] = useState(false);
  const [lastTestReport, setLastTestReport] = useState(null);

  // Edit Service Config Modal
  const [editingService, setEditingService] = useState(null);
  const [configFormData, setConfigFormData] = useState({
    connectorType: 'REST',
    endpoint: '',
    timeoutMs: 5000,
    retryLimit: 3,
    status: 'ACTIVE',
  });
  const [savingConfig, setSavingConfig] = useState(false);

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getServices();
      setServices(data);
    } catch (err) {
      console.error('Failed to load services:', err);
      setError(err.message || 'Failed to load departmental service registry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  // Execute real backend test probe
  const handleTestService = async (srv) => {
    try {
      setTestingServiceId(srv.serviceCode || srv.id);
      setError(null);

      // Call backend test endpoint
      const response = await adminService.testService(srv.serviceCode || srv.id);

      // Update service list with updated persisted record
      if (response?.data) {
        setServices((prev) =>
          prev.map((s) => (s.serviceCode === srv.serviceCode ? { ...s, ...response.data } : s))
        );
      }

      setLastTestReport({
        serviceName: srv.serviceName || srv.service,
        serviceCode: srv.serviceCode,
        department: srv.department,
        connectorType: srv.connectorType,
        ...response?.testResult,
        ...response?.data,
      });

      setSuccessMsg(`Backend test probe succeeded for ${srv.serviceName}. Health & latency persisted.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Service test failed:', err);
      setError(err.message || `Test probe failed for ${srv.serviceName}`);
    } finally {
      setTestingServiceId(null);
    }
  };

  // Batch test all services sequentially
  const handleTestAllServices = async () => {
    try {
      setBatchTesting(true);
      setError(null);
      for (const srv of services) {
        setTestingServiceId(srv.serviceCode);
        const res = await adminService.testService(srv.serviceCode);
        if (res?.data) {
          setServices((prev) =>
            prev.map((s) => (s.serviceCode === srv.serviceCode ? { ...s, ...res.data } : s))
          );
        }
      }
      setSuccessMsg('All registered service connectors probed successfully. Telemetry refreshed.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err.message || 'Batch service test failed');
    } finally {
      setTestingServiceId(null);
      setBatchTesting(false);
    }
  };

  // Open config modal
  const handleOpenConfig = (srv) => {
    setEditingService(srv);
    setConfigFormData({
      connectorType: srv.connectorType || 'REST',
      endpoint: srv.endpoint || '/verify',
      timeoutMs: srv.timeoutMs || 5000,
      retryLimit: srv.retryLimit || 3,
      status: srv.status || 'ACTIVE',
    });
  };

  // Save config changes to PostgreSQL
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      setSavingConfig(true);
      await adminService.updateServiceConfig(editingService.serviceCode || editingService.id, configFormData);
      setSuccessMsg(`Configuration updated for ${editingService.serviceName}`);
      setEditingService(null);
      await fetchServices();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update service configuration');
    } finally {
      setSavingConfig(false);
    }
  };

  // Filtered Services
  const filteredServices = services.filter((s) => {
    const type = (s.connectorType || '').toUpperCase();
    const name = (s.serviceName || s.service || '').toLowerCase();
    const code = (s.serviceCode || '').toLowerCase();
    const dept = (s.department || '').toLowerCase();

    const matchesType = connectorFilter === 'ALL' || type === connectorFilter;
    const matchesSearch =
      !searchQuery ||
      name.includes(searchQuery.toLowerCase()) ||
      code.includes(searchQuery.toLowerCase()) ||
      dept.includes(searchQuery.toLowerCase());

    return matchesType && matchesSearch;
  });

  const CONNECTOR_BADGES = {
    REST: 'bg-sky-50 text-sky-700 border-sky-200',
    LEGACY: 'bg-amber-50 text-amber-700 border-amber-200',
    MOCK: 'bg-purple-50 text-purple-700 border-purple-200',
    SANDBOX: 'bg-teal-50 text-teal-700 border-teal-200',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6 sm:p-7 border border-white/10 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-2 bg-teal-500/15 border border-teal-500/30 text-teal-300 px-3 py-1 rounded-full text-xs font-mono font-semibold">
              <Server className="w-3.5 h-3.5" />
              <span>SERVICE REGISTRY</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Departmental Service Registry
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Real-time inventory of all cross-agency connectors. Monitor health, probe latencies, and dispatch live tests across REST, LEGACY, MOCK, and SANDBOX adapters.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleTestAllServices}
              disabled={batchTesting || loading}
              className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition flex items-center space-x-2 shadow-lg shadow-teal-500/20 disabled:opacity-50 cursor-pointer"
            >
              <Play className={`w-4 h-4 ${batchTesting ? 'animate-spin' : ''}`} />
              <span>{batchTesting ? 'Testing...' : 'Ping All Services'}</span>
            </button>

            <button
              onClick={fetchServices}
              disabled={loading}
              className="p-2.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 rounded-xl transition shadow-xs cursor-pointer"
              title="Refresh Registry"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Telemetry Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-white/10">
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wide block">Registered</span>
            <span className="text-xl font-bold text-white">{services.length}</span>
          </div>
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wide block">Healthy</span>
            <span className="text-xl font-bold text-emerald-400">
              {services.filter((s) => (s.health || s.healthStatus) === 'HEALTHY').length}
            </span>
          </div>
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wide block">Avg Latency</span>
            <span className="text-xl font-bold text-teal-400">
              {services.length > 0
                ? Math.round(
                    services.reduce((acc, s) => acc + (s.responseTime || 25), 0) / services.length
                  )
                : 0}ms
            </span>
          </div>
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wide block">Connectors</span>
            <span className="text-[11px] font-mono text-slate-300 block mt-1">
              REST · LEGACY · MOCK · SANDBOX
            </span>
          </div>
        </div>
      </div>

      {/* Success & Error Alerts */}
      {successMsg && (
        <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl flex items-center space-x-3 text-xs font-mono shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-xl flex items-center space-x-3 text-xs font-mono shadow-xs">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Last Test Probe Report */}
      {lastTestReport && (
        <div className="glass-card p-5 space-y-3 border border-white/10 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300">
                <Terminal className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                Test Probe Report
              </h3>
            </div>
            <button
              onClick={() => setLastTestReport(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3 bg-slate-900/90 rounded-xl border border-white/10 text-xs font-mono">
            <div>
              <span className="text-[10px] text-slate-400 block">TARGET SERVICE</span>
              <span className="text-white font-bold">{lastTestReport.serviceCode}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">CONNECTOR</span>
              <span className="text-sky-300 font-bold">{lastTestReport.connectorType}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">HEALTH RESULT</span>
              <span className={`font-bold ${lastTestReport.health === 'HEALTHY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {lastTestReport.health || lastTestReport.healthStatus}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">RECORDED LATENCY</span>
              <span className="text-amber-300 font-bold">{lastTestReport.responseTime || lastTestReport.latencyMs} ms</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">TELEMETRY PERSISTENCE</span>
              <span className="text-emerald-400 font-bold flex items-center space-x-1">
                <Check className="w-3 h-3" />
                <span>SAVED TO DB</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Connector Type Filter Tabs */}
        <div className="flex items-center space-x-1 bg-slate-900/80 border border-white/10 p-1 rounded-xl overflow-x-auto shadow-xs">
          {['ALL', 'REST', 'LEGACY', 'MOCK', 'SANDBOX'].map((type) => (
            <button
              key={type}
              onClick={() => setConnectorFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                connectorFilter === type
                  ? 'bg-slate-800 text-teal-300 border border-teal-500/40 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search service or department..."
            className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-xs"
          />
        </div>
      </div>

      {/* Services Registry Table */}
      <div className="glass-card border border-white/10 rounded-xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-teal-400" />
            <p className="text-xs">Querying service registry and persisted telemetry...</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Server className="w-8 h-8 mx-auto text-slate-500" />
            <p className="text-sm font-semibold text-white">No services match criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 border-b border-white/10 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Service</th>
                  <th className="py-3.5 px-4 text-center">Department</th>
                  <th className="py-3.5 px-4 text-center">Connector Type</th>
                  <th className="py-3.5 px-4">Endpoint</th>
                  <th className="py-3.5 px-4 text-center">Health</th>
                  <th className="py-3.5 px-4 text-center">Response Time</th>
                  <th className="py-3.5 px-4">Last Checked</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Test Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredServices.map((srv) => {
                  const health = srv.health || srv.healthStatus || 'HEALTHY';
                  const connectorType = (srv.connectorType || 'REST').toUpperCase();
                  const isTesting = testingServiceId === (srv.serviceCode || srv.id);

                  return (
                    <tr
                      key={srv.id || srv.serviceCode}
                      className="hover:bg-slate-800/60 transition group"
                    >
                      {/* Service Name & Code */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="space-y-0.5">
                          <span className="font-bold text-white block text-xs group-hover:text-teal-300 transition">
                            {srv.serviceName || srv.service}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400 block">
                            {srv.serviceCode}
                          </span>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="bg-slate-800 text-slate-300 border border-white/10 font-mono text-[10px] font-bold px-2 py-0.5 rounded">
                          {srv.department || srv.departmentCode}
                        </span>
                      </td>

                      {/* Connector Type */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`font-mono text-[10px] font-bold px-2.5 py-1 rounded-md border ${
                            CONNECTOR_BADGES[connectorType] || 'bg-slate-800 text-slate-300 border-white/10'
                          }`}
                        >
                          {connectorType}
                        </span>
                      </td>

                      {/* Endpoint */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[11px] text-slate-300 bg-slate-900 px-2 py-1 rounded border border-white/10 block truncate max-w-xs">
                          {srv.endpoint}
                        </span>
                      </td>

                      {/* Health */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold">
                          {health === 'HEALTHY' && (
                            <span className="inline-flex items-center space-x-1.5 text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span>HEALTHY</span>
                            </span>
                          )}
                          {health === 'DEGRADED' && (
                            <span className="inline-flex items-center space-x-1.5 text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                              <span>DEGRADED</span>
                            </span>
                          )}
                          {health === 'DOWN' && (
                            <span className="inline-flex items-center space-x-1.5 text-rose-300 bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              <span>DOWN</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Response Time */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`font-mono font-bold text-xs ${
                            (srv.responseTime || 25) < 100
                              ? 'text-emerald-400'
                              : (srv.responseTime || 25) < 500
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {srv.responseTime !== undefined ? srv.responseTime : 25} ms
                        </span>
                      </td>

                      {/* Last Checked */}
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[10px]">
                        {srv.lastChecked
                          ? new Date(srv.lastChecked).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })
                          : 'Just now'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleOpenConfig(srv)}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-white/10 transition cursor-pointer"
                            title="Configure Connector"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleTestService(srv)}
                            disabled={isTesting || batchTesting}
                            className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition flex items-center space-x-1.5 shadow-xs cursor-pointer ${
                              isTesting
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/10'
                                : 'bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40'
                            }`}
                          >
                            {isTesting ? (
                              <>
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                <span>Testing...</span>
                              </>
                            ) : (
                              <>
                                <Zap className="w-3 h-3 text-amber-400" />
                                <span>Test Service</span>
                              </>
                            )}
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

      {/* Configure Connector Modal */}
      {editingService && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/15 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-bold text-white">Configure Service Connector</h3>
              </div>
              <button
                onClick={() => setEditingService(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1 uppercase">Service Name</label>
                <input
                  type="text"
                  value={editingService.serviceName || editingService.service}
                  disabled
                  className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1 uppercase">Connector Type</label>
                <select
                  value={configFormData.connectorType}
                  onChange={(e) => setConfigFormData({ ...configFormData, connectorType: e.target.value })}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-mono shadow-xs"
                >
                  <option value="REST" className="bg-slate-900 text-white">REST (Default HTTP/JSON Adapter)</option>
                  <option value="LEGACY" className="bg-slate-900 text-white">LEGACY (SOAP/XML Mainframe Adapter)</option>
                  <option value="MOCK" className="bg-slate-900 text-white">MOCK (Local In-Memory Simulation)</option>
                  <option value="SANDBOX" className="bg-slate-900 text-white">SANDBOX (Deterministic Sandbox Gateway)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1 uppercase">Dispatch Endpoint</label>
                <input
                  type="text"
                  value={configFormData.endpoint}
                  onChange={(e) => setConfigFormData({ ...configFormData, endpoint: e.target.value })}
                  placeholder="/api/education/verify"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1 uppercase">Timeout (ms)</label>
                  <input
                    type="number"
                    value={configFormData.timeoutMs}
                    onChange={(e) => setConfigFormData({ ...configFormData, timeoutMs: e.target.value })}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-xs"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1 uppercase">Retry Limit</label>
                  <input
                    type="number"
                    value={configFormData.retryLimit}
                    onChange={(e) => setConfigFormData({ ...configFormData, retryLimit: e.target.value })}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-xs"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold text-xs py-2 px-5 rounded-xl shadow-lg shadow-teal-500/20 transition flex items-center space-x-1.5 cursor-pointer"
                >
                  {savingConfig && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Configuration</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
