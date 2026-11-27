import test from 'node:test';
import assert from 'node:assert/strict';
import { parseIntervalMs, shouldRun, nextRunAt } from '../src/timewatch/schedule.mjs';

test('accepts a safe positive watcher interval', () => assert.equal(parseIntervalMs('300'), 300000));
test('rejects intervals below the safety floor', () => assert.throws(() => parseIntervalMs('2'), /at least 30 seconds/));
test('determines whether a source is due', () => {
 const now = Date.parse('2026-11-28T10:00:00.000Z');
 assert.equal(shouldRun(null, now, 60000), true);
 assert.equal(shouldRun('2026-11-28T09:58:00.000Z', now, 60000), true);
 assert.equal(shouldRun('2026-11-28T09:59:30.000Z', now, 60000), false);
});
test('computes the next run time', () => assert.equal(nextRunAt('2026-11-28T09:00:00.000Z', 60000), '2026-11-28T09:01:00.000Z'));
