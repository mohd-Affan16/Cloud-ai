const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const pool = require("../db");
const repository = require("../conversationRepository");

function message(id, role, content, priority = 0) {
    return {
        message_id: id,
        role,
        content,
        priority,
        timestamp: "2026-11-24T10:00:00.000Z"
    };
}

function setupDatabase(currentMessages, options = {}) {
    const state = {
        archived: null,
        pendingArchive: null,
        updated: null,
        committed: false,
        rolledBack: false,
        updateAttempted: false
    };

    pool.query = async (sql, params = []) => {
        if (sql.startsWith("CREATE TABLE") || sql.startsWith("CREATE INDEX")) {
            return { rows: [], rowCount: 0 };
        }
        if (sql.includes("SELECT archive_id FROM conversation_archives")) {
            return { rows: state.archived ? [{ archive_id: "archive-test" }] : [], rowCount: state.archived ? 1 : 0 };
        }
        throw new Error("Unexpected pool query: " + sql);
    };

    pool.connect = async () => ({
        async query(sql, params = []) {
            if (sql === "BEGIN" || sql === "ROLLBACK" || sql === "COMMIT") {
                if (sql === "ROLLBACK") {
                    state.rolledBack = true;
                    state.pendingArchive = null;
                }
                if (sql === "COMMIT") {
                    state.committed = true;
                    state.archived = state.pendingArchive;
                }
                return { rows: [], rowCount: 0 };
            }
            if (sql.includes("SELECT * FROM conversation_threads") && sql.includes("FOR UPDATE")) {
                return {
                    rows: [{
                        thread_id: "thread_test",
                        title: "Test conversation",
                        messages: currentMessages,
                        compression: null,
                        archived: false
                    }],
                    rowCount: 1
                };
            }
            if (sql.includes("INSERT INTO conversation_archives")) {
                state.pendingArchive = JSON.parse(params[5]);
                return { rows: [], rowCount: 1 };
            }
            if (sql.includes("UPDATE conversation_threads SET messages=")) {
                state.updateAttempted = true;
                if (options.failUpdate) throw new Error("simulated update failure");
                state.updated = JSON.parse(params[2]);
                return { rows: [{ compression: JSON.parse(params[3]) }], rowCount: 1 };
            }
            throw new Error("Unexpected client query: " + sql);
        },
        release() {}
    });

    return state;
}

function payload(sourceMessages, activeMessages) {
    return {
        archiveId: "archive-test",
        title: "Original: Test conversation",
        sourceDigest: crypto.createHash("sha256").update(JSON.stringify(sourceMessages)).digest("hex"),
        expectedSourceMessages: sourceMessages,
        activeMessages,
        compression: { summary: "Compressed summary", lastSuccessfulAt: Date.now() }
    };
}

test("compression rejects a stale source snapshot without archiving or replacing messages", async () => {
    const expected = [message("m1", "user", "Original text")];
    const changed = [message("m1", "user", "Newer text")];
    const state = setupDatabase(changed);

    const result = await repository.compressThread("user-a", "thread_test", payload(expected, [
        message("summary", "assistant", "Summary")
    ]));

    assert.equal(result.source_matches, false);
    assert.equal(state.archived, null);
    assert.equal(state.updateAttempted, false);
    assert.equal(state.committed, false);
});

test("compression refuses to remove or modify a starred source message", async () => {
    const source = [message("star-1", "user", "Important requirement", 2)];
    const state = setupDatabase(source);

    const result = await repository.compressThread("user-a", "thread_test", payload(source, [
        message("summary", "assistant", "Summary")
    ]));

    assert.equal(result.compression, null);
    assert.equal(state.archived, null);
    assert.equal(state.updateAttempted, false);
});

test("archive and active-history replacement commit together, and update failure rolls back", async () => {
    const source = [
        message("ordinary", "user", "An ordinary message"),
        message("starred", "assistant", "Important answer", 1)
    ];
    const active = [
        message("starred", "assistant", "Important answer", 1),
        message("summary", "assistant", "Compressed summary")
    ];

    const success = setupDatabase(source);
    const result = await repository.compressThread("user-a", "thread_test", payload(source, active));
    assert.equal(result.source_matches, true);
    assert.equal(success.committed, true);
    assert.equal(success.rolledBack, false);
    assert.deepEqual(success.archived, source);
    assert.deepEqual(success.updated, active);

    const failure = setupDatabase(source, { failUpdate: true });
    await assert.rejects(
        repository.compressThread("user-a", "thread_test", payload(source, active)),
        /simulated update failure/
    );
    assert.equal(failure.updateAttempted, true);
    assert.equal(failure.rolledBack, true);
    assert.equal(failure.committed, false);
    assert.equal(failure.archived, null);
});
