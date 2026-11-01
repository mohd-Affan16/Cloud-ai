//x-x-x-x-x-x-xx--x-x-x-x-x-x-x-x-x-x-x--x-x-x-x-x-x-x--xx-x-x-xx--x-x-x-x--x-x-x-x-x-x-x--x-x-x-x-x-x-x-x-x--xx--x-x--x-x-x-x-x-x
require("dotenv").config();

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
app.use(express.json());

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

    const { apiId, message } = req.body;

    if (
        typeof apiId !== "string" ||
        typeof message !== "string" ||
        !message.trim()
    ) {
        return res.status(400).json({
            error: "An API ID and message are required."
        });
    }

    if (message.length > 50000) {
        return res.status(400).json({
            error: "Message is too long."
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
                messages: [
                    {
                        role: "user",
                        content: message.trim()
                    }
                ]
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
                messages: [
                    {
                        role: "user",
                        content: message.trim()
                    }
                ]
            };
        } else {
            targetUrl = AI_PROVIDERS[provider];

            if (!targetUrl) {
                return res.status(400).json({
                    error: "Selected provider is not supported."
                });
            }

            headers["Authorization"] = `Bearer ${apiKey}`;

            body = {
                model,
                messages: [
                    {
                        role: "user",
                        content: message.trim()
                    }
                ]
            };
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

        return res.json({
            reply: reply.trim()
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
