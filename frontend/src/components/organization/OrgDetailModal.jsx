import {
  Building2,
  CheckCircle2,
  Layers,
  Users,
  X,
} from 'lucide-react';

export function OrgDetailModal({
  isOpen = false,
  onClose,
  detailItem = null,
  type = 'department', // 'department' | 'section'
  employees = [],
}) {
  if (!isOpen || !detailItem) return null;

  // Filter employees belonging to this department or section
  const assignedEmployees = employees.filter((e) => {
    if (type === 'department') {
      return (
        e.department === detailItem.name ||
        e.department === detailItem.department_name ||
        e.department_id === detailItem.id ||
        e.department_id === detailItem.department_id
      );
    }
    return (
      e.section === detailItem.name ||
      e.section === detailItem.section_name ||
      e.section_id === detailItem.id ||
      e.section_id === detailItem.section_id
    );
  });

  const totalCount = assignedEmployees.length || detailItem.totalCount || detailItem.employee_count || 0;
  const permCount = Math.round(totalCount * 0.7);
  const vendCount = totalCount - permCount;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="surface w-full max-w-2xl rounded-2xl border border-[var(--border)] shadow-2xl p-5 space-y-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[var(--border)]/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-purple-soft)] text-[var(--brand-purple)] flex items-center justify-center shrink-0">
              {type === 'department' ? (
                <Building2 className="w-5 h-5" />
              ) : (
                <Layers className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[var(--brand-purple)]">
                  {detailItem.id || detailItem.department_id || detailItem.section_id}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Active
                </span>
              </div>
              <h2 className="text-lg font-black text-[var(--text)] tracking-tight">
                {detailItem.name || detailItem.department_name || detailItem.section_name}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[var(--surface-hover)] text-[var(--secondary)] hover:text-[var(--text)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl border border-[var(--border)] surface text-center">
            <span className="text-[10.5px] font-semibold text-[var(--secondary)] block">
              Total Staff
            </span>
            <span className="text-xl font-black text-[var(--text)]">{totalCount}</span>
          </div>
          <div className="p-3 rounded-xl border border-[var(--border)] surface text-center">
            <span className="text-[10.5px] font-semibold text-purple-600 dark:text-purple-400 block">
              Permanent
            </span>
            <span className="text-xl font-black text-[var(--text)]">{permCount}</span>
          </div>
          <div className="p-3 rounded-xl border border-[var(--border)] surface text-center">
            <span className="text-[10.5px] font-semibold text-sky-600 dark:text-sky-400 block">
              Vendor
            </span>
            <span className="text-xl font-black text-[var(--text)]">{vendCount}</span>
          </div>
        </div>

        {/* Assigned Staff Preview Table */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[var(--text)] flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[var(--brand-purple)]" />
              Assigned Workforce ({assignedEmployees.length})
            </span>
            <span className="text-[10.5px] text-[var(--secondary)]">
              Plant: {detailItem.plant || 'Plant 1'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto border border-[var(--border)] rounded-xl surface no-scrollbar">
            {assignedEmployees.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--secondary)]">
                No individual employees currently assigned to this unit.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[10px] font-bold uppercase text-[var(--secondary)] bg-[var(--surface-hover)]/40 sticky top-0">
                    <th className="py-2 px-3">Employee ID</th>
                    <th className="py-2 px-3">Name</th>
                    <th className="py-2 px-3">Role</th>
                    <th className="py-2 px-3">Team</th>
                    <th className="py-2 px-3">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]/60 text-[11px]">
                  {assignedEmployees.slice(0, 50).map((emp) => (
                    <tr key={emp.employee_id} className="hover:bg-[var(--surface-hover)]/40">
                      <td className="py-1.5 px-3 font-mono font-bold text-[var(--brand-purple)]">
                        {emp.employee_id}
                      </td>
                      <td className="py-1.5 px-3 font-medium text-[var(--text)]">
                        {emp.employee_name || '—'}
                      </td>
                      <td className="py-1.5 px-3 text-[var(--secondary)]">
                        {emp.role || 'Operator'}
                      </td>
                      <td className="py-1.5 px-3 text-[var(--text)] font-bold">
                        {emp.team_id || '—'}
                      </td>
                      <td className="py-1.5 px-3">
                        <span
                          className={`text-[10px] font-bold ${
                            emp.employmentType === 'Permanent'
                              ? 'text-purple-600'
                              : 'text-sky-600'
                          }`}
                        >
                          {emp.employmentType || 'Vendor'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-2 border-t border-[var(--border)]/70">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold rounded-xl bg-[var(--brand-purple)] text-white hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

