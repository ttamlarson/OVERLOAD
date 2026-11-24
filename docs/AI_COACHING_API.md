# OVERLOAD AI Coaching API

## Current status

The deterministic browser coaching engine remains the offline baseline. This Worker is the server-side AI adapter foundation. It is deliberately disabled by default and will not call an AI provider until the operator configures authentication, rate limiting, origin allow-listing and server-side credentials.

## Security boundary

- Cloudflare Access JWTs are verified against the configured team's published signing keys, issuer and audience.
- Provider credentials stay in Worker secrets; never place them in PWA JavaScript or local storage.
- A Cloudflare Rate Limiting binding named `AI_RATE_LIMITER` is mandatory. Limits are keyed by the authenticated Access subject.
- Requests require an exact `OVERLOAD_ALLOWED_ORIGIN` match and are capped at 12 KB.
- `AI_ENABLED` defaults to false. The endpoint refuses requests until explicitly enabled.
- Only four bounded task types are accepted. The Worker builds a task-specific allow-listed context and drops unknown fields, free-form notes and raw food records.
- Explicit `consent: true` is required on every request. The client must show what data will be sent before asking for consent.
- Model output is parsed and validated; malformed output is rejected. Suggestions never write back into the user's programme or records.
- Provider errors and timeouts fail closed; no deterministic data is modified.

## Supported tasks

| Task | Minimal context |
|---|---|
| `weekly_review` | Up to eight session summaries, optional latest recovery scores and aggregate nutrition totals |
| `exercise_substitution` | Exercise name, training goal, equipment list and experience band |
| `programme_explanation` | Programme name, goal, weekly frequency and exercise names |
| `nutrition_pattern` | Aggregate averages, targets and logged-day count |

The request intentionally excludes user identifiers, exact body measurements, free-text recovery notes, individual food records, medical diagnoses and injury descriptions.

## API

`POST /v1/coach`

Headers:
- `Content-Type: application/json`
- Browser requests must use `credentials: "include"` so the Cloudflare Access session cookie is sent. Cloudflare Access injects the `Cf-Access-Jwt-Assertion` header after authenticating the request; the Worker independently verifies its signature, issuer, audience and expiry.
- A bearer token is accepted for controlled server-side integration tests only; do not expose a reusable bearer secret in the PWA.

Body:
```json
{
  "task": "weekly_review",
  "consent": true,
  "context": {
    "goal": "Build strength",
    "period": "Last 14 days",
    "workouts": [
      { "date": "2026-11-24", "label": "Upper", "workingSets": 18, "tonnageKg": 4200 }
    ],
    "recovery": { "date": "2026-11-24", "sleepHours": 6, "energy": 3, "stress": 2, "soreness": 2 },
    "nutrition": { "calories": 2800, "calorieTarget": 3000, "proteinGrams": 160, "proteinTargetGrams": 180 }
  }
}
```

Success returns a concise structured result with a title, summary, suggestions, data-used list, limitations and a non-medical disclaimer, plus provider token-usage counts when supplied. No programme, target or log changes are performed. Render model text as text (for example, with `textContent` or the app's escaping helper); never inject model output as raw HTML.

## Deployment configuration

1. Create a dedicated Cloudflare Worker from `workers/ai-coach/wrangler.toml.example`.
2. Configure Worker variables: `AI_ENABLED=false`, `AI_MODEL`, `AI_API_BASE_URL`, `OVERLOAD_ALLOWED_ORIGIN`, `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD`.
3. Add `AI_API_KEY` as a Worker secret. Never commit it.
4. Configure a Cloudflare Access application for the Worker hostname and use its team domain and audience tag.
5. Add a Cloudflare Rate Limiting binding named `AI_RATE_LIMITER`; choose conservative per-user limits and a low daily spend cap at the provider.
6. Run tests, verify Access rejection, origin rejection, rate limiting and provider failure, then test with non-sensitive synthetic data.
7. Keep `AI_ENABLED=false` until the PWA consent UI and privacy notice are released and reviewed.

## Tests

Run from this directory:

`node --test test/worker.test.mjs`

These tests cover consent, allow-listed fields, size bounds, prompt task selection, output validation and origin enforcement. A separate integration test against a configured Cloudflare Access tenant and AI provider is still required.
