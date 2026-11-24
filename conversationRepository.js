const crypto = require("crypto");
const pool = require("./db");

const COOLDOWN_MS = 24 * 60 * 60 * 1000;
let schemaPromise;

function validateThreadId(threadId) {
    if (typeof threadId !== "string" || !/^thread_[a-zA-Z0-9_-]{1,100}$/.test(threadId)) {
        throw new Error("Invalid conversation ID.");
    }
}

function normalizeMessages(messages) {
    if (!Array.isArray(messages) || messages.length > 1000) throw new Error("Invalid conversation messages.");
    return messages.map((message, index) => {
        if (!message || !["user", "assistant", "ai"].includes(message.role) || typeof message.content !== "string" || message.content.length > 50000 || ![0, 1, 2, 3].includes(Number.isInteger(message.priority) ? message.priority : 0)) {
            throw new Error("Invalid conversation messages.");
        }
        return {
            message_id: typeof message.message_id === "string" && message.message_id ? message.message_id : `${crypto.randomUUID()}`,
            role: message.role === "ai" ? "assistant" : message.role,
            content: message.content,
            priority: Number.isInteger(message.priority) ? message.priority : 0,
            timestamp: message.timestamp || new Date().toISOString()
        };
    });
}

async function ensureSchema() {
    if (!schemaPromise) {
        schemaPromise = (async () => {
            await pool.query(`CREATE TABLE IF NOT EXISTS conversation_threads (
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
            )`);
            await pool.query(`CREATE TABLE IF NOT EXISTS conversation_archives (
                archive_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                source_thread_id TEXT NOT NULL,
                title TEXT NOT NULL,
                archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                source_digest TEXT NOT NULL,
                messages JSONB NOT NULL,
                UNIQUE (user_id, source_thread_id, source_digest)
            )`);
            await pool.query("CREATE INDEX IF NOT EXISTS idx_conversation_archives_user ON conversation_archives (user_id, archived_at DESC)");
            await pool.query("CREATE INDEX IF NOT EXISTS idx_conversation_threads_user_updated ON conversation_threads (user_id, updated_at DESC)");
        })().catch(error => {
            schemaPromise = null;
            throw error;
        });
    }
    await schemaPromise;
}

function rowToThread(row) {
    if (!row) return null;
    return {
        id: row.thread_id,
        title: row.title,
        messages: Array.isArray(row.messages) ? row.messages : [],
        compression: row.compression || null,
        archived: row.archived === true,
        lastUsage: row.last_usage || null
    };
}

async function getThread(userId, threadId) {
    validateThreadId(threadId);
    await ensureSchema();
    const result = await pool.query("SELECT * FROM conversation_threads WHERE user_id = $1 AND thread_id = $2", [String(userId), threadId]);
    return rowToThread(result.rows[0]);
}

async function listThreads(userId) {
    await ensureSchema();
    const result = await pool.query("SELECT * FROM conversation_threads WHERE user_id=$1 ORDER BY updated_at DESC", [String(userId)]);
    return result.rows.map(rowToThread);
}

async function ensureThread(userId, threadId, legacy = {}) {
    validateThreadId(threadId);
    await ensureSchema();
    const messages = normalizeMessages(Array.isArray(legacy.messages) ? legacy.messages : []);
    const result = await pool.query(
        `INSERT INTO conversation_threads (user_id, thread_id, title, messages, compression, archived)
         VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6)
         ON CONFLICT (user_id, thread_id) DO NOTHING
         RETURNING *`,
        [String(userId), threadId, legacy.title || "New Conversation", JSON.stringify(messages), legacy.compression ? JSON.stringify(legacy.compression) : null, legacy.archived === true]
    );
    return rowToThread(result.rows[0]) || getThread(userId, threadId);
}

async function setMessages(userId, threadId, messages, options = {}) {
    validateThreadId(threadId);
    await ensureSchema();
    const normalized = normalizeMessages(messages);
    const existing = await getThread(userId, threadId);
    if (existing?.messages?.length && normalized.length === 0) throw new Error("An empty update cannot replace a saved conversation.");
    const result = await pool.query(
        `INSERT INTO conversation_threads (user_id, thread_id, title, messages)
         VALUES ($1, $2, $3, $4::jsonb)
         ON CONFLICT (user_id, thread_id) DO UPDATE
         SET messages = EXCLUDED.messages, updated_at = NOW()
         RETURNING messages`,
        [String(userId), threadId, options.title || "New Conversation", JSON.stringify(normalized)]
    );
    return result.rows[0]?.messages?.length ?? normalized.length;
}

async function appendMessage(userId, threadId, role, content, title = null) {
    validateThreadId(threadId);
    await ensureSchema();
    const [message] = normalizeMessages([{ role, content }]);
    const result = await pool.query(
        `INSERT INTO conversation_threads (user_id, thread_id, title, messages)
         VALUES ($1, $2, $4, jsonb_build_array($3::jsonb))
         ON CONFLICT (user_id, thread_id) DO UPDATE
         SET messages = conversation_threads.messages || jsonb_build_array($3::jsonb),
             title = CASE WHEN conversation_threads.title = 'New Conversation' AND $4 <> 'New Conversation' THEN $4 ELSE conversation_threads.title END,
             updated_at = NOW()
         RETURNING messages`,
        [String(userId), threadId, JSON.stringify(message), typeof title === "string" && title.trim() ? title.trim().slice(0, 120) : "New Conversation"]
    );
    return message;
}

async function updateTitle(userId, threadId, title) {
    validateThreadId(threadId);
    await ensureSchema();
    const result = await pool.query("UPDATE conversation_threads SET title=$3, updated_at=NOW() WHERE user_id=$1 AND thread_id=$2 RETURNING *", [String(userId), threadId, title]);
    return rowToThread(result.rows[0]);
}

async function setArchived(userId, threadId, archived) {
    validateThreadId(threadId);
    await ensureSchema();
    const result = await pool.query("UPDATE conversation_threads SET archived=$3, archived_at=CASE WHEN $3 THEN NOW() ELSE NULL END, updated_at=NOW() WHERE user_id=$1 AND thread_id=$2 RETURNING thread_id", [String(userId), threadId, archived]);
    return result.rowCount > 0;
}

async function deleteThread(userId, threadId) {
    validateThreadId(threadId);
    await ensureSchema();
    await pool.query("DELETE FROM conversation_threads WHERE user_id=$1 AND thread_id=$2", [String(userId), threadId]);
}

async function updatePriority(userId, threadId, messageId, priority) {
    validateThreadId(threadId);
    await ensureSchema();

    // Serialize priority changes for this conversation. Without a row lock,
    // concurrent requests can both validate against the same old message list
    // and overwrite one another or exceed a priority limit.
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const locked = await client.query(
            "SELECT * FROM conversation_threads WHERE user_id=$1 AND thread_id=$2 FOR UPDATE",
            [String(userId), threadId]
        );
        if (!locked.rows[0]) throw new Error("Conversation not found.");

        const current = rowToThread(locked.rows[0]);
        const target = current.messages.find(message => message.message_id === messageId);
        if (!target) throw new Error("Message not found.");

        const counts = { 1: 0, 2: 0, 3: 0 };
        let total = 0;
        for (const message of current.messages) {
            const value = Number.isInteger(message.priority) ? message.priority : 0;
            if (value > 0) { total++; counts[value]++; }
        }

        const prior = Number.isInteger(target.priority) ? target.priority : 0;
        if (![0, 1, 2, 3].includes(priority) || priority !== (prior + 1) % 4) {
            throw new Error("Priority must follow the 0 → 1 → 2 → 3 → 0 cycle.");
        }
        if (priority > 0 && priority !== prior &&
            (counts[priority] >= ({ 1: 10, 2: 7, 3: 3 })[priority] || (prior === 0 && total >= 20))) {
            throw new Error(`Priority ${priority} limit reached for this conversation.`);
        }

        const messages = current.messages.map(message =>
            message.message_id === messageId ? { ...message, priority } : message
        );
        const updated = await client.query(
            "UPDATE conversation_threads SET messages=$3::jsonb, updated_at=NOW() WHERE user_id=$1 AND thread_id=$2 RETURNING messages",
            [String(userId), threadId, JSON.stringify(messages)]
        );
        if (!updated.rows[0]) throw new Error("Priority update did not affect the conversation.");

        await client.query("COMMIT");
        return messages.find(message => message.message_id === messageId);
    } catch (error) {
        try { await client.query("ROLLBACK"); } catch (_) {}
        throw error;
    } finally {
        client.release();
    }
}

async function deleteMessage(userId, threadId, messageId) {
    const current = await getThread(userId, threadId);
    if (!current) return false;
    const messages = current.messages.filter(message => message.message_id !== messageId);
    if (messages.length === current.messages.length) return false;
    await pool.query("UPDATE conversation_threads SET messages=$3::jsonb, updated_at=NOW() WHERE user_id=$1 AND thread_id=$2", [String(userId), threadId, JSON.stringify(messages)]);
    return true;
}

function validTimestamp(value) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return value < 1000000000000 ? value * 1000 : value;
    if (typeof value === "string") {
        const parsed = Number(value);
        if (Number.isFinite(parsed) && parsed > 0) return parsed < 1000000000000 ? parsed * 1000 : parsed;
        const date = Date.parse(value);
        if (Number.isFinite(date)) return date;
    }
    return null;
}

function cooldownRemaining(lastSuccessfulAt, now = Date.now()) {
    const lastSuccess = validTimestamp(lastSuccessfulAt);
    if (!lastSuccess || !Number.isFinite(now)) return 0;
    return Math.max(0, COOLDOWN_MS - (now - lastSuccess));
}

async function compressThread(userId, threadId, payload) {
    validateThreadId(threadId);
    await ensureSchema();

    const activeMessages = normalizeMessages(payload.activeMessages);
    const expectedMessages = normalizeMessages(payload.expectedSourceMessages);
    const expectedSourceJson = JSON.stringify(payload.expectedSourceMessages || []);
    const activeById = new Map(activeMessages.map(message => [message.message_id, message]));
    const missingStarred = expectedMessages.some(source => {
        if (source.priority <= 0) return false;
        const active = activeById.get(source.message_id);
        return !active || active.role !== source.role ||
            active.content !== source.content || active.priority !== source.priority;
    });
    if (missingStarred) {
        return { thread_exists: true, source_matches: true, cooldown_ok: true, compression: null, archive_id: null };
    }

    // One PostgreSQL statement replaces the unsupported interactive transaction
    // previously attempted through Neon HTTP. The locked CTE serializes competing
    // compression attempts; archive insertion and active-history replacement are
    // part of the same statement and therefore commit or roll back together.
    const sql = `WITH locked AS MATERIALIZED (
            SELECT user_id, thread_id, title, messages, compression
            FROM conversation_threads
            WHERE user_id = $1 AND thread_id = $2
            FOR UPDATE
        ),
        status AS MATERIALIZED (
            SELECT *,
                messages = $6::jsonb AS source_matches,
                COALESCE(NULLIF(compression->>'lastSuccessfulAt', '')::numeric, 0)
                    <= (EXTRACT(EPOCH FROM NOW()) * 1000 - 86400000) AS cooldown_ok
            FROM locked
        ),
        eligible AS MATERIALIZED (
            SELECT * FROM status WHERE source_matches AND cooldown_ok
        ),
        archived AS (
            INSERT INTO conversation_archives
                (archive_id, user_id, source_thread_id, title, archived_at, source_digest, messages)
            SELECT $3, user_id, thread_id, $4, NOW(), $5, messages
            FROM eligible
            ON CONFLICT (user_id, source_thread_id, source_digest) DO NOTHING
            RETURNING archive_id
        ),
        updated AS (
            UPDATE conversation_threads AS thread
            SET messages = $7::jsonb,
                compression = $8::jsonb,
                updated_at = NOW()
            FROM eligible
            WHERE thread.user_id = eligible.user_id
              AND thread.thread_id = eligible.thread_id
            RETURNING thread.compression
        )
        SELECT
            EXISTS (SELECT 1 FROM status) AS thread_exists,
            COALESCE((SELECT source_matches FROM status), false) AS source_matches,
            COALESCE((SELECT cooldown_ok FROM status), true) AS cooldown_ok,
            (SELECT compression FROM updated) AS compression,
            COALESCE(
                (SELECT archive_id FROM archived),
                (SELECT archive_id FROM conversation_archives
                 WHERE user_id = $1 AND source_thread_id = $2 AND source_digest = $5)
            ) AS archive_id`;

    const result = await pool.query(sql, [
        String(userId),
        threadId,
        payload.archiveId,
        payload.title,
        payload.sourceDigest,
        expectedSourceJson,
        JSON.stringify(activeMessages),
        JSON.stringify(payload.compression)
    ]);
    const row = result.rows[0] || {};
    return {
        thread_exists: row.thread_exists === true,
        source_matches: row.source_matches === true,
        cooldown_ok: row.cooldown_ok === true,
        compression: row.compression || null,
        archive_id: row.archive_id || null
    };
}

async function getArchives(userId) {
    await ensureSchema();
    const result = await pool.query("SELECT archive_id AS id,title,source_thread_id AS \"sourceThreadId\",archived_at AS \"archivedAt\",jsonb_array_length(messages) AS \"messageCount\" FROM conversation_archives WHERE user_id=$1 ORDER BY archived_at DESC", [String(userId)]);
    return result.rows;
}

async function createArchive(userId, threadId, title, messages) {
    validateThreadId(threadId);
    await ensureSchema();
    const normalized = normalizeMessages(messages);
    const digest = crypto.createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
    const archiveId = `archive_${Date.now()}_${crypto.randomBytes(5).toString("hex")}`;
    const result = await pool.query(
        `INSERT INTO conversation_archives (archive_id,user_id,source_thread_id,title,source_digest,messages)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb)
         ON CONFLICT (user_id,source_thread_id,source_digest) DO UPDATE SET source_digest=EXCLUDED.source_digest
         RETURNING archive_id AS id,title,source_thread_id AS \"sourceThreadId\",archived_at AS \"archivedAt\",jsonb_array_length(messages) AS \"messageCount\"`,
        [archiveId, String(userId), threadId, title, digest, JSON.stringify(normalized)]
    );
    return result.rows[0];
}

async function getArchive(userId, archiveId) {
    await ensureSchema();
    const result = await pool.query("SELECT archive_id AS id,title,source_thread_id AS \"sourceThreadId\",archived_at AS \"archivedAt\",messages FROM conversation_archives WHERE user_id=$1 AND archive_id=$2", [String(userId), archiveId]);
    return result.rows[0] || null;
}

async function restoreArchive(userId, archiveId, newThreadId) {
    await ensureSchema();
    const result = await pool.query(
        `INSERT INTO conversation_threads (user_id,thread_id,title,messages)
         SELECT $1,$3,'Restored: ' || title,messages FROM conversation_archives
         WHERE user_id=$1 AND archive_id=$2 RETURNING *`, [String(userId), archiveId, newThreadId]
    );
    return rowToThread(result.rows[0]);
}

async function saveUsage(userId, threadId, usage) {
    validateThreadId(threadId);
    await ensureSchema();
    await pool.query("UPDATE conversation_threads SET last_usage=$3::jsonb,updated_at=NOW() WHERE user_id=$1 AND thread_id=$2", [String(userId), threadId, JSON.stringify(usage)]);
}

module.exports = {
    ensureSchema, validateThreadId, normalizeMessages, getThread, listThreads, ensureThread,
    setMessages, appendMessage, updateTitle, setArchived, deleteThread,
    updatePriority, deleteMessage, validTimestamp, cooldownRemaining, compressThread,
    getArchives, createArchive, getArchive, restoreArchive, saveUsage, COOLDOWN_MS
};
