// ============================================
// CLOUD AI - EXPRESS SERVER
// GOOGLE OAUTH BACKEND
// ============================================

require("dotenv").config();

const express = require("express");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const path = require("path");


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

                email:
                    profile.emails?.[0]?.value || null,

                picture:
                    profile.photos?.[0]?.value || null
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
// STATIC FILES
// ============================================

app.use(
    express.static(__dirname, {
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


    res.sendFile(
        path.join(__dirname, "login.html")
    );

});


// ============================================
// HOME PAGE
// ============================================

app.get("/", (req, res) => {

    if (!req.isAuthenticated()) {

        return res.redirect("/login");

    }


    res.sendFile(
        path.join(__dirname, "index.html")
    );

});


// ============================================
// START GOOGLE LOGIN
// ============================================

app.get(
    "/auth/google",

    passport.authenticate(
        "google",
        {
            scope: [
                "profile",
                "email"
            ]
        }
    )
);


// ============================================
// GOOGLE CALLBACK
// ============================================

app.get(
    "/auth/google/callback",

    passport.authenticate(
        "google",
        {
            failureRedirect: "/login"
        }
    ),

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

            console.error(
                "Logout error:",
                error
            );

            return res.status(500).json({
                error: "Logout failed"
            });

        }


        req.session.destroy(() => {

            res.redirect("/login");

        });

    });

});


// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {

    console.log(
        `Cloud AI server running at http://localhost:${PORT}`
    );

});