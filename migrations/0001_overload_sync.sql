CREATE TABLE IF NOT EXISTS overload_sync (
  sync_id TEXT PRIMARY KEY,
  auth_hash TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  ciphertext TEXT NOT NULL,
  iv TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS overload_sync_history (
  sync_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  ciphertext TEXT NOT NULL,
  iv TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (sync_id, revision)
);
CREATE INDEX IF NOT EXISTS overload_sync_history_lookup
  ON overload_sync_history(sync_id, revision DESC);
