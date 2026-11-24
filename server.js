//x-x-x-x-x-x-xx--x-x-x-x-x-x-x-x-x-x-x--x-x-x-x-x-x-x--xx-x-x-xx--x-x-x-x--x-x-x-x-x-x-x--x-x-x-x-x-x-x-x-x--xx--x-x--x-x-x-x-x-x
require("dotenv").config();
const {
    estimateConversationTokens,
    estimateMessageTokens,
    normalizeUsage,
    calculateContextBudget,
    recordUsageCalibration,
    getCalibratedInputEstimate
} = require("./tokenManager");
const pool = require("./db.js");
const { encryptApiKey, decryptApiKey } = require("./encryption.js");
//x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-xx-x-x-x-x-x-x-x by leader oct 17
// ============================================
// CLOUD AI - EXPRESS SERVER
// GOOGLE OAUTH BACKEND
// ============================================
// require("dotenv").config(); by leder oct 17
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const path = require("path");
const fs = require("fs");
const conversationRepository = require("./conversationRepository.js");
const { selectPillarMessages } = require("./pillarSelection");
// ============================================
// CREATE EXPRESS APP
// ============================================
const app = express();
const PORT = process.env.PORT || 3000;
// ============================================
// SESSION
// ============================================
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: "lax",
            secure: false
        }
    })
);
// ============================================
// PASSPORT
// ============================================
app.use(passport.initialize());
app.use(passport.session());
// ============================================
// GOOGLE OAUTH STRATEGY
// ============================================
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL
        },
        (accessToken, refreshToken, profile, done) => {
            // We don't need a database yet.
            // We store only the information
            // needed for the current session.
            const user = {
                id: profile.id,
                name: profile.displayName,
                email: profile.emails?.[0]?.value || null,
                picture: profile.photos?.[0]?.value || null
            };
            return done(null, user);
        }
    )
);
// ============================================
// SESSION SERIALIZATION
// ============================================
passport.serializeUser((user, done) => {
    done(null, user);
});
passport.deserializeUser((user, done) => {
    done(null, user);
});
// ============================================
// CREATE CONVERSATION FOLDER API
// ============================================
app.use(express.json({ limit: "10mb" }));

function readJsonFile(filePath, fallback = null) {
    try { return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf8")) : fallback; }
    catch (error) { console.warn("Ignoring malformed legacy conversation metadata:", path.basename(filePath), error.message); return fallback; }
}

function readLegacyThread(userId, threadId) {
    conversationRepository.validateThreadId(threadId);
    const hashedUser = require("crypto").createHash("sha256").update(String(userId)).digest("hex");
    const roots = [
        path.join(__dirname, "conversations", `user_${hashedUser}`, threadId),
        path.join(__dirname, "conversations", `user_${String(userId).replace(/[^a-zA-Z0-9_-]/g, "_")}`, threadId)
    ];
    const messages = [];
    const seen = new Set();
    let metadata = {};
    let compression = null;
    for (const directory of roots) {
        if (!fs.existsSync(directory)) continue;
        const currentMetadata = readJsonFile(path.join(directory, "metadata.json"), {});
        if (currentMetadata && typeof currentMetadata === "object") metadata = { ...metadata, ...currentMetadata };
        const currentCompression = readJsonFile(path.join(directory, "compression.json"));
        if (currentCompression && typeof currentCompression.summary === "string" && currentCompression.summary.trim()) {
            const stamp = conversationRepository.validTimestamp(currentCompression.lastSuccessfulAt);
            compression = { ...currentCompression, lastSuccessfulAt: stamp };
        }
        const files = fs.readdirSync(directory).filter(name => /^day_\d+\.jsonl$/.test(name) || name === "conversation.jsonl").sort();
        for (const name of files) {
            const lines = fs.readFileSync(path.join(directory, name), "utf8").split(/\r?\n/).filter(Boolean);
            lines.forEach((line, index) => {
                try {
                    const item = JSON.parse(line);
                    if (!["user", "assistant", "ai"].includes(item.role) || typeof item.content !== "string") return;
                    const fingerprint = require("crypto").createHash("sha256").update(`${item.role}\n${item.timestamp || ""}\n${item.content}`).digest("hex");
                    const messageKey = item.message_id ? `id:${item.message_id}` : `content:${fingerprint}`;
                    if (seen.has(messageKey) || seen.has(`content:${fingerprint}`)) return;
                    seen.add(messageKey);
                    seen.add(`content:${fingerprint}`);
                    messages.push({
                        message_id: item.message_id || `${threadId}_legacy_${fingerprint.slice(0, 20)}_${index}`,
                        role: item.role === "ai" ? "assistant" : item.role,
                        content: item.content,
                        priority: Number.isInteger(item.priority) && item.priority >= 0 && item.priority <= 3 ? item.priority : 0,
                        timestamp: item.timestamp || null
                    });
                } catch (error) {
                    console.warn("Skipping malformed legacy message:", name, index + 1, error.message);
                }
            });
        }
    }
    if (!messages.length && !compression && !Object.keys(metadata).length) return null;
    return { title: metadata.title || threadId, messages, compression, archived: metadata.archived === true };
}

async function getStoredThread(userId, threadId) {
    const current = await conversationRepository.getThread(userId, threadId);
    if (current) return current;
    const legacy = readLegacyThread(userId, threadId);
    return legacy ? conversationRepository.ensureThread(userId, threadId, legacy) : null;
}

async function importLegacyArchives(userId) {
    const hashedUser = require("crypto").createHash("sha256").update(String(userId)).digest("hex");
    const roots = [
        path.join(__dirname, "conversations", `user_${hashedUser}`, "archives"),
        path.join(__dirname, "conversations", `user_${String(userId).replace(/[^a-zA-Z0-9_-]/g, "_")}`, "archives")
    ];
    for (const directory of roots) {
        if (!fs.existsSync(directory)) continue;
        for (const name of fs.readdirSync(directory).filter(file => /^archive_[a-zA-Z0-9_-]+\.json$/.test(file))) {
            const record = readJsonFile(path.join(directory, name));
            if (!record || !/^thread_[a-zA-Z0-9_-]{1,100}$/.test(record.sourceThreadId || "") || !Array.isArray(record.messages)) continue;
            try {
                const title = String(record.title || "Original: Conversation").slice(0, 140);
                await conversationRepository.createArchive(String(userId), record.sourceThreadId, title, record.messages);
            } catch (error) {
                console.warn("Could not import a legacy archive:", name, error.message);
            }
        }
    }
}

/* ============================================
   API KEY DATABASE ROUTES oct 15 leader
   ============================================ */

// Save an API key in encrypted form
app.post("/api/keys", async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({
            error: "Please log in first."
        });
    }

    const { provider, label, model, endpoint, apiKey } = req.body;

    if (
        typeof provider !== "string" ||
        (endpoint != null &&
    (typeof endpoint !== "string" || endpoint.length > 2000)) ||
        !provider.trim() ||
        typeof label !== "string" ||
        !label.trim() ||
        typeof apiKey !== "string" ||
        !apiKey.trim()
    ) {
        return res.status(400).json({
            error: "Provider, label, and API key are required."
        });
    }

    if (
    provider.length > 100 ||
    label.length > 100 ||
    typeof model !== "string" ||
    !model.trim() ||
    model.length > 200
) {
        return res.status(400).json({
            error: "One or more fields are too long or invalid."
        });
    }

    try {

        const encrypted = encryptApiKey(apiKey);

        const result = await pool.query(
    `INSERT INTO user_api_keys
        (user_id, provider, label, model, endpoint,
         key_ciphertext, key_iv, key_auth_tag)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, provider, label, model, endpoint,
               created_at, updated_at`,
    [
        String(req.user.id),
        provider.trim(),
        label.trim(),
        model?.trim() || null,
        endpoint?.trim() || null,
        encrypted.ciphertext,
        encrypted.iv,
        encrypted.authTag
    ]
);

        return res.status(201).json({
            success: true,
            key: result.rows[0]
        });
    } catch (error) {
        console.error("API key save failed:", error.message);
        return res.status(500).json({
            error: "Could not save the API key."
        });
    }
});
/* ============================================
   GET ONE CONVERSATION
   ============================================ */

app.get("/api/threads", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Please log in first." });
    try {
        const threads = await conversationRepository.listThreads(String(req.user.id));
        return res.json({ threads });
    } catch (error) {
        console.error("Conversation list retrieval failed:", error.message);
        return res.status(500).json({ error: "Could not retrieve saved conversations." });
    }
});

app.get("/api/threads/:threadId", async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({
            error: "Please log in first."
        });
    }

    try {
        const thread = await getStoredThread(String(req.user.id), req.params.threadId);

        if (!thread) {
            return res.status(404).json({
                error: "Conversation not found."
            });
        }

        return res.json({
            success: true,
            thread
        });

    } catch (error) {
        console.error("Conversation retrieval failed:", error.message);

        return res.status(500).json({
            error: "Could not retrieve conversation."
        });
    }
});

/* ============================================
   RENAME CONVERSATION
   ============================================ */

app.patch("/api/threads/:threadId", async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({
            error: "Please log in first."
        });
    }

    const { title } = req.body;

    if (typeof title !== "string" || !title.trim()) {
        return res.status(400).json({
            error: "A valid conversation title is required."
        });
    }

    try {
        const thread = await getStoredThread(String(req.user.id), req.params.threadId);

        if (!thread) {
            return res.status(404).json({
                error: "Conversation not found."
            });
        }

        const updated = await conversationRepository.updateTitle(String(req.user.id), req.params.threadId, title.trim());

        return res.json({
            success: true,
            thread: updated
        });

    } catch (error) {
        console.error("Conversation rename failed:", error.message);

        return res.status(400).json({
            error: error.message || "Could not rename conversation."
        });
    }
});



/* ============================================
   ARCHIVE CONVERSATION
   ============================================ */

app.post("/api/threads/:threadId/archive", async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({
            error: "Please log in first."
        });
    }

    try {
        const found = await getStoredThread(String(req.user.id), req.params.threadId);
        if (!found) return res.status(404).json({ error: "Conversation not found." });
        await conversationRepository.setArchived(String(req.user.id), req.params.threadId, true);

        return res.json({
            success: true,
            message: "Conversation archived successfully."
        });

    } catch (error) {
        console.error("Conversation archive failed:", error.message);

        return res.status(400).json({
            error: error.message || "Could not archive conversation."
        });
    }
});

/* ============================================
   RESTORE CONVERSATION
   ============================================ */

app.post("/api/threads/:threadId/restore", async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({
            error: "Please log in first."
        });
    }

    try {
        const found = await getStoredThread(String(req.user.id), req.params.threadId);
        if (!found) return res.status(404).json({ error: "Conversation not found." });
        await conversationRepository.setArchived(String(req.user.id), req.params.threadId, false);

        return res.json({
            success: true,
            message: "Conversation restored successfully."
        });

    } catch (error) {
        console.error("Conversation restore failed:", error.message);

        return res.status(400).json({
            error: error.message || "Could not restore conversation."
        });
    }
});

/* ============================================
   DELETE CONVERSATION PERMANENTLY
   ============================================ */

app.delete("/api/threads/:threadId", async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({
            error: "Please log in first."
        });
    }

    try {
        await conversationRepository.deleteThread(String(req.user.id), req.params.threadId);

        return res.json({
            success: true,
            message: "Conversation deleted permanently."
        });

    } catch (error) {
        console.error("Conversation deletion failed:", error.message);

        return res.status(400).json({
            error: error.message || "Could not delete conversation."
        });
    }
});

/* ============================================
   SAVE MESSAGE TO CONVERSATION
   ============================================ */

app.post("/api/threads/:threadId/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({
            error: "Please log in first."
        });
    }

    const { role, content, title } = req.body;

    if (!["user", "assistant"].includes(role)) {
        return res.status(400).json({
            error: "Invalid message role."
        });
    }

    if (typeof content !== "string" || !content.trim()) {
        return res.status(400).json({
            error: "Message content is required."
        });
    }

    try {
        const userId = String(req.user.id);
        const existing = await getStoredThread(userId, req.params.threadId);
        if (!existing) await conversationRepository.ensureThread(userId, req.params.threadId, { title: typeof title === "string" && title.trim() ? title.trim().slice(0, 120) : "New Conversation" });
        const message = await conversationRepository.appendMessage(userId, req.params.threadId, role, content, title);

        return res.status(201).json({
            success: true,
            message
        });

    } catch (error) {
        console.error("Message storage failed:", error.message);

        return res.status(error.message === "Invalid conversation ID." || error.message === "Invalid message role." || error.message === "Message content cannot be empty." ? 400 : 500).json({
            error: error.message === "Invalid conversation ID." || error.message === "Invalid message role." || error.message === "Message content cannot be empty."
                ? error.message
                : "Could not save the message to persistent storage."
        });
    }
});

app.put("/api/threads/:threadId/compression", async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Please log in first." });
    }
    const { summary, sourceTokenEstimate, compressedTokenEstimate, sourceMessageCount, activeMessages, originalTitle } = req.body || {};
    if (typeof summary !== "string" || !summary.trim() || summary.length > 30000 ||
        !Number.isFinite(sourceTokenEstimate) || !Number.isFinite(compressedTokenEstimate) ||
        compressedTokenEstimate >= sourceTokenEstimate || !Number.isInteger(sourceMessageCount) || sourceMessageCount < 1 || !Array.isArray(activeMessages)) {
        return res.status(400).json({ error: "A valid, smaller compression summary is required." });
    }
    try {
        const userId = String(req.user.id);
        const thread = await getStoredThread(userId, req.params.threadId);
        if (!thread) return res.status(404).json({ error: "The original conversation was not found." });
        const now = Date.now();
        const retryAfterMs = conversationRepository.cooldownRemaining(thread.compression?.lastSuccessfulAt, now);
        if (retryAfterMs > 0) {
            return res.status(429).json({ error: "Manual compression is available after the 24-hour cooldown.", retryAfterMs });
        }
        const normalizedActive = conversationRepository.normalizeMessages(activeMessages);
        if (normalizedActive.length < 1 || normalizedActive.length > thread.messages.length) return res.status(400).json({ error: "The compressed conversation cannot contain more messages than the current history." });
        const compression = { summary: summary.trim(), sourceTokenEstimate, compressedTokenEstimate, sourceMessageCount, lastSuccessfulAt: now, estimateSource: req.body.estimateSource || "estimated" };
        const title = `Original: ${String(originalTitle || thread.title || "Conversation").replace(/^Original:\s*/i, "").trim().slice(0, 120)}`;
        const sourceDigest = require("crypto").createHash("sha256").update(JSON.stringify(thread.messages)).digest("hex");
        const result = await conversationRepository.compressThread(userId, req.params.threadId, {
            compression, activeMessages: normalizedActive, title, archiveId: `archive_${now}_${require("crypto").randomBytes(5).toString("hex")}`, sourceDigest
        });
        if (!result.thread_exists) return res.status(404).json({ error: "The original conversation was not found." });
        if (!result.cooldown_ok) return res.status(429).json({ error: "Manual compression is available after the 24-hour cooldown." });
        if (!result.compression) throw new Error("Compression could not be committed. The original conversation remains unchanged.");
        return res.json({ success: true, compression: result.compression, archiveId: result.archive_id });
    } catch (error) {
        console.error("Compression storage failed:", error.message);
        return res.status(500).json({ error: error.message || "Could not store compression summary." });
    }
});

app.get("/api/threads/:threadId/compression", async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Please log in first." });
    }
    try {
        const thread = await getStoredThread(String(req.user.id), req.params.threadId);
        if (!thread) return res.json({ compression: null });
        return res.json({ compression: thread.compression || null });
    } catch (error) {
        return res.status(400).json({ error: error.message || "Could not load compression summary." });
    }
});

app.get("/api/threads/:threadId/pillar-source", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Please log in first." });
    const apiId = String(req.query.apiId || "");
    const operation = req.query.operation === "migration" ? "migration" : req.query.operation === "compression" ? "compression" : null;
    if (!apiId || !operation) return res.status(400).json({ error: "Select a saved model and a valid context operation." });
    try {
        const userId = String(req.user.id);
        const thread = await getStoredThread(userId, req.params.threadId);
        if (!thread) return res.status(404).json({ error: "Conversation history was not found." });
        const key = await pool.query("SELECT provider,model FROM user_api_keys WHERE id=$1 AND user_id=$2", [apiId, userId]);
        if (!key.rows[0]) return res.status(404).json({ error: "Saved API key not found." });
        const selection = selectPillarMessages(thread.messages, operation, key.rows[0].provider, key.rows[0].model, thread.lastUsage);
        return res.json({
            thread: { id: thread.id, title: thread.title, compression: thread.compression },
            selectedMessages: selection.messages,
            tokenBudget: selection.tokenBudget,
            selectedTokens: selection.selectedTokens,
            totalSourceTokens: selection.totalSourceTokens,
            starredTokens: selection.starredTokens,
            sourceMessageCount: selection.sourceMessageCount,
            starredMessageCount: selection.starredMessageCount,
            omittedMessageCount: selection.omittedMessageCount,
            overflowStarred: selection.overflowStarred,
            contextCapacity: selection.capacity,
            capacitySource: selection.capacitySource,
            estimateSources: selection.estimateSources,
            previousUsage: thread.lastUsage
        });
    } catch (error) {
        console.error("Pillar source retrieval failed:", error.message);
        return res.status(500).json({ error: "Could not prepare the conversation for this context operation." });
    }
});

app.post("/api/token-estimate", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Please log in first." });
    const { apiId, text } = req.body || {};
    if (typeof apiId !== "string" || typeof text !== "string" || text.length > 30000) return res.status(400).json({ error: "A saved model and valid text are required for token estimation." });
    try {
        const key = await pool.query("SELECT provider,model FROM user_api_keys WHERE id=$1 AND user_id=$2", [apiId, String(req.user.id)]);
        if (!key.rows[0]) return res.status(404).json({ error: "Saved API key not found." });
        const estimate = estimateMessageTokens({ role: "assistant", content: text }, key.rows[0].provider, key.rows[0].model);
        if (!estimate) return res.status(422).json({ error: "Token estimation is unavailable for this model." });
        return res.json({ estimatedTokens: estimate.totalTokens, source: estimate.source });
    } catch (error) {
        console.error("Token estimation failed:", error.message);
        return res.status(500).json({ error: "Could not estimate tokens for this text." });
    }
});

app.post("/api/threads/:threadId/archive-original", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Please log in first." });
    const { messages, originalTitle } = req.body || {};
    if (!Array.isArray(messages) || messages.length > 1000 || !messages.every(message =>
        message && ["user", "assistant", "ai"].includes(message.role) && typeof message.content === "string" && message.content.length <= 50000 && [0, 1, 2, 3].includes(message.priority || 0)
    )) return res.status(400).json({ error: "Invalid original conversation messages." });
    try {
        const userId = String(req.user.id);
        const sourceThread = await getStoredThread(userId, req.params.threadId);
        if (!sourceThread) return res.status(404).json({ error: "The original conversation was not found on the server." });
        const title = `Original: ${String(originalTitle || sourceThread.title || "Conversation").replace(/^Original:\s*/i, "").trim().slice(0, 120)}`;
        const archive = await conversationRepository.createArchive(userId, req.params.threadId, title, sourceThread.messages);
        return res.json({ success: true, archive });
    } catch (error) {
        console.error("Original conversation archive failed:", error.message);
        return res.status(400).json({ error: error.message || "Could not archive the original conversation." });
    }
});

app.get("/api/archives", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Please log in first." });
    try {
        await importLegacyArchives(String(req.user.id));
        const archives = await conversationRepository.getArchives(String(req.user.id));
        return res.json({ archives });
    } catch (error) {
        console.error("Archive list load failed:", error.message);
        return res.status(400).json({ error: error.message || "Could not load archived conversations." });
    }
});

app.get("/api/archives/:archiveId", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Please log in first." });
    if (!/^archive_[a-zA-Z0-9_-]{1,120}$/.test(req.params.archiveId)) return res.status(400).json({ error: "Invalid archive ID." });
    try {
        const record = await conversationRepository.getArchive(String(req.user.id), req.params.archiveId);
        if (!record) return res.status(404).json({ error: "Archived conversation not found." });
        const messages = Array.isArray(record.messages) ? record.messages.map(message => ({ role: message.role, content: message.content })) : [];
        return res.json({ messages });
    } catch (error) {
        console.error("Archived conversation load failed:", error.message);
        return res.status(400).json({ error: error.message || "Could not load this archived conversation." });
    }
});

app.post("/api/archives/:archiveId/restore", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Please log in first." });
    if (!/^archive_[a-zA-Z0-9_-]{1,120}$/.test(req.params.archiveId)) return res.status(400).json({ error: "Invalid archive ID." });
    try {
        const newThreadId = `thread_${Date.now()}_${require("crypto").randomBytes(4).toString("hex")}`;
        const thread = await conversationRepository.restoreArchive(String(req.user.id), req.params.archiveId, newThreadId);
        if (!thread) return res.status(404).json({ error: "Archived conversation not found." });
        return res.json({ success: true, thread });
    } catch (error) {
        console.error("Archive restore failed:", error.message);
        return res.status(500).json({ error: "Could not restore this archived conversation." });
    }
});

app.put("/api/threads/:threadId/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Please log in first." });
    const { messages, title } = req.body || {};
    if (!Array.isArray(messages) || messages.length > 1000 || !messages.every(message =>
        message && ["user", "assistant", "ai"].includes(message.role) && typeof message.content === "string" && message.content.length <= 50000 && [0, 1, 2, 3].includes(message.priority || 0)
    )) return res.status(400).json({ error: "Invalid conversation messages." });
    try {
        const userId = String(req.user.id);
        const existing = await getStoredThread(userId, req.params.threadId);
        const count = await conversationRepository.setMessages(userId, req.params.threadId, messages, { title: typeof title === "string" && title.trim() ? title.trim().slice(0, 120) : existing?.title });
        return res.json({ success: true, messageCount: count });
    } catch (error) {
        const invalidInput = /Invalid conversation|empty update/i.test(error.message || "");
        return res.status(invalidInput ? 400 : 500).json({ error: invalidInput ? error.message : "Could not save the conversation to persistent storage." });
    }
});

/* ============================================
   UPDATE MESSAGE STAR PRIORITY
   ============================================ */

app.patch(
    "/api/threads/:threadId/messages/:messageId/priority",
    async (req, res) => {
        if (!req.isAuthenticated()) {
            return res.status(401).json({
                error: "Please log in first."
            });
        }

        const { priority } = req.body;

        if (![0, 1, 2, 3].includes(priority)) {
            return res.status(400).json({
                error: "Priority must be between 0 and 3."
            });
        }

        try {
            const userId = String(req.user.id);
            const thread = await getStoredThread(userId, req.params.threadId);
            if (!thread) return res.status(404).json({ error: "Conversation not found." });
            const message = await conversationRepository.updatePriority(userId, req.params.threadId, req.params.messageId, priority);

            return res.json({
                success: true,
                message
            });

        } catch (error) {
            const expected = /limit reached|Message not found|Conversation not found|Invalid conversation|Priority must follow/i.test(error.message || "");
            return res.status(expected ? 400 : 500).json({
                error: expected ? error.message : "Could not update the message priority in persistent storage."
            });
        }
    }
);

// List the signed-in user's saved API keys.
// Never return encrypted or decrypted key material here.


// app.get("/api/keys", async (req, res) => {

//     if (!req.isAuthenticated()) {
//         return res.status(401).json({
//             error: "Please log in first."
//         });
//     }

//     try {
//         const result = await pool.query(
//             `SELECT id, provider, label, model,
//                     created_at, updated_at
//              FROM user_api_keys
//              WHERE user_id = $1
//              ORDER BY created_at DESC`,
//             [String(req.user.id)]
//         );

//         return res.json({
//             keys: result.rows
//         });
//     } catch (error) {
//         console.error("API key list failed:", error);

//         return res.status(500).json({
//             error: "Could not load saved API keys."
//         });
//     }
// });

/* =========================================================
   DELETE INDIVIDUAL MESSAGE
========================================================= */
app.delete(
    "/api/threads/:threadId/messages/:messageId",
    async (req, res) => {
        if (!req.isAuthenticated()) {
            return res.status(401).json({
                error: "Please log in first."
            });
        }

        try {
            const userId = String(req.user.id);
            if (!await getStoredThread(userId, req.params.threadId)) return res.status(404).json({ error: "Conversation not found." });
            if (!await conversationRepository.deleteMessage(userId, req.params.threadId, req.params.messageId)) return res.status(404).json({ error: "Message not found." });

            return res.json({
                success: true,
                deleted: true
            });

        } catch (error) {
            console.error("Message deletion failed:", error.message);

            return res.status(400).json({
                error: error.message || "Could not delete message."
            });
        }
    }
);
/* ============================================
   LIST SAVED API KEYS
   ============================================ */

app.get("/api/keys", async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({
            error: "Please log in first."
        });
    }

    try {
        const result = await pool.query(
            `SELECT id, provider, label, model, endpoint,
             created_at, updated_at
             FROM user_api_keys
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [String(req.user.id)]
        );

        return res.json({ keys: result.rows });
    } catch (error) {
        console.error("API key list failed:", error.message);

        return res.status(500).json({
            error: "Could not load saved API keys."
        });
    }
});

/* ============================================
   REVEAL ONE SAVED API KEY
   ============================================ */

app.get("/api/keys/:id/reveal", async (req, res) => {
    res.set("Cache-Control", "no-store");

    if (!req.isAuthenticated()) {
        return res.status(401).json({
            error: "Please log in first."
        });
    }

    try {
        const result = await pool.query(
            `SELECT key_ciphertext, key_iv, key_auth_tag
             FROM user_api_keys
             WHERE id = $1 AND user_id = $2`,
            [
                req.params.id,
                String(req.user.id)
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Saved API key not found."
            });
        }

        const row = result.rows[0];

        const apiKey = decryptApiKey({
            ciphertext: row.key_ciphertext,
            iv: row.key_iv,
            authTag: row.key_auth_tag
        });

        return res.json({ apiKey });

    } catch (error) {
        // Never log the API key or decrypted response.
        if (error.code === "22P02") {
            return res.status(400).json({
                error: "Invalid API key record ID."
            });
        }

        console.error("API key reveal failed:", error.message);

        return res.status(500).json({
            error: "Could not reveal the saved API key."
        });
    }
});
/* ============================================
   SECURE AI CHAT ROUTE - MULTI-PROVIDER
   ============================================ */

const AI_PROVIDERS = {
    groq: "https://api.groq.com/openai/v1/chat/completions",
    openai: "https://api.openai.com/v1/chat/completions",
    google: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    openrouter: "https://openrouter.ai/api/v1/chat/completions",
    together: "https://api.together.xyz/v1/chat/completions",
    fireworks: "https://api.fireworks.ai/inference/v1/chat/completions",
    cerebras: "https://api.cerebras.ai/v1/chat/completions",
    mistral: "https://api.mistral.ai/v1/chat/completions",
    deepseek: "https://api.deepseek.com/v1/chat/completions"
};

app.post("/api/chat", async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({
            error: "Please log in first."
        });
    }

   const { apiId, messages, threadId, usageScope } = req.body;

if (usageScope != null && !["conversation", "pillar_generation"].includes(usageScope)) return res.status(400).json({ error: "Invalid usage scope." });
if (
    typeof apiId !== "string" ||
    !Array.isArray(messages) ||
    messages.length === 0 ||
    messages.length > 500
) {
    return res.status(400).json({
        error: "A valid API ID and conversation history are required."
    });
}

const validMessages = messages.every(message =>
    message &&
    ["user", "assistant"].includes(message.role) &&
    typeof message.content === "string" &&
    message.content.trim().length > 0 &&
    message.content.length <= 50000
);

if (threadId != null) {
    try { conversationRepository.validateThreadId(threadId); }
    catch { return res.status(400).json({ error: "Invalid conversation ID." }); }
}

if (!validMessages) {
    return res.status(400).json({
        error: "Conversation contains invalid messages."
    });
}

const totalCharacters = messages.reduce(
    (total, message) => total + message.content.length,
    0
);

if (totalCharacters > 200000) {
    return res.status(400).json({
        error: "Conversation is too large to process."
    });
}
    try {
        const result = await pool.query(
            `SELECT provider, model, endpoint,
                    key_ciphertext, key_iv, key_auth_tag
             FROM user_api_keys
             WHERE id = $1 AND user_id = $2`,
            [apiId, String(req.user.id)]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Saved API key not found."
            });
        }

        const savedApi = result.rows[0];
        const provider = String(savedApi.provider || "")
            .trim()
            .toLowerCase();

        const model = typeof savedApi.model === "string"
            ? savedApi.model.trim()
            : "";

        if (!model || model.length > 200) {
            return res.status(400).json({
                error: "Please configure a valid model ID for this API key."
            });
        }
        const estimatedInputTokens =
    estimateConversationTokens(messages, provider, model);
    const contextBudget =
    calculateContextBudget(messages, provider, model);
    
    const messageTokenEstimates = messages.map((message, index) => {
    const estimate = estimateMessageTokens(
        message,
        provider,
        model
    );

    return {
        messageIndex: index,
        role: message.role,
        estimatedTokens: estimate?.totalTokens ?? null,
        source: estimate?.source ?? "unavailable"
    };
});

        const apiKey = decryptApiKey({
            ciphertext: savedApi.key_ciphertext,
            iv: savedApi.key_iv,
            authTag: savedApi.key_auth_tag
        });

        if (!apiKey) {
            return res.status(500).json({
                error: "Could not access the saved API key."
            });
        }

        let targetUrl;
        let headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        };
        let body;

        if (provider === "anthropic") {
            targetUrl = "https://api.anthropic.com/v1/messages";

            headers["x-api-key"] = apiKey;
            headers["anthropic-version"] = "2023-06-01";

            body = {
                model,
                max_tokens: 4000,
               messages: messages.map(message => ({
                    role: message.role,
                    content: message.content
                }))
            };
        } else if (provider === "custom") {
            if (
                typeof savedApi.endpoint !== "string" ||
                !savedApi.endpoint.trim()
            ) {
                return res.status(400).json({
                    error: "Custom endpoint URL is missing."
                });
            }

            let parsedUrl;

            try {
                parsedUrl = new URL(savedApi.endpoint.trim());
            } catch {
                return res.status(400).json({
                    error: "Invalid custom endpoint URL."
                });
            }

            if (
                parsedUrl.protocol !== "https:" ||
                parsedUrl.username ||
                parsedUrl.password ||
                parsedUrl.hostname === "localhost" ||
                parsedUrl.hostname.endsWith(".localhost") ||
                parsedUrl.hostname.endsWith(".local") ||
                parsedUrl.hostname === "127.0.0.1" ||
                parsedUrl.hostname === "::1" ||
                parsedUrl.hostname.startsWith("10.") ||
                parsedUrl.hostname.startsWith("192.168.") ||
                parsedUrl.hostname.startsWith("169.254.")
            ) {
                return res.status(400).json({
                    error: "This custom endpoint URL is not allowed."
                });
            }

            targetUrl = parsedUrl.toString();

            headers["Authorization"] = `Bearer ${apiKey}`;

            body = {
                model,
               messages: messages.map(message => ({
                role: message.role,
                content: message.content
            }))
            };
        }  else {
    targetUrl = AI_PROVIDERS[provider];

    if (!targetUrl) {
        return res.status(400).json({
            error: "Selected provider is not supported."
        });
    }

    headers["Authorization"] = `Bearer ${apiKey}`;

    body = {
        model,
        messages: messages.map(message => ({
            role: message.role,
            content: message.content
        }))
    };

    if (
        provider === "groq" &&
        model === "openai/gpt-oss-20b"
    ) {
        body.max_completion_tokens = 4096;
    }
}

        const upstream = await fetch(targetUrl, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(60000),
            redirect: "error"
        });

        const data = await upstream.json().catch(() => null);

        if (!upstream.ok) {
            console.error("AI provider request failed:", {
                provider,
                status: upstream.status
            });

            return res.status(502).json({
                error: data?.error?.message ||
                    data?.message ||
                    `Provider request failed (${upstream.status}).`
            });
        }

        let reply;

        if (provider === "anthropic") {
            reply = data?.content
                ?.filter(item => item.type === "text")
                .map(item => item.text)
                .join("\n");
        } else {
            reply = data?.choices?.[0]?.message?.content;
        }

        if (typeof reply !== "string" || !reply.trim()) {
            return res.status(502).json({
                error: "The provider returned an empty or unsupported response."
            });
        }
        
        const actualUsage = normalizeUsage(data?.usage, provider);
if (
    actualUsage &&
    Number.isFinite(estimatedInputTokens) &&
    Number.isFinite(actualUsage.inputTokens) &&
    usageScope !== "pillar_generation"
) {
    recordUsageCalibration(
        estimatedInputTokens,
        actualUsage.inputTokens,
        provider,
        model
    );
}

const calibratedInputEstimate =
    getCalibratedInputEstimate(
        estimatedInputTokens,
        provider,
        model
    );
const usagePayload = {
    estimatedInputTokens,
    messageTokenEstimates,
    calibratedInputEstimate,
    contextBudget,
    actualInputTokens: actualUsage?.inputTokens ?? null,
    actualOutputTokens: actualUsage?.outputTokens ?? null,
    actualTotalTokens: actualUsage?.totalTokens ?? null,
    source: actualUsage ? "provider" : "estimated",
    provider,
    model
};
if (threadId && usageScope !== "pillar_generation") {
    try { await conversationRepository.saveUsage(String(req.user.id), threadId, usagePayload); }
    catch (error) { console.error("Conversation token usage could not be saved:", error.message); }
}
return res.json({
    reply: reply.trim(),
    usage: usagePayload,

    model: data.model || model
});

       

    } catch (error) {
        console.error("AI chat request failed:", error.message);

        if (
            error.name === "TimeoutError" ||
            error.name === "AbortError"
        ) {
            return res.status(504).json({
                error: "The model request timed out."
            });
        }

        return res.status(500).json({
            error: "Could not complete the AI request."
        });
    }

});

/* ============================================
   UPDATE A SAVED API KEY
   ============================================ */

app.put("/api/keys/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({
            error: "Please log in first."
        });
    }

    const { provider, label, model, apiKey, endpoint } = req.body;

    if (
        typeof provider !== "string" ||
        !provider.trim() ||
        typeof label !== "string" ||
        !label.trim()
    ) {
        return res.status(400).json({
            error: "Provider and label are required."
        });
    }

    if (
        provider.length > 100 ||
        label.length > 100 ||
        (
    typeof model !== "string" ||
    !model.trim() ||
    model.length > 200
) ||
            (
        endpoint != null &&
        (typeof endpoint !== "string" || endpoint.length > 2000)
    ) ||
        (
            apiKey != null &&
            (typeof apiKey !== "string" || apiKey.length > 10000)
        )
    ) {

        return res.status(400).json({
            error: "One or more fields are invalid."
        });
    }

    try {
        // Verify ownership before updating anything.
        const existing = await pool.query(
            `SELECT id
             FROM user_api_keys
             WHERE id = $1 AND user_id = $2`,
            [req.params.id, String(req.user.id)]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({
                error: "Saved API key not found."
            });
        }

        let result;

        // Only replace encrypted key material if a new key was supplied.
        if (typeof apiKey === "string" && apiKey.trim()) {
            const encrypted = encryptApiKey(apiKey);

           result = await pool.query(
    `UPDATE user_api_keys
     SET provider = $1,
         label = $2,
         model = $3,
         endpoint = $4,
         key_ciphertext = $5,
         key_iv = $6,
         key_auth_tag = $7,
         updated_at = NOW()
     WHERE id = $8 AND user_id = $9
     RETURNING id, provider, label, model, endpoint,
               created_at, updated_at`,
    [
        provider.trim(),
        label.trim(),
        model?.trim() || null,
        endpoint?.trim() || null,
        encrypted.ciphertext,
        encrypted.iv,
        encrypted.authTag,
        req.params.id,
        String(req.user.id)
    ]
);
        } else {
           result = await pool.query(
    `UPDATE user_api_keys
     SET provider = $1,
         label = $2,
         model = $3,
         endpoint = $4,
         updated_at = NOW()
     WHERE id = $5 AND user_id = $6
     RETURNING id, provider, label, model, endpoint,
               created_at, updated_at`,
    [
        provider.trim(),
        label.trim(),
        model?.trim() || null,
        endpoint?.trim() || null,
        req.params.id,
        String(req.user.id)
    ]
);
        }

        return res.json({
            success: true,
            key: result.rows[0]
        });
    } catch (error) {
        if (error.code === "22P02") {
            return res.status(400).json({
                error: "Invalid API key record ID."
            });
        }

        console.error("API key update failed:", error.message);

        return res.status(500).json({
            error: "Could not update the API key."
        });
    }
});

/* ============================================
   DELETE SAVED API KEYS
   ============================================ */

// Keep your existing app.delete("/api/keys/:id", ...)
// route below the chat route.
app.delete("/api/keys/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({
            error: "Please log in first."
        });
    }

    try {
        const result = await pool.query(
            `DELETE FROM user_api_keys
             WHERE id = $1 AND user_id = $2
             RETURNING id`,
            [
                req.params.id,
                String(req.user.id)
            ]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                error: "API key not found."
            });
        }

        return res.json({
            success: true
        });
    } catch (error) {
        if (error.code === "22P02") {
            return res.status(400).json({
                error: "Invalid API key record ID."
            });
        }

        console.error("API key delete failed:", error.message);

        return res.status(500).json({
            error: "Could not delete the API key."
        });
    }
});
//x-x-x-x-x-x-x-x-xx-x-x-x-x-x-x-x-x-x-xx-xx-x-x-x
app.post("/api/conversations", async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({
            error: "Please log in first."
        });
    }

    const { conversationId } = req.body;

    try {
        conversationRepository.validateThreadId(conversationId);
        await conversationRepository.ensureThread(String(req.user.id), conversationId);

        return res.status(201).json({
            success: true,
            conversationId,
            message: "Conversation folder is ready."
        });
    } catch (error) {
        console.error("Conversation folder error:", error);

        return res.status(400).json({
            error: error.message
        });
    }
});
app.post("/api/conversations/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({
            error: "Please log in first."
        });
    }
    const { conversationId, role, content } = req.body;
    try {
        const userId = String(req.user.id);
        const result = await conversationRepository.appendMessage(userId, conversationId, role, content);
        return res.status(200).json({
            success: true,
            saved: true,
            message: result
        });
    } catch (error) {
        console.error("Message storage error:", error);
        return res.status(400).json({
            error: error.message
        });
    }
});
// ============================================
// STATIC FILES
// ============================================
app.use(
    express.static(path.join(__dirname, "public"), {
        index: false
    })
);
// ============================================
// LOGIN PAGE
// ============================================
app.get("/login", (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect("/");
    }
    res.sendFile(path.join(__dirname, "login.html"));
});
// ============================================
// HOME PAGE
// ============================================
app.get("/", (req, res) => {

    res.sendFile(path.join(__dirname, "index.html"));
});
// ============================================
// START GOOGLE LOGIN
// ============================================
app.get(
    "/auth/google",
    passport.authenticate("google", {
        scope: ["profile", "email"]
    })
);
// ============================================
// GOOGLE CALLBACK
// ============================================
app.get(
    "/auth/google/callback",
    passport.authenticate("google", {
        failureRedirect: "/login"
    }),
    (req, res) => {
        res.redirect("/");
    }
);
// ============================================
// CHECK CURRENT USER
// ============================================
app.get("/auth/me", (req, res) => {
    if (!req.isAuthenticated()) {
        return res.json({
            authenticated: false
        });
    }
    res.json({
        authenticated: true,
        user: req.user
    });
});
// ============================================
// LOGOUT
// ============================================
app.get("/auth/logout", (req, res) => {
    req.logout((error) => {
        if (error) {
            console.error("Logout error:", error);
            return res.status(500).json({
                error: "Logout failed"
            });
        }
        req.session.destroy(() => {
            res.redirect("/");
        });
    });
});
// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
    console.log(`Cloud AI server running at http://localhost:${PORT}`);
});
