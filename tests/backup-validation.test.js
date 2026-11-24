const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('backup-validation.js', 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox);
const validate = sandbox.window.OverloadBackup.validateBackup;
const validLegacy = { workouts: [], foods: [], measurements: [] };
const validCurrent = { app: 'OVERLOAD', schemaVersion: 1, workouts: [{}], foods: [], measurements: [], settings: {}, current: {} };

test('accepts current and legacy backup formats', () => {
  assert.equal(validate(validLegacy).valid, true);
  assert.equal(validate(validCurrent).valid, true);
  assert.equal(validate({ app: 'CORV', ...validLegacy }).valid, true);
});

test('rejects unknown app identifiers and unsupported schema versions', () => {
  assert.equal(validate({ app: 'OTHER', ...validLegacy }).valid, false);
  assert.match(validate({ ...validLegacy, schemaVersion: 2 }).error, /unsupported schema/i);
});

test('rejects missing, malformed and oversized core collections', () => {
  assert.equal(validate({ workouts: [], foods: [] }).valid, false);
  assert.equal(validate({ ...validLegacy, workouts: [null] }).valid, false);
  assert.equal(validate({ ...validLegacy, workouts: Array(50001).fill({}) }).valid, false);
});

test('rejects malformed optional collections and settings', () => {
  assert.equal(validate({ ...validLegacy, cardio: [{}] }).valid, true);
  assert.equal(validate({ ...validLegacy, cardio: [false] }).valid, false);
  assert.equal(validate({ ...validLegacy, settings: [] }).valid, false);
  assert.equal(validate({ ...validLegacy, current: null }).valid, false);
});

test('rejects arrays and null as backup roots', () => {
  assert.equal(validate([]).valid, false);
  assert.equal(validate(null).valid, false);
});
