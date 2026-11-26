import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { webcrypto } from "node:crypto";
import { TextEncoder, TextDecoder } from "node:util";

async function loadClient() {
  const source = await readFile(new URL("../sync-client.js", import.meta.url), "utf8");
  let captured = null;
  const window = { OverloadBackup: { validateBackup(value) {
    return value && value.app === "OVERLOAD" && Array.isArray(value.workouts) && Array.isArray(value.foods) && Array.isArray(value.measurements)
      ? { valid: true, error: "" } : { valid: false, error: "Invalid backup" };
  } } };
  const context = {
    window, document: { querySelector: () => null }, crypto: webcrypto,
    TextEncoder, TextDecoder, Uint8Array, Array, Date, Promise, JSON, Math, Object, String, Number, Error,
    btoa, atob, console, location: { href: "https://ttamlarson.github.io/OVERLOAD/" },
    fetch: async (url, options) => {
      captured = { url, options };
      return { status: 200, ok: true, json: async () => ({ revision: 1 }) };
    }
  };
  runInNewContext(source, context);
  return { api: window.OverloadSync, getRequest: () => captured };
}

test("recovery keys are high entropy and are not transmitted to the sync API", async () => {
  const { api, getRequest } = await loadClient();
  const phrase = api.generateRecoveryKey();
  assert.equal(phrase.length, 43);
  const payload = { app: "OVERLOAD", schemaVersion: 1, workouts: [], foods: [], measurements: [], settings: {} };
  await api.upload(phrase, payload, 0);
  const request = getRequest();
  assert.equal(request.url, "/v1/sync");
  assert.notEqual(request.options.headers.authorization, "Bearer " + phrase);
  assert.match(request.options.headers.authorization, /^Bearer [a-f0-9]{64}$/);
  const body = JSON.parse(request.options.body);
  assert.ok(Array.isArray(body.chunks) && body.chunks.length > 0);
  assert.equal(body.syncId.length, 64);
});

test("encrypted backups decrypt with the recovery key and reject a different key", async () => {
  const { api, getRequest } = await loadClient();
  const phrase = api.generateRecoveryKey();
  const payload = { app: "OVERLOAD", schemaVersion: 1, workouts: [{ id: "w1" }], foods: [], measurements: [], settings: {} };
  await api.upload(phrase, payload, 0);
  const body = JSON.parse(getRequest().options.body);
  const restored = await api.decrypt(phrase, { chunks: body.chunks, iv: body.iv });
  assert.deepEqual(JSON.parse(JSON.stringify(restored)), payload);
  await assert.rejects(api.decrypt(api.generateRecoveryKey(), { chunks: body.chunks, iv: body.iv }));
});
