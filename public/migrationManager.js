
const MigrationManager = (() => {
    const WARNING_THRESHOLD = 80;
    const CRITICAL_THRESHOLD = 95;

    let currentWarning = null;
    let currentConversationId = null;

    let conversationState = {
        neverAskAgain: false,
        warningShown: {
            80: false,
            95: false
        }
    };

    function getStorageKey(conversationId) {
        return `cloud_ai_migration_${conversationId}`;
    }

    function saveState() {
        if (!currentConversationId) return;

        try {
            localStorage.setItem(
                getStorageKey(currentConversationId),
                JSON.stringify(conversationState)
            );
        } catch (error) {
            console.error("Could not save migration preferences:", error);
        }
    }

    function loadState(conversationId) {
        try {
            const saved = localStorage.getItem(
                getStorageKey(conversationId)
            );

            if (saved) {
                const parsed = JSON.parse(saved);

                return {
                    neverAskAgain: parsed.neverAskAgain === true,
                    warningShown: {
                        80: parsed.warningShown?.[80] === true,
                        95: parsed.warningShown?.[95] === true
                    }
                };
            }
        } catch (error) {
            console.error("Could not load migration preferences:", error);
        }

        return {
            neverAskAgain: false,
            warningShown: {
                80: false,
                95: false
            }
        };
    }

    function setConversation(conversationId) {
        closePopup();

        currentConversationId = conversationId || null;

        conversationState = currentConversationId
            ? loadState(currentConversationId)
            : {
                neverAskAgain: false,
                warningShown: {
                    80: false,
                    95: false
                }
            };
    }

    function createPopup() {
        if (document.getElementById("migrationWarningOverlay")) {
            return;
        }

        const style = document.createElement("style");

        style.textContent = `
            #migrationWarningOverlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.65);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                padding: 20px;
            }

            #migrationWarningBox {
                width: 100%;
                max-width: 420px;
                background: var(--card-bg, #202020);
                color: var(--text-color, #fff);
                border: 1px solid var(--border-color, #444);
                border-radius: 16px;
                padding: 24px;
                box-shadow: 0 15px 50px rgba(0,0,0,0.4);
            }

            #migrationWarningBox h2 {
                margin: 0 0 12px;
                font-size: 21px;
            }

            #migrationWarningBox p {
                line-height: 1.5;
                margin-bottom: 20px;
            }

            .migration-option {
                width: 100%;
                padding: 13px;
                margin-top: 10px;
                border-radius: 9px;
                border: 1px solid var(--border-color, #555);
                background: transparent;
                color: inherit;
                cursor: pointer;
                text-align: left;
                font-size: 14px;
                transition: background 0.2s;
            }

            .migration-option:hover {
                background: rgba(128,128,128,0.2);
            }

            .migration-option.primary {
                background: var(--accent-color, #6366f1);
                color: white;
                border-color: transparent;
            }
        `;

        document.head.appendChild(style);
    }

    function showWarning(percentage) {
        if (!currentConversationId) return;
        if (conversationState.neverAskAgain || currentWarning) return;
        if (conversationState.warningShown[percentage]) return;

        conversationState.warningShown[percentage] = true;
        saveState();

        currentWarning = percentage;

        createPopup();

        const isCritical = percentage >= CRITICAL_THRESHOLD;

        const overlay = document.createElement("div");
        overlay.id = "migrationWarningOverlay";

        const box = document.createElement("div");
        box.id = "migrationWarningBox";

        const title = isCritical
            ? "Your conversation is almost full!"
            : "Your conversation is reaching its context limit.";

        const message = isCritical
            ? "Your context usage has reached 95%. Choose how you would like to continue."
            : "Your context usage has reached 80%. Consider preparing your conversation for the next stage.";

        const thirdOption = isCritical
            ? "Never ask again"
            : "Not now";

        box.innerHTML = `
            <h2>${title}</h2>
            <p>${message}</p>

            <button class="migration-option primary"
                data-action="pillar1">
                1. Pillar 1 – Master Prompt
            </button>

            <button class="migration-option"
                data-action="pillar2">
                2. Pillar 2 – Conversation Compression
            </button>

            <button class="migration-option"
                data-action="dismiss">
                3. ${thirdOption}
            </button>
        `;

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        box.querySelectorAll("[data-action]").forEach(button => {
            button.addEventListener("click", () => {
                handleChoice(button.dataset.action, percentage);
            });
        });
    }

    function closePopup() {
        const overlay = document.getElementById(
            "migrationWarningOverlay"
        );

        if (overlay) overlay.remove();

        currentWarning = null;
    }

    function handleChoice(action, percentage) {
        closePopup();

        switch (action) {
            case "pillar1":
                window.dispatchEvent(
                    new CustomEvent("migration:pillar1")
                );
                break;

            case "pillar2":
                window.dispatchEvent(
                    new CustomEvent("migration:pillar2")
                );
                break;

            case "dismiss":
                if (percentage >= CRITICAL_THRESHOLD) {
                    conversationState.neverAskAgain = true;
                    saveState();
                }
                break;
        }
    }

    function checkUsage(usagePercentage) {
        if (!currentConversationId) return;
        if (conversationState.neverAskAgain) return;

        const percentage = Number(usagePercentage);

        if (!Number.isFinite(percentage)) return;

        if (percentage >= CRITICAL_THRESHOLD) {
            showWarning(CRITICAL_THRESHOLD);
        } else if (percentage >= WARNING_THRESHOLD) {
            showWarning(WARNING_THRESHOLD);
        }
    }
    function checkUsageForConversation(conversationId, usagePercentage) {
    if (!conversationId) return;

    // Ignore responses belonging to a conversation
    // that is no longer currently selected.
    if (conversationId !== currentConversationId) return;

    checkUsage(usagePercentage);
}
    function resetConversation() {
        conversationState = {
            neverAskAgain: false,
            warningShown: {
                80: false,
                95: false
            }
        };

        saveState();
        closePopup();
    }

   return {
    setConversation,
    checkUsage,
    checkUsageForConversation,
    resetConversation
};
})();

window.MigrationManager = MigrationManager;
