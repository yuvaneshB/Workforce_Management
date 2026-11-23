import { AlertCircle, RefreshCw, Users } from 'lucide-react';
import { useState } from 'react';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

function formatPlantName(key) {
  if (key === 'IN-TN-01') return 'Plant 1';
  if (key === 'IN-TN-02') return 'Plant 2';
  if (key === 'IN-KA-01') return 'Plant 2';
  return key || 'Unknown Plant';
}

export function WorkforceDistributionCard({
  departmentAnalytics = null,
  attendanceAnalytics = null,
  sectionAnalytics = null,
  workforceSummary = null,
  loading = false,
  error = null,
  onRetry = null,
}) {
  const [activeTab, setActiveTab] = useState('Department');

  const totalEmployees = !error ? (workforceSummary?.total_employees || 0) : 0;

  // 1. Department data from departmentAnalytics API
  const rawDeptItems = !error ? (departmentAnalytics?.items || []) : [];
  const deptTotal = rawDeptItems.reduce((sum, d) => sum + (d.employee_count || 0), 0) || totalEmployees;
  const maxDeptCount = Math.max(...rawDeptItems.map((d) => d.employee_count || 0), 1);
  const departmentData = rawDeptItems.map((d) => {
    const count = d.employee_count || 0;
    const pctNum = deptTotal > 0 ? (count / deptTotal) * 100 : 0;
    return {
      id: d.department_id || d.id || d.name,
      name: d.department_name || d.name || 'Department',
      count,
      pct: `${pctNum.toFixed(1)}%`,
      barWidthPct: Math.min(100, Math.round((count / maxDeptCount) * 100)),
    };
  });

  // 2. Plant data from attendanceAnalytics.by_plant API
  const rawPlantItems = !error ? (attendanceAnalytics?.by_plant || []) : [];
  const plantItems = rawPlantItems.map((p) => {
    const key = Array.isArray(p) ? p[0] : (p.key || p.plant_id || '');
    const count = Array.isArray(p) ? Number(p[1] || 0) : Number(p.count || p.employee_count || 0);
    return { key, count };
  });
  const plantTotal = plantItems.reduce((sum, p) => sum + p.count, 0) || totalEmployees;
  const maxPlantCount = Math.max(...plantItems.map((p) => p.count), 1);
  const plantData = plantItems.map((p) => {
    const pctNum = plantTotal > 0 ? (p.count / plantTotal) * 100 : 0;
    return {
      id: p.key,
      name: formatPlantName(p.key),
      count: p.count,
      pct: `${pctNum.toFixed(1)}%`,
      barWidthPct: Math.min(100, Math.round((p.count / maxPlantCount) * 100)),
    };
  });

  // 3. Section data from sectionAnalytics API
  const rawSecItems = !error ? (sectionAnalytics?.items || []) : [];
  const secTotal = rawSecItems.reduce((sum, s) => sum + (s.employee_count || 0), 0) || totalEmployees;
  const maxSecCount = Math.max(...rawSecItems.map((s) => s.employee_count || 0), 1);
  const sectionData = rawSecItems.map((s) => {
    const count = s.employee_count || 0;
    const pctNum = secTotal > 0 ? (count / secTotal) * 100 : 0;
    return {
      id: s.section_id || s.id || s.name,
      name: s.section_name || s.name || 'Section',
      count,
      pct: `${pctNum.toFixed(1)}%`,
      barWidthPct: Math.min(100, Math.round((count / maxSecCount) * 100)),
    };
  });

  const currentList =
    activeTab === 'Plant' ? plantData : activeTab === 'Section' ? sectionData : departmentData;

  return (
    <div className="surface rounded-2xl p-4 border border-[var(--border)] shadow-xs flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-7 h-7 rounded-lg bg-[var(--brand-purple-soft)] text-[var(--brand-purple)] flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-extrabold text-[var(--text)] tracking-tight">
            Workforce Distribution
          </h3>
        </div>

        {/* 3 Selectable Tabs */}
        <div className="flex items-center gap-1 mb-3">
          {['Department', 'Plant', 'Section'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-0.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab
                  ? 'bg-[var(--brand-purple)] text-white shadow-2xs'
                  : 'text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--muted-fill)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <LoadingSkeleton className="h-40 w-full rounded-xl" />
      ) : error ? (
        <div className="h-40 flex flex-col items-center justify-center gap-2 p-4 text-center">
          <AlertCircle className="w-5 h-5 text-rose-500" />
          <p className="text-xs text-rose-500 font-semibold">{error}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-1 px-3 py-1 text-[11px] font-semibold rounded-md border border-[var(--border)] hover:bg-[var(--muted-fill)] text-[var(--text)] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          )}
        </div>
      ) : currentList.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-xs text-[var(--secondary)]">
          No data available
        </div>
      ) : (
        <div className="space-y-2.5 flex-1 flex flex-col justify-center">
          {currentList.map((item, idx) => (
            <div key={item.id || idx} className="flex items-center gap-2 text-xs">
              <span className="w-20 font-bold text-[var(--text)] truncate text-[11px]" title={item.name}>
                {item.name}
              </span>
              <div className="flex-1 h-2 rounded-full bg-[var(--muted-fill)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${item.barWidthPct}%`,
                    background: 'var(--brand-purple)',
                  }}
                />
              </div>
              <span className="w-20 text-right font-semibold text-[var(--secondary)] text-[11px] whitespace-nowrap">
                {item.pct} ({item.count})
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
