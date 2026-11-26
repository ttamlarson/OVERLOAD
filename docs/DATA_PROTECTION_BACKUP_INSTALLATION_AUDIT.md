# OVERLOAD data protection, backup and installation audit

**Source-reviewed release:** 5.15.17  
**Remediation included:** 5.14.2–5.15.17 (offline shell, backup validation, encrypted sync and recovery)  
**Architecture:** static GitHub Pages PWA; local-first browser storage; optional client-encrypted Cloudflare D1 sync.

## Executive summary

The primary dataset remains in browser localStorage under the legacy key `apexProtocolData_v1`, intentionally retained for migration compatibility. Optional encrypted sync now uploads an AES-256-GCM ciphertext backup to Cloudflare D1; the recovery phrase stays on the device and a separate derived credential is used for API authentication. The app also keeps recent IndexedDB snapshots and retains up to 20 prior cloud revisions. Records are not readable by the sync database without the recovery phrase. The phrase is stored locally on paired devices for automatic sync, so device/browser profile security remains important.

This is a privacy advantage compared with a centrally hosted user database, but it is also a data-loss risk: clearing website data, losing a device, browser profile corruption, private-browsing cleanup or storage exhaustion can make records unavailable. Users must export and store their own backups.

## Findings and remediation

| Area | Finding | Status |
|---|---|---|
| Data location | Primary app records remain local-first; optional encrypted cloud snapshots are stored in Cloudflare D1 | Implemented in 5.15.17 |
| Cross-device recovery | Recovery-key pairing, encrypted sync and revision conflict protection | Implemented in 5.15.17; physical-device validation pending |
| Save failures | Previous save path could throw on quota/storage errors; quiet persist failures were possible | Hardened with visible warning |
| Backup export | JSON export existed; object URL was revoked immediately after click | Fixed with delayed URL cleanup and metadata |
| Backup restore | Validation was minimal and safety copy depended on a legacy global not loaded by this app | Hardened in 5.14.3: shared tested validator, schema-version enforcement, bounded record collections, and a downloaded pre-restore safety backup |
| AI coaching | Cloud AI was not connected to the browser client | 5.14.4 adds an optional exact-data preview, fresh per-request consent and a fixed deployment-time endpoint; remains disconnected until Cloudflare Access, rate limiting, CSP and Worker secrets are configured |
| Restore compatibility | Legacy exports remain accepted when core record arrays are present | Preserved |
| Offline shell | Service worker cache used query-string versions that did not match some script URLs | Fixed with query-insensitive cache matching and aligned core assets |
| PWA identity | Manifest used stale icon query versions and did not explicitly include standard 192/512 PNG icons | Fixed |
| Installation guidance | iPhone instructions existed; Android and desktop guidance was incomplete | Expanded below |
| Third-party code | QR scanner library is loaded from unpkg and executes in the app page context | Residual risk; review/vendor and pin with SRI before handling sensitive data |
| Feedback | Beta feedback is opt-in and opens public GitHub issue creation | Keep reports free of personal or health data |

## Data protection guidance for users

- Use a device passcode and keep the operating system and browser updated.
- Do not share an unlocked browser profile with other people.
- Do not use private browsing for records you intend to keep.
- Export a backup after meaningful updates and at least weekly during regular use.
- Keep two backup copies in separate places, such as a private cloud drive and an encrypted computer backup.
- Treat exported JSON files as private health and fitness information. Store them securely and do not post them publicly.
- Before changing phones, browsers, site domains or clearing website data, export a backup and confirm it has downloaded.
- Keep the encrypted-sync recovery key somewhere private and separate from your devices; without it, cloud backups cannot be decrypted.\n- Cloud sync is optional and only begins after you generate a recovery key. It does not replace manual backups.

## Backup and restore procedure

1. Open OVERLOAD → Settings → Backup & restore.
2. Choose **Export JSON backup**.
3. Confirm the file `overload-backup-YYYY-MM-DD.json` exists in Files/Downloads.
4. Copy it to a secure second location.
5. On the destination browser/device, open the same OVERLOAD site and choose **Import backup**.
6. Select the JSON file and confirm. OVERLOAD downloads a separate pre-restore safety copy before replacing local records.
7. Check workout history, programmes, nutrition, measurements, recovery and cardio records.

Never test restore over a user's only copy of real records. Use a separate test profile or device.

## Installation

### iPhone / iPad
1. Open the live URL in Safari (not an in-app browser).
2. Tap Share → Add to Home Screen.
3. Keep the suggested OVERLOAD name and add it.
4. Launch from the Home Screen. Keep Safari website data intact.
5. After a major release, open the web app online and accept the in-app update prompt. If the icon or app shell is stale, close the app, open the URL in Safari and relaunch.

### Android
1. Open the live URL in Chrome.
2. Use the browser's Install app / Add to Home screen option.
3. Confirm installation and launch from the app icon.
4. Open the app online periodically so service-worker updates can be downloaded.

### Desktop
1. Open the live URL in a supported Chromium browser such as Chrome or Edge.
2. Use the install icon in the address bar or browser menu → Install OVERLOAD.
3. Launch from the installed app shortcut. The browser tab remains a supported fallback.

## 5.15.17 encrypted sync update\n\n- Added a Cloudflare D1 database and Worker `/v1/sync` endpoint. Encrypted backup data is stored in bounded chunks; the database retains the latest copy and up to 20 previous revisions.\n- The browser derives AES-256-GCM encryption and a separate API credential from a generated 256-bit recovery key. The recovery phrase is not sent to the Worker and is excluded from portable JSON backups.\n- Local saves schedule a debounced sync; IndexedDB retains up to 20 recent local snapshots. Revision checks stop stale devices from silently overwriting newer cloud data.\n- Added explicit connect/restore controls, local safety export before cloud restore, CI syntax checks and client/Worker security tests.\n- Remaining validation: exercise pairing, conflict handling, recovery and offline behaviour on physical iPhone, iPad, Android and desktop browsers.\n\n## 5.14.4 source review update

- Added an AI review panel to the Coach screen. The preview shows the exact compact weekly summary that will be sent; consent must be checked after previewing, and a new preview clears the previous consent.
- The client sends no raw food entries, recovery notes, body measurements, private notes, or user identifiers. It uses the browser's Cloudflare Access session and does not embed provider credentials.
- The endpoint metadata remains blank, AI stays disabled on the Worker, and the app CSP must be updated with the exact HTTPS Worker hostname before any connection can be enabled.
- Added browser-client tests for minimisation, preview consent, HTTPS enforcement and credentialed requests. GitHub Actions passed on the 5.14.4 source changes.

## 5.14.3 source review update

- Backup validation is now isolated in `backup-validation.js` and tested independently. It accepts legacy APEX/CORV exports and current OVERLOAD schema version 1, rejects unsupported schema versions and malformed collections, and caps each record collection at 50,000 entries.
- The validator is included in the service-worker core cache so restore validation remains available offline.
- Automated CI now runs the backup validation tests alongside the existing application and AI Worker tests.

## 5.14.2 source review update

- The service-worker precache now includes the 192 px and 512 px PNG icons referenced by the web app manifest, alongside the Apple touch icon.
- The validation workflow now checks release-version consistency across `version.json`, the update manager, beta feedback form, service-worker cache name and cache-busted HTML asset URLs. It also checks that service-worker core assets and manifest icons exist in the repository.
- These are source-level safeguards. They do not replace physical-device install, offline, update or backup/restore testing. The third-party QR scanner remains externally loaded from unpkg without a verified Subresource Integrity hash, and the current CSP still permits inline scripts and styles.

## Release verification checklist

- [ ] Install from the production Pages URL on real iPhone Safari.
- [ ] Install from Chrome on Android.
- [ ] Install from Chrome or Edge desktop.
- [ ] Create a disposable test workout, food entry, measurement and recovery record.
- [ ] Export backup and inspect that the JSON file downloads.
- [ ] Restore on a separate browser profile and compare records.
- [ ] Restore an older valid export and verify legacy compatibility.
- [ ] Attempt an invalid JSON file and confirm existing records remain unchanged.
- [ ] Load once online, switch to airplane mode, relaunch and verify cached app shell.
- [ ] Publish a new release and verify the update prompt appears without clearing user storage.

## Scope and limitations

This is a source-code and configuration audit, not a formal penetration test, independent device lab test, legal privacy assessment or guarantee against browser/device failure. The production installation, first-time sync, device pairing, conflict handling and restore checklist still needs execution on physical iOS, Android and desktop devices. The app currently restores the latest cloud revision; prior revisions are retained but are not yet selectable in the UI. This is not a formal penetration test, legal privacy assessment or guarantee against device/browser failure.
