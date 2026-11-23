import { Calendar, Flame } from 'lucide-react';
import { useState } from 'react';
import { Card } from '../common/Card';

const HEATMAP_DEPARTMENTS = [
  {
    name: 'Production',
    totalStaff: '60 planned staff',
    c1: { pct: '96.7%', label: '58 staff', type: 'sky' },
    c2: { pct: '95.0%', label: '57 staff', type: 'sky' },
    c3: { pct: '91.7%', label: '55 staff', type: 'sky' },
    c4: { pct: '5 avail', label: 'L3–L4', type: 'green' },
    c5: { pct: 'Optimal', label: 'Covered', type: 'green' },
  },
  {
    name: 'Quality',
    totalStaff: '20 planned staff',
    c1: { pct: '100%', label: '20 staff', type: 'green' },
    c2: { pct: '90.0%', label: '18 staff', type: 'amber' },
    c3: { pct: '90.0%', label: '18 staff', type: 'amber' },
    c4: { pct: '2 avail', label: 'IPC-610', type: 'green' },
    c5: { pct: 'Moderate', label: '2 Absent', type: 'amber' },
  },
  {
    name: 'Maintenance',
    totalStaff: '18 planned staff',
    c1: { pct: '94.4%', label: '17 staff', type: 'sky' },
    c2: { pct: '88.9%', label: '16 staff', type: 'amber' },
    c3: { pct: '94.4%', label: '17 staff', type: 'sky' },
    c4: { pct: '2 avail', label: 'LOTO', type: 'green' },
    c5: { pct: 'Low Risk', label: 'Covered', type: 'green' },
  },
  {
    name: 'Warehouse',
    totalStaff: '16 planned staff',
    c1: { pct: '100%', label: '16 staff', type: 'green' },
    c2: { pct: '93.8%', label: '15 staff', type: 'sky' },
    c3: { pct: '87.5%', label: '14 staff', type: 'red' },
    c4: { pct: '1 avail', label: 'Forklift', type: 'green' },
    c5: { pct: 'Watch', label: '1 Shortage', type: 'red' },
  },
  {
    name: 'Operations',
    totalStaff: '26 planned staff',
    c1: { pct: '96.2%', label: '25 staff', type: 'sky' },
    c2: { pct: '92.3%', label: '24 staff', type: 'sky' },
    c3: { pct: '88.5%', label: '23 staff', type: 'amber' },
    c4: { pct: '3 avail', label: 'General', type: 'green' },
    c5: { pct: 'Low Risk', label: 'Covered', type: 'green' },
  },
  {
    name: 'Assembly',
    totalStaff: '24 planned staff',
    c1: { pct: '95.8%', label: '23 staff', type: 'sky' },
    c2: { pct: '91.7%', label: '22 staff', type: 'amber' },
    c3: { pct: '91.7%', label: '22 staff', type: 'amber' },
    c4: { pct: '3 avail', label: 'Soldering', type: 'green' },
    c5: { pct: 'Moderate', label: 'Covered', type: 'green' },
  },
];

function getCellStyles(cell, isSelected) {
  if (!cell) {
    return 'bg-transparent text-[var(--secondary)]';
  }

  const base =
    cell.type === 'red'
      ? 'bg-[#FEE2E2] dark:bg-rose-950/50 text-[#991B1B] dark:text-rose-300 border-rose-200 dark:border-rose-900'
      : cell.type === 'green'
        ? 'bg-[#D1FAE5] dark:bg-emerald-950/50 text-[#065F46] dark:text-emerald-300 border-emerald-200 dark:border-emerald-900'
        : cell.type === 'amber'
          ? 'bg-[#FEF3C7] dark:bg-amber-950/50 text-[#92400E] dark:text-amber-300 border-amber-200 dark:border-amber-900'
          : 'bg-[#E0F2FE] dark:bg-sky-950/50 text-[#075985] dark:text-sky-300 border-sky-200 dark:border-sky-900';

  const ring = isSelected ? 'ring-2 ring-purple-600 scale-102 shadow-xs' : 'hover:brightness-95';

  return `${base} ${ring}`;
}

export function DeliveryHeatmapCard() {
  const [selectedCell, setSelectedCell] = useState(null);

  return (
    <Card className="p-4 lg:col-span-5 flex flex-col justify-between min-h-[340px] border border-[var(--border)] shadow-xs select-none">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-800">
              <Flame className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <h2 className="text-[13px] sm:text-sm font-extrabold text-[var(--text)] tracking-tight whitespace-nowrap">
              Workforce Shift Coverage & Department Heatmap
            </h2>
          </div>

          <span className="text-[9.5px] font-black text-blue-600 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
            6 DEPARTMENTS × 5 SHIFT WINDOWS
          </span>
        </div>

        {/* Heatmap Matrix Table */}
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-[10px]">
                <th className="text-left font-black text-[var(--secondary)] uppercase pb-2 px-1">
                  DEPARTMENT
                </th>
                <th className="pb-2 px-1">
                  <div className="font-black text-[#1E3A8A] dark:text-sky-400">GS1 Morning</div>
                  <div className="text-[8.5px] text-[#2563EB] font-extrabold">06:00 - 14:00</div>
                </th>
                <th className="pb-2 px-1">
                  <div className="font-black text-[#1E3A8A] dark:text-sky-400">S2 Evening</div>
                  <div className="text-[8.5px] text-[#2563EB] font-extrabold">14:00 - 22:00</div>
                </th>
                <th className="pb-2 px-1">
                  <div className="font-black text-[#1E3A8A] dark:text-sky-400">NS3 Night</div>
                  <div className="text-[8.5px] text-[#2563EB] font-extrabold">22:00 - 06:00</div>
                </th>
                <th className="pb-2 px-1">
                  <div className="font-black text-[#16A34A] dark:text-emerald-400">Standby Buffer</div>
                  <div className="text-[8.5px] text-[#16A34A] font-extrabold">Available</div>
                </th>
                <th className="pb-2 px-1">
                  <div className="font-black text-[#D97706] dark:text-amber-400">Shift Risk</div>
                  <div className="text-[8.5px] text-[#D97706] font-extrabold">Status</div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-transparent">
              {HEATMAP_DEPARTMENTS.map((dept, rowIdx) => (
                <tr key={dept.name} className="h-10">
                  <td className="text-left py-1 px-1">
                    <div className="font-extrabold text-[11px] text-[var(--text)] whitespace-nowrap">
                      {dept.name}
                    </div>
                    <div className="text-[8.5px] font-semibold text-[var(--secondary)]">
                      {dept.totalStaff}
                    </div>
                  </td>

                  {/* 5 Shift / Buffer Cells */}
                  {[dept.c1, dept.c2, dept.c3, dept.c4, dept.c5].map((cell, colIdx) => {
                    const cellKey = `${rowIdx}-${colIdx}`;
                    const isSelected = selectedCell === cellKey;

                    return (
                      <td key={colIdx} className="p-0.5">
                        <div
                          onClick={() => setSelectedCell(isSelected ? null : cellKey)}
                          className={`py-1 px-1 rounded-lg border text-center transition-all duration-150 cursor-pointer ${getCellStyles(
                            cell,
                            isSelected
                          )}`}
                        >
                          <div className="text-[10px] font-black leading-tight">
                            {cell.pct}
                          </div>
                          <div className="text-[8px] font-bold opacity-85 leading-tight">
                            {cell.label}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Note */}
      <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--secondary)] mt-1.5">
        <div className="flex items-center gap-1.5 font-bold text-[var(--text)]">
          <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>Next Shift Line Startup:</span>
          <span className="font-black text-[var(--text)]">GS1 Morning (06:00 AM)</span>
          <span className="text-[var(--secondary)] font-normal">across 6 departments</span>
        </div>

        <span className="text-[9.5px] font-medium text-[var(--secondary)]">
          Click any cell to highlight
        </span>
      </div>
    </Card>
  );
}
