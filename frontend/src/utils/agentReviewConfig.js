import { cleanText, parseAgentFinding } from './humanizeAgentOutput.js';

/**
 * Configuration per agent for the HR Review Panel.
 * Extracts 3-4 real metrics, findings, recommendations, and tailored placeholders.
 */

export const AGENT_REVIEW_CONFIGS = {
  attendance: {
    agentId: 'attendance',
    agentName: 'Attendance Intelligence Agent',
    notesPlaceholder: 'Scheduled HR check-in with the shift lead, verified medical slip on file',
    realisticExample: 'Scheduled HR check-in with Shift C lead; verified medical certification for absent operators; authorized temporary cross-shift rebalancing.',
    getMetrics: (result) => {
      const m = result?.metrics || {};
      const list = [];
      if (m.attendance_rate != null) {
        list.push({
          label: 'Attendance Rate',
          value: `${m.attendance_rate}%`,
          hint: `${m.present_count?.toLocaleString() || 0} present`,
        });
      }
      if (m.absent_count != null || m.absenteeism_rate != null) {
        list.push({
          label: 'Absenteeism',
          value: m.absenteeism_rate != null ? `${m.absenteeism_rate}%` : `${m.absent_count}`,
          hint: `${m.absent_count?.toLocaleString() || 0} absences`,
        });
      }
      if (m.late_count != null || m.late_arrival_rate != null) {
        list.push({
          label: 'Late Arrivals',
          value: m.late_arrival_rate != null ? `${m.late_arrival_rate}%` : `${m.late_count}`,
          hint: `${m.late_count?.toLocaleString() || 0} punches`,
        });
      }
      const chronicCount =
        result?.chronic_absentees?.length ??
        result?.consecutive_streaks?.length ??
        m.chronic_absentees_count;
      if (chronicCount != null && chronicCount > 0) {
        list.push({
          label: 'Chronic Absentees',
          value: `${chronicCount} staff`,
          hint: '>= 3 shifts flagged',
        });
      } else if (m.lost_hours != null) {
        list.push({
          label: 'Lost Labor Hours',
          value: `${m.lost_hours.toLocaleString()} h`,
          hint: `across ${m.total_records?.toLocaleString() || 0} records`,
        });
      }
      return list.slice(0, 4);
    },
  },

  attrition: {
    agentId: 'attrition',
    agentName: 'Attrition & Retention Agent',
    notesPlaceholder: 'Authorized buddy onboarding program for Final Assembly; scheduled 30-day follow-up with team leads',
    realisticExample: 'Conducted stay-interview audit in Final Assembly; approved peer-buddy onboarding mentor program and 30-day review cadence.',
    getMetrics: (result) => {
      const m = result?.metrics || {};
      const list = [];
      if (m.overall_attrition_rate != null) {
        list.push({
          label: 'Attrition Rate',
          value: `${m.overall_attrition_rate}%`,
          hint: `of ${m.total_workforce_base?.toLocaleString() || 0} base`,
        });
      }
      if (m.total_exits != null) {
        list.push({
          label: 'Total Exits',
          value: `${m.total_exits}`,
          hint: `${m.permanent_exits || 0} Perm · ${m.vendor_exits || 0} Vendor`,
        });
      }
      const topDept = result?.by_department?.[0]?.department_name || m.highest_risk_department;
      if (topDept) {
        list.push({
          label: 'Top Department',
          value: topDept,
          hint: 'Highest departure concentration',
        });
      }
      if (m.average_tenure_years != null) {
        list.push({
          label: 'Average Exit Tenure',
          value: `${m.average_tenure_years} yrs`,
          hint: `${m.early_exits_count || 0} early (< 2 yrs)`,
        });
      } else if (m.retention_rate != null) {
        list.push({
          label: 'Retention Rate',
          value: `${m.retention_rate}%`,
          hint: `${m.active_employees?.toLocaleString() || 0} retained`,
        });
      }
      return list.slice(0, 4);
    },
  },

  overtime: {
    agentId: 'overtime',
    agentName: 'Overtime Optimization Agent',
    notesPlaceholder: 'Rebalance overtime across teams next week',
    realisticExample: 'Reviewed ₹11.99L absenteeism cover surcharge; authorized Shift A standby roster pilot and cross-team overtime rebalancing for next week.',
    getMetrics: (result) => {
      const m = result?.metrics || {};
      const list = [];
      if (m.total_overtime_hours != null) {
        list.push({
          label: 'Total OT Hours',
          value: `${m.total_overtime_hours.toLocaleString()} h`,
          hint: `${m.overtime_records_count?.toLocaleString() || 0} shifts logged`,
        });
      }
      if (m.total_overtime_cost_inr != null) {
        list.push({
          label: 'Total OT Cost',
          value: `₹${(m.total_overtime_cost_inr / 100000).toFixed(2)} L`,
          hint: `@ ₹${m.avg_hourly_base_rate_inr || 0}/hr base`,
        });
      }
      const repeatCount = result?.top_repeat_employees?.length ?? m.repeat_ot_employees_count;
      if (repeatCount != null) {
        list.push({
          label: 'Repeat OT Operators',
          value: `${repeatCount} staff`,
          hint: 'Fatigue gating required',
        });
      }
      const topDept = result?.department_breakdown?.[0]?.department_name || m.highest_ot_department;
      if (topDept) {
        list.push({
          label: 'Top Department',
          value: topDept,
          hint: 'Highest overtime driver',
        });
      } else if (m.potential_savings_inr != null) {
        list.push({
          label: 'Potential Savings',
          value: `₹${(m.potential_savings_inr / 100000).toFixed(2)} L`,
          hint: 'via standby pool rebalancing',
        });
      }
      return list.slice(0, 4);
    },
  },

  production: {
    agentId: 'production',
    agentName: 'Production Workforce Agent',
    notesPlaceholder: 'Approved shift rebalancing for Night Shift line 3; maintenance scheduled for buffer depletion',
    realisticExample: 'Approved line balancing adjustments for Night Shift C shortfall (-81k units); dispatched floating technicians to Assembly Line 2.',
    getMetrics: (result) => {
      const m = result?.metrics || {};
      const list = [];
      if (m.actual_units != null && m.target_units != null) {
        list.push({
          label: 'Output vs Target',
          value: `${(m.actual_units / 1000000).toFixed(2)}M / ${(m.target_units / 1000000).toFixed(2)}M`,
          hint: 'units produced vs plan',
        });
      }
      if (m.output_variance != null) {
        list.push({
          label: 'Output Variance',
          value: `${(m.output_variance / 1000).toFixed(1)}k units`,
          hint: m.output_variance < 0 ? 'Deficit' : 'Surplus',
        });
      }
      if (m.achievement_pct != null || m.overall_efficiency_pct != null) {
        const ach = m.achievement_pct ?? m.overall_efficiency_pct;
        list.push({
          label: 'Efficiency / Yield',
          value: `${ach.toFixed(1)}%`,
          hint: m.units_per_hour != null ? `${m.units_per_hour.toFixed(1)} u/h` : 'Line throughput',
        });
      }
      if (m.total_downtime_minutes != null) {
        list.push({
          label: 'Total Downtime',
          value: `${Math.round(m.total_downtime_minutes / 60)} hrs`,
          hint: `${m.total_downtime_minutes.toLocaleString()} mins recorded`,
        });
      }
      return list.slice(0, 4);
    },
  },

  skill_training: {
    agentId: 'skill_training',
    agentName: 'Skill & Training Agent',
    notesPlaceholder: 'Scheduled L3 certification bootcamp for Shift A operators; prioritized expired safety certs',
    realisticExample: 'Approved capability upskilling cohort for 575 headcount gap; scheduled L3/L4 cross-skilling certification for Assembly cell operators.',
    getMetrics: (result) => {
      const m = result?.metrics || {};
      const list = [];
      if (m.l3_l4_share_pct != null || m.skill_coverage_pct != null) {
        const cov = m.l3_l4_share_pct ?? m.skill_coverage_pct;
        list.push({
          label: 'L3/L4 Senior Ratio',
          value: `${cov}%`,
          hint: `${m.l3_l4_count?.toLocaleString() || 0} certified senior`,
        });
      }
      if (m.headcount_gap != null) {
        list.push({
          label: 'Skill Gap Shortfall',
          value: `${m.headcount_gap} staff`,
          hint: 'Statutory plant requirement',
        });
      }
      if (m.expired_certifications != null) {
        list.push({
          label: 'Expired Certifications',
          value: `${m.expired_certifications}`,
          hint: `${m.expiring_soon_count || 0} expiring soon`,
        });
      }
      if (m.training_passed_count != null) {
        list.push({
          label: 'Training Passed',
          value: `${m.training_passed_count.toLocaleString()}`,
          hint: 'Completed assessments',
        });
      }
      return list.slice(0, 4);
    },
  },

  vendor: {
    agentId: 'vendor',
    agentName: 'Vendor Workforce Agent',
    notesPlaceholder: 'Issued SLA compliance notice to agency; authorized headcount rebalancing across shifts',
    realisticExample: 'Acknowledged contractor share distribution (35.4%); authorized staffing agency rebalancing to address Line 2 peak variance.',
    getMetrics: (result) => {
      const m = result?.metrics || {};
      const list = [];
      if (m.contractor_share_pct != null) {
        list.push({
          label: 'Contractor Share',
          value: `${m.contractor_share_pct}%`,
          hint: `${m.active_vendor || 0} active contractors`,
        });
      }
      const topVendor = result?.by_vendor?.[0]?.vendor_name || (m.top_vendor ? `Vendor ${m.top_vendor}` : null);
      if (topVendor) {
        list.push({
          label: 'Top Staffing Agency',
          value: topVendor,
          hint: `${m.top_vendor_share || 0}% share of contingent`,
        });
      }
      if (m.total_vendors != null) {
        list.push({
          label: 'Partner Agencies',
          value: `${m.total_vendors} Agencies`,
          hint: 'Active contracting vendors',
        });
      }
      if (m.active_vendor != null) {
        list.push({
          label: 'Active Headcount',
          value: `${m.active_vendor.toLocaleString()}`,
          hint: 'Deployable on shift',
        });
      }
      return list.slice(0, 4);
    },
  },

  workforce_planning: {
    agentId: 'workforce_planning',
    agentName: 'Workforce Planning Agent',
    notesPlaceholder: 'Approved standby from Assembly cell B',
    realisticExample: 'Authorized standby replacement roster for Shift B; designated Assembly Cell B cross-skilled operator to cover absent station 10170.',
    getMetrics: (result) => {
      const m = result?.metrics || {};
      const list = [];
      if (m.required_baseline != null && m.available_count != null) {
        list.push({
          label: 'Required vs Available',
          value: `${m.required_baseline.toLocaleString()} / ${m.available_count.toLocaleString()}`,
          hint: `${m.availability_rate || 0}% floor availability`,
        });
      }
      if (m.shortage_count != null) {
        list.push({
          label: 'Operational Shortage',
          value: `${m.shortage_count.toLocaleString()} operators`,
          hint: `${m.shortage_percentage || 0}% operational deficit`,
        });
      }
      if (m.absent_count != null) {
        list.push({
          label: 'Absent Staff',
          value: `${m.absent_count.toLocaleString()}`,
          hint: `${m.approved_leave_count || 0} leave · ${m.late_arrival_count || 0} late`,
        });
      }
      const repCount = result?.replacement_candidates?.length ?? m.replacement_candidates_count ?? m.eligible_replacements;
      if (repCount != null) {
        list.push({
          label: 'Replacement Standby',
          value: `${repCount} eligible`,
          hint: 'Turnaround & skill verified',
        });
      }
      return list.slice(0, 4);
    },
  },
};

/**
 * Fallback metric extractor for any agent or custom payload
 */
export function getAgentReviewMetrics(agentId, result, filters) {
  const config = AGENT_REVIEW_CONFIGS[agentId];
  let list = [];
  if (config && typeof config.getMetrics === 'function') {
    list = config.getMetrics(result, filters) || [];
  }

  // If fewer than 4 metrics, fill from remaining numeric properties in result.metrics
  if (list.length < 4 && result?.metrics) {
    const existingLabels = new Set(list.map((i) => i.label.toLowerCase()));
    for (const [key, val] of Object.entries(result.metrics)) {
      if (typeof val === 'number') {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        if (!existingLabels.has(label.toLowerCase())) {
          list.push({
            label,
            value: Number.isInteger(val) ? val.toLocaleString() : val.toFixed(1),
            hint: '',
          });
          existingLabels.add(label.toLowerCase());
          if (list.length >= 4) break;
        }
      }
    }
  }

  return list.slice(0, 4);
}

/**
 * Standardizes raw findings into a checklist-ready array.
 */
export function getAgentReviewFindings(result) {
  const rawList = result?.findings || [];
  if (!Array.isArray(rawList)) return [];

  return rawList.map((item, idx) => {
    const parsed = parseAgentFinding(item);
    return {
      id: parsed.id || `FND-${idx + 1}`,
      title: cleanText(parsed.title || `Observation #${idx + 1}`),
      severity: parsed.severity || 'MODERATE',
      metric: parsed.metric ? cleanText(parsed.metric) : null,
      evidence: parsed.evidence ? cleanText(parsed.evidence) : null,
      raw: item,
    };
  });
}

/**
 * Standardizes recommendations into a checklist-ready array.
 */
export function getAgentReviewRecommendations(result) {
  const rawList = result?.recommendations || [];
  if (!Array.isArray(rawList)) return [];

  return rawList.map((item, idx) => {
    if (typeof item === 'string') {
      return {
        id: `REC-${idx + 1}`,
        title: cleanText(item),
        action: cleanText(item),
      };
    }
    const id = item.id || `REC-${idx + 1}`;
    const title = cleanText(item.title || item.action || `Recommendation #${idx + 1}`);
    const action = cleanText(item.details || item.action || item.description || '');
    return { id, title, action };
  });
}

/**
 * Formats structured review data into clean, readable plain text for storage in the backend notes field.
 */
export function composeReviewNotes({
  decision,
  acceptedRecTitles = [],
  reviewedFindingsCount = 0,
  totalFindings = 0,
  notes = '',
}) {
  const lines = [
    `Decision: ${decision}`,
    `Reviewed Findings: ${reviewedFindingsCount} of ${totalFindings} acknowledged`,
  ];

  if (acceptedRecTitles.length > 0) {
    lines.push('Accepted Recommendations:');
    acceptedRecTitles.forEach((t) => {
      lines.push(`• ${t}`);
    });
  }

  if (notes && notes.trim()) {
    lines.push('HR Review Notes:');
    lines.push(notes.trim());
  }

  return lines.join('\n');
}
