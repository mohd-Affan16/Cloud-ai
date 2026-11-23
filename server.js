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
const { getConversationDirectory } = require("./conversationstorage.js");
const { appendMessage } = require("./conversationstorage.js");
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

function getAuthenticatedThreadFile(userId, threadId, create = false) {
    if (typeof threadId !== "string" || !/^thread_[a-zA-Z0-9_-]{1,100}$/.test(threadId)) {
        throw new Error("Invalid conversation ID.");
    }
    const userDirectory = path.resolve(__dirname, "conversations", `user_${String(userId).replace(/[^a-zA-Z0-9_-]/g, "_")}`);
    const threadDirectory = path.resolve(userDirectory, threadId);
    if (!threadDirectory.startsWith(userDirectory + path.sep)) throw new Error("Invalid conversation path.");
    if (create) fs.mkdirSync(threadDirectory, { recursive: true });
    return { threadDirectory, filePath: path.join(threadDirectory, "conversation.jsonl") };
}

function getAuthenticatedArchiveDirectory(userId, create = false) {
    const userDirectory = path.resolve(__dirname, "conversations", `user_${String(userId).replace(/[^a-zA-Z0-9_-]/g, "_")}`);
    const archiveDirectory = path.resolve(userDirectory, "archives");
    if (!archiveDirectory.startsWith(userDirectory + path.sep)) throw new Error("Invalid archive path.");
    if (create) fs.mkdirSync(archiveDirectory, { recursive: true });
    return archiveDirectory;
}

function readAuthenticatedThread(userId, threadId) {
    const { filePath } = getAuthenticatedThreadFile(userId, threadId);
    if (!fs.existsSync(filePath)) return null;
    const messages = fs.readFileSync(filePath, "utf8").split(/\r?\n/).filter(Boolean).map((line, index) => {
        const record = JSON.parse(line);
        return {
            message_id: record.message_id || `${threadId}_${index}`,
            role: record.role,
            content: record.content,
            priority: Number.isInteger(record.priority) ? record.priority : 0,
            timestamp: record.timestamp || null
        };
    });
    const metadataPath = path.join(path.dirname(filePath), "metadata.json");
    const metadata = fs.existsSync(metadataPath) ? JSON.parse(fs.readFileSync(metadataPath, "utf8")) : {};
    return { id: threadId, title: metadata.title || threadId, messages, archived: metadata.archived === true };
}

function appendAuthenticatedThreadMessage(userId, threadId, role, content) {
    const { filePath } = getAuthenticatedThreadFile(userId, threadId, true);
    const existingMessages = readAuthenticatedThread(userId, threadId)?.messages || [];
    const record = {
        message_id: `${threadId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        role,
        content,
        priority: 0,
        timestamp: new Date().toISOString()
    };
    fs.appendFileSync(filePath, JSON.stringify(record) + "\n", "utf8");
    return record;
}

function updateAuthenticatedMessagePriority(userId, threadId, messageId, priority) {
    const { filePath } = getAuthenticatedThreadFile(userId, threadId);
    if (!fs.existsSync(filePath)) throw new Error("Conversation not found.");
    const records = fs.readFileSync(filePath, "utf8").split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
    const record = records.find(item => item.message_id === messageId);
    if (!record) throw new Error("Message not found.");
    const previousPriority = Number.isInteger(record.priority) ? record.priority : 0;
    const counts = records.reduce((result, item) => {
        const value = Number.isInteger(item.priority) ? item.priority : 0;
        result[value] = (result[value] || 0) + 1;
        return result;
    }, {});
    const caps = { 1: 10, 2: 7, 3: 3 };
    const totalStarred = records.filter(item => Number.isInteger(item.priority) && item.priority > 0).length;
    if (priority > 0 && priority !== previousPriority && ((counts[priority] || 0) >= caps[priority] || totalStarred >= 20)) {
        throw new Error(`Priority ${priority} limit reached for this conversation.`);
    }
    record.priority = priority;
    fs.writeFileSync(filePath, records.map(item => JSON.stringify(item)).join("\n") + "\n", "utf8");
    return record;
}

function writeAuthenticatedThreadMessages(userId, threadId, messages) {
    const { filePath } = getAuthenticatedThreadFile(userId, threadId, true);
    const records = messages.map((message, index) => ({
        message_id: message.message_id || `${threadId}_${index}`,
        role: message.role === "ai" ? "assistant" : message.role,
        content: String(message.content || ""),
        priority: Number.isInteger(message.priority) ? message.priority : 0,
        timestamp: message.timestamp || new Date().toISOString()
    }));
    const temporaryPath = `${filePath}.tmp`;
    fs.writeFileSync(temporaryPath, records.map(record => JSON.stringify(record)).join("\n") + (records.length ? "\n" : ""), "utf8");
    try {
        fs.renameSync(temporaryPath, filePath);
    } catch (error) {
        if (!fs.existsSync(filePath) || !["EPERM", "EEXIST"].includes(error.code)) throw error;
        fs.copyFileSync(temporaryPath, filePath);
        fs.unlinkSync(temporaryPath);
    }
    return records.length;
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

app.get("/api/threads/:threadId", (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({
            error: "Please log in first."
        });
    }

    try {
        const thread = readAuthenticatedThread(String(req.user.id), req.params.threadId);

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

app.patch("/api/threads/:threadId", (req, res) => {
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
        const thread = readAuthenticatedThread(String(req.user.id), req.params.threadId);

        if (!thread) {
            return res.status(404).json({
                error: "Conversation not found."
            });
        }

        const { threadDirectory } = getAuthenticatedThreadFile(String(req.user.id), req.params.threadId, true);
        fs.writeFileSync(path.join(threadDirectory, "metadata.json"), JSON.stringify({ title: title.trim(), archived: thread.archived }), "utf8");
        thread.title = title.trim();

        return res.json({
            success: true,
            thread
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

app.post("/api/threads/:threadId/archive", (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({
            error: "Please log in first."
        });
    }

    try {
        const { threadDirectory } = getAuthenticatedThreadFile(String(req.user.id), req.params.threadId);
        fs.writeFileSync(path.join(threadDirectory, "metadata.json"), JSON.stringify({ archived: true, archivedAt: Date.now() }), "utf8");

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

app.post("/api/threads/:threadId/restore", (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({
            error: "Please log in first."
        });
    }

    try {
        const { threadDirectory } = getAuthenticatedThreadFile(String(req.user.id), req.params.threadId);
        const metadataPath = path.join(threadDirectory, "metadata.json");
        if (fs.existsSync(metadataPath)) {
            const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
            delete metadata.archived;
            delete metadata.archivedAt;
            fs.writeFileSync(metadataPath, JSON.stringify(metadata), "utf8");
        }

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

app.delete("/api/threads/:threadId", (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({
            error: "Please log in first."
        });
    }

    try {
        const { threadDirectory } = getAuthenticatedThreadFile(String(req.user.id), req.params.threadId);
        if (fs.existsSync(threadDirectory)) fs.rmSync(threadDirectory, { recursive: true, force: true });

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

app.post("/api/threads/:threadId/messages", (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({
            error: "Please log in first."
        });
    }

    const { role, content } = req.body;

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
        const message = appendAuthenticatedThreadMessage(String(req.user.id), req.params.threadId, role, content);

        return res.status(201).json({
            success: true,
            message
        });

    } catch (error) {
        console.error("Message storage failed:", error.message);

        return res.status(400).json({
            error: error.message || "Could not save message."
        });
    }
});

app.put("/api/threads/:threadId/compression", (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Please log in first." });
    }
    const { summary, sourceTokenEstimate, compressedTokenEstimate, sourceMessageCount } = req.body || {};
    if (typeof summary !== "string" || !summary.trim() || summary.length > 30000 ||
        !Number.isFinite(sourceTokenEstimate) || !Number.isFinite(compressedTokenEstimate) ||
        compressedTokenEstimate >= sourceTokenEstimate || !Number.isInteger(sourceMessageCount) || sourceMessageCount < 1) {
        return res.status(400).json({ error: "A valid, smaller compression summary is required." });
    }
    try {
        const { threadDirectory } = getAuthenticatedThreadFile(String(req.user.id), req.params.threadId, true);
        const filePath = path.join(threadDirectory, "compression.json");
        const previous = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf8")) : {};
        const now = Date.now();
        if (previous.lastSuccessfulAt && now - previous.lastSuccessfulAt < 24 * 60 * 60 * 1000) {
            const retryAfterMs = 24 * 60 * 60 * 1000 - (now - previous.lastSuccessfulAt);
            return res.status(429).json({ error: "Manual compression is available after the 24-hour cooldown.", retryAfterMs });
        }
        const compression = { summary: summary.trim(), sourceTokenEstimate, compressedTokenEstimate, sourceMessageCount, lastSuccessfulAt: now };
        fs.writeFileSync(filePath, JSON.stringify(compression, null, 2), "utf8");
        return res.json({ success: true, compression });
    } catch (error) {
        console.error("Compression storage failed:", error.message);
        return res.status(400).json({ error: error.message || "Could not store compression summary." });
    }
});

app.get("/api/threads/:threadId/compression", (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Please log in first." });
    }
    try {
        const { filePath } = getAuthenticatedThreadFile(String(req.user.id), req.params.threadId);
        if (!fs.existsSync(filePath)) return res.json({ compression: null });
        return res.json({ compression: JSON.parse(fs.readFileSync(filePath, "utf8")) });
    } catch (error) {
        return res.status(400).json({ error: error.message || "Could not load compression summary." });
    }
});

app.post("/api/threads/:threadId/archive-original", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Please log in first." });
    const { messages, originalTitle } = req.body || {};
    if (!Array.isArray(messages) || messages.length > 1000 || !messages.every(message =>
        message && ["user", "assistant", "ai"].includes(message.role) && typeof message.content === "string" && message.content.length <= 50000 && [0, 1, 2, 3].includes(message.priority || 0)
    )) return res.status(400).json({ error: "Invalid original conversation messages." });
    try {
        const userId = String(req.user.id);
        const sourceThread = readAuthenticatedThread(userId, req.params.threadId);
        if (!sourceThread) return res.status(404).json({ error: "The original conversation was not found on the server." });
        const archiveDirectory = getAuthenticatedArchiveDirectory(userId, true);
        const archiveId = `archive_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const title = `Original: ${String(originalTitle || sourceThread.title || "Conversation").replace(/^Original:\s*/i, "").trim().slice(0, 120)}`;
        const archive = {
            id: archiveId,
            title,
            sourceThreadId: req.params.threadId,
            archivedAt: new Date().toISOString(),
            messages: messages.map(message => ({
                role: message.role === "ai" ? "assistant" : message.role,
                content: message.content,
                priority: Number.isInteger(message.priority) ? message.priority : 0,
                message_id: typeof message.message_id === "string" ? message.message_id : null,
                timestamp: message.timestamp || null
            }))
        };
        const filePath = path.join(archiveDirectory, `${archiveId}.json`);
        fs.writeFileSync(filePath, JSON.stringify(archive, null, 2), { encoding: "utf8", flag: "wx" });
        return res.json({ success: true, archive: { id: archive.id, title: archive.title, sourceThreadId: archive.sourceThreadId, archivedAt: archive.archivedAt, messageCount: archive.messages.length } });
    } catch (error) {
        console.error("Original conversation archive failed:", error.message);
        return res.status(400).json({ error: error.message || "Could not archive the original conversation." });
    }
});

app.get("/api/archives", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Please log in first." });
    try {
        const archiveDirectory = getAuthenticatedArchiveDirectory(String(req.user.id));
        if (!fs.existsSync(archiveDirectory)) return res.json({ archives: [] });
        const archives = fs.readdirSync(archiveDirectory)
            .filter(name => /^archive_[a-zA-Z0-9_-]+\.json$/.test(name))
            .map(name => {
                const record = JSON.parse(fs.readFileSync(path.join(archiveDirectory, name), "utf8"));
                return { id: record.id, title: record.title };
            })
            .sort((a, b) => String(b.archivedAt).localeCompare(String(a.archivedAt)));
        return res.json({ archives });
    } catch (error) {
        console.error("Archive list load failed:", error.message);
        return res.status(400).json({ error: error.message || "Could not load archived conversations." });
    }
});

app.get("/api/archives/:archiveId", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Please log in first." });
    if (!/^archive_[a-zA-Z0-9_-]{1,120}$/.test(req.params.archiveId)) return res.status(400).json({ error: "Invalid archive ID." });
    try {
        const filePath = path.join(getAuthenticatedArchiveDirectory(String(req.user.id)), `${req.params.archiveId}.json`);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Archived conversation not found." });
        const record = JSON.parse(fs.readFileSync(filePath, "utf8"));
        const messages = Array.isArray(record.messages) ? record.messages.map(message => ({ role: message.role, content: message.content })) : [];
        return res.json({ messages });
    } catch (error) {
        console.error("Archived conversation load failed:", error.message);
        return res.status(400).json({ error: error.message || "Could not load this archived conversation." });
    }
});

app.put("/api/threads/:threadId/messages", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Please log in first." });
    const { messages } = req.body || {};
    if (!Array.isArray(messages) || messages.length > 1000 || !messages.every(message =>
        message && ["user", "assistant", "ai"].includes(message.role) && typeof message.content === "string" && message.content.length <= 50000 && [0, 1, 2, 3].includes(message.priority || 0)
    )) return res.status(400).json({ error: "Invalid conversation messages." });
    try {
        const count = writeAuthenticatedThreadMessages(String(req.user.id), req.params.threadId, messages);
        return res.json({ success: true, messageCount: count });
    } catch (error) {
        return res.status(400).json({ error: error.message || "Could not save conversation." });
    }
});

/* ============================================
   UPDATE MESSAGE STAR PRIORITY
   ============================================ */

app.patch(
    "/api/threads/:threadId/messages/:messageId/priority",
    (req, res) => {
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
            const message = updateAuthenticatedMessagePriority(String(req.user.id), req.params.threadId, req.params.messageId, priority);

            return res.json({
                success: true,
                message
            });

        } catch (error) {
            return res.status(400).json({
                error: error.message || "Could not update message priority."
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
    (req, res) => {
        if (!req.isAuthenticated()) {
            return res.status(401).json({
                error: "Please log in first."
            });
        }

        try {
            const { filePath } = getAuthenticatedThreadFile(String(req.user.id), req.params.threadId);
            if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Conversation not found." });
            const records = fs.readFileSync(filePath, "utf8").split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
            const nextRecords = records.filter(record => record.message_id !== req.params.messageId);
            if (nextRecords.length === records.length) return res.status(404).json({ error: "Message not found." });
            fs.writeFileSync(filePath, nextRecords.map(record => JSON.stringify(record)).join("\n") + (nextRecords.length ? "\n" : ""), "utf8");

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

   const { apiId, messages } = req.body;

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
    Number.isFinite(actualUsage.inputTokens)
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
return res.json({
    reply: reply.trim(),

  usage: {
    estimatedInputTokens,
    messageTokenEstimates,
    calibratedInputEstimate,
    contextBudget,
    actualInputTokens: actualUsage?.inputTokens ?? null,
    actualOutputTokens: actualUsage?.outputTokens ?? null,
    actualTotalTokens: actualUsage?.totalTokens ?? null,
    source: actualUsage ? "provider" : "unavailable"
},

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
app.post("/api/conversations", (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({
            error: "Please log in first."
        });
    }

    const { conversationId } = req.body;

    try {
        getConversationDirectory(String(req.user.id), conversationId);

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
app.post("/api/conversations/messages", (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({
            error: "Please log in first."
        });
    }
    const { conversationId, role, content } = req.body;
    try {
        const result = appendMessage(
            String(req.user.id),
            conversationId,
            role,
            content
        );
        return res.status(200).json({
            success: true,
            ...result
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
