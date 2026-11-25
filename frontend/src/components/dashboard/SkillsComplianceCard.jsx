import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

function CircularMeter({ pct, label, color }) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-22 h-22 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r={radius}
            className="stroke-slate-100 dark:stroke-slate-700/60"
            strokeWidth="6"
            fill="transparent"
          />
          <circle
            cx="40"
            cy="40"
            r={radius}
            stroke={color}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[14px] font-black text-slate-900 dark:text-white">
            {pct.toFixed(1)}%
          </span>
        </div>
      </div>
      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mt-1.5 text-center leading-tight">
        {label}
      </span>
    </div>
  );
}

export function SkillsComplianceCard({
  complianceAnalytics = null,
  loading = false,
}) {
  const trainingPct =
    typeof complianceAnalytics?.training_compliance_pct === 'number'
      ? complianceAnalytics.training_compliance_pct
      : 97.6;

  const skillMatchPct =
    typeof complianceAnalytics?.skill_match_pct === 'number'
      ? complianceAnalytics.skill_match_pct
      : 96.1;

  return (
    <Card className="p-3.5 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[13px] font-extrabold text-slate-900 dark:text-white tracking-tight">
          Skills & Compliance
        </h2>
      </div>

      {loading ? (
        <LoadingSkeleton className="h-40 w-full rounded-lg" />
      ) : (
        <div className="flex items-center justify-around h-40 px-2">
          <CircularMeter
            pct={trainingPct}
            label="Training Compliance"
            color="#493287"
          />
          <CircularMeter
            pct={skillMatchPct}
            label="Skill Match"
            color="#31B7C3"
          />
        </div>
      )}
    </Card>
  );
}

