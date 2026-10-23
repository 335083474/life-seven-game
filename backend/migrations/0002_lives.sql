CREATE TABLE lives (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  state TEXT NOT NULL,
  expires INTEGER NOT NULL
);
CREATE INDEX lives_owner ON lives(owner);
CREATE INDEX lives_expiry ON lives(expires);
CREATE TABLE life_actions (
  id TEXT PRIMARY KEY,
  life_id TEXT NOT NULL,
  owner TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  output TEXT,
  expires INTEGER NOT NULL
);
CREATE INDEX life_actions_expiry ON life_actions(expires);
CREATE INDEX life_actions_life ON life_actions(life_id);
