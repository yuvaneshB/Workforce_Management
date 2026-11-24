import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Plug,
  RefreshCw,
  Search,
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
      }, 1500);

      timeoutIdsRef.current.push(t2);
    }, 2000);

    timeoutIdsRef.current.push(t1);
  }

  function handleDisconnectConnector(connectorId) {
    setConnectorStatus((prev) => ({ ...prev, [connectorId]: 'idle' }));
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

    setConnections((prev) => ({
      ...prev,
      [connectorId]: {
        ...(prev[connectorId] || {}),
        config,
        status: 'connecting',
      },
    }));

    await new Promise((resolve) => setTimeout(resolve, 850));

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
      {/* 2. Catalog Header Card: Single slim row (~64px tall), no description line or policy warning */}
      <Card className="px-4 py-3 border bg-gradient-to-r from-violet-950/10 via-transparent to-blue-950/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 min-h-[64px]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 text-white flex items-center justify-center shadow-xs shrink-0">
            <Plug className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Enterprise Data Connectors Catalog
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              10 Connectors
            </span>
          </div>
        </div>

        {/* Neon Active Core Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 text-xs shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div className="text-[11px] leading-tight">
            <span className="font-bold">Neon PostgreSQL:</span> Connected &amp; Verified (Read-Only)
          </div>
        </div>
      </Card>

      {/* 3. Stat Cards: Label + big value only, p-3, compact height ~80px (h-20), equal widths */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 h-20 flex flex-col justify-between">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
            Catalog Connectors
          </span>
          <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">10</div>
        </Card>

        <Card className="p-3 h-20 flex flex-col justify-between">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
            Active Core Database
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none">1</div>
        </Card>

        <Card className="p-3 h-20 flex flex-col justify-between">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
            Configured in Session
          </span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 leading-none">{configuredCount}</div>
        </Card>

        <Card className="p-3 h-20 flex flex-col justify-between">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
            Backend Drivers Pending
          </span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 leading-none">10</div>
        </Card>
      </div>

      {/* 4. Filter Row: Tabs & Search, slim row (~56px) */}
      <Card className="px-3.5 py-2 min-h-[56px] flex items-center">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {CONNECTOR_CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-violet-600 to-purple-700 text-white shadow-xs'
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
              className="w-full h-8.5 pl-8 pr-3 text-xs rounded-lg border outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
              }}
            />
          </div>
        </div>
      </Card>

      {/* 5. Connector Cards Grid: 5 columns on wide, 3 on med, 2 on small, gap-3 */}
      {filteredConnectors.length === 0 ? (
        <Card className="p-10">
          <EmptyState
            icon={Plug}
            title="No matching connectors found"
            description="Try adjusting your search query or switching to another category."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {filteredConnectors.map((connector) => {
            const status = connectorStatus[connector.id] || 'idle';
            const isConnecting = status === 'connecting';
            const isAnalyzing = status === 'analyzing';
            const isConnected = status === 'connected';
            const isFailed = status === 'failed';

            return (
              <Card
                key={connector.id}
                className="p-3 flex flex-col justify-between h-[158px] border hover:border-violet-300 dark:hover:border-violet-800 transition-all duration-200 group"
              >
                {/* Top Row: 40px Icon + Name and Status Badge in same row */}
                <div className="flex items-start gap-2.5 min-w-0">
                  <div
                    onClick={() => setActiveModalConnector(connector)}
                    className="w-10 h-10 rounded-xl overflow-hidden shadow-xs flex items-center justify-center shrink-0 cursor-pointer"
                    title="Click to view details and configuration"
                  >
                    <ConnectorIcon id={connector.id} className="w-10 h-10 object-cover" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3
                      onClick={() => setActiveModalConnector(connector)}
                      className="text-xs font-bold text-slate-900 dark:text-white leading-tight break-words cursor-pointer hover:text-violet-600 dark:hover:text-violet-400 transition-colors line-clamp-1"
                      title={connector.description}
                    >
                      {connector.name}
                    </h3>

                    {/* Status Badge */}
                    <div className="mt-1">
                      {isConnected ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          Connected
                        </span>
                      ) : isAnalyzing ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                          <Clock className="w-3 h-3 text-violet-600 dark:text-violet-400 animate-spin" />
                          Analyzing...
                        </span>
                      ) : isConnecting ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 animate-spin" />
                          Connecting...
                        </span>
                      ) : isFailed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                          Failed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          Not Connected
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Full width Connect button with h-9 */}
                <div className="mt-auto pt-2">
                  {isConnected ? (
                    <button
                      type="button"
                      onClick={() => handleDisconnectConnector(connector.id)}
                      className="w-full h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:bg-slate-800 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                    >
                      <span>Disconnect</span>
                    </button>
                  ) : isConnecting ? (
                    <button
                      type="button"
                      disabled
                      className="w-full h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 bg-gradient-to-r from-violet-600 to-purple-700 text-white shadow-xs opacity-75 cursor-not-allowed"
                    >
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      <span>Connecting...</span>
                    </button>
                  ) : isAnalyzing ? (
                    <button
                      type="button"
                      disabled
                      className="w-full h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 bg-gradient-to-r from-violet-600 to-purple-700 text-white shadow-xs opacity-75 cursor-not-allowed"
                    >
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyzing...</span>
                    </button>
                  ) : isFailed ? (
                    <button
                      type="button"
                      onClick={() => handleConnect(connector.id)}
                      className="w-full h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 active:scale-[0.99] text-white shadow-xs transition-all cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleConnect(connector.id)}
                      className="w-full h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 active:scale-[0.99] text-white shadow-xs transition-all cursor-pointer"
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

export default DataConnectors;
