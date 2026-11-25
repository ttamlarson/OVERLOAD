'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'sync-engine.js'), 'utf8');

function createEngine() {
  class Storage {
    constructor() { this.items = new Map([['apexProtocolData_v1', '{"workouts":[{"id":"legacy"}]}']]); }
    getItem(key) { return this.items.has(key) ? this.items.get(key) : null; }
    setItem(key, value) { this.items.set(key, String(value)); }
  }
  const localStorage = new Storage();
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url, init });
    if (url.endsWith('/v1/sync/push')) {
      const body = JSON.parse(init.body);
      return { ok: true, json: async () => ({ acceptedOperationIds: body.operations.map(item => item.operationId), conflicts: [], cursor: 'push-cursor' }) };
    }
    return { ok: true, json: async () => ({ cursor: 'pull-cursor', changes: [{ collection: 'workouts', id: 'remote-1', revision: 2 }] }) };
  };
  const window = {};
  vm.runInNewContext(source, { window, localStorage, fetch, URL, Date, Set, JSON, Number, String, Promise, Error });
  return { engine: window.OverloadSync, localStorage, calls };
}

test('optional cloud sync is disabled by default and makes no network calls', async () => {
  const { engine, calls } = createEngine();
  const result = await engine.syncNow();
  assert.equal(result.status, 'disabled');
  assert.equal(calls.length, 0);
});

test('sync operations use a separate queue and preserve canonical workout data', () => {
  const { engine, localStorage } = createEngine();
  const before = localStorage.getItem('apexProtocolData_v1');
  const id = engine.queueChange({ collection: 'workouts', id: 'w-1', revision: 1, data: { type: 'Upper' } });
  assert.equal(id, 'workouts:w-1:1');
  assert.equal(localStorage.getItem('apexProtocolData_v1'), before);
  assert.equal(engine.getStatus().pendingCount, 1);
});

test('sync requires HTTPS and returns remote changes without applying them', async () => {
  const { engine, localStorage, calls } = createEngine();
  assert.throws(() => engine.configure({ endpoint: 'http://example.com', tokenProvider: async () => 'token' }), /HTTPS/);
  engine.queueChange({ collection: 'workouts', id: 'w-2', revision: 1, data: { type: 'Lower' } });
  engine.configure({ endpoint: 'https://sync.example.test', tokenProvider: async () => 'short-lived-token' });
  const result = await engine.syncNow();
  assert.equal(result.status, 'success');
  assert.equal(result.pendingCount, 0);
  assert.equal(result.changes[0].id, 'remote-1');
  assert.equal(calls.length, 2);
  assert.equal(localStorage.getItem('apexProtocolData_v1'), '{"workouts":[{"id":"legacy"}]}');
});
