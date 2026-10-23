CREATE TABLE operations (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  kind TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  input TEXT NOT NULL,
  output TEXT,
  result TEXT,
  dice INTEGER,
  lock_until INTEGER NOT NULL DEFAULT 0,
  expires INTEGER NOT NULL
);
CREATE INDEX operations_expiry ON operations(expires);
CREATE TABLE quotas (id TEXT PRIMARY KEY, used INTEGER NOT NULL, expires INTEGER NOT NULL);
CREATE INDEX quotas_expiry ON quotas(expires);
