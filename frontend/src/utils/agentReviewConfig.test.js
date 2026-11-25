import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AGENT_REVIEW_CONFIGS,
  getAgentReviewMetrics,
  getAgentReviewFindings,
  getAgentReviewRecommendations,
  composeReviewNotes,
} from './agentReviewConfig.js';

describe('agentReviewConfig & helpers', () => {
  it('1. Extracts 3-4 metrics for Attendance Agent without sample numbers', () => {
    const result = {
      metrics: {
        attendance_rate: 96.2,
        absent_count: 52,
        absenteeism_rate: 3.8,
        late_count: 14,
        late_arrival_rate: 1.1,
        chronic_absentees_count: 5,
        present_count: 1312,
      },
    };
    const metrics = getAgentReviewMetrics('attendance', result);
    assert.equal(metrics.length, 4);
    assert.equal(metrics[0].label, 'Attendance Rate');
    assert.equal(metrics[0].value, '96.2%');
    assert.equal(metrics[1].label, 'Absenteeism');
    assert.equal(metrics[2].label, 'Late Arrivals');
    assert.equal(metrics[3].label, 'Chronic Absentees');
  });

  it('2. Extracts metrics for Attrition Agent', () => {
    const result = {
      metrics: {
        overall_attrition_rate: 8.4,
        total_exits: 42,
        average_tenure_years: 1.8,
      },
      by_department: [{ department_name: 'Final Assembly' }],
    };
    const metrics = getAgentReviewMetrics('attrition', result);
    assert.equal(metrics.length, 4);
    assert.equal(metrics[0].label, 'Attrition Rate');
    assert.equal(metrics[1].label, 'Total Exits');
    assert.equal(metrics[2].label, 'Top Department');
    assert.equal(metrics[2].value, 'Final Assembly');
    assert.equal(metrics[3].label, 'Average Exit Tenure');
  });

  it('3. Extracts metrics for Overtime Agent', () => {
    const result = {
      metrics: {
        total_overtime_hours: 6240,
        total_overtime_cost_inr: 1840000,
      },
      top_repeat_employees: [{}, {}, {}],
      department_breakdown: [{ department_name: 'Logistics' }],
    };
    const metrics = getAgentReviewMetrics('overtime', result);
    assert.equal(metrics.length, 4);
    assert.equal(metrics[0].label, 'Total OT Hours');
    assert.equal(metrics[1].label, 'Total OT Cost');
    assert.equal(metrics[1].value, '₹18.40 L');
    assert.equal(metrics[2].label, 'Repeat OT Operators');
    assert.equal(metrics[3].label, 'Top Department');
    assert.equal(metrics[3].value, 'Logistics');
  });

  it('4. Extracts metrics for Production, Skill, Vendor, Workforce Planning', () => {
    const prodMetrics = getAgentReviewMetrics('production', {
      metrics: {
        actual_units: 16640000,
        target_units: 16690000,
        output_variance: -50000,
        achievement_pct: 99.7,
        total_downtime_minutes: 180,
      },
    });
    assert.equal(prodMetrics.length, 4);

    const skillMetrics = getAgentReviewMetrics('skill_training', {
      metrics: {
        l3_l4_share_pct: 72.5,
        headcount_gap: 575,
        expired_certifications: 89,
        training_passed_count: 8787,
      },
    });
    assert.equal(skillMetrics.length, 4);

    const vendorMetrics = getAgentReviewMetrics('vendor', {
      metrics: {
        contractor_share_pct: 35.4,
        top_vendor: 'V01',
        total_vendors: 6,
        active_vendor: 560,
      },
    });
    assert.equal(vendorMetrics.length, 4);

    const planMetrics = getAgentReviewMetrics('workforce_planning', {
      metrics: {
        required_baseline: 1581,
        available_count: 1312,
        shortage_count: 269,
        absent_count: 50,
      },
    });
    assert.equal(planMetrics.length, 4);
  });

  it('5. Extracts findings and recommendations cleanly', () => {
    const findings = getAgentReviewFindings({
      findings: [
        '{"id":"FND-01","title":"Chronic absenteeism","severity":"HIGH","metric":"5 operators"}',
        { id: 'FND-02', title: 'Night shift gap', severity: 'MODERATE' },
      ],
    });
    assert.equal(findings.length, 2);
    assert.equal(findings[0].id, 'FND-01');
    assert.equal(findings[0].severity, 'HIGH');
    assert.equal(findings[0].title, 'Chronic absenteeism');

    const recs = getAgentReviewRecommendations({
      recommendations: [
        { id: 'REC-01', title: 'Standby pool', action: 'Activate standby operators' },
        'Conduct stay interviews',
      ],
    });
    assert.equal(recs.length, 2);
    assert.equal(recs[0].title, 'Standby pool');
    assert.equal(recs[1].title, 'Conduct stay interviews');
  });

  it('6. Composes structured review notes cleanly', () => {
    const text = composeReviewNotes({
      decision: 'Agree with findings',
      acceptedRecTitles: ['Standby pool', 'Cross-training'],
      reviewedFindingsCount: 3,
      totalFindings: 4,
      notes: 'Scheduled follow-up next Monday.',
    });
    assert.match(text, /Decision: Agree with findings/);
    assert.match(text, /Reviewed Findings: 3 of 4 acknowledged/);
    assert.match(text, /Accepted Recommendations:/);
    assert.match(text, /• Standby pool/);
    assert.match(text, /• Cross-training/);
    assert.match(text, /HR Review Notes:\nScheduled follow-up next Monday\./);
  });
});

