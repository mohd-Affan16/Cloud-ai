const test = require("node:test");
const assert = require("node:assert/strict");
const { registerModel } = require("../modelRegistry");
const { selectPillarMessages } = require("../pillarSelection");

const provider = "groq";
const model = "pillar2-selection-regression-test";

registerModel(provider, model, {
    tokenizer: "o200k_harmony",
    countingMethod: "local",
    contextWindow: 8192,
    maxOutputTokens: 1024
});

function message(id, role, content, priority = 0) {
    return { message_id: id, role, content, priority };
}

test("Pillar 2 keeps an oversized starred message selected for separate preservation", () => {
    const messages = [
        message("ordinary", "user", "A short ordinary message."),
        message("starred-large", "user", "Important requirement ".repeat(1500), 2),
        message("ordinary-2", "assistant", "A second ordinary message.")
    ];

    const result = selectPillarMessages(messages, "compression", provider, model);

    assert.ok(result.tokenBudget > 0);
    assert.ok(result.selectedTokens > result.tokenBudget);
    assert.ok(result.messages.some(item => item.message_id === "starred-large"));
    assert.equal(result.overflowStarred.length, 0);
    assert.equal(result.starredMessageCount, 1);
});

test("Pillar 1 migration retains its existing starred-message overflow guard", () => {
    const messages = [
        message("ordinary", "user", "A short ordinary message."),
        message("starred-large", "user", "Important requirement ".repeat(1500), 2)
    ];

    const result = selectPillarMessages(messages, "migration", provider, model);

    assert.ok(result.overflowStarred.some(item => item.index === 1));
    assert.ok(!result.messages.some(item => item.message_id === "starred-large"));
});

test("Pillar 2 still reports the actual full input capacity separately from its selection target", () => {
    const result = selectPillarMessages(
        [message("one", "user", "A short message.")],
        "compression",
        provider,
        model
    );

    assert.equal(result.capacity, 8192);
    assert.equal(result.inputCapacity, 8192 - 1024 - Math.ceil(8192 * 0.1));
    assert.ok(result.tokenBudget < result.inputCapacity);
});
