import { Factory } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { CHART_COLORS } from '../../utils/constants';
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

const PLANT_LABELS = {
  'IN-TN-01': 'Chennai Electronics Plant (TN-01)',
  'IN-KA-01': 'Bengaluru Electronics Plant (KA-01)',
};

export function PlantWorkforceCard({
  workforceSummary = null,
  attendance = null,
  selectedPlantId = '',
  loading = false,
  error = null,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  // Use authoritative employee_master counts from workforceSummary; fallback to attendance if summary not passed
  const rawPlants = !error ? (workforceSummary?.by_plant ?? attendance?.by_plant ?? []) : [];
  const plantCounts = {
    'IN-TN-01': 0,
    'IN-KA-01': 0,
  };

  // Populate from API counts for verified plants
  rawPlants.forEach((p) => {
    if (p.key in plantCounts) {
      plantCounts[p.key] = p.count;
    }
  });

  const totalAcrossPlants = Object.values(plantCounts).reduce((a, b) => a + b, 0);

  const chartData = [
    {
      plant_id: 'IN-TN-01',
      name: PLANT_LABELS['IN-TN-01'],
      count: plantCounts['IN-TN-01'],
      pct: totalAcrossPlants > 0 ? ((plantCounts['IN-TN-01'] / totalAcrossPlants) * 100).toFixed(1) : '0.0',
    },
    {
      plant_id: 'IN-KA-01',
      name: PLANT_LABELS['IN-KA-01'],
      count: plantCounts['IN-KA-01'],
      pct: totalAcrossPlants > 0 ? ((plantCounts['IN-KA-01'] / totalAcrossPlants) * 100).toFixed(1) : '0.0',
    },
  ];

  return (
    <Card className="p-4 lg:col-span-4 flex flex-col justify-between min-h-[220px]">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Factory className="w-4 h-4 shrink-0" style={{ color: '#4D8EEB' }} aria-hidden="true" />
            <h2 className="text-[13px] sm:text-sm font-bold whitespace-nowrap">Plant-wise Workforce Distribution</h2>
          </div>
          <span className="text-[10px] font-semibold muted shrink-0">employee_master</span>
        </div>

        {loading ? (
          <LoadingSkeleton className="h-32 w-full rounded-lg" />
        ) : totalAcrossPlants === 0 ? (
          <div className="h-32 w-full my-1 flex flex-col items-center justify-center text-center p-2 bg-[var(--surface-hover)]/30 rounded-lg border border-dashed border-[var(--border)]">
            <Factory className="w-5 h-5 text-slate-400 mb-1 opacity-60" />
            <p className="text-xs font-bold text-[var(--text)]">No Plant Data</p>
            <p className="text-[10px] text-[var(--secondary)] mt-0.5">
              Connect to FastAPI backend to view live plant breakdown.
            </p>
          </div>
        ) : (
          <div className="h-32 w-full my-1">
            <ResponsiveContainer width="100%" height={128}>
              <BarChart data={chartData} margin={{ top: 8, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
                <XAxis
                  dataKey="plant_id"
                  stroke={palette.axisText}
                  fontSize={10}
                  tickLine={false}
                />
                <YAxis
                  stroke={palette.axisText}
                  fontSize={9}
                  domain={[0, 1200]}
                  ticks={[0, 300, 600, 900, 1200]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: palette.tooltipBg,
                    borderColor: palette.tooltipBorder,
                    color: palette.tooltipText,
                    fontSize: '11px',
                    borderRadius: '8px',
                  }}
                  formatter={(val, name, item) => [`${val.toLocaleString()} (${item.payload.pct}%)`, item.payload.name]}
                />
                <Bar dataKey="count" name="Employees" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => {
                    const isFiltered = selectedPlantId ? selectedPlantId === entry.plant_id : true;
                    return (
                      <Cell
                        key={`cell-plant-${index}`}
                        fill={isFiltered ? (entry.plant_id === 'IN-TN-01' ? '#6F3DBA' : '#4D8EEB') : '#CBD5E1'}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {totalAcrossPlants > 0 && (
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border)] text-[10px]">
          {chartData.map((p) => (
            <div
              key={p.plant_id}
              className={`rounded-lg p-1.5 border text-center transition-all ${
                selectedPlantId === p.plant_id
                  ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700'
                  : 'bg-[var(--muted-fill)]/50 border-[var(--border)]/60'
              }`}
            >
              <div className="font-extrabold text-[var(--text)]">{p.plant_id}</div>
              <div className="text-[var(--secondary)] truncate text-[9px]">{p.count.toLocaleString()} workers</div>
              <div className="font-black text-[var(--brand-purple)] text-[9px] mt-0.5">{p.pct}%</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
