const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'device-bridge.js'), 'utf8');

test('device bridge preserves the canonical legacy storage key and is read-only', () => {
  assert.match(source, /apexProtocolData_v1/);
  assert.match(source, /Storage\\.prototype\\.setItem/);
  assert.doesNotMatch(source, /removeItem\\s*\\(|clear\\s*\\(/);
  assert.match(source, /overload:device-snapshot/);
});

test('widget projection excludes free-text notes and food names', () => {
  assert.match(source, /todayWorkout/);
  assert.match(source, /nutrition/);
  assert.doesNotMatch(source, /foodNames/);
});
