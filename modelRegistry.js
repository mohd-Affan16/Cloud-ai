
const MODEL_REGISTRY = {
   openai: {
    default: {
        tokenizer: null,
        countingMethod: "provider_usage",
        contextWindow: null,
        maxOutputTokens: null
    }
},

    anthropic: {
        default: {
            tokenizer: null,
            countingMethod: "provider_usage",
            contextWindow: null,
            maxOutputTokens: null
        }
    },

    google: {
        default: {
            tokenizer: null,
            countingMethod: "provider_usage",
            contextWindow: null,
            maxOutputTokens: null
        }
    },

  groq: {
    "openai/gpt-oss-20b": {
        tokenizer: "o200k_harmony",
        countingMethod: "local",
        contextWindow: 131072,
        maxOutputTokens: 65536
    },

    default: {
        tokenizer: null,
        countingMethod: "provider_usage",
        contextWindow: null,
        maxOutputTokens: null
    }
},

    openrouter: {
        default: {
            tokenizer: null,
            countingMethod: "provider_usage",
            contextWindow: null,
            maxOutputTokens: null
        }
    },

    together: {
        default: {
            tokenizer: null,
            countingMethod: "provider_usage",
            contextWindow: null,
            maxOutputTokens: null
        }
    },

    fireworks: {
        default: {
            tokenizer: null,
            countingMethod: "provider_usage",
            contextWindow: null,
            maxOutputTokens: null
        }
    },

    cerebras: {
        default: {
            tokenizer: null,
            countingMethod: "provider_usage",
            contextWindow: null,
            maxOutputTokens: null
        }
    },

    mistral: {
        default: {
            tokenizer: null,
            countingMethod: "provider_usage",
            contextWindow: null,
            maxOutputTokens: null
        }
    },

    deepseek: {
        default: {
            tokenizer: null,
            countingMethod: "provider_usage",
            contextWindow: null,
            maxOutputTokens: null
        }
    },

    custom: {
        default: {
            tokenizer: null,
            countingMethod: "provider_usage",
            contextWindow: null,
            maxOutputTokens: null
        }
    }
};

function getModelConfig(provider, model) {
    const normalizedProvider = String(provider || "")
        .trim()
        .toLowerCase();

    const normalizedModel = String(model || "").trim();

    const providerConfig = MODEL_REGISTRY[normalizedProvider];

    if (!providerConfig) {
        return {
            tokenizer: null,
            countingMethod: "provider_usage",
            contextWindow: null,
            maxOutputTokens: null
        };
    }

    return (
        providerConfig[normalizedModel] ||
        providerConfig.default
    );
}

function registerModel(provider, model, config) {
    const normalizedProvider = String(provider || "")
        .trim()
        .toLowerCase();

    const normalizedModel = String(model || "").trim();

    if (!normalizedProvider || !normalizedModel) {
        throw new Error("Provider and model ID are required.");
    }

    if (!MODEL_REGISTRY[normalizedProvider]) {
        throw new Error(`Unsupported provider: ${normalizedProvider}`);
    }

    MODEL_REGISTRY[normalizedProvider][normalizedModel] = {
        ...MODEL_REGISTRY[normalizedProvider].default,
        ...config
    };
}

module.exports = {
    MODEL_REGISTRY,
    getModelConfig,
    registerModel
};
