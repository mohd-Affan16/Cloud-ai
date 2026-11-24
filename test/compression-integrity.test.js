const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const pool = require("../db");
const repository = require("../conversationRepository");

function message(id, role, content, priority = 0) {
    return { message_id: id, role, content, priority, timestamp: "2026-11-24T10:00:00.000Z" };
}

function setupDatabase(currentMessages, options = {}) {
    const state = {
        archived: null,
        updated: null,
        statement: "",
        params: null,
        statementCount: 0
    };

    pool.query = async (sql, params = []) => {
        if (sql.startsWith("CREATE TABLE") || sql.startsWith("CREATE INDEX")) {
            return { rows: [], rowCount: 0 };
        }
        if (sql.includes("WITH locked AS MATERIALIZED")) {
            state.statement = sql;
            state.params = params;
            state.statementCount++;
            if (options.failStatement) throw new Error("simulated atomic statement failure");

            const exists = !options.missingThread;
            const expected = JSON.parse(params[5]);
            const sourceMatches = exists && JSON.stringify(currentMessages) === JSON.stringify(expected);
            const cooldownOk = exists && options.cooldownOk !== false;
            const eligible = sourceMatches && cooldownOk;

            if (eligible) {
                state.archived = structuredClone(currentMessages);
                state.updated = JSON.parse(params[6]);
            }

            return {
                rows: [{
                    thread_exists: exists,
                    source_matches: sourceMatches,
                    cooldown_ok: cooldownOk,
                    compression: eligible ? JSON.parse(params[7]) : null,
                    archive_id: eligible ? "archive-test" : null
                }],
                rowCount: 1
            };
        }
        throw new Error("Unexpected pool query: " + sql);
    };

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
    assert.equal(state.updated, null);
    assert.match(state.statement, /FOR UPDATE/);
});

test("compression refuses to remove or modify a starred source message", async () => {
    const source = [message("star-1", "user", "Important requirement", 2)];
    const state = setupDatabase(source);

    const result = await repository.compressThread("user-a", "thread_test", payload(source, [
        message("summary", "assistant", "Summary")
    ]));

    assert.equal(result.compression, null);
    assert.equal(state.statementCount, 0);
    assert.equal(state.archived, null);
});

test("archive and active-history replacement are issued in one atomic Neon-compatible statement", async () => {
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
    assert.equal(result.cooldown_ok, true);
    assert.equal(result.archive_id, "archive-test");
    assert.deepEqual(success.archived, source);
    assert.deepEqual(success.updated, active);
    assert.equal(success.statementCount, 1);
    assert.match(success.statement, /INSERT INTO conversation_archives/);
    assert.match(success.statement, /UPDATE conversation_threads/);
    assert.doesNotMatch(success.statement, /BEGIN|COMMIT|ROLLBACK/);
});

test("compression reports cooldown without changing archive or active history", async () => {
    const source = [message("ordinary", "user", "An ordinary message")];
    const state = setupDatabase(source, { cooldownOk: false });
    const result = await repository.compressThread("user-a", "thread_test", payload(source, [
        message("summary", "assistant", "Summary")
    ]));

    assert.equal(result.cooldown_ok, false);
    assert.equal(result.compression, null);
    assert.equal(state.archived, null);
    assert.equal(state.updated, null);
});

test("a database failure leaves archive and active history unchanged", async () => {
    const source = [message("ordinary", "user", "An ordinary message")];
    const state = setupDatabase(source, { failStatement: true });

    await assert.rejects(
        repository.compressThread("user-a", "thread_test", payload(source, [
            message("summary", "assistant", "Summary")
        ])),
        /simulated atomic statement failure/
    );

    assert.equal(state.archived, null);
    assert.equal(state.updated, null);
});
