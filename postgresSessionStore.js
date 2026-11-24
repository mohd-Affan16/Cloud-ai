"use strict";

const session = require("express-session");

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

class NeonSessionStore extends session.Store {
    constructor(pool, options = {}) {
        super();

        if (!pool || typeof pool.query !== "function") {
            throw new TypeError("A database pool with a query method is required.");
        }

        this.pool = pool;
        this.tableName = options.tableName || "cloud_ai_sessions";
        this.ttlMs = Number.isFinite(options.ttlMs) && options.ttlMs > 0
            ? options.ttlMs
            : DEFAULT_TTL_MS;

        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(this.tableName)) {
            throw new TypeError("Invalid session table name.");
        }

        this.ready = null;
    }

    ensureTable() {
        if (!this.ready) {
            this.ready = (async () => {
                await this.pool.query(`
                    CREATE TABLE IF NOT EXISTS ${this.tableName} (
                        sid TEXT PRIMARY KEY,
                        sess JSONB NOT NULL,
                        expire TIMESTAMPTZ NOT NULL
                    )
                `);
                await this.pool.query(`
                    CREATE INDEX IF NOT EXISTS idx_${this.tableName}_expire
                    ON ${this.tableName} (expire)
                `);
            })().catch((error) => {
                this.ready = null;
                throw error;
            });
        }

        return this.ready;
    }

    getExpiry(sess) {
        const cookieExpiry = sess?.cookie?.expires
            ? new Date(sess.cookie.expires)
            : null;

        if (cookieExpiry && Number.isFinite(cookieExpiry.getTime())) {
            return cookieExpiry;
        }

        return new Date(Date.now() + this.ttlMs);
    }

    get(sid, callback) {
        this.ensureTable()
            .then(() => this.pool.query(
                `SELECT sess
                 FROM ${this.tableName}
                 WHERE sid = $1 AND expire > NOW()
                 LIMIT 1`,
                [sid]
            ))
            .then((result) => {
                const stored = result.rows?.[0]?.sess ?? null;
                const value = typeof stored === "string"
                    ? JSON.parse(stored)
                    : stored;
                callback(null, value);
            })
            .catch(callback);
    }

    set(sid, sess, callback = () => {}) {
        this.ensureTable()
            .then(() => this.pool.query(
                `INSERT INTO ${this.tableName} (sid, sess, expire)
                 VALUES ($1, $2::jsonb, $3)
                 ON CONFLICT (sid)
                 DO UPDATE SET sess = EXCLUDED.sess, expire = EXCLUDED.expire`,
                [sid, JSON.stringify(sess), this.getExpiry(sess)]
            ))
            .then(() => callback(null))
            .catch(callback);
    }

    touch(sid, sess, callback = () => {}) {
        this.ensureTable()
            .then(() => this.pool.query(
                `UPDATE ${this.tableName}
                 SET expire = $2
                 WHERE sid = $1`,
                [sid, this.getExpiry(sess)]
            ))
            .then(() => callback(null))
            .catch(callback);
    }

    destroy(sid, callback = () => {}) {
        this.ensureTable()
            .then(() => this.pool.query(
                `DELETE FROM ${this.tableName} WHERE sid = $1`,
                [sid]
            ))
            .then(() => callback(null))
            .catch(callback);
    }
}

module.exports = NeonSessionStore;
