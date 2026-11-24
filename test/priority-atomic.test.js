const test = require("node:test");
const assert = require("node:assert/strict");
const pool = require("../db");
const repository = require("../conversationRepository");

function message(id, priority = 0) {
    return { message_id: id, role: "user", content: id, priority };
}

function setup(messages, options = {}) {
    const state = { messages: structuredClone(messages), updateSql: "", updateParams: null, updateCount: 0 };
    pool.query = async (sql, params = []) => {
        if (sql.startsWith("CREATE TABLE") || sql.startsWith("CREATE INDEX")) {
            return { rows: [], rowCount: 0 };
        }
        if (sql.startsWith("UPDATE conversation_threads AS thread")) {
            state.updateSql = sql;
            state.updateParams = params;
            state.updateCount++;
            if (options.rejectUpdate) return { rows: [], rowCount: 0 };
            const target = state.messages.find(item => item.message_id === params[2]);
            if (!target) return { rows: [], rowCount: 0 };
            target.priority = params[3];
            return { rows: [{ messages: structuredClone(state.messages) }], rowCount: 1 };
        }
        if (sql.includes("SELECT * FROM conversation_threads")) {
            return options.missingThread
                ? { rows: [], rowCount: 0 }
                : { rows: [{ thread_id: "thread_test", title: "Test", messages: structuredClone(state.messages), compression: null, archived: false }], rowCount: 1 };
        }
        throw new Error("Unexpected pool query: " + sql);
    };
    return state;
}

test("Star priority update uses one atomic SQL statement compatible with the Neon HTTP client", async () => {
    const state = setup([message("m1")]);
    const updated = await repository.updatePriority("user-a", "thread_test", "m1", 1);

    assert.equal(state.updateCount, 1);
    assert.match(state.updateSql, /jsonb_array_elements/);
    assert.match(state.updateSql, /UPDATE conversation_threads AS thread/);
    assert.match(state.updateSql, /COUNT\(\*\)/);
    assert.deepEqual(state.updateParams, ["user-a", "thread_test", "m1", 1]);
    assert.equal(updated.priority, 1);
});

test("Priority limit rejection does not mutate the message list", async () => {
    const messages = Array.from({ length: 10 }, (_, i) => message("star-" + i, 1));
    messages.push(message("target", 0));
    const state = setup(messages, { rejectUpdate: true });

    await assert.rejects(
        repository.updatePriority("user-a", "thread_test", "target", 1),
        /Priority 1 limit reached/
    );
    assert.equal(state.updateCount, 1);
    assert.equal(state.messages.at(-1).priority, 0);
});

test("Missing conversation is reported when atomic update affects no row", async () => {
    const state = setup([], { missingThread: true, rejectUpdate: true });
    await assert.rejects(
        repository.updatePriority("user-a", "thread_test", "missing", 1),
        /Conversation not found/
    );
    assert.equal(state.updateCount, 1);
});

test("Invalid priority values are rejected before database mutation", async () => {
    const state = setup([message("m1")]);
    await assert.rejects(
        repository.updatePriority("user-a", "thread_test", "m1", 4),
        /Priority must be between 0 and 3/
    );
    assert.equal(state.updateCount, 0);
});
