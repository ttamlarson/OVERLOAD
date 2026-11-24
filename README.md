# OVERLOAD Performance Systems

**BUILT THROUGH REPETITION. ENGINEERED TO PERFORM.**

OVERLOAD is a performance training system for tracking training, nutrition, progress and recovery.

## Product roadmap

See [docs/PLATFORM_ROADMAP.md](docs/PLATFORM_ROADMAP.md) for the product delivery plan, [docs/COMMERCIAL_READINESS_PLAN.md](docs/COMMERCIAL_READINESS_PLAN.md) for the commercial launch plan, and [docs/AI_COACHING_API.md](docs/AI_COACHING_API.md) for the privacy-first AI coaching service design.

## Coaching and workout intelligence (5.14.4)

The Coach workspace combines recent recovery check-ins, rolling workout frequency and same-day nutrition logs into transparent suggestions. The Training workspace includes a Workout Load Map with front/back muscle views for the current session or rolling seven-day completed/logged sets. Exercise-to-muscle estimates are transparent and deterministic; unknown exercises remain unmapped rather than guessed. These features are training aids, not medical assessments. Engines are isolated in `coach-engine.js` and `muscle-map.js` and covered by Node tests. The Coach screen now includes an optional AI review panel. It previews the exact compact weekly summary and requires fresh consent for each request. The browser client in `ai-coach-client.js` sends no raw food entries, recovery notes or measurements. The endpoint remains blank and the Worker in `workers/ai-coach/` remains disabled until the Cloudflare Access application, per-user rate limiting, exact-host CSP allow-list and server-side provider secret are configured.

## Deploy to GitHub Pages

1. Keep the application files in the repository root.
2. Deploy using the existing GitHub Pages workflow or the existing branch deployment configuration.
3. Check the Actions tab and Pages settings for the published URL.

## Add OVERLOAD to iPhone

1. Open the deployed Pages URL in Safari.
2. Tap **Share → Add to Home Screen**.
3. Confirm the name **OVERLOAD**, then tap **Add**.
4. If an older previous app shortcut is installed, remove that shortcut and add OVERLOAD again after deployment.

## Data and backups

The app stores records locally in the browser on the device and does not automatically sync between devices. Existing local storage key and data model are preserved by the rebrand. Use **Settings → Backup & restore → Export JSON backup** regularly. Keep at least two copies in separate locations. Restores download a safety copy before replacing device records. Do not clear Safari website data or change the site's origin if you need to retain existing local records.

## Files

- `index.html` — complete app
- `manifest.webmanifest` — OVERLOAD PWA name, launch behavior and icon declarations
- `sw.js` — service worker and offline app-shell cache
- `backup-validation.js` — bounded backup schema validation
- `ai-coach-client.js` — consent-gated, minimized AI review client
- `apple-touch-icon.png` — iPhone Home Screen icon
- `overload-mark.svg` — PWA/browser icon
- `workers/ai-coach/` — disabled-by-default, privacy-first AI coaching Worker and tests
- `.github/workflows/deploy-pages.yml` — GitHub Pages deployment workflow

