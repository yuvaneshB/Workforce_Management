import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  RefreshCw,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '../common/Button';
import { ConnectorIcon } from './ConnectorIcons';

export function ConnectorConfigModal({
  connector,
  connectionState,
  isOpen,
  onClose,
  onSaveConfig,
  onValidateConnection,
  onDisconnect,
}) {
  const [formData, setFormData] = useState(() => ({
    ...(connector?.defaultConfig || {}),
    ...(connectionState?.config || {}),
  }));

  const [showPassword, setShowPassword] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(() =>
    connectionState?.lastError
      ? {
          status: 'failed',
          message: connectionState.lastError,
        }
      : null
  );

  if (!isOpen || !connector) return null;

  const status = connectionState?.status || 'not_connected';
  const isConnected = status === 'connected';

  function handleChange(field, value) {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleValidate() {
    setIsValidating(true);
    setValidationResult(null);

    // Call the validation handler
    try {
      const res = await onValidateConnection(connector.id, formData);
      setValidationResult(res);
    } catch (err) {
      setValidationResult({
        status: 'failed',
        message: err?.message || `Backend integration driver '${connector.driver}' is pending.`,
      });
    } finally {
      setIsValidating(false);
    }
  }

  function handleSave() {
    onSaveConfig(connector.id, formData);
    onClose();
  }

  function handleDisconnectClick() {
    onDisconnect(connector.id);
    setValidationResult(null);
  }

  const inputClass =
    'w-full h-8.5 rounded-lg border px-3 text-xs outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors';
  const inputStyle = {
    borderColor: 'var(--border)',
    background: 'var(--surface)',
    color: 'var(--text)',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="connector-modal-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
    >
      <div
        className="rounded-2xl border w-full max-w-2xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto relative animate-in fade-in-50 zoom-in-95"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          color: 'var(--text)',
        }}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3.5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl overflow-hidden shadow-xs shrink-0 flex items-center justify-center">
              <ConnectorIcon id={connector.id} className="w-11 h-11 object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="connector-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                  {connector.name} Configuration
                </h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                  {connector.typeBadge}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Target Driver: <code className="font-mono text-purple-600 dark:text-purple-400">{connector.driver}</code>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close configuration modal"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Backend Driver Required Notice */}
        <div
          className="rounded-xl p-3 flex items-start gap-2.5 text-xs border"
          style={{
            background: 'var(--amber-soft, rgba(245, 158, 11, 0.08))',
            borderColor: 'rgba(245, 158, 11, 0.25)',
          }}
        >
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed text-amber-900 dark:text-amber-200">
            <strong>Backend Driver Required:</strong> Live synchronization with {connector.name} requires deploying the{' '}
            <span className="font-mono font-semibold">{connector.driver}</span> service on the FastAPI backend. You can
            safely save your connection parameters below. Neon PostgreSQL continues to serve as the active verified core
            database.
          </div>
        </div>

        {/* Validation Output Alert (if executed) */}
        {validationResult && (
          <div
            className={`rounded-xl p-3 flex items-start gap-2.5 text-xs border ${
              validationResult.status === 'connected'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
            }`}
          >
            {validationResult.status === 'connected' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-[11px] leading-relaxed">
              <span className="font-bold">
                {validationResult.status === 'connected' ? 'Connection Verified' : 'Validation Notice'}:
              </span>{' '}
              {validationResult.message}
            </div>
          </div>
        )}

        {/* Dynamic Connector-Specific Configuration Form */}
        <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
          {/* ORACLE CONFIG */}
          {connector.id === 'oracle' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Host / Server Address
                </label>
                <input
                  type="text"
                  value={formData.host || ''}
                  onChange={(e) => handleChange('host', e.target.value)}
                  placeholder="oracle-db.corp.internal"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Port</label>
                <input
                  type="text"
                  value={formData.port || '1521'}
                  onChange={(e) => handleChange('port', e.target.value)}
                  placeholder="1521"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Service Name / SID
                </label>
                <input
                  type="text"
                  value={formData.serviceName || ''}
                  onChange={(e) => handleChange('serviceName', e.target.value)}
                  placeholder="ORCLPDB1"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Schema / Database
                </label>
                <input
                  type="text"
                  value={formData.schema || ''}
                  onChange={(e) => handleChange('schema', e.target.value)}
                  placeholder="WORKFORCE"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Username</label>
                <input
                  type="text"
                  value={formData.username || ''}
                  onChange={(e) => handleChange('username', e.target.value)}
                  placeholder="WORKFORCE_RO"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password || ''}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="••••••••••••"
                    className={`${inputClass} pr-8`}
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MYSQL CONFIG */}
          {connector.id === 'mysql' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Host / Server Address
                </label>
                <input
                  type="text"
                  value={formData.host || ''}
                  onChange={(e) => handleChange('host', e.target.value)}
                  placeholder="mysql-primary.internal.net"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Port</label>
                <input
                  type="text"
                  value={formData.port || '3306'}
                  onChange={(e) => handleChange('port', e.target.value)}
                  placeholder="3306"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Database Name
                </label>
                <input
                  type="text"
                  value={formData.database || ''}
                  onChange={(e) => handleChange('database', e.target.value)}
                  placeholder="workforce_staging"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Charset</label>
                <input
                  type="text"
                  value={formData.charset || 'utf8mb4'}
                  onChange={(e) => handleChange('charset', e.target.value)}
                  placeholder="utf8mb4"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Username</label>
                <input
                  type="text"
                  value={formData.username || ''}
                  onChange={(e) => handleChange('username', e.target.value)}
                  placeholder="db_reader"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password || ''}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="••••••••••••"
                    className={`${inputClass} pr-8`}
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SAP CONFIG */}
          {connector.id === 'sap' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  SAP Gateway / OData Endpoint
                </label>
                <input
                  type="text"
                  value={formData.gatewayUrl || ''}
                  onChange={(e) => handleChange('gatewayUrl', e.target.value)}
                  placeholder="https://sap-gateway.company.com:8443"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Client ID</label>
                <input
                  type="text"
                  value={formData.client || '100'}
                  onChange={(e) => handleChange('client', e.target.value)}
                  placeholder="100"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  System Number / Instance
                </label>
                <input
                  type="text"
                  value={formData.systemNumber || '00'}
                  onChange={(e) => handleChange('systemNumber', e.target.value)}
                  placeholder="00"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Username</label>
                <input
                  type="text"
                  value={formData.username || ''}
                  onChange={(e) => handleChange('username', e.target.value)}
                  placeholder="SAP_RFC_USER"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password || ''}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="••••••••••••"
                    className={`${inputClass} pr-8`}
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SAP HANA CONFIG */}
          {connector.id === 'sap-hana' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  HANA Host
                </label>
                <input
                  type="text"
                  value={formData.host || ''}
                  onChange={(e) => handleChange('host', e.target.value)}
                  placeholder="hana-cluster.prod.corp"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  SQL Port (Default 39015)
                </label>
                <input
                  type="text"
                  value={formData.port || '39015'}
                  onChange={(e) => handleChange('port', e.target.value)}
                  placeholder="39015"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tenant / Database
                </label>
                <input
                  type="text"
                  value={formData.database || ''}
                  onChange={(e) => handleChange('database', e.target.value)}
                  placeholder="HDB_TENANT01"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Schema</label>
                <input
                  type="text"
                  value={formData.schema || ''}
                  onChange={(e) => handleChange('schema', e.target.value)}
                  placeholder="MANUFACTURING_OPS"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Username</label>
                <input
                  type="text"
                  value={formData.username || ''}
                  onChange={(e) => handleChange('username', e.target.value)}
                  placeholder="HANA_USER"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password || ''}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="••••••••••••"
                    className={`${inputClass} pr-8`}
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* EXCEL CONFIG */}
          {connector.id === 'excel' && (
            <div className="space-y-3">
              <div
                className="border-2 border-dashed rounded-xl p-5 text-center transition-colors cursor-pointer hover:border-emerald-500"
                style={{ borderColor: 'var(--border)', background: 'var(--brand-bg)' }}
              >
                <Upload className="w-7 h-7 mx-auto text-emerald-600 mb-2" />
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {formData.fileName ? formData.fileName : 'Click or Drag & Drop Excel / CSV Workbook'}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Supported formats: .xlsx, .xls, .csv (Max 25MB)</p>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleChange('fileName', file.name);
                  }}
                  className="hidden"
                  id="excel-file-upload"
                />
                <label
                  htmlFor="excel-file-upload"
                  className="mt-2.5 inline-block text-[10px] font-bold px-3 py-1 rounded-md bg-emerald-600 text-white cursor-pointer hover:bg-emerald-700"
                >
                  Browse Files
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Sheet Name
                  </label>
                  <input
                    type="text"
                    value={formData.sheetName || 'Sheet1'}
                    onChange={(e) => handleChange('sheetName', e.target.value)}
                    placeholder="Sheet1"
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Header Row
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.headerRow || '1'}
                    onChange={(e) => handleChange('headerRow', e.target.value)}
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Data Mapping
                  </label>
                  <select
                    value={formData.dataCategory || 'Attendance Records'}
                    onChange={(e) => handleChange('dataCategory', e.target.value)}
                    className={inputClass}
                    style={inputStyle}
                  >
                    <option value="Attendance Records">Attendance Records</option>
                    <option value="Employee Skills Matrix">Employee Skills Matrix</option>
                    <option value="Shift Calendar Roster">Shift Calendar Roster</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* SNOWFLAKE CONFIG */}
          {connector.id === 'snowflake' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Account Identifier
                </label>
                <input
                  type="text"
                  value={formData.account || ''}
                  onChange={(e) => handleChange('account', e.target.value)}
                  placeholder="xy12345.us-east-1"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Warehouse
                </label>
                <input
                  type="text"
                  value={formData.warehouse || 'COMPUTE_WH'}
                  onChange={(e) => handleChange('warehouse', e.target.value)}
                  placeholder="COMPUTE_WH"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Database</label>
                <input
                  type="text"
                  value={formData.database || ''}
                  onChange={(e) => handleChange('database', e.target.value)}
                  placeholder="WORKFORCE_ANALYTICS"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Schema</label>
                <input
                  type="text"
                  value={formData.schema || 'PUBLIC'}
                  onChange={(e) => handleChange('schema', e.target.value)}
                  placeholder="PUBLIC"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Username</label>
                <input
                  type="text"
                  value={formData.username || ''}
                  onChange={(e) => handleChange('username', e.target.value)}
                  placeholder="SNOWFLAKE_RO"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password || ''}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="••••••••••••"
                    className={`${inputClass} pr-8`}
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* API CONFIG */}
          {connector.id === 'api' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Base URL</label>
                  <input
                    type="text"
                    value={formData.baseUrl || ''}
                    onChange={(e) => handleChange('baseUrl', e.target.value)}
                    placeholder="https://api.accesscontrol.internal/v1"
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Method</label>
                  <select
                    value={formData.method || 'POST'}
                    onChange={(e) => handleChange('method', e.target.value)}
                    className={inputClass}
                    style={inputStyle}
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Endpoint Path
                  </label>
                  <input
                    type="text"
                    value={formData.endpoint || ''}
                    onChange={(e) => handleChange('endpoint', e.target.value)}
                    placeholder="/swipes/stream"
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Auth Type</label>
                  <select
                    value={formData.authType || 'Bearer Token'}
                    onChange={(e) => handleChange('authType', e.target.value)}
                    className={inputClass}
                    style={inputStyle}
                  >
                    <option value="Bearer Token">Bearer Token</option>
                    <option value="API Key">API Key</option>
                    <option value="Basic Auth">Basic Auth</option>
                    <option value="None">None</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  API Key / Token
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.token || ''}
                    onChange={(e) => handleChange('token', e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className={`${inputClass} pr-8`}
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SIEMENS OPCENTER MES CONFIG */}
          {connector.id === 'siemens-opcenter' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Opcenter MES Endpoint URL
                </label>
                <input
                  type="text"
                  value={formData.mesEndpoint || ''}
                  onChange={(e) => handleChange('mesEndpoint', e.target.value)}
                  placeholder="https://opcenter.plant01.local:9000"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Plant Code
                  </label>
                  <input
                    type="text"
                    value={formData.plantCode || 'IN-KA-01'}
                    onChange={(e) => handleChange('plantCode', e.target.value)}
                    placeholder="IN-KA-01"
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Line ID Filter
                  </label>
                  <input
                    type="text"
                    value={formData.lineFilter || 'LINE-01, LINE-02'}
                    onChange={(e) => handleChange('lineFilter', e.target.value)}
                    placeholder="LINE-01, LINE-02"
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  API Key / Access Token
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.apiKey || ''}
                    onChange={(e) => handleChange('apiKey', e.target.value)}
                    placeholder="••••••••••••"
                    className={`${inputClass} pr-8`}
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MS TEAMS CONFIG */}
          {connector.id === 'ms-teams' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Incoming Webhook URL
                </label>
                <input
                  type="text"
                  value={formData.webhookUrl || ''}
                  onChange={(e) => handleChange('webhookUrl', e.target.value)}
                  placeholder="https://outlook.office.com/webhook/..."
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Channel Name
                </label>
                <input
                  type="text"
                  value={formData.channelName || '#plant-hr'}
                  onChange={(e) => handleChange('channelName', e.target.value)}
                  placeholder="#plant-hr"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] block">
                  Broadcast Triggers
                </span>
                <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-300 text-[11px]">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.notifyShortages)}
                    onChange={(e) => handleChange('notifyShortages', e.target.checked)}
                    className="rounded text-purple-600"
                  />
                  <span>Critical Shift Shortages (&gt; 3 workers missing)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-300 text-[11px]">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.notifyOvertimeAlerts)}
                    onChange={(e) => handleChange('notifyOvertimeAlerts', e.target.checked)}
                    className="rounded text-purple-600"
                  />
                  <span>Overtime Threshold Exceeded (&gt; 4 hours/day)</span>
                </label>
              </div>
            </div>
          )}

          {/* MS POWER BI CONFIG */}
          {connector.id === 'ms-powerbi' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Workspace ID (GUID)
                </label>
                <input
                  type="text"
                  value={formData.workspaceId || ''}
                  onChange={(e) => handleChange('workspaceId', e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Dataset / Report ID
                </label>
                <input
                  type="text"
                  value={formData.datasetId || ''}
                  onChange={(e) => handleChange('datasetId', e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Azure Tenant ID
                </label>
                <input
                  type="text"
                  value={formData.tenantId || ''}
                  onChange={(e) => handleChange('tenantId', e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Client ID (Application)
                </label>
                <input
                  type="text"
                  value={formData.clientId || ''}
                  onChange={(e) => handleChange('clientId', e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Client Secret
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.clientSecret || ''}
                    onChange={(e) => handleChange('clientSecret', e.target.value)}
                    placeholder="••••••••••••"
                    className={`${inputClass} pr-8`}
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="pt-3 border-t flex flex-wrap items-center justify-between gap-2.5" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            {/* Validate Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleValidate}
              disabled={isValidating}
              className="text-xs"
            >
              {isValidating ? (
                <>
                  <Clock className="w-3.5 h-3.5 mr-1.5 animate-spin text-amber-500" />
                  <span>Validating Driver...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
                  <span>Validate Connection</span>
                </>
              )}
            </Button>

            {/* Disconnect Option if currently connected */}
            {isConnected && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnectClick}
                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                <span>Disconnect</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <button
              type="button"
              onClick={handleSave}
              className="h-8 px-4 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Configuration</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
