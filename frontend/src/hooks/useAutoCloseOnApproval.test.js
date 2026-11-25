import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { AGENT_DRAWER_AUTOCLOSE_MS } from '../utils/constants.js';

describe('useAutoCloseOnApproval constant and logic', () => {
  test('AGENT_DRAWER_AUTOCLOSE_MS is 3000ms', () => {
    assert.equal(AGENT_DRAWER_AUTOCLOSE_MS, 3000);
  });

  test('Countdown timing calculations', () => {
    const delayMs = AGENT_DRAWER_AUTOCLOSE_MS;
    const initialSeconds = Math.max(1, Math.ceil(delayMs / 1000));
    assert.equal(initialSeconds, 3);
  });
});

