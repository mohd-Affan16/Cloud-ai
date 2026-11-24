const test = require("node:test");
const assert = require("node:assert/strict");
const pool = require("../db");
const repository = require("../conversationRepository");
const { selectPillarMessages } = require("../pillarSelection");
const { registerModel } = require("../modelRegistry");

function message(id, role, content, priority = 0) {
    return { message_id: id, role, content, priority, timestamp: "2026-11-24T00:00:00.000Z" };
}

test("pillar selection uses cumulative token costs and preserves chronological order", () => {
    registerModel("custom", "test-small", { tokenizer: null, countingMethod: "provider_usage", contextWindow: 10000, maxOutputTokens: 1000 });
    const source = [
        message("m1", "user", "ordinary ".repeat(120)),
        message("m2", "assistant", "starred early ".repeat(20), 1),
        message("m3", "user", "ordinary long ".repeat(900)),
        message("m4", "assistant", "starred late ".repeat(20), 1),
        message("m5", "user", "new ordinary ".repeat(100))
    ];
    const result = selectPillarMessages(source, "migration", "custom", "test-small");
    assert.ok(result.selectedTokens <= result.tokenBudget);
    assert.deepEqual(result.messages.filter(item => item.priority === 1).map(item => item.message_id), ["m2", "m4"]);
    assert.deepEqual(result.messages.map(item => item.index), [...result.messages.map(item => item.index)].sort((a, b) => a - b));
    assert.equal(result.omittedMessageCount > 0, true);
});

test("pillar selection reports a starred message larger than the full budget", () => {
    registerModel("custom", "test-small-star", { tokenizer: null, countingMethod: "provider_usage", contextWindow: 10000, maxOutputTokens: 1000 });
    const result = selectPillarMessages([
        message("huge", "user", "x".repeat(30000), 3),
        message("other", "assistant", "short")
    ], "compression", "custom", "test-small-star");
    assert.equal(result.overflowStarred.length, 1);
    assert.equal(result.overflowStarred[0].index, 0);
});

test("star priority caps are enforced from the persisted thread state", async () => {
    const records = Array.from({ length: 10 }, (_, index) => message(`star-${index}`, "user", "saved", 1));
    records.push(message("target", "assistant", "target"));
    pool.query = async (sql, params) => {
        if (sql.startsWith("CREATE TABLE") || sql.startsWith("CREATE INDEX")) return { rows: [], rowCount: 0 };
        if (sql.includes("SELECT * FROM conversation_threads")) {
            return { rows: params[0] === "user-a" ? [{ thread_id: params[1], title: "Test", messages: records, compression: null, archived: false }] : [], rowCount: 1 };
        }
        throw new Error(`Unexpected query: ${sql}`);
    };
    await assert.rejects(repository.updatePriority("user-a", "thread_test", "target", 1), /Priority 1 limit reached/);
    assert.equal(await repository.getThread("user-b", "thread_test"), null);
});

test("archive, active history, and cooldown share one atomic compression statement", async () => {
    let compressionSql = "";
    pool.query = async (sql) => {
        if (sql.startsWith("CREATE TABLE") || sql.startsWith("CREATE INDEX")) return { rows: [], rowCount: 0 };
        if (sql.includes("WITH source AS")) {
            compressionSql = sql;
            return { rows: [{ compression: { summary: "saved", lastSuccessfulAt: 1795478400000 }, archive_id: "archive_test", thread_exists: true, cooldown_ok: true }], rowCount: 1 };
        }
        throw new Error(`Unexpected query: ${sql}`);
    };
    const result = await repository.compressThread("user-a", "thread_test", {
        archiveId: "archive_test", sourceDigest: "digest", title: "Original: Test",
        compression: { summary: "saved", lastSuccessfulAt: 1795478400000 },
        activeMessages: [message("summary", "assistant", "summary")]
    });
    assert.equal(result.archive_id, "archive_test");
    assert.match(compressionSql, /INSERT INTO conversation_archives/);
    assert.match(compressionSql, /UPDATE conversation_threads/);
    assert.match(compressionSql, /lastSuccessfulAt/);
});

test("malformed and missing cooldown timestamps do not block compression", () => {
    assert.equal(repository.validTimestamp(undefined), null);
    assert.equal(repository.validTimestamp("invalid"), null);
    assert.equal(repository.validTimestamp("2026-11-24T00:00:00.000Z"), Date.parse("2026-11-24T00:00:00.000Z"));
    const now = 1795478400000;
    assert.equal(repository.cooldownRemaining(now - 23 * 60 * 60 * 1000, now), 60 * 60 * 1000);
    assert.equal(repository.cooldownRemaining(now - 24 * 60 * 60 * 1000, now), 0);
    assert.equal(repository.cooldownRemaining("broken", now), 0);
});
