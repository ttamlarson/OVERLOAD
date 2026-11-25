# OVERLOAD device ecosystem architecture

**Selected scope:** iOS widgets + Apple Watch + Live Activities; Android home-screen widgets + Wear OS; local-first data with optional account sync.

## Non-negotiable data safety

- The canonical browser record key remains `apexProtocolData_v1`. The bridge is a read-only projection and does not migrate, rename, clear or rewrite user records.
- Widgets receive a deliberately small snapshot, not raw food logs, notes, measurements, recovery answers or the full workout history.
- The app remains fully usable offline. No cloud account is required to record training.
- Cloud sync is not enabled until an authenticated backend, per-user authorization, conflict handling, deletion and restore tests exist. A separate disabled-by-default transport queue is now implemented under `overload_sync_state_v1`; it never reads or rewrites the legacy record store.
- Existing JSON export/restore remains the recovery path during the staged rollout.

## Current implementation

- `device-bridge.js` observes writes to the existing localStorage key and publishes a versioned, minimized `overload:device-snapshot` event.
- The bridge also calls the optional Capacitor plugin `OverloadDeviceBridge.publishSnapshot` when that native plugin is installed. Without it, the PWA works as before.
- Snapshot schema v1 includes today's workout summary, weekly workout count, today's calories/protein and targets, and a placeholder for verified strength records. It never exposes free-text notes or food names.
- Native integration sources live in the `OVERLOAD-IOS` repository. The iOS Capacitor bridge is now registered by the generated native app; the Android Capacitor bridge and Glance widget are configured by a repeatable build script. Both remain separate from the PWA's canonical records.

## Platform delivery

### Apple

- WidgetKit / SwiftUI extension: small, medium and lock-screen widget families; timeline refresh is best-effort and OS scheduled.
- App Group `group.com.overload.performance` is the shared snapshot boundary between the iOS app and widget extension.
- Capacitor plugin writes the minimized snapshot to the App Group. The iOS app target is configured with the `group.com.overload.performance` entitlement; this App Group must still be enabled in the Apple Developer account and shared with the WidgetKit extension before physical-device distribution.
- Live Activities use ActivityKit for an active workout/rest timer. Start/update/end must be driven by explicit workout lifecycle events; no fake background timer guarantees.
- Apple Watch companion uses WatchConnectivity and an independent watch-side workout session. Workout recording must continue without the phone and reconcile on reconnect.
- HealthKit access is opt-in and separately permissioned. Never infer permission from a widget or watch installation.

### Android

- Jetpack Glance home-screen widget reads a minimized snapshot from app-private storage. The Android build workflow generates the Capacitor project, registers the bridge plugin, adds the widget receiver and compiles a debug APK.
- Wear OS companion uses the Data Layer for phone/watch snapshot exchange and Health Services for supported exercise/heart-rate collection.
- Health Connect access is opt-in, scoped to requested record types and accompanied by clear provenance.

## Secure optional cloud sync (transport foundation implemented; sync remains disabled)

A production sync service must provide:
1. Sign-in with short-lived access tokens; no API key or privileged database credential in the app.
2. Per-user authorization on every request and record.
3. Stable record IDs, per-record revisions, server cursors and deletion tombstones.
4. Idempotent push/pull batches and explicit conflict responses. Never use last-write-wins for a whole user blob.
5. Encryption in transit, rate limits, audit events, export and account deletion.
6. A durable queue with retry/backoff; local writes succeed even if the network is unavailable.
7. Migration, two-device conflict, restore, revoke and deletion tests.

The web and native bundles now include a separate sync queue/transport interface. It requires an explicitly configured HTTPS endpoint and short-lived token provider, pushes revisioned operations, records conflicts and returns pulled changes for explicit app-level merge. It never applies remote changes automatically. The current repositories do not contain a verified authenticated sync backend or identity provider. Therefore network sync remains disabled; do not point clients at an unconfigured Worker or invent credentials. Cloudflare D1/R2/Durable Objects can be evaluated for the backend after authentication and privacy design are approved.

## Build and release gates

- [ ] Register App Group and WidgetKit extension in Apple Developer account.
- [x] Add the Capacitor plugin to the iOS native project and register it in the app.
- [x] Add the Android Capacitor plugin and Glance widget to the generated Android project.
- [ ] Add WidgetKit and Live Activity targets to the generated Xcode project; add Watch app target and signing.
- [x] Add Android Glance widget receiver to the Android app manifest.
- [ ] Package the Wear OS companion and add its offline workout session/reconnect flow.
- [ ] Validate iOS simulator/device and Android emulator/device builds.
- [ ] Test offline logging, app upgrade, local data preservation, snapshot refresh and phone/watch disconnect/reconnect.
- [ ] Obtain explicit HealthKit/Health Connect permissions and complete privacy disclosures before release.
- [x] Implement an isolated, disabled-by-default client sync queue and conflict-aware transport contract.
- [ ] Provision and security-test the authenticated sync backend before exposing account sync to users.

## Rollout

1. Validate the generated iOS and Android builds in CI.
2. Add and sign the WidgetKit extension and verify widgets on real devices.
3. Build Apple Watch and Wear OS companion apps with independent workout capture and reconnect-safe transfer.
4. Implement authenticated sync in a separate, tested backend release.
5. Enable cloud sync as an opt-in setting only after the full conflict/deletion test suite passes.
