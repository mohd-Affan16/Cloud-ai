"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const NeonSessionStore = require("../postgresSessionStore");

function createFakePool() {
    const records = new Map();
    const statements = [];
    return {
        records,
        statements,
        async query(sql, params = []) {
            statements.push(sql);
            if (sql.includes("INSERT INTO cloud_ai_sessions")) {
                records.set(params[0], {
                    sess: JSON.parse(params[1]),
                    expire: new Date(params[2])
                });
                return { rows: [], rowCount: 1 };
            }
            if (sql.includes("SELECT sess")) {
                const record = records.get(params[0]);
                if (!record || record.expire <= new Date()) {
                    return { rows: [], rowCount: 0 };
                }
                return { rows: [{ sess: record.sess }], rowCount: 1 };
            }
            if (sql.includes("UPDATE cloud_ai_sessions")) {
                const record = records.get(params[0]);
                if (record) record.expire = new Date(params[1]);
                return { rows: [], rowCount: record ? 1 : 0 };
            }
            if (sql.includes("DELETE FROM cloud_ai_sessions")) {
                const deleted = records.delete(params[0]);
                return { rows: [], rowCount: deleted ? 1 : 0 };
            }
            if (sql.includes("CREATE TABLE") || sql.includes("CREATE INDEX")) {
                return { rows: [], rowCount: 0 };
            }
            throw new Error("Unexpected SQL in test: " + sql);
        }
    };
}

function callStore(store, method, ...args) {
    return new Promise((resolve, reject) => {
        store[method](...args, (error, value) => {
            if (error) reject(error);
            else resolve(value);
        });
    });
}

test("Neon session store persists and retrieves a session", async () => {
    const pool = createFakePool();
    const store = new NeonSessionStore(pool);
    const value = { passport: { user: { id: "google-user-1" } }, cookie: { expires: new Date(Date.now() + 60000).toISOString() } };

    await callStore(store, "set", "session-1", value);
    const loaded = await callStore(store, "get", "session-1");

    assert.deepEqual(loaded, value);
    assert.equal(pool.records.size, 1);
    assert.equal(pool.statements.filter(sql => sql.includes("CREATE TABLE")).length, 1);
    assert.equal(pool.statements.filter(sql => sql.includes("CREATE INDEX")).length, 1);
});

test("Neon session store refreshes expiry without replacing session data", async () => {
    const pool = createFakePool();
    const store = new NeonSessionStore(pool);
    const value = { user: "kept", cookie: { expires: new Date(Date.now() + 60000).toISOString() } };

    await callStore(store, "set", "session-2", value);
    const before = pool.records.get("session-2").expire;
    await callStore(store, "touch", "session-2", {
        ...value,
        cookie: { expires: new Date(Date.now() + 120000).toISOString() }
    });

    assert.deepEqual(pool.records.get("session-2").sess, value);
    assert.ok(pool.records.get("session-2").expire > before);
});

test("Neon session store removes destroyed and expired sessions", async () => {
    const pool = createFakePool();
    const store = new NeonSessionStore(pool);

    await callStore(store, "set", "session-3", {
        user: "temporary",
        cookie: { expires: new Date(Date.now() - 1000).toISOString() }
    });
    assert.equal(await callStore(store, "get", "session-3"), null);

    await callStore(store, "set", "session-4", { user: "delete-me" });
    await callStore(store, "destroy", "session-4");
    assert.equal(await callStore(store, "get", "session-4"), null);
});

test("Neon session store rejects unsafe table names", () => {
    assert.throws(
        () => new NeonSessionStore(createFakePool(), { tableName: "sessions; DROP TABLE users" }),
        /Invalid session table name/
    );
});
