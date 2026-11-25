import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('device bridge preserves the canonical legacy storage key and is read-only', () => {
  const source = fs.readFileSync(new URL('../device-bridge.js', import.meta.url), 'utf8');
  assert.match(source, /apexProtocolData_v1/);
  assert.match(source, /Storage\.prototype\.setItem/);
  assert.doesNotMatch(source, /removeItem\s*\(|clear\s*\(/);
  assert.match(source, /overload:device-snapshot/);
});

test('widget projection deliberately excludes raw notes and food names', () => {
  const source = fs.readFileSync(new URL('../device-bridge.js', import.meta.url), 'utf8');
  assert.match(source, /todayWorkout/);
  assert.match(source, /nutrition/);
  assert.doesNotMatch(source, /notes:\s*String/);
  assert.doesNotMatch(source, /foodNames/);
});
