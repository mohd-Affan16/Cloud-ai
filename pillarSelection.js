const { estimateMessageTokens, getCalibratedInputEstimate } = require("./tokenManager");
const { getModelConfig } = require("./modelRegistry");

function selectPillarMessages(messages, operation, provider, model, previousUsage = null) {
    if (!Array.isArray(messages)) throw new Error("Conversation history is unavailable.");
    const hasMatchingUsage = previousUsage && previousUsage.provider === provider && previousUsage.model === model &&
        Number.isFinite(previousUsage.actualInputTokens) && previousUsage.actualInputTokens > 0 &&
        Number.isFinite(previousUsage.estimatedInputTokens) && previousUsage.estimatedInputTokens > 0;
    const providerRatio = hasMatchingUsage
        ? Math.max(0.5, Math.min(2, previousUsage.actualInputTokens / previousUsage.estimatedInputTokens))
        : null;
    const normalized = messages.map((message, index) => {
        const estimate = estimateMessageTokens(message, provider, model);
        const calibrated = estimate && estimate.source === "character_estimate"
            ? getCalibratedInputEstimate(estimate.totalTokens, provider, model)
            : null;
        const estimatedTokens = providerRatio !== null && estimate?.source === "character_estimate"
            ? Math.ceil((estimate.totalTokens + 24) * providerRatio)
            : calibrated?.calibratedEstimate ?? estimate?.totalTokens ?? null;
        return {
            ...message,
            index,
            role: message.role === "ai" ? "assistant" : message.role,
            priority: Number.isInteger(message.priority) && message.priority >= 0 && message.priority <= 3 ? message.priority : 0,
            estimatedTokens: Number.isFinite(estimatedTokens) ? (providerRatio !== null && estimate?.source === "character_estimate" ? estimatedTokens : estimatedTokens + 24) : null,
            estimateSource: providerRatio !== null && estimate?.source === "character_estimate"
                ? "provider_calibrated_estimate"
                : calibrated?.source === "calibrated_estimate" ? calibrated.source : estimate?.source || "unavailable"
        };
    }).filter(message => ["user", "assistant"].includes(message.role) && typeof message.content === "string" && message.content.trim());

    const config = getModelConfig(provider, model);
    const capacityKnown = Number.isFinite(config.contextWindow) && config.contextWindow > 0;
    const inputCapacity = capacityKnown
        ? Math.max(1, config.contextWindow - Math.min(config.maxOutputTokens || 4096, 4096) - Math.ceil(config.contextWindow * 0.1))
        : 6000;
    const targetRatio = operation === "migration" ? 0.45 : 0.35;
    const tokenBudget = Math.max(1, Math.floor(inputCapacity * targetRatio));
    const ordered = [...normalized].sort((a, b) => b.priority - a.priority || a.index - b.index);
    const selected = [];
    const overflowStarred = [];
    let usedTokens = 0;

    for (const message of ordered) {
        const cost = message.estimatedTokens;
        if (!Number.isFinite(cost)) {
            if (message.priority > 0) overflowStarred.push({ index: message.index, priority: message.priority, reason: "token estimate unavailable" });
            continue;
        }
        if (usedTokens + cost <= tokenBudget) {
            selected.push(message);
            usedTokens += cost;
        } else if (message.priority > 0 && operation === "compression") {
            // Compression summarizes the full source in bounded chunks. Keep every
            // starred message in the source set even when it exceeds the selection
            // target; the original is preserved separately in active history.
            selected.push(message);
            usedTokens += cost;
        } else if (message.priority > 0) {
            overflowStarred.push({ index: message.index, priority: message.priority, estimatedTokens: cost });
        }
    }

    const chronological = selected.sort((a, b) => a.index - b.index);
    const totalSourceTokens = normalized.reduce((sum, message) => sum + (message.estimatedTokens || 0), 0);
    const starredTokens = normalized.filter(message => message.priority > 0).reduce((sum, message) => sum + (message.estimatedTokens || 0), 0);
    return {
        messages: chronological,
        tokenBudget,
        selectedTokens: usedTokens,
        totalSourceTokens,
        starredTokens,
        sourceMessageCount: normalized.length,
        starredMessageCount: normalized.filter(message => message.priority > 0).length,
        omittedMessageCount: normalized.length - chronological.length,
        overflowStarred,
        capacity: capacityKnown ? config.contextWindow : null,
        inputCapacity,
        capacitySource: capacityKnown ? "model_registry" : "conservative_fallback",
        estimateSources: [...new Set(normalized.map(message => message.estimateSource))]
    };
}

module.exports = { selectPillarMessages };
