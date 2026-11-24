CREATE TABLE IF NOT EXISTS user_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    label TEXT NOT NULL,
    model TEXT,
    endpoint TEXT,
    key_ciphertext TEXT NOT NULL,
    key_iv TEXT NOT NULL,
    key_auth_tag TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Keep existing installations compatible with the current API-key routes.
ALTER TABLE user_api_keys
ADD COLUMN IF NOT EXISTS endpoint TEXT;

CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id
ON user_api_keys (user_id);

-- Persistent conversation source of truth for local Express and Vercel.
CREATE TABLE IF NOT EXISTS conversation_threads (
    user_id TEXT NOT NULL,
    thread_id TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    compression JSONB,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    last_usage JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, thread_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_threads_user_updated
ON conversation_threads (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS conversation_archives (
    archive_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    source_thread_id TEXT NOT NULL,
    title TEXT NOT NULL,
    archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_digest TEXT NOT NULL,
    messages JSONB NOT NULL,
    UNIQUE (user_id, source_thread_id, source_digest)
);

CREATE INDEX IF NOT EXISTS idx_conversation_archives_user
ON conversation_archives (user_id, archived_at DESC);
