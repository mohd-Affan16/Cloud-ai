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

    const { provider, label, model, apiKey } = req.body;

    if (
        typeof provider !== "string" ||
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
        (model != null &&
            (typeof model !== "string" || model.length > 200))
    ) {
        return res.status(400).json({
            error: "One or more fields are too long or invalid."
        });
    }

    try {

        const encrypted = encryptApiKey(apiKey);

        const result = await pool.query(
            `INSERT INTO user_api_keys
                (user_id, provider, label, model,
                 key_ciphertext, key_iv, key_auth_tag)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, provider, label, model,
                       created_at, updated_at`,
            [
                String(req.user.id),
                provider.trim(),
                label.trim(),
                model?.trim() || null,
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
            `SELECT id, provider, label, model,
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
   SECURE AI CHAT ROUTE
   ============================================ */

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

    // Provider URLs are controlled by the server.
    const providerEndpoints = {
        groq: "https://api.groq.com/openai/v1/chat/completions",
        huggingface: "https://router.huggingface.co/v1/chat/completions",
        openai: "https://api.openai.com/v1/chat/completions"
    };

    try {
        // Retrieve only this user's API record.
        const result = await pool.query(
            `SELECT provider, model,
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
//x-x-x-x-x-x-xx--x-x-x-x-x-x-x-x-x-x-x--x-x-x-x-x-x-x--xx-x-x-xx--x-x-x-x--x-x-x-x-x-x-x--x-x-x-x-x-x-x-x-x--xx--x-x--x-x-x-x-x-x
        // const endpoint = providerEndpoints[savedApi.provider];

        // if (!endpoint) {
        //     return res.status(400).json({
        //         error: "Unsupported API provider."
        //     });
        // }

const provider = String(savedApi.provider || "")
    .trim()
    .toLowerCase();

const endpoint = providerEndpoints[provider];

if (!endpoint) {
    console.error("Unsupported saved provider:", savedApi.provider);
    return res.status(400).json({
        error: `Unsupported API provider: ${savedApi.provider || "(empty)"}.`
    });
}
//x-x-x-x-x-x-xx--x-x-x-x-x-x-x-x-x-x-x--x-x-x-x-x-x-x--xx-x-x-xx--x-x-x-x--x-x-x-x-x-x-x--x-x-x-x-x-x-x-x-x--xx--x-x--x-x-x-x-x-x by leader oct  17

        // Decrypt only on the server.
        const apiKey = decryptApiKey({
            ciphertext: savedApi.key_ciphertext,
            iv: savedApi.key_iv,
            authTag: savedApi.key_auth_tag
        });


        const models = {
            groq: "openai/gpt-oss-20b",
            huggingface: "openai/gpt-oss-120b:fastest",
            openai: "gpt-4o-mini"
        };
//x-x-x-x-x-x-xx--x-x-x-x-x-x-x-x-x-x-x--x-x-x-x-x-x-x--xx-x-x-xx--x-x-x-x--x-x-x-x-x-x-x--x-x-x-x-x-x-x-x-x--xx--x-x--x-x-x-x-x-x
        // const model = savedApi.model || models[savedApi.provider];
        const model = savedApi.model || models[provider];
//x-x-x-x-x-x-xx--x-x-x-x-x-x-x-x-x-x-x--x-x-x-x-x-x-x--xx-x-x-xx--x-x-x-x--x-x-x-x-x-x-x--x-x-x-x-x-x-x-x-x--xx--x-x--x-x-x-x-x-x by leader oct 17
        const upstream = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages: [
                    {
                        role: "user",
                        content: message.trim()
                    }
                ]
            }),
            signal: AbortSignal.timeout(60000)
        });

        const data = await upstream.json().catch(() => null);

        if (!upstream.ok) {
            console.error("AI provider returned status:", upstream.status);

            return res.status(502).json({
                error: data?.error?.message ||
                    "The AI provider could not complete the request."
            });
        }

        const reply = data?.choices?.[0]?.message?.content;

        if (typeof reply !== "string" || !reply.trim()) {
            return res.status(502).json({
                error: "The AI provider returned an empty response."
            });
        }

        // Never send the API key back to the browser.
        return res.json({ reply });

    } catch (error) {
        console.error("Secure chat request failed:", error.message);

        return res.status(500).json({
            error: "The chat request failed. Please try again."
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
