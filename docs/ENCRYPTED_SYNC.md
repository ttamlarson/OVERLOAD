# OVERLOAD encrypted backup and cross-device sync

## Architecture

- The existing `apexProtocolData_v1` localStorage key remains the primary app data model.
- Each successful local save marks the encrypted cloud copy dirty and schedules a debounced upload.
- The browser creates a 256-bit random recovery key. PBKDF2 (SHA-256, 310,000 iterations) derives an AES-256-GCM encryption key locally.
- A separate one-way SHA-256-derived credential authenticates sync requests. The recovery phrase itself is never sent to the Worker.
- The Worker stores only ciphertext chunks in the `overload-encrypted-sync` D1 database. It cannot decrypt the backup without the recovery phrase.
- Each cloud write uses an expected revision. If another device has already uploaded a newer revision, the write is rejected rather than silently overwriting it.
- The previous 20 cloud revisions are retained in D1 history tables.
- Up to 20 recent local snapshots are kept in IndexedDB as an additional browser-local recovery layer.
- Portable JSON export/import remains available. Export files deliberately omit the private sync recovery key.

## Pairing a device

1. On the device with the records you want to protect, open Settings → Encrypted cloud sync.
2. Choose **Generate key & enable sync** and wait for the first encrypted backup to complete.
3. Copy the recovery key and store it somewhere private and separate from the device.
4. On another iPhone, iPad, Android device or desktop browser, open the same OVERLOAD site.
5. Paste the recovery key into **Private recovery key** and choose **Connect this device**.
6. If a cloud backup exists, choose restore. OVERLOAD downloads a local safety backup before replacing the device's current records.

## Conflict behaviour

- Local changes are saved first; cloud sync never blocks normal training entry.
- Uploads are delayed briefly to combine rapid saves.
- If the cloud revision has advanced on another device, OVERLOAD stops the upload and displays a conflict status.
- The user can inspect/export local records and explicitly restore the latest cloud copy. There is no automatic destructive last-write-wins merge.
- A device that has not been paired or restored will not overwrite an existing cloud backup.

## Recovery and privacy

- Keep the recovery key: it is the only way to decrypt cloud records on a new device.
- The app stores the recovery key locally on paired devices to support unattended automatic sync. It is excluded from exported backups and is not stored in D1.
- Cloudflare receives a derived authentication token and encrypted payload, not the recovery phrase or plaintext workout data.
- Anyone with the recovery key can access and decrypt the backup. Treat it like a password.
- Local IndexedDB snapshots are on the same browser/device and are not a substitute for a separate cloud copy.
- Manual JSON backups remain recommended as a separate recovery path.

## Current limits

- Encrypted cloud payloads are capped at 40 chunks of 180,000 base64url characters each (roughly 5.4 MB of unencoded data).
- The UI currently restores the latest cloud revision. Older revisions are retained in D1 for recovery tooling, but are not yet selectable in the app.
- Device-level install, offline, and cross-browser validation remains necessary after the release is deployed.
