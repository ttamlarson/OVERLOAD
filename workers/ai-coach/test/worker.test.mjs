import test from "node:test";
import assert from "node:assert/strict";
import { sanitiseRequest, buildMessages, validateModelResponse, handleRequest } from "../src/index.mjs";

test("requires explicit consent and an allow-listed task", () => {
  assert.equal(sanitiseRequest({ task: "weekly_review", consent: false, context: {} }), null);
  assert.equal(sanitiseRequest({ task: "free_chat", consent: true, context: {} }), null);
});

test("weekly review only forwards bounded, allow-listed summary fields", () => {
  const result = sanitiseRequest({
    task: "weekly_review", consent: true,
    context: {
      goal: "Strength", workouts: [{ date: "2026-11-24", label: "Upper", workingSets: 18, tonnageKg: 4500, privateNotes: "must not pass" }],
      recovery: { date: "2026-11-24", sleepHours: 6, energy: 3, stress: 2, soreness: 2, notes: "must not pass" },
      nutrition: { calories: 2800, calorieTarget: 3000, proteinGrams: 160, proteinTargetGrams: 180, rawFoods: ["must not pass"] }
    }
  });
  assert.equal(result.context.workouts[0].privateNotes, undefined);
  assert.equal(result.context.latestRecovery.notes, undefined);
  assert.equal(result.context.nutrition.rawFoods, undefined);
  assert.equal(result.context.workouts[0].workingSets, 18);
});

test("caps arrays, strings and numeric values", () => {
  const result = sanitiseRequest({ task: "exercise_substitution", consent: true, context: {
    exercise: "x".repeat(500), equipmentAvailable: Array(20).fill("barbell")
  }});
  assert.equal(result.context.exercise.length, 100);
  assert.equal(result.context.equipmentAvailable.length, 12);
});

test("builds a bounded task-specific prompt", () => {
  const result = sanitiseRequest({ task: "programme_explanation", consent: true, context: { programmeName: "Upper Lower", exercises: ["Bench", "Row"] } });
  const messages = buildMessages(result);
  assert.equal(messages.length, 2);
  assert.match(messages[0].content, /Do not invent missing data/);
  assert.match(messages[1].content, /programme_explanation/);
});

test("rejects malformed model output and normalises valid output", () => {
  assert.equal(validateModelResponse({ title: "bad" }), null);
  const valid = validateModelResponse({ title: "Review", summary: "Good consistency", suggestions: ["Progress slowly", 12], dataUsed: ["3 sessions"], limitations: [] });
  assert.equal(valid.suggestions.length, 1);
  assert.match(valid.disclaimer, /not medical advice/);
});

test("refuses requests when origin is not explicitly allow-listed", async () => {
  const response = await handleRequest(new Request("https://api.example/v1/coach", { method: "POST", headers: { Origin: "https://evil.example" }, body: "{}" }), {});
  assert.equal(response.status, 403);
});


test("only serves the documented coaching endpoint", async () => {
  const response = await handleRequest(new Request("https://api.example/not-the-coach", { method: "POST", headers: { Origin: "https://app.example" }, body: "{}" }), { OVERLOAD_ALLOWED_ORIGIN: "https://app.example" });
  assert.equal(response.status, 404);
});

test("AI stays disabled by default and exposes credentialed CORS only to the allow-listed origin", async () => {
  const response = await handleRequest(new Request("https://api.example/v1/coach", { method: "POST", headers: { Origin: "https://app.example" }, body: "{}" }), { OVERLOAD_ALLOWED_ORIGIN: "https://app.example" });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("access-control-allow-origin"), "https://app.example");
  assert.equal(response.headers.get("access-control-allow-credentials"), "true");
});

test("returns CORS preflight only for the configured origin", async () => {
  const response = await handleRequest(new Request("https://api.example/v1/coach", { method: "OPTIONS", headers: { Origin: "https://app.example" } }), { OVERLOAD_ALLOWED_ORIGIN: "https://app.example" });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-credentials"), "true");
  const rejected = await handleRequest(new Request("https://api.example/v1/coach", { method: "OPTIONS", headers: { Origin: "https://other.example" } }), { OVERLOAD_ALLOWED_ORIGIN: "https://app.example" });
  assert.equal(rejected.status, 403);
});

test("rejects invalid Access assertions before invoking rate limiting", async () => {
  const response = await handleRequest(new Request("https://api.example/v1/coach", { method: "POST", headers: { Origin: "https://app.example", "cf-access-jwt-assertion": "not-a-valid-token" }, body: "{}" }), { OVERLOAD_ALLOWED_ORIGIN: "https://app.example", AI_ENABLED: "true" });
  assert.equal(response.status, 401);
});


test("rejects impossible calendar dates instead of forwarding them", () => {
  const result = sanitiseRequest({ task: "weekly_review", consent: true, context: {
    workouts: [
      { date: "2026-11-24", label: "Valid", workingSets: 12 },
      { date: "2026-19-42", label: "Impossible", workingSets: 9 }
    ],
    recovery: { date: "2026-02-30", sleepHours: 6 }
  }});
  assert.equal(result.context.workouts[0].date, "2026-11-24");
  assert.equal(result.context.workouts[1].date, null);
  assert.equal(result.context.latestRecovery.date, null);
});

test("marks supplied context as untrusted data in the model instruction", () => {
  const safe = sanitiseRequest({ task: "weekly_review", consent: true, context: { goal: "Strength" } });
  assert.match(buildMessages(safe)[0].content, /untrusted data/);
});
