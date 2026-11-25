import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseAgentFinding,
  safeParseJson,
  formatDatesInText,
  formatNumbersInText,
  sanitizeNoneWords,
  cleanText,
  isJsonBlob,
} from './humanizeAgentOutput.js';

describe('humanizeAgentOutput Parser & Sanitizer', () => {
  test('1. Parsed JavaScript Object input', () => {
    const rawObj = {
      id: 'PLN-FND-01',
      title: 'Workforce Shortage Gap: 269 Workers (17.0%)',
      metric: '1312 Available vs 1581 Baseline (269 Short)',
      affected: 'Date 2026-08-01 · All Plants · All Shifts',
      severity: 'MODERATE',
      evidence: 'Available on floor: 1312 present employees against an operational requirement of 1581 staff',
      operational_impact: 'Deficit of 269 operators triggers immediate line balancing constraints.',
      recommendation: 'Activate priority standby roster and reallocate certified cross-shift operators.',
    };

    const parsed = parseAgentFinding(rawObj);
    assert.equal(parsed.isStructured, true);
    assert.equal(parsed.id, 'PLN-FND-01');
    assert.equal(parsed.severity, 'MODERATE');
    assert.equal(parsed.metric, '1,312 Available vs 1,581 Baseline (269 Short)');
    assert.equal(parsed.where, 'Date Aug 1, 2026 · All Plants · All Shifts');
    assert.match(parsed.what, /1,312 present employees/);
    assert.match(parsed.what, /1,581 staff/);
    assert.equal(parsed.why, 'Deficit of 269 operators triggers immediate line balancing constraints.');
    assert.equal(parsed.action, 'Activate priority standby roster and reallocate certified cross-shift operators.');
  });

  test('2. Raw JSON string input', () => {
    const jsonStr = JSON.stringify({
      id: 'PLN-FND-02',
      title: 'Concentrated Deficit in None',
      metric: '27 shortfall (402 of 429 present)',
      affected: 'None Line',
      severity: 'HIGH',
      evidence: 'None has 402 active workers against a required complement of 429.',
      operational_impact: 'Downstream assembly stations face throughput choke points and buffer depletion.',
      recommendation: 'Deploy temporary floating technicians from secondary sub-assembly cells.',
      custom_department: 'Assembly Unit 2',
    });

    const parsed = parseAgentFinding(jsonStr);
    assert.equal(parsed.isStructured, true);
    assert.equal(parsed.id, 'PLN-FND-02');
    assert.equal(parsed.severity, 'HIGH');
    assert.equal(parsed.title, 'Concentrated Deficit in Unassigned');
    assert.equal(parsed.where, 'Unassigned Line');
    assert.match(parsed.what, /Unassigned has 402 active workers/);
    // Custom unknown fields
    assert.equal(parsed.unknownFields.length, 1);
    assert.equal(parsed.unknownFields[0].label, 'Custom Department');
    assert.equal(parsed.unknownFields[0].value, 'Assembly Unit 2');
  });

  test('3. Double-encoded JSON string input', () => {
    const rawObj = {
      id: 'PLN-FND-04',
      title: 'Replacement Gating Audit',
      severity: 'HIGH',
      metric: '0 Eligible Candidates / 37 Disqualified',
      affected: 'Plant TN/KA Shift Dispatch',
      evidence: 'Candidate evaluation identified 0 qualified standby employees',
      recommendation: 'Submit top-ranked candidate for HR review',
    };
    // Double JSON encoded
    const doubleEncoded = JSON.stringify(JSON.stringify(rawObj));

    const parsed = parseAgentFinding(doubleEncoded);
    assert.equal(parsed.isStructured, true);
    assert.equal(parsed.id, 'PLN-FND-04');
    assert.equal(parsed.severity, 'HIGH');
    assert.equal(parsed.title, 'Replacement Gating Audit');
    assert.equal(parsed.action, 'Submit top-ranked candidate for HR review');
  });

  test('4. Plain text input', () => {
    const plainText = 'All shifts are fully staffed with 1312 operators operating normally on 2026-08-01.';

    const parsed = parseAgentFinding(plainText);
    assert.equal(parsed.isStructured, false);
    assert.equal(parsed.text, 'All shifts are fully staffed with 1,312 operators operating normally on Aug 1, 2026.');
  });

  test('5. Malformed JSON string input', () => {
    const malformed = '{"id": "BAD-01", "title": "Unclosed string, metric: 1234';

    const parsed = parseAgentFinding(malformed);
    assert.equal(parsed.isStructured, false);
    // Graceful fallback to readable text
    assert.ok(typeof parsed.text === 'string');
    assert.ok(!parsed.text.startsWith('{'));
  });

  test('6. Helpers: Date and Number formatters and isJsonBlob', () => {
    assert.equal(formatDatesInText('Period from 2026-08-01 to 2026-11-19'), 'Period from Aug 1, 2026 to Nov 19, 2026');
    assert.equal(formatNumbersInText('Processed 147014 biometric entries for EMP-10170'), 'Processed 147,014 biometric entries for EMP-10170');
    assert.equal(sanitizeNoneWords('Role is None and vendor is null'), 'Role is Unassigned and vendor is Unassigned');
    assert.equal(isJsonBlob('{"id":"1"}'), true);
    assert.equal(isJsonBlob('Normal chat message with no json'), false);
  });

  test('7. Extra fields filtering: hides internal flags, empty arrays/objects, debug/raw fields', () => {
    const rawObj = {
      id: 'FND-05',
      title: 'Flagged Consecutive Absence Streaks (>= 3 Shifts)',
      metric: '5 workers on multi-day absence (3 days max)',
      where: 'Yogesh Raj (EMP-10894) in IN-KA-01',
      severity: 'HIGH',
      what: 'Identified 5 operators with 3 or more consecutive unexcused absent days',
      action: 'Conduct direct HR counseling and welfare outreach',
      // Internal fields that MUST be hidden
      isStructured: true,
      unknownFields: [],
      _raw_data: { foo: 'bar' },
      is_flagged: true,
      has_overtime: false,
      debug: 'trace_123',
      schema_version: 'v1.0',
      empty_list: [],
      empty_dict: {},
      empty_str: '',
      // Valid extra field
      facility_zone: 'North Wing Floor 2',
    };

    const parsed = parseAgentFinding(rawObj);
    assert.equal(parsed.isStructured, true);
    assert.equal(parsed.unknownFields.length, 1);
    assert.equal(parsed.unknownFields[0].label, 'Facility Zone');
    assert.equal(parsed.unknownFields[0].value, 'North Wing Floor 2');

    // Passing already-parsed finding must not create "Is Structured" or "Unknown Fields"
    const reParsed = parseAgentFinding(parsed);
    assert.equal(reParsed.unknownFields.length, 1);
    assert.equal(reParsed.unknownFields[0].label, 'Facility Zone');
  });
});

