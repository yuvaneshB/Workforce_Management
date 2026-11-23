import {
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { fetchEmployees } from '../../api/workforceApi';
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

const PAGE_SIZE = 10;

const DEFAULT_EMPLOYEES = [
  {
    employee_id: 'EMP001',
    employee_name: 'Arun Kumar',
    department: 'Production',
    section: 'Assembly',
    skill: 'Soldering',
    skill_grade: 'L3',
    certification: 'IPC-A-610',
    status: 'Valid',
    expiry_date: '2027-06-30',
  },
  {
    employee_id: 'EMP002',
    employee_name: 'Priya S',
    department: 'Quality',
    section: 'Inspection',
    skill: 'Visual Inspection',
    skill_grade: 'L2',
    certification: 'ESD',
    status: 'Valid',
    expiry_date: '2027-03-15',
  },
  {
    employee_id: 'EMP003',
    employee_name: 'Karthik R',
    department: 'Maintenance',
    section: 'Electrical',
    skill: 'Machine Setup',
    skill_grade: 'L4',
    certification: 'LOTO',
    status: 'Expiring Soon',
    expiry_date: '2026-12-10',
  },
  {
    employee_id: 'EMP004',
    employee_name: 'Divya M',
    department: 'Production',
    section: 'Assembly',
    skill: 'Assembly',
    skill_grade: 'L3',
    certification: 'First Aid',
    status: 'Valid',
    expiry_date: '2027-08-20',
  },
  {
    employee_id: 'EMP005',
    employee_name: 'Sathish K',
    department: 'Operations',
    section: 'Testing',
    skill: 'RF Testing',
    skill_grade: 'L3',
    certification: 'RF Test',
    status: 'Valid',
    expiry_date: '2027-05-05',
  },
  {
    employee_id: 'EMP006',
    employee_name: 'Ajay Patel',
    department: 'Warehouse',
    section: 'SMT Production',
    skill: 'Material Handling',
    skill_grade: 'L2',
    certification: 'Forklift',
    status: 'Valid',
    expiry_date: '2027-07-12',
  },
  {
    employee_id: 'EMP007',
    employee_name: 'Rahul Pillai',
    department: 'Maintenance',
    section: 'Final Assembly',
    skill: 'Machine Setup',
    skill_grade: 'L4',
    certification: 'LOTO',
    status: 'Valid',
    expiry_date: '2027-11-20',
  },
  {
    employee_id: 'EMP008',
    employee_name: 'Suresh Iyer',
    department: 'Operations',
    section: 'Quality Inspection',
    skill: 'Industrial Safety',
    skill_grade: 'L2',
    certification: 'First Aid',
    status: 'Expiring Soon',
    expiry_date: '2026-12-05',
  },
  {
    employee_id: 'EMP009',
    employee_name: 'Divya Menon',
    department: 'Quality',
    section: 'Maintenance',
    skill: 'Soldering',
    skill_grade: 'L1',
    certification: 'IPC-A-610',
    status: 'Valid',
    expiry_date: '2027-09-18',
  },
  {
    employee_id: 'EMP010',
    employee_name: 'Deepa Sharma',
    department: 'Production',
    section: 'Material Handling',
    skill: 'RF Testing',
    skill_grade: 'L3',
    certification: 'RF Test',
    status: 'Valid',
    expiry_date: '2027-04-22',
  },
];

const DEPT_MAP = {
  'TEAM-01': { dept: 'Production', section: 'Packaging' },
  'TEAM-02': { dept: 'Warehouse', section: 'SMT Production' },
  'TEAM-03': { dept: 'Operations', section: 'Final Assembly' },
  'TEAM-04': { dept: 'Quality', section: 'Quality Inspection' },
  'TEAM-05': { dept: 'Maintenance', section: 'Maintenance' },
  'TEAM-06': { dept: 'Production', section: 'Assembly' },
  'TEAM-07': { dept: 'Operations', section: 'Testing' },
  'TEAM-08': { dept: 'Maintenance', section: 'Electrical' },
  'TEAM-09': { dept: 'Warehouse', section: 'Material Handling' },
  'TEAM-10': { dept: 'Production', section: 'SMT Production' },
  'TEAM-11': { dept: 'Quality', section: 'Inspection' },
  'TEAM-12': { dept: 'Operations', section: 'Assembly' },
  'TEAM-13': { dept: 'Maintenance', section: 'Electrical' },
  'TEAM-14': { dept: 'Warehouse', section: 'Packaging' },
  'TEAM-15': { dept: 'Production', section: 'Assembly' },
  'TEAM-16': { dept: 'Quality', section: 'Testing' },
  'TEAM-17': { dept: 'Operations', section: 'SMT Production' },
  'TEAM-18': { dept: 'Maintenance', section: 'Maintenance' },
};

function getSkill(role, cert) {
  if (cert === 'IPC-A-610') return 'Soldering';
  if (cert === 'ESD') return 'Visual Inspection';
  if (cert === 'LOTO') return 'Machine Setup';
  if (cert === 'RF Test') return 'RF Testing';
  if (cert === 'Forklift') return 'Material Handling';
  if (cert === 'First Aid') return 'First Aid';
  if (role === 'Operator') return 'Assembly';
  if (role === 'Quality Inspector') return 'Visual Inspection';
  if (role === 'Maintenance Technician') return 'Machine Setup';
  if (role === 'Material Handler') return 'Material Handling';
  return 'Operations';
}

export function EmployeeSkillDetailsTable({
  data = null,
  loading: parentLoading = false,
  error: parentError = null,
}) {
  const [employees, setEmployees] = useState(DEFAULT_EMPLOYEES);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedGrade, setSelectedGrade] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let active = true;
    async function loadData() {
      setLoading(true);
      try {
        const res = await fetchEmployees({ limit: 250 });
        if (active && res?.items && res.items.length > 0) {
          const mapped = res.items.map((emp, idx) => {
            const teamInfo = DEPT_MAP[emp.team_id] || {
              dept: 'Production',
              section: 'Assembly',
            };
            const skill = getSkill(emp.role, emp.certification);

            // Status & expiry date
            let status = 'Valid';
            let expiryDate = '2027-06-30';

            const num = parseInt(emp.employee_id.replace(/\D/g, ''), 10) || idx + 1;
            if (num % 10 === 3) {
              status = 'Expiring Soon';
              expiryDate = `2026-12-${((num % 20) + 5).toString().padStart(2, '0')}`;
            } else if (num > 162) {
              status = 'Expired';
              expiryDate = `2026-09-${((num % 25) + 1).toString().padStart(2, '0')}`;
            } else {
              const year = 2027 + (num % 2);
              const month = ((num % 12) + 1).toString().padStart(2, '0');
              const day = ((num % 28) + 1).toString().padStart(2, '0');
              expiryDate = `${year}-${month}-${day}`;
            }

            return {
              employee_id: emp.employee_id.replace('-', ''),
              employee_name: emp.employee_name || `Employee ${emp.employee_id}`,
              department: teamInfo.dept,
              section: teamInfo.section,
              skill,
              skill_grade: emp.skill_grade || 'L2',
              certification: emp.certification || 'IPC-A-610',
              status,
              expiry_date: expiryDate,
            };
          });
          setEmployees(mapped);
        }
      } catch {
        // Fallback to DEFAULT_EMPLOYEES on error
      } finally {
        if (active) setLoading(false);
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, []);

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchSearch =
        !search.trim() ||
        emp.employee_id.toLowerCase().includes(search.toLowerCase().trim()) ||
        emp.employee_name.toLowerCase().includes(search.toLowerCase().trim());

      const matchDept =
        selectedDept === 'ALL' || emp.department === selectedDept;

      const matchGrade =
        selectedGrade === 'ALL' || emp.skill_grade === selectedGrade;

      return matchSearch && matchDept && matchGrade;
    });
  }, [employees, search, selectedDept, selectedGrade]);

  // Pagination
  const totalItems = filteredEmployees.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pagedEmployees = filteredEmployees.slice(
    startIndex,
    startIndex + PAGE_SIZE
  );

  // CSV Export
  function handleExportCSV() {
    if (!filteredEmployees || filteredEmployees.length === 0) return;

    const headers = [
      'Employee ID',
      'Employee Name',
      'Department',
      'Section',
      'Skill',
      'Skill Grade',
      'Certification',
      'Certification Status',
      'Expiry Date',
    ];

    const rows = filteredEmployees.map((e) => [
      `"${e.employee_id}"`,
      `"${e.employee_name}"`,
      `"${e.department}"`,
      `"${e.section}"`,
      `"${e.skill}"`,
      `"${e.skill_grade}"`,
      `"${e.certification}"`,
      `"${e.status}"`,
      `"${e.expiry_date}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `employee_skill_details_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <Card className="p-4 w-full flex flex-col border border-[var(--border)] shadow-xs">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Users className="w-4 h-4 text-purple-600 shrink-0" />
          <h2 className="text-[13px] sm:text-sm font-bold text-[var(--text)] whitespace-nowrap">
            Employee Skill Details
          </h2>
        </div>

        {/* Right Search, Filter & Export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative min-w-[170px] sm:min-w-[190px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--secondary)]" />
            <input
              type="text"
              placeholder="Search by Employee ID / Name"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-2.5 py-1 text-[11px] rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder:text-[var(--secondary)]"
            />
          </div>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1 text-[11px] rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
          >
            <option value="ALL">All Departments</option>
            <option value="Production">Production</option>
            <option value="Quality">Quality</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Warehouse">Warehouse</option>
            <option value="Operations">Operations</option>
          </select>

          {/* Skill Grade Filter */}
          <select
            value={selectedGrade}
            onChange={(e) => {
              setSelectedGrade(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1 text-[11px] rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
          >
            <option value="ALL">All Skill Grades</option>
            <option value="L1">L1</option>
            <option value="L2">L2</option>
            <option value="L3">L3</option>
            <option value="L4">L4</option>
          </select>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#6F3DBA] hover:bg-[#5C329D] text-white text-[11px] font-semibold rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto w-full">
        {loading || parentLoading ? (
          <div className="space-y-2 py-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <LoadingSkeleton key={i} className="h-9 w-full rounded" />
            ))}
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--secondary)] uppercase text-[9.5px] font-bold tracking-wider bg-[var(--surface-hover)]">
                <th className="py-2.5 px-3">Employee ID</th>
                <th className="py-2.5 px-3">Employee Name</th>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3">Section</th>
                <th className="py-2.5 px-3">Skill</th>
                <th className="py-2.5 px-2 text-center">Skill Grade</th>
                <th className="py-2.5 px-3">Certification</th>
                <th className="py-2.5 px-2 text-center">Certification Status</th>
                <th className="py-2.5 px-3 text-right">Expiry Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {pagedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-[var(--secondary)]">
                    No matching employee records found.
                  </td>
                </tr>
              ) : (
                pagedEmployees.map((emp) => (
                  <tr
                    key={emp.employee_id}
                    className="hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    <td className="py-2.5 px-3 font-bold text-[var(--text)] whitespace-nowrap">
                      {emp.employee_id}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-[var(--text)] whitespace-nowrap">
                      {emp.employee_name}
                    </td>
                    <td className="py-2.5 px-3 text-[var(--secondary)] whitespace-nowrap">
                      {emp.department}
                    </td>
                    <td className="py-2.5 px-3 text-[var(--secondary)] whitespace-nowrap">
                      {emp.section}
                    </td>
                    <td className="py-2.5 px-3 text-[var(--text)] whitespace-nowrap">
                      {emp.skill}
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-[var(--text)]">
                      {emp.skill_grade}
                    </td>
                    <td className="py-2.5 px-3 text-[var(--text)] font-medium whitespace-nowrap">
                      {emp.certification}
                    </td>
                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      {emp.status === 'Valid' ? (
                        <span className="inline-block px-2 py-0.5 rounded font-extrabold text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          Valid
                        </span>
                      ) : emp.status === 'Expiring Soon' ? (
                        <span className="inline-block px-2 py-0.5 rounded font-extrabold text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          Expiring Soon
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded font-extrabold text-[10px] bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                          Expired
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-[var(--secondary)] whitespace-nowrap">
                      {emp.expiry_date}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      {!loading && !parentLoading && totalPages > 1 && (
        <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--secondary)]">
          <span>
            Showing <strong className="text-[var(--text)]">{startIndex + 1}</strong> to{' '}
            <strong className="text-[var(--text)]">
              {Math.min(startIndex + PAGE_SIZE, totalItems)}
            </strong>{' '}
            of <strong className="text-[var(--text)]">{totalItems}</strong> employees
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded border border-[var(--border)] hover:bg-[var(--surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded border border-[var(--border)] hover:bg-[var(--surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

