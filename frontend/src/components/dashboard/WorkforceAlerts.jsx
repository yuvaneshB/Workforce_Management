import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { StatusBadge } from '../common/StatusBadge';

export function WorkforceAlerts({
  attendanceAnalytics = null,
  loading = false,
  error = null,
}) {
  const warnings = attendanceAnalytics?.data_quality_warnings ?? [];

  return (
    <Card className="p-5">
      <div className="flex justify-between items-start gap-2">
        <div>
          <h3 className="font-bold text-xs">Workforce alerts</h3>
          <p className="text-[10px] muted mt-1">
            Attendance data-quality warnings reported by the backend.
          </p>
        </div>
        {!loading && !error && warnings.length > 0 && (
          <StatusBadge background="var(--peach-soft)" color="#D9701F">
            {warnings.length} active
          </StatusBadge>
        )}
      </div>

      {loading ? (
        <div className="py-5 space-y-3">
          <LoadingSkeleton className="h-11 w-full rounded-lg" />
          <LoadingSkeleton className="h-11 w-full rounded-lg" />
          <LoadingSkeleton className="h-11 w-full rounded-lg" />
        </div>
      ) : error ? (
        <div className="py-9">
          <EmptyState
            icon={AlertTriangle}
            iconClassName="w-7 h-7 mx-auto mb-2"
            iconStyle={{ color: '#D9701F' }}
            title="Unable to load workforce alerts"
            description={error}
          />
        </div>
      ) : warnings.length === 0 ? (
        <div className="py-9">
          <EmptyState
            icon={ShieldCheck}
            iconClassName="w-7 h-7 mx-auto mb-2"
            iconStyle={{ color: '#0E9C86' }}
            title="No alerts to display"
            description="Alerts will be generated after workforce analysis."
          />
        </div>
      ) : (
        <div className="mt-4 space-y-2.5">
          {warnings.map((warning) => (
            <div
              key={warning.code}
              className="rounded-lg border p-3 flex items-start justify-between gap-3"
              style={{ borderColor: 'var(--border)', background: 'var(--brand-bg)' }}
            >
              <div className="min-w-0">
                <div className="text-[10px] font-bold">{warning.code}</div>
                <p className="text-[10px] muted mt-1 leading-4">{warning.message}</p>
              </div>
              <StatusBadge
                background="var(--peach-soft)"
                color="#D9701F"
                className="shrink-0"
              >
                {warning.affected_records.toLocaleString()} rows
              </StatusBadge>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
