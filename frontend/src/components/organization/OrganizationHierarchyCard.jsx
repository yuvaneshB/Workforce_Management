import {
  Building2,
  ChevronDown,
  ChevronRight,
  Factory,
  Folder,
  FolderOpen,
  GitFork,
  Layers,
  List,
  Network,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { Card } from '../common/Card';

export function OrganizationHierarchyCard({
  hierarchyData = [],
  onSelectNode = null,
  selectedNodeId = null,
}) {
  const [viewMode, setViewMode] = useState('hierarchy'); // 'hierarchy' | 'list'
  const [expandedNodes, setExpandedNodes] = useState({
    'plant-1': true,
    'plant-2': false,
    'dept-DEPT-01': true,
    'dept-DEPT-02': false,
    'dept-DEPT-03': false,
  });

  const toggleNode = (id) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <Card className="p-4 surface rounded-2xl border border-[var(--border)] shadow-xs flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[var(--brand-purple-soft)] text-[var(--brand-purple)] flex items-center justify-center">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-[var(--text)] tracking-tight">
              Organization Hierarchy
            </h3>
            <p className="text-[11px] text-[var(--secondary)]">
              Multi-tiered manufacturing workforce structure
            </p>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 p-0.5 bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl text-xs">
          <button
            type="button"
            onClick={() => setViewMode('hierarchy')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'hierarchy'
                ? 'bg-[var(--brand-purple)] text-white shadow-xs'
                : 'text-[var(--secondary)] hover:text-[var(--text)]'
            }`}
          >
            <GitFork className="w-3 h-3" />
            <span>Hierarchy View</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'list'
                ? 'bg-[var(--brand-purple)] text-white shadow-xs'
                : 'text-[var(--secondary)] hover:text-[var(--text)]'
            }`}
          >
            <List className="w-3 h-3" />
            <span>List View</span>
          </button>
        </div>
      </div>

      {/* Tree Content */}
      <div className="pt-3 flex-1 overflow-y-auto max-h-[380px] no-scrollbar">
        {viewMode === 'hierarchy' ? (
          <div className="space-y-2 text-xs">
            {hierarchyData.map((plant) => {
              const isPlantOpen = Boolean(expandedNodes[plant.id]);
              const isSelected = selectedNodeId === plant.id;

              return (
                <div key={plant.id} className="space-y-1">
                  {/* Plant Node */}
                  <div
                    onClick={() => {
                      toggleNode(plant.id);
                      onSelectNode?.(plant);
                    }}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'border-[var(--brand-purple)] bg-[var(--brand-purple-soft)]/30 text-[var(--brand-purple)] font-bold'
                        : 'border-transparent hover:border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text)]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleNode(plant.id);
                      }}
                      className="p-0.5 hover:bg-[var(--border)]/40 rounded cursor-pointer"
                    >
                      {isPlantOpen ? (
                        <ChevronDown className="w-3.5 h-3.5 text-[var(--secondary)]" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-[var(--secondary)]" />
                      )}
                    </button>
                    <Factory className="w-4 h-4 text-[var(--brand-purple)] shrink-0" />
                    <span className="font-bold text-[12px]">{plant.name}</span>
                    <span className="text-[11px] font-semibold text-[var(--secondary)] bg-[var(--surface-hover)] px-2 py-0.5 rounded-full border border-[var(--border)]">
                      {plant.employeeCount} Employees
                    </span>
                  </div>

                  {/* Departments within Plant */}
                  {isPlantOpen && (
                    <div className="pl-6 border-l-2 border-[var(--border)]/70 ml-4 space-y-1.5 my-1">
                      {plant.departments?.map((dept) => {
                        const isDeptOpen = Boolean(expandedNodes[`dept-${dept.id}`]);
                        const isDeptSelected = selectedNodeId === dept.id;

                        return (
                          <div key={dept.id} className="space-y-1">
                            {/* Department Row */}
                            <div
                              onClick={() => {
                                toggleNode(`dept-${dept.id}`);
                                onSelectNode?.(dept);
                              }}
                              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer select-none ${
                                isDeptSelected
                                  ? 'border-[var(--brand-purple)] bg-[var(--brand-purple-soft)]/20 font-bold text-[var(--brand-purple)]'
                                  : 'border-transparent hover:border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text)]'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleNode(`dept-${dept.id}`);
                                }}
                                className="p-0.5 hover:bg-[var(--border)]/40 rounded cursor-pointer"
                              >
                                {isDeptOpen ? (
                                  <ChevronDown className="w-3 h-3 text-[var(--secondary)]" />
                                ) : (
                                  <ChevronRight className="w-3 h-3 text-[var(--secondary)]" />
                                )}
                              </button>
                              {isDeptOpen ? (
                                <FolderOpen className="w-3.5 h-3.5 text-[#493287] shrink-0" />
                              ) : (
                                <Folder className="w-3.5 h-3.5 text-[#493287] shrink-0" />
                              )}
                              <span className="font-bold text-[11.5px]">{dept.name}</span>
                              <span className="text-[10px] font-semibold text-[var(--secondary)] ml-auto">
                                ({dept.employeeCount})
                              </span>
                            </div>

                            {/* Sections within Department */}
                            {isDeptOpen && dept.sections?.length > 0 && (
                              <div className="pl-5 border-l-2 border-[var(--border)]/60 ml-3 space-y-1 my-1">
                                {dept.sections.map((sec) => (
                                  <div
                                    key={sec.id}
                                    onClick={() => onSelectNode?.(sec)}
                                    className="flex items-center justify-between gap-2 px-2 py-1 rounded-md hover:bg-[var(--surface-hover)] text-[11px] text-[var(--text)] cursor-pointer"
                                  >
                                    <div className="flex items-center gap-1.5 truncate">
                                      <Layers className="w-3 h-3 text-[var(--brand-blue)] shrink-0" />
                                      <span className="font-medium truncate">{sec.name}</span>
                                      <span className="text-[10px] text-[var(--secondary)]">
                                        ({sec.employeeCount})
                                      </span>
                                    </div>
                                    <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[var(--brand-blue)] border border-blue-200/50 shrink-0">
                                      {sec.teamCount || 2} Teams
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div className="space-y-2 text-xs">
            {hierarchyData.flatMap((plant) =>
              (plant.departments || []).map((dept) => (
                <div
                  key={`${plant.id}-${dept.id}`}
                  onClick={() => onSelectNode?.(dept)}
                  className="p-2.5 rounded-xl border border-[var(--border)] hover:border-[var(--brand-purple)]/60 surface transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between font-bold text-[12px] text-[var(--text)]">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[var(--brand-purple)]" />
                      {dept.name}
                    </span>
                    <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-[var(--brand-purple-soft)] text-[var(--brand-purple)] font-bold">
                      {dept.employeeCount} Staff
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10.5px] text-[var(--secondary)] mt-1.5 pt-1.5 border-t border-[var(--border)]/50">
                    <span>{plant.name}</span>
                    <span>{(dept.sections || []).length} Sections • Active</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

