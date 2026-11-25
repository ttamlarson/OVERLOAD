/* OVERLOAD optional sync transport.
 * Disabled by default. Never reads or rewrites apexProtocolData_v1.
 * The host app must explicitly configure an HTTPS endpoint and short-lived
 * token provider before any network request can occur.
 */
(() => {
  'use strict';
  const KEY = 'overload_sync_state_v1';
  const empty = () => ({ schemaVersion: 1, cursor: null, pending: [], conflicts: [], lastSyncAt: null });
  let config = null;
  let inFlight = null;

  function read() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!value || value.schemaVersion !== 1) return empty();
      return {
        schemaVersion: 1,
        cursor: typeof value.cursor === 'string' ? value.cursor : null,
        pending: Array.isArray(value.pending) ? value.pending : [],
        conflicts: Array.isArray(value.conflicts) ? value.conflicts : [],
        lastSyncAt: value.lastSyncAt || null
      };
    } catch (_) { return empty(); }
  }
  function write(value) {
    localStorage.setItem(KEY, JSON.stringify(value));
    return value;
  }
  function normaliseEndpoint(value) {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      throw new Error('OVERLOAD sync requires HTTPS.');
    }
    return url.toString().replace(/\/$/, '');
  }
  function queueChange(change) {
    if (!change || typeof change !== 'object') throw new Error('A sync change is required.');
    const collection = String(change.collection || '');
    const recordId = String(change.id || '');
    const revision = Number(change.revision);
    if (!/^[a-z][a-z0-9_-]{0,39}$/.test(collection) || !recordId || !Number.isSafeInteger(revision) || revision < 1) {
      throw new Error('A collection, record ID and positive integer revision are required.');
    }
    const operation = {
      operationId: collection + ':' + recordId + ':' + revision,
      collection,
      id: recordId,
      revision,
      updatedAt: change.updatedAt || new Date().toISOString(),
      deletedAt: change.deletedAt || null,
      data: change.deletedAt ? null : (change.data ?? null)
    };
    const state = read();
    if (!state.pending.some(item => item.operationId === operation.operationId)) {
      state.pending.push(operation);
      write(state);
    }
    return operation.operationId;
  }
  function getStatus() {
    const state = read();
    return {
      enabled: Boolean(config),
      pendingCount: state.pending.length,
      conflictCount: state.conflicts.length,
      cursor: state.cursor,
      lastSyncAt: state.lastSyncAt
    };
  }
  function configure(options) {
    if (!options || typeof options.tokenProvider !== 'function' || !options.endpoint) {
      throw new Error('Configure sync with an HTTPS endpoint and tokenProvider.');
    }
    config = { endpoint: normaliseEndpoint(options.endpoint), tokenProvider: options.tokenProvider };
    return getStatus();
  }
  function disable() { config = null; return getStatus(); }

  async function request(path, token, init) {
    const response = await fetch(config.endpoint + path, {
      ...init,
      credentials: 'omit',
      cache: 'no-store',
      headers: { ...(init && init.headers || {}), Authorization: 'Bearer ' + token }
    });
    if (!response.ok) throw new Error('OVERLOAD sync request failed (' + response.status + ').');
    return response.json();
  }

  async function syncNow() {
    if (!config) return { status: 'disabled', ...getStatus(), changes: [] };
    if (inFlight) return inFlight;
    inFlight = (async () => {
      const token = await config.tokenProvider();
      if (typeof token !== 'string' || !token.trim()) throw new Error('Sync token provider returned no access token.');
      let state = read();
      if (state.pending.length) {
        const pushed = await request('/v1/sync/push', token, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operations: state.pending })
        });
        const accepted = new Set(Array.isArray(pushed.acceptedOperationIds) ? pushed.acceptedOperationIds : []);
        state.pending = state.pending.filter(item => !accepted.has(item.operationId));
        state.conflicts = Array.isArray(pushed.conflicts) ? pushed.conflicts : state.conflicts;
        if (typeof pushed.cursor === 'string') state.cursor = pushed.cursor;
        write(state);
      }
      const suffix = state.cursor ? '?cursor=' + encodeURIComponent(state.cursor) : '';
      const pulled = await request('/v1/sync/pull' + suffix, token, { method: 'GET' });
      state = read();
      if (typeof pulled.cursor === 'string') state.cursor = pulled.cursor;
      state.lastSyncAt = new Date().toISOString();
      write(state);
      // Remote changes are returned for explicit app-level review/merge; never
      // overwrite the existing local record store automatically.
      return { status: 'success', ...getStatus(), changes: Array.isArray(pulled.changes) ? pulled.changes : [] };
    })();
    try { return await inFlight; }
    finally { inFlight = null; }
  }

  window.OverloadSync = Object.freeze({ configure, disable, queueChange, getStatus, syncNow });
})();
