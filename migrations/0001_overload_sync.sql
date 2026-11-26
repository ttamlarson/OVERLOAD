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

CREATE TABLE IF NOT EXISTS overload_sync_chunks (
  sync_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_data TEXT NOT NULL,
  PRIMARY KEY (sync_id, revision, chunk_index)
);
CREATE TABLE IF NOT EXISTS overload_sync_history_chunks (
  sync_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_data TEXT NOT NULL,
  PRIMARY KEY (sync_id, revision, chunk_index)
);
