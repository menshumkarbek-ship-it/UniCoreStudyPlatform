-- Sessions that were signed out before they expired. A session cookie carries a random id (jti);
-- signing out records it here so a copied cookie stops working. Rows are purged once the token has expired anyway.
CREATE TABLE revoked_sessions (
  jti text PRIMARY KEY,
  expires_at timestamptz NOT NULL
);
CREATE INDEX revoked_sessions_expires_at_idx ON revoked_sessions (expires_at);
