
CREATE TABLE IF NOT EXISTS user_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    label TEXT NOT NULL,
    model TEXT,
    key_ciphertext TEXT NOT NULL,
    key_iv TEXT NOT NULL,
    key_auth_tag TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id
ON user_api_keys (user_id);