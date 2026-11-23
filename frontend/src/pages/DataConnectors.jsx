import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Plug,
  Search,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { ConnectorConfigModal } from '../components/connectors/ConnectorConfigModal';
import { CONNECTOR_CATEGORIES, INITIAL_CONNECTORS } from '../components/connectors/connectorData';
import { ConnectorIcon } from '../components/connectors/ConnectorIcons';

export function DataConnectors() {
  const [connectors] = useState(INITIAL_CONNECTORS);
  const [connections, setConnections] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeModalConnector, setActiveModalConnector] = useState(null);

  // Local connector status map: idle | connecting | analyzing | connected | failed
  const [connectorStatus, setConnectorStatus] = useState({});
  const [syncedEvents, setSyncedEvents] = useState({});
  const timeoutIdsRef = useRef([]);

  useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach((id) => clearTimeout(id));
    };
  }, []);

  function handleConnect(connectorId) {
    setConnectorStatus((prev) => ({ ...prev, [connectorId]: 'connecting' }));

    const t1 = setTimeout(() => {
      setConnectorStatus((prev) => ({ ...prev, [connectorId]: 'analyzing' }));

      const t2 = setTimeout(() => {
        setConnectorStatus((prev) => ({ ...prev, [connectorId]: 'connected' }));
        setSyncedEvents((prev) => ({ ...prev, [connectorId]: 0 }));
      }, 1500);

      timeoutIdsRef.current.push(t2);
    }, 2000);

    timeoutIdsRef.current.push(t1);
  }

  function handleDisconnectConnector(connectorId) {
    setConnectorStatus((prev) => ({ ...prev, [connectorId]: 'idle' }));
    setSyncedEvents((prev) => ({ ...prev, [connectorId]: 0 }));
  }

  // Compute counts
  const configuredCount = useMemo(() => {
    const configuredFromConnections = Object.values(connections).filter(
      (c) => c?.status === 'configured' || c?.config
    ).length;
    const connectedCount = Object.values(connectorStatus).filter((s) => s === 'connected').length;
    return configuredFromConnections + connectedCount;
  }, [connections, connectorStatus]);

  // Filtered connector list
  const filteredConnectors = useMemo(() => {
    return connectors.filter((c) => {
      const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory;
      const matchesSearch =
        searchQuery === '' ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.driver.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [connectors, selectedCategory, searchQuery]);

  // Handle configuration save
  function handleSaveConfig(connectorId, newConfig) {
    setConnections((prev) => {
      const existing = prev[connectorId] || {};
      return {
        ...prev,
        [connectorId]: {
          ...existing,
          config: newConfig,
          status: existing.status === 'connected' ? 'connected' : 'not_connected',
          configuredAt: new Date().toISOString(),
        },
      };
    });
  }

  // Handle connection validation
  async function handleValidateConnection(connectorId, config) {
    const conn = connectors.find((c) => c.id === connectorId);
    if (!conn) throw new Error('Connector not found');

    // Update connection state to 'connecting'
    setConnections((prev) => ({
      ...prev,
      [connectorId]: {
        ...(prev[connectorId] || {}),
        config,
        status: 'connecting',
      },
    }));

    // Realistic delay simulating driver probing on the FastAPI backend
    await new Promise((resolve) => setTimeout(resolve, 850));

    // The backend does not have external enterprise drivers installed for this connector
    const errorMessage = `Backend driver '${conn.driver}' is not installed or enabled in the FastAPI service. External synchronization cannot be initiated until backend driver integration is provisioned.`;

    setConnections((prev) => ({
      ...prev,
      [connectorId]: {
        ...(prev[connectorId] || {}),
        config,
        status: 'failed',
        lastError: errorMessage,
        validatedAt: new Date().toISOString(),
      },
    }));

    return {
      status: 'failed',
      message: errorMessage,
    };
  }

  // Handle disconnect
  function handleDisconnect(connectorId) {
    setConnections((prev) => {
      const updated = { ...prev };
      delete updated[connectorId];
      return updated;
    });
  }

  return (
    <section aria-label="Data Connectors & Integrations" className="space-y-4 pb-10">
      {/* Top Architecture & Active Database Banner */}
      <Card className="p-4 border bg-gradient-to-r from-purple-950/10 via-transparent to-blue-950/10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Plug className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Enterprise Data Connectors Catalog
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                  10 Connectors
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Centralized gateway to configure ERP, MES, relational databases, cloud warehouses, and BI feeds.
              </p>
            </div>
          </div>

          {/* Neon Active Core Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 text-xs shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="text-[11px] leading-tight">
              <span className="font-bold">Neon PostgreSQL:</span> Connected &amp; Verified (Read-Only)
            </div>
          </div>
        </div>

        {/* Informative Architectural Disclaimer */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
          <span>
            <strong>Integration Policy:</strong> All operational workforce queries currently execute against Neon PostgreSQL.
            External connectors display catalog availability and configuration templates. Actual live data ingestion requires
            registering the respective backend connector service in the FastAPI runtime.
          </span>
        </div>
      </Card>

      {/* KPI Stat Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Catalog Connectors
          </span>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">10</div>
          <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">Enterprise Integrations</span>
        </Card>

        <Card className="p-3.5">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Active Core Database
          </span>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">1</div>
          <span className="text-[10px] text-slate-500 font-medium">Neon PostgreSQL (Live)</span>
        </Card>

        <Card className="p-3.5">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Configured in Session
          </span>
          <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">{configuredCount}</div>
          <span className="text-[10px] text-slate-500 font-medium">Saved Profiles</span>
        </Card>

        <Card className="p-3.5">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Backend Drivers Pending
          </span>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">10</div>
          <span className="text-[10px] text-slate-500 font-medium">Requires Driver Deployment</span>
        </Card>
      </div>

      {/* Search & Category Filter Controls */}
      <Card className="p-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {CONNECTOR_CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[220px] sm:max-w-xs w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search connectors or drivers..."
              className="w-full h-8.5 pl-8 pr-3 text-xs rounded-lg border outline-none focus:ring-1 focus:ring-purple-500 transition-colors"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
              }}
            />
          </div>
        </div>
      </Card>

      {/* 5-Column Responsive Grid of Connector Cards */}
      {filteredConnectors.length === 0 ? (
        <Card className="p-10">
          <EmptyState
            icon={Plug}
            title="No matching connectors found"
            description="Try adjusting your search query or switching to another category."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredConnectors.map((connector) => {
            const status = connectorStatus[connector.id] || 'idle';
            const isConnecting = status === 'connecting';
            const isAnalyzing = status === 'analyzing';
            const isConnected = status === 'connected';
            const isFailed = status === 'failed';
            const syncedCount = syncedEvents[connector.id];

            return (
              <Card
                key={connector.id}
                className="p-4 flex flex-col justify-between h-[305px] border hover:border-purple-300 dark:hover:border-purple-800 transition-all duration-200 group"
              >
                <div>
                  {/* Top Header: Brand Icon + Status Badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden shadow-xs flex items-center justify-center shrink-0">
                      <ConnectorIcon id={connector.id} className="w-10 h-10 object-cover" />
                    </div>

                    {/* Status Badge */}
                    {isConnected ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        Connected
                      </span>
                    ) : isAnalyzing ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        <Clock className="w-3 h-3 text-purple-600 dark:text-purple-400 animate-spin" />
                        Analyzing schema...
                      </span>
                    ) : isConnecting ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 animate-spin" />
                        Connecting...
                      </span>
                    ) : isFailed ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                        Connection Failed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        Not Connected
                      </span>
                    )}
                  </div>

                  {/* Connector Name & Category Badge */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between gap-1.5">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate" title={connector.name}>
                        {connector.name}
                      </h3>
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                        {connector.category}
                      </span>
                    </div>
                  </div>

                  {/* Short Description */}
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed mb-3">
                    {connector.description}
                  </p>
                </div>

                {/* Bottom Area: Supported Events + Connect Action */}
                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 mt-auto">
                  {/* Supported Events count & backend status indicator */}
                  <div className="flex items-center justify-between text-[10px] mb-2.5 text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {isConnected && syncedCount
                        ? `${syncedCount.toLocaleString()} synced events`
                        : connector.supportedEventsLabel}
                    </span>
                    {isConnected ? (
                      <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-200/60 dark:border-emerald-800/60">
                        Driver ready
                      </span>
                    ) : (
                      <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 font-medium">
                        Driver pending
                      </span>
                    )}
                  </div>

                  {/* Primary Action Button */}
                  {isConnected ? (
                    <button
                      type="button"
                      onClick={() => handleDisconnectConnector(connector.id)}
                      className="w-full h-8.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:bg-slate-800 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                    >
                      <span>Disconnect</span>
                    </button>
                  ) : isConnecting ? (
                    <button
                      type="button"
                      disabled
                      className="w-full h-8.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 bg-purple-600 text-white shadow-xs opacity-75 cursor-not-allowed"
                    >
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      <span>Connecting...</span>
                    </button>
                  ) : isAnalyzing ? (
                    <button
                      type="button"
                      disabled
                      className="w-full h-8.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 bg-purple-600 text-white shadow-xs opacity-75 cursor-not-allowed"
                    >
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyzing schema...</span>
                    </button>
                  ) : isFailed ? (
                    <button
                      type="button"
                      onClick={() => handleConnect(connector.id)}
                      className="w-full h-8.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white shadow-xs transition-colors cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Reconfigure / Retry</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleConnect(connector.id)}
                      className="w-full h-8.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white shadow-xs transition-colors cursor-pointer"
                    >
                      <span>Connect</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Connector Configuration Modal */}
      {activeModalConnector && (
        <ConnectorConfigModal
          connector={activeModalConnector}
          connectionState={connections[activeModalConnector.id]}
          isOpen={Boolean(activeModalConnector)}
          onClose={() => setActiveModalConnector(null)}
          onSaveConfig={handleSaveConfig}
          onValidateConnection={handleValidateConnection}
          onDisconnect={handleDisconnect}
        />
      )}
    </section>
  );
}
