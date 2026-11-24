const test = require("node:test");
const assert = require("node:assert/strict");
const pool = require("../db");
const repository = require("../conversationRepository");

function message(id, priority = 0) {
    return { message_id: id, role: "user", content: id, priority, timestamp: "2026-11-24T10:00:00.000Z" };
}

function setup(messages, options = {}) {
    const state = { messages: structuredClone(messages), began: false, locked: false, committed: false, rolledBack: false, released: false, updateCount: 0 };
    pool.query = async sql => {
        if (sql.startsWith("CREATE TABLE") || sql.startsWith("CREATE INDEX")) return { rows: [], rowCount: 0 };
        throw new Error("Unexpected pool query: " + sql);
    };
    pool.connect = async () => ({
        async query(sql, params = []) {
            if (sql === "BEGIN") { state.began = true; return { rows: [], rowCount: 0 }; }
            if (sql === "COMMIT") { state.committed = true; return { rows: [], rowCount: 0 }; }
            if (sql === "ROLLBACK") { state.rolledBack = true; return { rows: [], rowCount: 0 }; }
            if (sql.includes("SELECT * FROM conversation_threads") && sql.includes("FOR UPDATE")) {
                state.locked = true;
                return options.missingThread ? { rows: [], rowCount: 0 } : {
                    rows: [{ thread_id: "thread_test", title: "Test", messages: state.messages, compression: null, archived: false }],
                    rowCount: 1
                };
            }
            if (sql.includes("UPDATE conversation_threads SET messages=")) {
                state.updateCount++;
                state.messages = JSON.parse(params[2]);
                return { rows: [{ messages: state.messages }], rowCount: 1 };
            }
            throw new Error("Unexpected client query: " + sql);
        },
        release() { state.released = true; }
    });
    return state;
}

test("Star priority update locks the conversation and commits the updated message list", async () => {
    const state = setup([message("m1")]);
    const updated = await repository.updatePriority("user-a", "thread_test", "m1", 1);

    assert.equal(state.began, true);
    assert.equal(state.locked, true);
    assert.equal(state.updateCount, 1);
    assert.equal(state.committed, true);
    assert.equal(state.rolledBack, false);
    assert.equal(state.released, true);
    assert.equal(updated.priority, 1);
    assert.equal(state.messages[0].priority, 1);
});

test("Star priority limit is checked inside the transaction and rolls back without updating", async () => {
    const messages = Array.from({ length: 10 }, (_, i) => message("star-" + i, 1));
    messages.push(message("target", 0));
    const state = setup(messages);

    await assert.rejects(
        repository.updatePriority("user-a", "thread_test", "target", 1),
        /Priority 1 limit reached/
    );

    assert.equal(state.locked, true);
    assert.equal(state.updateCount, 0);
    assert.equal(state.committed, false);
    assert.equal(state.rolledBack, true);
    assert.equal(state.released, true);
});

test("Star priority update rolls back when the conversation does not exist", async () => {
    const state = setup([], { missingThread: true });

    await assert.rejects(
        repository.updatePriority("user-a", "thread_test", "missing", 1),
        /Conversation not found/
    );

    assert.equal(state.locked, true);
    assert.equal(state.updateCount, 0);
    assert.equal(state.committed, false);
    assert.equal(state.rolledBack, true);
    assert.equal(state.released, true);
});
