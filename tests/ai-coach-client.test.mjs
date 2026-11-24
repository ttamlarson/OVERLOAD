import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('ai-coach-client.js', 'utf8');
const meta = { content: '' };
const sandbox = {
  window: {},
  document: { querySelector: selector => selector === 'meta[name="overload-ai-endpoint"]' ? meta : null },
  URL,
  fetch: async () => { throw new Error('network should not be called'); }
};
vm.runInNewContext(source, sandbox);
const ai = sandbox.window.OverloadAI;

test('builds a minimized weekly summary without notes or raw food records', () => {
  const preview = ai.buildWeeklyReview({
    workouts: [{ date: '2026-11-24', type: 'Upper', privateNotes: 'secret', exercises: [{ name: 'Bench', sets: [{ weight: 100, reps: 5 }, { weight: 0, reps: 8 }] }] }],
    recoveries: [{ date: '2026-11-24', sleep: 6, energy: 3, stress: 2, soreness: 2, notes: 'private' }],
    foods: [{ date: '2026-11-24', cal: 2500, pro: 150, foodName: 'private food' }],
    settings: { calories: 2800, protein: 170 }
  }, '2026-11-24');
  assert.equal(preview.task, 'weekly_review');
  assert.deepEqual(JSON.parse(JSON.stringify(preview.context.workouts[0])), { date: '2026-11-24', label: 'Upper', workingSets: 1, tonnageKg: 500 });
  assert.equal(preview.context.recovery.notes, undefined);
  assert.equal(preview.context.nutrition.rawFoods, undefined);
  assert.equal(preview.context.nutrition.calories, 2500);
  assert.equal(preview.context.nutrition.loggedDays, 1);
});

test('does not include stale or future recovery check-ins in the AI preview', () => {
  const preview = ai.buildWeeklyReview({
    recoveries: [
      { date: '2026-11-20', sleep: 8, energy: 5, stress: 1, soreness: 1 },
      { date: '2026-11-25', sleep: 3, energy: 1, stress: 5, soreness: 5 }
    ]
  }, '2026-11-24');
  assert.equal(preview.context.recovery, undefined);
});

test('does not send data without explicit consent or configured endpoint', async () => {
  let calls = 0;
  const fakeFetch = async () => { calls++; };
  await assert.rejects(ai.requestWeeklyReview({}, false, fakeFetch), /consent/i);
  await assert.rejects(ai.requestWeeklyReview({}, true, fakeFetch), /not connected/i);
  assert.equal(calls, 0);
});

test('requires HTTPS and uses Access session credentials after consent', async () => {
  meta.content = 'http://worker.example/v1/coach';
  await assert.rejects(ai.requestWeeklyReview({}, true, async () => ({})), /HTTPS/i);
  meta.content = 'https://worker.example/v1/coach';
  let request;
  const result = await ai.requestWeeklyReview({ workouts: [] }, true, async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ result: { title: 'Review', summary: 'Steady training', suggestions: ['Keep logging'], dataUsed: [], limitations: [], disclaimer: 'Not medical advice.' } }) };
  });
  assert.equal(result.summary, 'Steady training');
  assert.equal(request.options.credentials, 'include');
  assert.equal(request.options.cache, 'no-store');
  assert.equal(request.options.referrerPolicy, 'no-referrer');
  assert.equal(request.options.headers.authorization, undefined);
  assert.equal(JSON.parse(request.options.body).consent, true);
});

test('rejects malformed or oversized AI result structures before rendering', async () => {
  meta.content = 'https://worker.example/v1/coach';
  await assert.rejects(ai.requestWeeklyReview({}, true, async () => ({
    ok: true, json: async () => ({ result: { title: 'Review', summary: 'Bad', suggestions: [1], dataUsed: [], limitations: [] } })
  })), /could not be verified/i);
  await assert.rejects(ai.requestWeeklyReview({}, true, async () => ({
    ok: true, json: async () => ({ result: { title: 'Review', summary: 'Bad', suggestions: ['1','2','3','4'], dataUsed: [], limitations: [] } })
  })), /could not be verified/i);
});
