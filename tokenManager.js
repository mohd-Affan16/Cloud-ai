
const { getModelConfig } = require("./modelRegistry");
const { encode } = require("gpt-tokenizer/encoding/o200k_harmony");

// Rough message-format overhead.
// This is an estimate, not an exact provider-specific value.
const MESSAGE_OVERHEAD = 4;

// Estimate tokens in a text string.
function estimateTokens(text, tokenizer = "o200k_harmony") {
    if (typeof text !== "string" || !text.trim()) {
        return 0;
    }

    if (tokenizer === "o200k_harmony") {
        return encode(text).length;
    }

    return null;
}

// Estimate tokens for one individual message.
function estimateMessageTokens(message, provider, model) {
    if (
        !message ||
        typeof message !== "object" ||
        typeof message.role !== "string" ||
        typeof message.content !== "string"
    ) {
        return null;
    }

    const config = getModelConfig(provider, model);

    const tokenizer = config.countingMethod === "local" && config.tokenizer
        ? config.tokenizer
        : null;
    const roleTokens = tokenizer ? estimateTokens(message.role, tokenizer) : Math.ceil(message.role.length / 3.5);
    const contentTokens = tokenizer ? estimateTokens(message.content, tokenizer) : Math.ceil(message.content.length / 3.5);

    if (roleTokens === null || contentTokens === null) {
        return null;
    }

    const totalTokens =
        roleTokens +
        contentTokens +
        MESSAGE_OVERHEAD;

    return {
        roleTokens,
        contentTokens,
        overheadTokens: MESSAGE_OVERHEAD,
        totalTokens,
        source: tokenizer ? "local_tokenizer_estimate" : "character_estimate"
    };
}

// Estimate the total tokens across a conversation.
function estimateConversationTokens(messages, provider, model) {
    if (!Array.isArray(messages)) {
        return null;
    }

    let totalTokens = 0;

    for (const message of messages) {
        const result = estimateMessageTokens(
            message,
            provider,
            model
        );

        // Do not silently ignore messages that cannot
        // be estimated.
        if (!result) {
            return null;
        }

        totalTokens += result.totalTokens;
    }

    return totalTokens;
}

// Normalize actual usage returned by an AI provider.
function normalizeUsage(usage, provider) {
    if (!usage || typeof usage !== "object") {
        return null;
    }

    let inputTokens = null;
    let outputTokens = null;

    if (provider === "anthropic") {
        inputTokens = usage.input_tokens ?? null;
        outputTokens = usage.output_tokens ?? null;
    } else {
        inputTokens =
            usage.prompt_tokens ??
            usage.input_tokens ??
            null;

        outputTokens =
            usage.completion_tokens ??
            usage.output_tokens ??
            null;
    }

    const totalTokens =
        usage.total_tokens ??
        (
            Number.isFinite(inputTokens) &&
            Number.isFinite(outputTokens)
                ? inputTokens + outputTokens
                : null
        );

    const hasProviderUsage =
        Number.isFinite(inputTokens) ||
        Number.isFinite(outputTokens) ||
        Number.isFinite(totalTokens);

    if (!hasProviderUsage) {
        return null;
    }

    return {
        inputTokens,
        outputTokens,
        totalTokens,
        source: "provider"
    };
}

const DEFAULT_OUTPUT_RESERVATION = 4096;
const SAFETY_MARGIN_RATIO = 0.10;


function calculateContextBudget(messages, provider, model) {
    const config = getModelConfig(provider, model);

    if (!config || !Number.isFinite(config.contextWindow)) {
        return null;
    }

    const estimatedInputTokens =
        estimateConversationTokens(messages, provider, model);

    // Validate before attempting calibration.
    if (!Number.isFinite(estimatedInputTokens)) {
        return null;
    }

    const calibratedEstimate =
        getCalibratedInputEstimate(
            estimatedInputTokens,
            provider,
            model
        );

    const budgetInputTokens =
        calibratedEstimate?.calibratedEstimate ??
        estimatedInputTokens;

    const contextWindow = config.contextWindow;

    const outputReservationTokens =
        DEFAULT_OUTPUT_RESERVATION;

    const safetyMarginTokens =
        Math.ceil(contextWindow * SAFETY_MARGIN_RATIO);

    const inputBudget =
        contextWindow -
        outputReservationTokens -
        safetyMarginTokens;

    const remainingTokens = Math.max(
        0,
        inputBudget - budgetInputTokens
    );

    const overBudgetTokens = Math.max(
        0,
        budgetInputTokens - inputBudget
    );

    const usagePercent =
        (budgetInputTokens / inputBudget) * 100;

    let warningLevel = "normal";

    if (usagePercent >= 95) {
        warningLevel = "critical";
    } else if (usagePercent >= 80) {
        warningLevel = "warning";
    }

    return {
        contextWindow,
        outputReservationTokens,
        safetyMarginTokens,
        inputBudget,
        estimatedInputTokens,
        calibratedInputTokens: budgetInputTokens,
        remainingTokens,
        overBudgetTokens,
        usagePercent: Number(usagePercent.toFixed(2)),
        warningLevel,
        thresholds: {
            warning: 80,
            critical: 95
        },
        source: calibratedEstimate?.source ?? "local_estimate"
    };
}

// Stores calibration data separately for each provider and model.
// This data lasts until the Node.js server restarts.
const usageCalibration = new Map();

function getCalibrationKey(provider, model) {
    return `${provider}:${model}`;
}

function recordUsageCalibration(
    estimatedInputTokens,
    actualInputTokens,
    provider,
    model
) {
    if (
        !Number.isFinite(estimatedInputTokens) ||
        !Number.isFinite(actualInputTokens) ||
        estimatedInputTokens <= 0 ||
        actualInputTokens <= 0
    ) {
        return null;
    }

    const key = getCalibrationKey(provider, model);

    const previous = usageCalibration.get(key) || {
        sampleCount: 0,
        totalEstimatedTokens: 0,
        totalActualTokens: 0
    };

    const updated = {
        sampleCount: previous.sampleCount + 1,
        totalEstimatedTokens:
            previous.totalEstimatedTokens + estimatedInputTokens,
        totalActualTokens:
            previous.totalActualTokens + actualInputTokens
    };

    updated.ratio =
        updated.totalActualTokens / updated.totalEstimatedTokens;

    usageCalibration.set(key, updated);

    return { ...updated };
}

function getCalibratedInputEstimate(
    estimatedInputTokens,
    provider,
    model
) {
    if (!Number.isFinite(estimatedInputTokens)) {
        return null;
    }

    const key = getCalibrationKey(provider, model);
    const calibration = usageCalibration.get(key);

    const MIN_CALIBRATION_SAMPLES = 3;

    if (
        !calibration ||
        calibration.sampleCount < MIN_CALIBRATION_SAMPLES
    ) {
        return {
            localEstimate: estimatedInputTokens,
            calibratedEstimate: estimatedInputTokens,
            calibrationRatio: 1,
            sampleCount: calibration?.sampleCount ?? 0,
            source: "local_estimate"
        };
    }

    return {
        localEstimate: estimatedInputTokens,
        calibratedEstimate: Math.ceil(
            estimatedInputTokens * calibration.ratio - 1e-9
        ),
        calibrationRatio: Number(
            calibration.ratio.toFixed(4)
        ),
        sampleCount: calibration.sampleCount,
        source: "calibrated_estimate"
    };
}




module.exports = {
    estimateTokens,
    recordUsageCalibration,
    getCalibratedInputEstimate,
    estimateMessageTokens,
    estimateConversationTokens,
    normalizeUsage,
    calculateContextBudget
};
