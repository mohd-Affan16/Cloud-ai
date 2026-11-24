/* ========================================================= CLOUD HYBRID AI FRONTEND JAVASCRIPT ========================================================= */
/* ========================================================= ELEMENT REFERENCES ========================================================= */
const menuButton = document.getElementById("menuButton");
const newConversationButton = document.getElementById("newConversationButton");
const sideMenu = document.getElementById("sideMenu");
const chat = document.getElementById("chat");
const inputContainer = document.getElementById("inputContainer");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const welcome = document.getElementById("welcome");
const pages = document.querySelectorAll(".app-page");
const menuItems = document.querySelectorAll(".menu-item[data-page]");
const logoutButton = document.getElementById("logoutButton");
const settingsNavigationItems = document.querySelectorAll(".settings-navigation-item");
const backButtons = document.querySelectorAll(".back-button");
const themeCards = document.querySelectorAll(".theme-card");
/* ========================================================= CUSTOM THEME ========================================================= */
const customThemeInput = document.getElementById("customThemeInput");
/* ========================================================= API ELEMENTS ========================================================= */
const apiList = document.getElementById("apiList");
const apiNameInput = document.getElementById("apiNameInput");
const apiKeyInput = document.getElementById("apiKeyInput");
const customEndpointInput = document.getElementById("customEndpointInput");
const customEndpointGroup = document.getElementById("customEndpointGroup");
const providerSelectButton = document.getElementById("providerSelectButton");
const providerSelectValue = document.getElementById("providerSelectValue");
const providerSelectMenu = document.getElementById("providerSelectMenu");
const providerOptions = document.querySelectorAll(".provider-option");
const createApiButton = document.getElementById("createApiButton");
const addApiKeyButton = document.getElementById("addApiKeyButton");
const apiCreateCard = document.getElementById("apiCreateCard");
const cancelCreateApiButton = document.getElementById("cancelCreateApiButton");

let selectedProvider = "groq";
/* ========================================================= DELETE MODAL ========================================================= */
const deleteModal = document.getElementById("deleteModal");
const deleteModalText = document.getElementById("deleteModalText");
const cancelDeleteButton = document.getElementById("cancelDeleteButton");
const confirmDeleteButton = document.getElementById("confirmDeleteButton");
let apiToDelete = null;
/* ========================================================= API SWITCHER ========================================================= */
const apiSwitcherButton = document.getElementById("apiSwitcherButton");
const apiSwitcherMenu = document.getElementById("apiSwitcherMenu");
const apiSwitcherCurrent = document.getElementById("apiSwitcherCurrent");
const apiSwitcherList = document.getElementById("apiSwitcherList");

/* =========================================================
   LOGOUT / AUTH ACTION ENGINE
========================================================= */
const authButtonLabel = document.getElementById("authButtonLabel");
let isUserAuthenticated = false;
let authenticatedUserId = null;

async function updateAuthButton() {
    try {
        const response = await fetch("/auth/me", { credentials: "same-origin" });
        const auth = await response.json();
        isUserAuthenticated = response.ok && auth.authenticated === true;
        if (isUserAuthenticated && auth.user?.id) {
            const signedInUserId = String(auth.user.id);
            if (authenticatedUserId !== signedInUserId) {
                await activateAccountStorage(signedInUserId);
                await syncThreadsFromServer();
            }
        } else {
            authenticatedUserId = null;
            if (localStorage.getItem("cloud_ai_legacy_threads_owner")) {
                threads = [];
                activeThreadId = null;
                renderThreads();
                clearChatMessages();
                welcome?.classList.remove("hidden");
            }
        }
        if (authButtonLabel) {
            authButtonLabel.textContent = isUserAuthenticated ? "Log out" : "Login / Sign up";
        }
    } catch (error) {
        console.error("Could not check login status:", error);
        isUserAuthenticated = false;
        if (authButtonLabel) authButtonLabel.textContent = "Login / Sign up";
    }
}
updateAuthButton();

logoutButton?.addEventListener("click", async () => {
    await updateAuthButton();
    if (isUserAuthenticated) {
        window.location.href = "/auth/logout";
    } else {
        window.location.href = "/login";
    }
});

/* =========================================================
   CUSTOM NOTIFICATION POPUP
========================================================= */
let notificationTimer = null;

function showPopup(title, message, type = "error", duration = 5000) {
    const popup = document.getElementById("notificationPopup");
    const icon = document.getElementById("notificationIcon");
    const titleElement = document.getElementById("notificationTitle");
    const messageElement = document.getElementById("notificationMessage");
    if (!popup || !icon || !titleElement || !messageElement) {
        console.error("Notification popup elements were not found.");
        return;
    }
    clearTimeout(notificationTimer);
    titleElement.textContent = title;
    messageElement.textContent = message;
    popup.classList.remove("error", "warning", "success");
    popup.classList.add(type);
    const icons = { error: "×", warning: "!", success: "✓" };
    icon.textContent = icons[type] || "!";
    popup.classList.add("show");
    popup.setAttribute("aria-hidden", "false");
    notificationTimer = setTimeout(hidePopup, duration);
}

function hidePopup() {
    const popup = document.getElementById("notificationPopup");
    if (!popup) return;
    popup.classList.remove("show");
    popup.setAttribute("aria-hidden", "true");
    clearTimeout(notificationTimer);
}

document.addEventListener("click", (event) => {
    if (event.target.closest("#notificationClose")) {
        hidePopup();
    }
});
/* ========================================================= PROVIDER DICTIONARY & CORE CONFIGS ========================================================= */
const themes = window.CLOUD_THEMES;
const PROVIDERS = {
    groq: {
        label: "Groq",
        endpoint: "https://api.groq.com/openai/v1"
    },
    openai: {
        label: "OpenAI",
        endpoint: "https://api.openai.com/v1"
    },
    google: {
        label: "Google Gemini",
        endpoint: "https://generativelanguage.googleapis.com/v1beta/openai"
    },
    anthropic: {
        label: "Anthropic",
        endpoint: null,
        format: "anthropic"
    },
    openrouter: {
        label: "OpenRouter",
        endpoint: "https://openrouter.ai/api/v1"
    },
    together: {
        label: "Together AI",
        endpoint: "https://api.together.xyz/v1"
    },
    fireworks: {
        label: "Fireworks AI",
        endpoint: "https://api.fireworks.ai/inference/v1"
    },
    cerebras: {
        label: "Cerebras",
        endpoint: "https://api.cerebras.ai/v1"
    },
    mistral: {
        label: "Mistral AI",
        endpoint: "https://api.mistral.ai/v1"
    },
    deepseek: {
        label: "DeepSeek",
        endpoint: "https://api.deepseek.com/v1"
    },
    custom: {
        label: "Custom Endpoint",
        endpoint: null
    }
};

function getProviderConfig(providerKey) {
    const provider = PROVIDERS[providerKey] || PROVIDERS.huggingface;
    return provider;
}

/* ========================================================= LAYOUT NAVIGATION & INTERFACE ROUTERS ========================================================= */
menuButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    sideMenu?.classList.toggle("open");
});

sideMenu?.addEventListener("click", (event) => {
    event.stopPropagation();
});

menuItems.forEach((item) => {
    item.addEventListener("click", (event) => {
        event.stopPropagation();
        const pageId = item.dataset.page;
        openPage(pageId);
    });
});

document.addEventListener("click", (event) => {
    const item = event.target.closest(".settings-navigation-item");
    if (!item) return;
    const pageId = item.dataset.page;
    if (!pageId) return;
    event.preventDefault();
    event.stopPropagation();
    openPage(pageId);
});

function openPage(pageId) {
    sideMenu?.classList.remove("open");
    apiSwitcherMenu?.classList.remove("open");
    pages.forEach((page) => {
        page.classList.remove("open");
    });
    const page = document.getElementById(pageId);
    if (!page) {
        console.error("Page not found:", pageId);
        return;
    }
    page.classList.add("open");
    inputContainer?.classList.add("page-hidden");
    if (pageId === "archivePage") loadOriginalConversationArchives();
}

async function loadOriginalConversationArchives() {
    const status = document.getElementById("archivePageStatus");
    const list = document.getElementById("archiveConversationList");
    if (!list || !status) return;
    status.textContent = "Loading archived conversations…";
    list.replaceChildren();
    try {
        const response = await fetch("/api/archives", { credentials: "same-origin", cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Could not load archived conversations.");
        const archives = Array.isArray(data.archives) ? data.archives : [];
        if (!archives.length) {
            status.textContent = "No original conversations have been archived yet.";
            return;
        }
        status.textContent = `${archives.length} original conversation${archives.length === 1 ? "" : "s"} archived.`;
        archives.forEach(archive => {
            const row = document.createElement("article");
            row.className = "archive-entry";
            const details = document.createElement("div");
            details.className = "archive-entry-details";
            const title = document.createElement("strong");
            title.textContent = archive.title || "Original: Conversation";
            details.append(title);
            const view = document.createElement("button");
            view.type = "button";
            view.className = "storage-action-button archive-view-button";
            view.textContent = "View JSON";
            const preview = document.createElement("pre");
            preview.className = "archive-conversation-preview";
            preview.hidden = true;
            const restore = document.createElement("button");
            restore.type = "button";
            restore.className = "storage-action-button archive-restore-button";
            restore.textContent = "Restore to new chat";
            restore.addEventListener("click", async () => {
                restore.disabled = true;
                try {
                    const restoreResponse = await fetch(`/api/archives/${encodeURIComponent(archive.id)}/restore`, {
                        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }
                    });
                    const restoreData = await restoreResponse.json().catch(() => ({}));
                    if (!restoreResponse.ok || !restoreData.thread) throw new Error(restoreData.error || "Could not restore this archive.");
                    threads.unshift(restoreData.thread);
                    activeThreadId = restoreData.thread.id;
                    saveThreadsToStorage();
                    renderThreads();
                    closePages();
                    loadThread(activeThreadId);
                } catch (error) {
                    status.textContent = error.message || "Could not restore this archive.";
                } finally { restore.disabled = false; }
            });
            view.addEventListener("click", async () => {
                view.disabled = true;
                try {
                    const fileResponse = await fetch(`/api/archives/${encodeURIComponent(archive.id)}`, { credentials: "same-origin", cache: "no-store" });
                    const fileData = await fileResponse.json().catch(() => ({}));
                    if (!fileResponse.ok || !Array.isArray(fileData.messages)) throw new Error(fileData.error || "Could not open the archived file.");
                    preview.textContent = JSON.stringify(fileData.messages, null, 2);
                    preview.hidden = false;
                } catch (error) {
                    status.textContent = error.message || "Could not open the archived file.";
                } finally { view.disabled = false; }
            });
            row.append(details, view, restore, preview);
            list.appendChild(row);
        });
    } catch (error) {
        status.textContent = error.message || "Could not load archived conversations.";
    }
}

backButtons.forEach((button) => {
    button.addEventListener("click", closePages);
});

function closePages() {
    pages.forEach((page) => {
        page.classList.remove("open");
    });
    inputContainer?.classList.remove("page-hidden");
}
/* ========================================================= THREAD & CONVERSATION HISTORY ENGINE ========================================================= */
const threadsList = document.getElementById("threadsList");
const migrateConversationButton = document.getElementById("migrateConversationButton");
const compressConversationButton = document.getElementById("compressConversationButton");
const contextActionStatus = document.getElementById("contextActionStatus");
const contextTools = document.getElementById("contextTools");
const contextToolsMenu = document.getElementById("contextToolsMenu");
const contextUsageButton = document.getElementById("contextUsageButton");
const contextUsageLabel = document.getElementById("contextUsageLabel");
const contextUsageRing = document.getElementById("contextUsageRing");
const COMPRESSION_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const legacyThreadOwner = localStorage.getItem("cloud_ai_legacy_threads_owner");
let threads = legacyThreadOwner ? [] : JSON.parse(localStorage.getItem("cloud_ai_threads") || "[]");
let activeThreadId = legacyThreadOwner ? null : (localStorage.getItem("cloud_ai_active_thread") || null);
let apiEntries = [];

function saveThreadsToStorage() {
    if (authenticatedUserId) {
        localStorage.setItem(`cloud_ai_threads_${authenticatedUserId}`, JSON.stringify(threads));
        localStorage.setItem(`cloud_ai_active_thread_${authenticatedUserId}`, activeThreadId || "");
        return;
    }
    localStorage.setItem("cloud_ai_threads", JSON.stringify(threads));
    localStorage.setItem("cloud_ai_active_thread", activeThreadId);
}

async function activateAccountStorage(userId) {
    const threadKey = `cloud_ai_threads_${userId}`;
    const activeKey = `cloud_ai_active_thread_${userId}`;
    let scopedThreads = localStorage.getItem(threadKey);
    const priorOwner = localStorage.getItem("cloud_ai_legacy_threads_owner");
    if (scopedThreads === null) {
        if (!priorOwner) {
            scopedThreads = localStorage.getItem("cloud_ai_threads") || "[]";
            localStorage.setItem("cloud_ai_legacy_threads_owner", userId);
            localStorage.setItem(threadKey, scopedThreads);
            localStorage.setItem(activeKey, localStorage.getItem("cloud_ai_active_thread") || "");
        } else if (priorOwner === userId) {
            scopedThreads = localStorage.getItem("cloud_ai_threads") || "[]";
            localStorage.setItem(threadKey, scopedThreads);
            localStorage.setItem(activeKey, localStorage.getItem("cloud_ai_active_thread") || "");
        } else {
            scopedThreads = "[]";
            localStorage.setItem(threadKey, scopedThreads);
            localStorage.setItem(activeKey, "");
        }
    }
    authenticatedUserId = userId;
    threads = JSON.parse(scopedThreads || "[]");
    activeThreadId = localStorage.getItem(activeKey) || null;
}

async function syncThreadsFromServer() {
    if (!authenticatedUserId) return;
    try {
        const localThreads = [...threads];
        for (const localThread of localThreads) {
            const existingResponse = await fetch(`/api/threads/${encodeURIComponent(localThread.id)}`, { credentials: "same-origin", cache: "no-store" });
            if (existingResponse.status === 404) {
                const messages = Array.isArray(localThread.messages) ? localThread.messages : [];
                if (messages.length) {
                    const saved = await fetch(`/api/threads/${encodeURIComponent(localThread.id)}/messages`, {
                        method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ title: localThread.title || "Conversation", messages })
                    });
                    if (!saved.ok) throw new Error("Could not import an existing conversation into persistent storage.");
                } else {
                    const created = await fetch("/api/conversations", {
                        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ conversationId: localThread.id })
                    });
                    if (!created.ok) throw new Error("Could not create persistent conversation storage.");
                }
            }
        }
        const response = await fetch("/api/threads", { credentials: "same-origin", cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !Array.isArray(data.threads)) throw new Error(data.error || "Could not load saved conversations.");
        const localById = new Map(threads.map(thread => [thread.id, thread]));
        threads = data.threads.map(thread => ({ ...localById.get(thread.id), ...thread }));
        if (!threads.length) {
            activeThreadId = null;
            createNewThread();
            return;
        }
        if (!threads.some(thread => thread.id === activeThreadId)) activeThreadId = threads[0].id;
        saveThreadsToStorage();
        renderThreads();
        loadThread(activeThreadId);
    } catch (error) {
        console.error("Conversation synchronization failed:", error.message);
        showPopup("Conversation Sync Failed", error.message || "Could not synchronize saved conversations.", "error", 7000);
    }
}

function getActiveThread() {
    return threads.find((thread) => thread.id === activeThreadId);
}

function clearChatMessages() {
    const messages = chat?.querySelectorAll(".message");
    messages?.forEach((message) => {
        message.remove();
    });
}
/* =========================================================
   CREATE NEW THREAD
========================================================= */
function createNewThread() {
    const newThread = {
        id: "thread_" + Date.now(),
        title: "New Conversation",
        messages: []
    };
    threads.unshift(newThread);
    activeThreadId = newThread.id;
    saveThreadsToStorage();
    clearChatMessages();
    welcome.classList.remove("hidden");
    messageInput.value = "";
    autoResize();
    renderThreads();
    sideMenu.classList.remove("open");
    messageInput.focus();
}
/* =========================================================
   LOAD THREAD
========================================================= */

function loadThread(id) {
    const thread = threads.find((item) => item.id === id);

    if (!thread) {
        return;
    }

    activeThreadId = id;
    saveThreadsToStorage();

    MigrationManager.setConversation(id);
    updateCompressionCooldown();
    loadContextUsage();
    loadStoredCompression(thread);
    syncThreadMessagesFromServer(id);

    clearChatMessages();

    if (!thread.messages || thread.messages.length === 0) {
        welcome.classList.remove("hidden");
    } else {
        welcome.classList.add("hidden");

        thread.messages.forEach((message) => {
            const messageType =
                message.role === "assistant" || message.role === "ai"
                    ? "ai"
                    : message.role;

            addMessage(
                message.content,
                messageType,
                message.message_id,
                message.priority || 0
            );
        });
    }

    renderThreads();
    sideMenu?.classList.remove("open");
}

async function syncThreadMessagesFromServer(threadId) {
    if (!/^thread_[a-zA-Z0-9_-]+$/.test(String(threadId || ""))) return null;
    try {
        const response = await fetch(`/api/threads/${encodeURIComponent(threadId)}`, {
            credentials: "same-origin",
            cache: "no-store"
        });
        if (!response.ok) return null;
        const data = await response.json().catch(() => ({}));
        const remoteMessages = data?.thread?.messages;
        if (!Array.isArray(remoteMessages) || !remoteMessages.length) return null;
        const thread = threads.find(item => item.id === threadId);
        if (!thread) return null;
        thread.messages = remoteMessages;
        saveThreadsToStorage();
        if (activeThreadId === threadId) {
            clearChatMessages();
            welcome?.classList.toggle("hidden", remoteMessages.length > 0);
            remoteMessages.forEach(message => addMessage(message.content, message.role === "assistant" || message.role === "ai" ? "ai" : "user", message.message_id, message.priority || 0));
            estimateVisibleContextUsage();
        }
        return thread;
    } catch (error) {
        console.warn("Could not refresh this conversation from saved history:", error.message);
        return null;
    }
}

async function loadStoredCompression(thread) {
    if (!thread?.id || !/^thread_[a-zA-Z0-9_-]+$/.test(thread.id)) return;
    try {
        const response = await fetch(`/api/threads/${encodeURIComponent(thread.id)}/compression`, { credentials: "same-origin", cache: "no-store" });
        if (response.status === 401 || response.status === 404) return;
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.compression) return;
        thread.compression = data.compression;
        saveThreadsToStorage();
        if (getActiveThread()?.id === thread.id) updateCompressionCooldown();
    } catch (error) {
        console.warn("Could not load saved compression context:", error.message);
    }
}

/* =========================================================
   DELETE THREAD
========================================================= */

async function deleteThread(id, event) {
    event.stopPropagation();

    const deleteButton = event.currentTarget;
    if (deleteButton) deleteButton.disabled = true;

    try {
        const response = await fetch(`/api/threads/${encodeURIComponent(id)}`, {
            method: "DELETE",
            credentials: "same-origin",
            headers: { "Accept": "application/json" }
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok || data.success !== true) {
            throw new Error(data.error || "The conversation could not be deleted from your account.");
        }

        threads = threads.filter((thread) => thread.id !== id);

        if (activeThreadId === id) {
            if (threads.length > 0) {
                activeThreadId = threads[0].id;
                loadThread(activeThreadId);
            } else {
                saveThreadsToStorage();
                renderThreads();
                createNewThread();
                return;
            }
        }

        saveThreadsToStorage();
        renderThreads();
    } catch (error) {
        if (deleteButton) deleteButton.disabled = false;
        showPopup("Could Not Delete Conversation", error.message || "Please try again.", "error");
    }
}
/* =========================================================
   RENDER THREADS
========================================================= */
function renderThreads() {
    if (!threadsList) return;
    threadsList.innerHTML = "";
    threads.forEach((thread) => {
        const item = document.createElement("div");
        item.className = `thread-item ${thread.id === activeThreadId ? "active" : ""}`;
        item.onclick = () => loadThread(thread.id);
        item.innerHTML = `
                <span class="thread-title">${escapeHtml(thread.title)}</span>
                <button class="thread-delete-btn" title="Delete conversation">&times;</button>
            `;
        const deleteButton = item.querySelector(".thread-delete-btn");
        if (deleteButton) {
            deleteButton.onclick = (event) => deleteThread(thread.id, event);
        }
        threadsList.appendChild(item);
    });
}

newConversationButton?.addEventListener("click", async (event) => {
    event.stopPropagation();
    try {
        const response = await fetch("/auth/me");
        const auth = await response.json();
        if (!auth.authenticated) {
            showPopup("Login Required", "Please log in with Google to start a new conversation.", "warning");
            return;
        }
        createNewThread();
    } catch (error) {
        console.error("Authentication check failed:", error);
        showPopup("Something went wrong", "Could not verify your login. Please try again.", "error");
    }
});


/* =========================================================
   INITIALIZE CHAT HISTORY
========================================================= */

function initializeChatHistory() {
    try {
        if (threads.length === 0) {
            createNewThread();
            return;
        }

        const activeThreadExists = threads.some(
            (thread) => thread.id === activeThreadId
        );

        if (!activeThreadExists) {
            activeThreadId = threads[0].id;
            saveThreadsToStorage();
        }

        loadThread(activeThreadId);

    } catch (error) {
        console.error("Chat initialization failed:", error);

        showPopup(
            "Chat Loading Error",
            error.message || "Could not load your conversations.",
            "error"
        );
    }
}

initializeChatHistory();

/* =========================================================
   CHAT AND INPUT CLICK HANDLERS
========================================================= */
chat?.addEventListener("click", () => {
    sideMenu?.classList.remove("open");
    dismissWelcome();
});

inputContainer?.addEventListener("click", () => {
    sideMenu?.classList.remove("open");
    dismissWelcome();
});

/* ========================================================= WELCOME ========================================================= */
function dismissWelcome() {
    if (!welcome) return;
    welcome.classList.add("hidden");
}

function setContextActionStatus(message) {
    if (contextActionStatus) contextActionStatus.textContent = message;
}

function setContextUsage(usage) {
    const percent = Number(usage?.contextBudget?.usagePercent);
    const remaining = Number.isFinite(percent) ? Math.max(0, Math.min(100, 100 - percent)) : null;
    if (contextUsageLabel) contextUsageLabel.textContent = formatContextRemaining(remaining);
    if (contextUsageButton) {
        contextUsageButton.dataset.level = percent >= 95 ? "critical" : percent >= 80 ? "warning" : "normal";
        contextUsageButton.setAttribute("aria-label", remaining === null
            ? "Context window usage unavailable; open context tools"
            : `${formatContextRemaining(remaining)} of the context window remains; open context tools`);
        if (Number.isFinite(percent)) contextUsageButton.title = `${formatContextRemaining(remaining)} context remaining`;
    }
    if (contextUsageRing) {
        const circumference = 2 * Math.PI * 20;
        contextUsageRing.style.strokeDasharray = String(circumference);
        contextUsageRing.style.strokeDashoffset = remaining === null ? String(circumference) : String(circumference * (1 - remaining / 100));
    }
    if (remaining !== null && activeThreadId) {
        localStorage.setItem(`cloud_ai_context_usage_${activeThreadId}`, JSON.stringify({ usagePercent: percent, updatedAt: Date.now() }));
        window.MigrationManager?.checkUsageForConversation(activeThreadId, percent);
    }
}

function estimateVisibleContextUsage() {
    const thread = getActiveThread();
    const messages = getPillarSourceMessages(thread || { messages: [] });
    const estimate = messages.reduce((sum, message) => sum + Math.ceil(message.content.length / 4) + 4, 0);
    const activeApi = getActiveApi();
    const model = String(activeApi?.model || "").toLowerCase();
    const windowSize = model.includes("gpt-oss-20b") ? 131072 : null;
    if (!windowSize) {
        if (activeApi?.id) {
            const fallbackEstimate = estimate + Math.ceil((messageInput?.value?.length || 0) / 4);
            const fallbackBudget = 32768 - 4096 - Math.ceil(32768 * 0.1);
            const usagePercent = Math.min(100, fallbackEstimate / fallbackBudget * 100);
            setContextUsage({ contextBudget: { usagePercent } });
            if (contextUsageButton) contextUsageButton.title = "Approximate remaining context using a 32k fallback; provider usage replaces this after a reply";
        } else setContextUsage(null);
        return;
    }
    const inputTokens = estimate + Math.ceil((messageInput?.value?.length || 0) / 4);
    const inputBudget = windowSize - 4096 - Math.ceil(windowSize * 0.1);
    const usagePercent = Math.min(100, inputTokens / inputBudget * 100);
    setContextUsage({ contextBudget: { usagePercent } });
}

function loadContextUsage() {
    try {
        const saved = JSON.parse(localStorage.getItem(`cloud_ai_context_usage_${activeThreadId}`) || "null");
        if (saved && Date.now() - saved.updatedAt < 24 * 60 * 60 * 1000) {
            setContextUsage({ contextBudget: { usagePercent: saved.usagePercent } });
        } else estimateVisibleContextUsage();
    } catch { estimateVisibleContextUsage(); }
}

function formatContextRemaining(remaining) {
    if (remaining === null) return "—";
    if (remaining >= 99.95) return `${(Math.floor(remaining * 10) / 10).toFixed(1)}%`;
    if (remaining >= 10) return `${remaining.toFixed(1)}%`;
    return `${remaining.toFixed(2)}%`;
}

contextUsageButton?.addEventListener("click", () => {
    const open = contextTools?.classList.toggle("open") || false;
    contextUsageButton.setAttribute("aria-expanded", String(open));
    contextToolsMenu?.setAttribute("aria-hidden", String(!open));
});

messageInput?.addEventListener("input", estimateVisibleContextUsage);

document.addEventListener("click", event => {
    if (contextTools && !contextTools.contains(event.target)) {
        contextTools.classList.remove("open");
        contextUsageButton?.setAttribute("aria-expanded", "false");
        contextToolsMenu?.setAttribute("aria-hidden", "true");
    }
});

function updateCompressionCooldown() {
    const thread = getActiveThread();
    const compressedAt = Number(thread?.compression?.lastSuccessfulAt || 0);
    const remaining = compressedAt + COMPRESSION_COOLDOWN_MS - Date.now();
    const coolingDown = remaining > 0;
    if (compressConversationButton) {
        compressConversationButton.disabled = coolingDown;
        compressConversationButton.title = coolingDown
            ? `Available in ${Math.ceil(remaining / 3600000)} hour(s)`
            : "Create and save a compact context summary";
    }
    if (coolingDown) {
        const hours = Math.floor(remaining / 3600000);
        const minutes = Math.ceil((remaining % 3600000) / 60000);
        setContextActionStatus(`Manual compression available in ${hours}h ${minutes}m.`);
    } else if (contextActionStatus?.textContent.startsWith("Manual compression available")) {
        setContextActionStatus("");
    }
}

function getPillarSourceMessages(thread) {
    return (thread.messages || []).map((message, index) => ({ message, index })).filter(({ message }) =>
        message && ["user", "assistant", "ai"].includes(message.role) &&
        typeof message.content === "string" && message.content.trim()
    ).map(({ message, index }) => ({
        index,
        role: message.role === "ai" ? "assistant" : message.role,
        content: message.content,
        priority: Number.isInteger(message.priority) ? message.priority : 0
    }));
}

async function buildPillarRequest(thread, operation) {
    const activeApi = getActiveApi();
    if (!activeApi?.id) throw new Error("Select a saved API key before using context tools.");
    const response = await fetch(`/api/threads/${encodeURIComponent(thread.id)}/pillar-source?apiId=${encodeURIComponent(activeApi.id)}&operation=${encodeURIComponent(operation)}`, {
        credentials: "same-origin", cache: "no-store"
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Could not load the saved conversation for context management.");
    if (operation !== "compression" && data.overflowStarred?.length) {
        const tooLarge = data.overflowStarred.some(message => message.estimatedTokens > data.tokenBudget);
        throw new Error(`${data.overflowStarred.length} starred message${data.overflowStarred.length === 1 ? "" : "s"} could not fit in the ${Number(data.tokenBudget).toLocaleString()} token estimate budget${tooLarge ? ", including a message larger than the entire budget" : ""}. Shorten or unstar messages before continuing; none were silently dropped.`);
    }
    const messages = Array.isArray(data.selectedMessages) ? data.selectedMessages : [];
    const allMessages = Array.isArray(data.allMessages) ? data.allMessages : messages;
    if ((operation === "compression" ? allMessages.length : messages.length) < 2) {
        throw new Error("This conversation does not have enough saved messages to migrate or compress.");
    }
    const history = messages.map(message =>
        `[${message.role === "user" ? "USER" : "ASSISTANT (unverified unless user-confirmed)"}; priority ${message.priority}; ${message.estimateSource.replaceAll("_", " ")} ${message.estimatedTokens} tokens]\n${message.content}`
    ).join("\n\n");
    return {
        apiId: activeApi.id,
        provider: String(activeApi.provider || "").toLowerCase(),
        model: String(activeApi.model || ""),
        messages,
        allMessages,
        tokenEstimate: Number(data.totalSourceTokens) || 0,
        history,
        budget: Number(data.tokenBudget) || 0,
        inputCapacity: Number(data.inputCapacity) || 0,
        selectedTokens: Number(data.selectedTokens) || 0,
        starredTokenEstimate: Number(data.starredTokens) || 0,
        sourceMessageCount: Number(data.sourceMessageCount) || messages.length,
        starredCount: Number(data.starredMessageCount) || 0,
        omittedMessageCount: Number(data.omittedMessageCount) || 0,
        estimateSources: data.estimateSources || [],
        capacitySource: data.capacitySource || "conservative_fallback"
    };
}

async function generatePillarContent(apiId, threadId, sourceMessages, instruction, maxWords) {
    const prompt = `${instruction}\nFollow the source policy strictly: USER messages are authoritative. ASSISTANT messages are unverified and may be included only as attributed assistant statements or when the user explicitly confirms them. Do not invent or infer facts. Write "Not specified" for missing information. Do not import information from other conversations or website-wide state. Keep the result under ${maxWords} words and return plain Markdown only.\n\nMessages from this conversation only:\n\n${sourceMessages}\n\nCreate the requested output now.`;
    const payload = [{ role: "user", content: prompt }];
    const task = instruction.includes("structured Master Prompt") ? "context_migration" : "context_compression";
    const response = await fetch("/api/chat", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiId, threadId, usageScope: "pillar_generation", messages: payload })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Generation failed (${response.status}).`);
    if (typeof data.reply !== "string" || !data.reply.trim()) throw new Error("The selected model returned an empty result.");
    return { reply: data.reply.trim(), usage: data.usage || null, task };
}

function showMigrationReview(prompt, metadata) {
    return new Promise(resolve => {
        const overlay = document.createElement("div");
        overlay.className = "pillar-review-overlay";
        const dialog = document.createElement("section");
        dialog.className = "pillar-review-dialog";
        const title = document.createElement("h2");
        title.textContent = "Review Master Prompt";
        const details = document.createElement("p");
        details.textContent = `Estimated source size: ${metadata.tokenEstimate.toLocaleString()} tokens. ${metadata.starredCount} starred messages were prioritized. ${metadata.omittedMessageCount} other messages were omitted from the model input. Counts are estimates (${metadata.estimateSources.join(", ") || "unknown source"}). Edit the prompt before creating the new chat.`;
        const preview = document.createElement("div");
        preview.className = "pillar-review-preview markdown-content";
        renderAssistantMarkdown(preview, prompt);
        const textarea = document.createElement("textarea");
        textarea.value = prompt;
        textarea.hidden = true;
        textarea.setAttribute("aria-label", "Generated Master Prompt");
        const actions = document.createElement("div");
        actions.className = "pillar-review-actions";
        const edit = document.createElement("button");
        edit.type = "button";
        edit.className = "pillar-action-button";
        edit.textContent = "Edit Markdown";
        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.className = "pillar-action-button";
        cancel.textContent = "Cancel";
        const confirm = document.createElement("button");
        confirm.type = "button";
        confirm.className = "pillar-action-button primary";
        confirm.textContent = "Create new chat";
        actions.append(edit, cancel, confirm);
        dialog.append(title, details, preview, textarea, actions);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        const finish = value => { overlay.remove(); resolve(value); };
        edit.addEventListener("click", () => {
            const editing = textarea.hidden;
            if (editing) {
                textarea.hidden = false;
                preview.hidden = true;
                edit.textContent = "Preview Markdown";
                textarea.focus();
            } else {
                renderAssistantMarkdown(preview, textarea.value);
                textarea.hidden = true;
                preview.hidden = false;
                edit.textContent = "Edit Markdown";
            }
        });
        cancel.addEventListener("click", () => finish(null));
        confirm.addEventListener("click", () => finish(textarea.value.trim()));
        overlay.addEventListener("click", event => { if (event.target === overlay) finish(null); });
    });
}

function showCompressionReview(summary, metadata) {
    return new Promise(resolve => {
        const overlay = document.createElement("div");
        overlay.className = "pillar-review-overlay";
        const dialog = document.createElement("section");
        dialog.className = "pillar-review-dialog";
        const title = document.createElement("h2");
        title.textContent = "Review Compressed Context";
        const details = document.createElement("p");
        details.textContent = `This will replace ${metadata.sourceMessageCount} active messages with the summary and preserve starred messages. Estimated tokens: ${metadata.sourceTokenEstimate.toLocaleString()} → ${metadata.compressedTokenEstimate.toLocaleString()} (${metadata.estimateSource}). Estimated usable input capacity: ${metadata.inputCapacity.toLocaleString()} tokens (${metadata.capacitySource}). Per-chunk source target: ${metadata.tokenBudget.toLocaleString()} tokens. All values are estimates.`;
        const preview = document.createElement("div");
        preview.className = "pillar-review-preview markdown-content";
        renderAssistantMarkdown(preview, summary);
        const textarea = document.createElement("textarea");
        textarea.value = summary;
        textarea.hidden = true;
        textarea.setAttribute("aria-label", "Generated compressed context");
        const actions = document.createElement("div");
        actions.className = "pillar-review-actions";
        const edit = document.createElement("button");
        edit.type = "button";
        edit.className = "pillar-action-button";
        edit.textContent = "Edit Markdown";
        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.className = "pillar-action-button";
        cancel.textContent = "Cancel";
        const confirm = document.createElement("button");
        confirm.type = "button";
        confirm.className = "pillar-action-button primary";
        confirm.textContent = "Apply compression";
        actions.append(edit, cancel, confirm);
        dialog.append(title, details, preview, textarea, actions);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        const finish = value => { overlay.remove(); resolve(value); };
        edit.addEventListener("click", () => {
            const editing = textarea.hidden;
            if (editing) {
                textarea.hidden = false;
                preview.hidden = true;
                edit.textContent = "Preview Markdown";
                textarea.focus();
            } else {
                renderAssistantMarkdown(preview, textarea.value);
                textarea.hidden = true;
                preview.hidden = false;
                edit.textContent = "Edit Markdown";
            }
        });
        cancel.addEventListener("click", () => finish(null));
        confirm.addEventListener("click", () => finish(textarea.value.trim()));
        overlay.addEventListener("click", event => { if (event.target === overlay) finish(null); });
    });
}

async function runMigration() {
    let thread = getActiveThread();
    if (!thread) return;
    if (migrateConversationButton) migrateConversationButton.disabled = true;
    setContextActionStatus("Preparing a structured Master Prompt…");
    try {
        thread = await syncThreadMessagesFromServer(thread.id) || thread;
        const request = await buildPillarRequest(thread, "migration");
        const generated = await generatePillarContent(request.apiId, thread.id, request.history,
            "Create a structured Master Prompt from this conversation only for continuing it in a new conversation. Include these headings: Project or Conversation Objective; Background and Important Context; User Instructions; Important Decisions; Technical Information; Current Progress; Pending Tasks; Known Problems; Important Constraints; Next Recommended Steps. Treat starred messages as important, but do not convert unconfirmed assistant claims into facts. Do not import details from other conversations or invent anything.", 2200);
        const prompt = generated.reply;
        const approvedPrompt = await showMigrationReview(prompt, {
            tokenEstimate: request.tokenEstimate, starredCount: request.starredCount,
            omittedMessageCount: request.omittedMessageCount, estimateSources: request.estimateSources
        });
        if (!approvedPrompt) {
            setContextActionStatus("Migration cancelled. The original conversation is unchanged.");
            return;
        }
        const newThread = {
            id: "thread_" + Date.now(),
            title: `Continue: ${thread.title || "Conversation"}`.slice(0, 60),
            messages: [{ message_id: `thread_${Date.now()}_master_prompt`, role: "user", content: `Use this Master Prompt as the working context for continuing the project:\n\n${approvedPrompt}`, priority: 0 }],
            migratedFrom: thread.id,
            masterPrompt: approvedPrompt
        };
        threads.unshift(newThread);
        activeThreadId = newThread.id;
        try {
            const persisted = await fetch(`/api/threads/${encodeURIComponent(newThread.id)}/messages`, {
                method: "PUT", credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: newThread.title, messages: newThread.messages })
            });
            const persistedData = await persisted.json().catch(() => ({}));
            if (!persisted.ok) throw new Error(persistedData.error || "Could not persist the new conversation.");
        } catch (persistError) {
            threads.shift();
            activeThreadId = thread.id;
            throw persistError;
        }
        saveThreadsToStorage();
        clearChatMessages();
        welcome?.classList.add("hidden");
        addMessage(newThread.messages[0].content, "user", newThread.messages[0].message_id, 0);
        renderThreads();
        MigrationManager.setConversation(newThread.id);
        updateCompressionCooldown();
        if (typeof LocalConversationStorage !== "undefined" && LocalConversationStorage.isFolderSelected()) {
            try { await LocalConversationStorage.saveConversation(newThread); }
            catch (archiveError) { console.warn("Could not copy migrated chat to archive:", archiveError.message); }
        }
        setContextActionStatus("New chat created with the reviewed Master Prompt. The original conversation is preserved.");
    } catch (error) {
        console.error("Auto-migration failed:", error);
        setContextActionStatus(error.message || "Could not prepare a Master Prompt.");
    } finally {
        if (migrateConversationButton) migrateConversationButton.disabled = false;
    }
}

async function runCompression() {
    let thread = getActiveThread();
    if (!thread) return;
    if (Number(thread.compression?.lastSuccessfulAt || 0) + COMPRESSION_COOLDOWN_MS > Date.now()) {
        updateCompressionCooldown();
        return;
    }
    if (compressConversationButton) compressConversationButton.disabled = true;
    setContextActionStatus("Compressing conversation context…");
    try {
        thread = await syncThreadMessagesFromServer(thread.id) || thread;
        if (getActiveThread()?.id !== thread.id) throw new Error("The active conversation changed. Reopen its context tools and try again.");
        const request = await buildPillarRequest(thread, "compression");
        const compressionInstruction = "Create a useful, information-dense record of the supplied conversation messages for continuing the SAME conversation after compression. Do not reduce the conversation to a list of topics or generic statements. Preserve concrete user goals and requests; exact constraints and preferences; named entities, technical terms, settings, versions, errors, and important values; decisions and their reasons; steps already completed and their outcomes; useful explanations or answers given by the assistant; unresolved questions, blockers, and next actions. Keep important relationships and sequence when they affect meaning. USER messages are authoritative for the user’s intent and facts about the user’s project. ASSISTANT messages are not automatically confirmed facts: retain useful assistant explanations as attributed guidance, and mark claims or suggestions as unconfirmed unless the user accepted or verified them. Preserve all unique information; remove only repetition and irrelevant small talk. Do not invent, guess, or import information from outside the supplied messages. If a detail is unclear, say it is unclear rather than filling the gap.";
        const sourceForCompression = request.allMessages.length ? request.allMessages : request.messages;
        const chunks = [];
        let currentChunk = [];
        let currentTokens = 0;
        const isGroqOss = request.provider === "groq" && request.model === "openai/gpt-oss-20b";
        // The context window is not the provider's TPM allowance. Keep Groq
        // compression inputs deliberately smaller so prompt and output tokens fit too.
        const chunkLimit = isGroqOss
            ? Math.min(2600, Math.max(500, request.budget || 2600))
            : Math.max(500, request.budget || 3000);
        for (const message of sourceForCompression) {
            const content = String(message.content || "");
            const estimated = Number.isFinite(message.estimatedTokens)
                ? message.estimatedTokens
                : Math.max(1, Math.ceil(content.length / 4));
            const pieces = estimated > chunkLimit
                ? Array.from({ length: Math.ceil(estimated / chunkLimit) }, (_, partIndex, all) => {
                    const start = Math.floor(content.length * partIndex / all.length);
                    const end = Math.floor(content.length * (partIndex + 1) / all.length);
                    return content.slice(start, end);
                })
                : [content];
            for (let partIndex = 0; partIndex < pieces.length; partIndex++) {
                const piece = pieces[partIndex];
                const pieceCost = Math.max(1, Math.ceil(estimated / pieces.length));
                if (currentChunk.length && currentTokens + pieceCost > chunkLimit) {
                    chunks.push(currentChunk);
                    currentChunk = [];
                    currentTokens = 0;
                }
                currentChunk.push({
                    ...message,
                    content: pieces.length > 1
                        ? `[Message segment ${partIndex + 1}/${pieces.length}]\\n${piece}`
                        : piece
                });
                currentTokens += pieceCost;
            }
        }
        if (currentChunk.length) chunks.push(currentChunk);
        if (!chunks.length) throw new Error("No conversation messages were available to compress.");
        let summaries = [];
        for (let index = 0; index < chunks.length; index++) {
            const chunkText = chunks[index].map(message =>
                `[${message.role === "user" ? "USER" : "ASSISTANT"}; priority ${message.priority || 0}]\\n${message.content}`
            ).join("\\n\\n");
            setContextActionStatus(`Summarizing conversation part ${index + 1} of ${chunks.length}…`);
            const part = await generatePillarContent(request.apiId, thread.id, chunkText, compressionInstruction, 350);
            summaries.push(part.reply);
        }
        const finalInstruction = "Synthesize ALL supplied part summaries into one reusable context record that lets a new assistant continue this exact conversation without asking the user to repeat important information. Do not turn the result into a topic list. Preserve every distinct requirement, constraint, preference, decision, reason, technical detail, identifier, error, completed action, test result, unresolved issue, and next step. Retain specific values and names exactly when supplied. Distinguish user-confirmed facts and decisions from assistant suggestions or unverified claims; never upgrade an assistant suggestion into a confirmed decision. Merge duplicates, but do not discard unique details merely to make the summary shorter. Include these sections: Objective; User Requirements and Constraints; Decisions and Rationale; Important Conversation Details; Technical Context; Completed Work and Outcomes; Current State; Unresolved Issues and Risks; Pending Tasks / Next Steps. If a section has no supported information, write Not specified. Do not invent facts or import information from outside the supplied summaries.";
        const summaryTokenEstimate = value => Math.ceil(String(value || "").length / 3.5) + 64;
        const mergeInputLimit = isGroqOss
            ? 3600
            : Math.max(1200, Math.floor((request.inputCapacity || request.budget * 3) * 0.6));
        let round = 1;

        // Avoid repeatedly summarizing already-small summaries. Only use another
        // reduction pass when the combined summaries would exceed a conservative
        // share of the model's actual input capacity.
        while (summaries.length > 1 &&
            summaries.reduce((total, summary) => total + summaryTokenEstimate(summary), 0) > mergeInputLimit) {
            const reduced = [];
            for (let index = 0; index < summaries.length; index += 3) {
                const group = summaries.slice(index, index + 3);
                const groupText = group.map((summary, offset) =>
                    `SOURCE SUMMARY ${index + offset + 1} (preserve its unique details):\\n${summary}`
                ).join("\\n\\n");
                setContextActionStatus(`Combining compression summaries (pass ${round})…`);
                const mergeWordTarget = Math.min(1800, Math.max(700, group.length * 500));
                const merged = await generatePillarContent(request.apiId, thread.id, groupText, finalInstruction, mergeWordTarget);
                reduced.push(merged.reply);
            }
            if (reduced.length >= summaries.length) {
                throw new Error("Compression could not safely reduce the intermediate summaries. The original conversation is unchanged.");
            }
            summaries = reduced;
            round++;
        }

        let compressed = summaries[0];
        if (summaries.length > 1) {
            const finalSource = summaries.map((summary, index) =>
                `SOURCE SUMMARY ${index + 1} (retain every distinct fact and decision):\\n${summary}`
            ).join("\\n\\n");
            setContextActionStatus("Creating the final compressed context…");
            const finalWordTarget = Math.min(2400, Math.max(900, summaries.length * 400));
            const finalResult = await generatePillarContent(request.apiId, thread.id, finalSource, finalInstruction, finalWordTarget);
            compressed = finalResult.reply;
        }
        const tokenEstimateResponse = await fetch("/api/token-estimate", {
            method: "POST", credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ apiId: request.apiId, text: compressed })
        });
        const tokenEstimateData = await tokenEstimateResponse.json().catch(() => ({}));
        if (!tokenEstimateResponse.ok) throw new Error(tokenEstimateData.error || "Could not estimate the compressed summary size.");
        let compressedEstimate = tokenEstimateData.estimatedTokens;
        if (compressedEstimate >= Math.max(1, request.tokenEstimate - request.starredTokenEstimate)) {
            throw new Error("The summary did not reduce the estimated context by at least 10%. No changes were saved.");
        }
        const approvedSummary = await showCompressionReview(compressed, {
            sourceTokenEstimate: request.tokenEstimate,
            compressedTokenEstimate: compressedEstimate,
            sourceMessageCount: request.sourceMessageCount,
            selectedTokens: request.selectedTokens,
            tokenBudget: request.budget,
            inputCapacity: request.inputCapacity,
            capacitySource: request.capacitySource,
            estimateSource: tokenEstimateData.source
        });
        if (!approvedSummary) {
            setContextActionStatus("Compression cancelled. The conversation is unchanged.");
            return;
        }
        if (approvedSummary !== compressed) {
            const editedEstimateResponse = await fetch("/api/token-estimate", {
                method: "POST", credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ apiId: request.apiId, text: approvedSummary })
            });
            const editedEstimateData = await editedEstimateResponse.json().catch(() => ({}));
            if (!editedEstimateResponse.ok) throw new Error(editedEstimateData.error || "Could not estimate the edited summary.");
            compressedEstimate = editedEstimateData.estimatedTokens;
            if (compressedEstimate >= Math.max(1, request.tokenEstimate - request.starredTokenEstimate)) {
                throw new Error("The edited summary no longer reduces the estimated context size. No changes were saved.");
            }
        }
        const summarizedMessages = request.allMessages.filter(message => message.priority > 0).map(message => ({
            role: message.role,
            content: message.content,
            priority: message.priority,
            message_id: message.message_id,
            timestamp: message.timestamp
        }));
        summarizedMessages.push({ message_id: `${thread.id}_summary_${Date.now()}`, role: "assistant", content: `[Conversation context compressed by user]\n${approvedSummary}`, priority: 0 });
        const nextMessages = summarizedMessages;
        setContextActionStatus("Saving the archive, summary, and cooldown together…");
        const stored = await fetch(`/api/threads/${encodeURIComponent(thread.id)}/compression`, {
            method: "PUT",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                summary: approvedSummary,
                sourceTokenEstimate: request.tokenEstimate,
                compressedTokenEstimate: compressedEstimate,
                sourceMessageCount: request.sourceMessageCount,
                activeMessages: nextMessages,
                originalTitle: thread.title || "Conversation",
                estimateSource: tokenEstimateData.source
            })
        });
        const storedData = await stored.json().catch(() => ({}));
        if (!stored.ok) throw new Error(storedData.error || "Could not save compression. The server left the original messages unchanged.");
        thread.messages = nextMessages;
        thread.compression = storedData.compression;
        saveThreadsToStorage();
        if (getActiveThread()?.id === thread.id) {
            clearChatMessages();
            thread.messages.forEach(message => addMessage(message.content, message.role === "assistant" || message.role === "ai" ? "ai" : "user", message.message_id, message.priority || 0));
            estimateVisibleContextUsage();
        }
        if (typeof LocalConversationStorage !== "undefined" && LocalConversationStorage.isFolderSelected()) {
            try { await LocalConversationStorage.saveConversation(thread); }
            catch (archiveError) { console.warn("Could not copy compression summary to archive:", archiveError.message); }
        }
        updateCompressionCooldown();
        setContextActionStatus(`Context compressed and archived (${request.tokenEstimate.toLocaleString()} → ${compressedEstimate.toLocaleString()} estimated tokens). ${request.omittedMessageCount} ordinary message${request.omittedMessageCount === 1 ? " was" : "s were"} summarized; starred messages were preserved.`);
    } catch (error) {
        console.error("Conversation compression failed:", error);
        if (compressConversationButton) compressConversationButton.disabled = false;
        setContextActionStatus(error.message || "Could not compress this conversation.");
    }
}

migrateConversationButton?.addEventListener("click", runMigration);
compressConversationButton?.addEventListener("click", runCompression);
window.addEventListener("migration:pillar1", runMigration);
window.addEventListener("migration:pillar2", runCompression);


async function saveMessageToServer(conversationId, role, content) {
    const serverRole = role === "ai" ? "assistant" : role;

    try {
        const localThread = threads.find(thread => thread.id === conversationId);
        const archiveResponse = await fetch(`/api/threads/${encodeURIComponent(conversationId)}/messages`, {
            method: "POST", credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: serverRole, content, title: localThread?.title || "New Conversation" })
        });
        const archiveData = await archiveResponse.json().catch(() => ({}));
        if (!archiveResponse.ok || !archiveData.success) throw new Error(archiveData.error || "Message could not be saved.");
        if (typeof LocalConversationStorage !== "undefined" && LocalConversationStorage.isFolderSelected()) {
            LocalConversationStorage.saveMessage(conversationId, serverRole, content).catch(error => console.warn("Local archive write failed:", error.message));
        }
        return archiveData.message;
    } catch (error) {
        console.error("Conversation storage error:", error);
        return false;
    }

    // 1. Save to the selected local archive folder
    if (
        typeof LocalConversationStorage !== "undefined" &&
        LocalConversationStorage.isFolderSelected()
    ) {
        try {
            await LocalConversationStorage.saveMessage(
                conversationId,
                serverRole,
                content
            );
        } catch (error) {
            console.error("Local file save failed:", error);

            showPopup(
                "Local Archive Save Failed",
                "This message may not be saved in your selected folder.",
                "error",
                7000
            );
        }
    }

    // 2. Save to server-side conversation storage
    try {
        const response = await fetch(
            `/api/threads/${conversationId}/messages`,
            {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    role: serverRole,
                    content
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.error || "Message could not be saved."
            );
        }

        return data.message;

    } catch (error) {
        console.error("Conversation storage error:", error);
        return false;
    }
}

/* ========================================================= SECURE ENGINE CHAT SYSTEM ========================================================= */

async function sendMessage() {
    let loadingMessage = null;

    try {
        // 1. Check authentication
        const authResponse = await fetch("/auth/me", {
            credentials: "same-origin"
        });

        if (!authResponse.ok) {
            showPopup(
                "Login Required",
                "Please log in with Google to send AI messages.",
                "warning"
            );
            return;
        }

        const auth = await authResponse.json();

        if (!auth.authenticated) {
            showPopup(
                "Login Required",
                "Please log in with Google to send AI messages.",
                "warning"
            );
            return;
        }

        // 2. Validate input
        const text = messageInput.value.trim();

        if (!text) {
            showPopup(
                "Empty Message",
                "Please enter a message before sending.",
                "warning"
            );
            return;
        }

        const activeApi = getActiveApi();

        if (!activeApi) {
            showPopup(
                "No API Selected",
                "Please add an API key and select it before sending a message.",
                "warning"
            );
            return;
        }


        // 3. Get active conversation
        const currentThread = getActiveThread();

        if (!currentThread) {
            throw new Error("No active conversation was found.");
        }

        dismissWelcome();

        if (currentThread.messages.length === 0) {
            currentThread.title =
                text.slice(0, 24) + (text.length > 24 ? "..." : "");
        }

        // 4. Save user message to server
        const savedUserMessage = await saveMessageToServer(
            currentThread.id,
            "user",
            text
        );

        if (!savedUserMessage || !savedUserMessage.message_id) {
            throw new Error("Your message could not be saved.");
        }

        currentThread.messages.push(savedUserMessage);

        addMessage(
            savedUserMessage.content,
            "user",
            savedUserMessage.message_id,
            savedUserMessage.priority || 0
        );

        messageInput.value = "";
        autoResize();

        saveThreadsToStorage();
        renderThreads();

        // 5. Show loading indicator
        loadingMessage = addMessage("Thinking...", "ai");

        // 6. Prepare conversation history
        const conversationMessages = currentThread.messages.map(
            (message) => ({
                role: message.role === "ai"
                    ? "assistant"
                    : message.role,
                content: message.content
            })
        );

        // 7. Request AI response
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                apiId: activeApi.id,
                threadId: currentThread.id,
                usageScope: "conversation",
                messages: conversationMessages
            })
        });

        const data = await response.json().catch(() => ({}));

        loadingMessage?.remove();
        loadingMessage = null;

        if (!response.ok) {
            throw new Error(
                data?.error ||
                `The chat request failed (${response.status}).`
            );
        }

        // 8. Check migration usage
        const contextUsage = data?.usage?.contextBudget?.usagePercent;
        setContextUsage(data?.usage);

        if (Number.isFinite(contextUsage)) {
            window.MigrationManager?.checkUsageForConversation(
                currentThread.id,
                contextUsage
            );
        }

        // 9. Validate AI response
        const aiResponse = data?.reply;

        if (typeof aiResponse !== "string" || !aiResponse.trim()) {

            throw new Error("The server did not return an AI message.");
        }

        // 10. Save AI response to server
        const savedAIMessage = await saveMessageToServer(
            currentThread.id,
            "assistant",
            aiResponse
        );

        if (!savedAIMessage || !savedAIMessage.message_id) {
            throw new Error("The AI response could not be saved.");
        }

        currentThread.messages.push(savedAIMessage);

        addMessage(
            savedAIMessage.content,
            "ai",
            savedAIMessage.message_id,
            savedAIMessage.priority || 0
        );

        // 11. Update conversation storage and sidebar
        saveThreadsToStorage();
        renderThreads();

    } catch (error) {
        loadingMessage?.remove();

        console.error("SEND MESSAGE ERROR:", error);

        showPopup(
            "Something Went Wrong",
            error?.message ||
                "The message could not be sent. Check configurations.",
            "error"
        );
    }
}

function appendInlineMarkdown(parent, source) {
    const tokenPattern = /(\[[^\]]+\]\(https?:\/\/[^\s)]+\)|\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|_[^_]+_)/g;
    let cursor = 0;
    for (const match of source.matchAll(tokenPattern)) {
        if (match.index > cursor) parent.appendChild(document.createTextNode(source.slice(cursor, match.index)));
        const token = match[0];
        const linkMatch = token.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/i);
        let node;
        if (linkMatch) {
            node = document.createElement("a");
            node.href = linkMatch[2];
            node.target = "_blank";
            node.rel = "noopener noreferrer";
            node.textContent = linkMatch[1];
        } else if (token.startsWith("**") || token.startsWith("__")) {
            node = document.createElement("strong");
            node.textContent = token.slice(2, -2);
        } else if (token.startsWith("*" ) || token.startsWith("_")) {
            node = document.createElement("em");
            node.textContent = token.slice(1, -1);
        } else {
            node = document.createElement("code");
            node.textContent = token.slice(1, -1);
        }
        parent.appendChild(node);
        cursor = match.index + token.length;
    }
    if (cursor < source.length) parent.appendChild(document.createTextNode(source.slice(cursor)));
}

function splitMarkdownTableRow(line) {
    return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(cell => cell.trim());
}

function isMarkdownTableDivider(line) {
    const cells = splitMarkdownTableRow(line);
    return cells.length > 0 && cells.every(cell => /^:?-{3,}:?$/.test(cell));
}

function renderAssistantMarkdown(target, markdown) {
    const lines = String(markdown ?? "").replace(/\r/g, "").split("\n");
    let index = 0;
    const isBlockStart = line => /^(#{1,6})\s|^```|^~~~|^\s*(?:[-*+]\s+|\d+[.)]\s+|>\s*)|^\s*([-*_]\s*){3,}$/.test(line);
    while (index < lines.length) {
        const line = lines[index];
        if (!line.trim()) { index++; continue; }
        const fenceMatch = line.match(/^(```|~~~)\s*([a-zA-Z0-9_+-]*)\s*$/);
        if (fenceMatch) {
            const fence = fenceMatch[1];
            const language = fenceMatch[2].toLowerCase();
            const codeLines = [];
            index++;
            while (index < lines.length && !lines[index].startsWith(fence)) codeLines.push(lines[index++]);
            if (index < lines.length) index++;
            const codeText = codeLines.join("\n");
            const hasMarkdownHeading = /^\s{0,3}#{1,6}\s+\S/m.test(codeText);
            const hasMarkdownTable = codeLines.some((tableLine, lineIndex) =>
                tableLine.includes("|") && lineIndex + 1 < codeLines.length && isMarkdownTableDivider(codeLines[lineIndex + 1])
            );
            const hasMarkdownList = /^\s{0,3}(?:[-*+]\s+|\d+[.)]\s+)/m.test(codeText);
            const explicitlyMarkdown = language === "md" || language === "markdown";
            if (explicitlyMarkdown || hasMarkdownHeading || hasMarkdownTable || (language === "vbnet" && hasMarkdownList)) {
                renderAssistantMarkdown(target, codeText);
                continue;
            }
            const pre = document.createElement("pre");
            const code = document.createElement("code");
            if (language) code.className = `language-${language}`;
            code.textContent = codeText;
            pre.appendChild(code);
            target.appendChild(pre);
            continue;
        }
        const heading = line.match(/^(#{1,6})\s+(.+)$/);
        if (heading) {
            const element = document.createElement(`h${heading[1].length}`);
            appendInlineMarkdown(element, heading[2]);
            target.appendChild(element);
            index++;
            continue;
        }
        if (index + 1 < lines.length && line.includes("|") && isMarkdownTableDivider(lines[index + 1])) {
            const table = document.createElement("table");
            const head = document.createElement("thead");
            const headRow = document.createElement("tr");
            splitMarkdownTableRow(line).forEach(cell => {
                const th = document.createElement("th");
                appendInlineMarkdown(th, cell);
                headRow.appendChild(th);
            });
            head.appendChild(headRow);
            table.appendChild(head);
            index += 2;
            const body = document.createElement("tbody");
            while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
                const row = document.createElement("tr");
                splitMarkdownTableRow(lines[index++]).forEach(cell => {
                    const td = document.createElement("td");
                    appendInlineMarkdown(td, cell);
                    row.appendChild(td);
                });
                body.appendChild(row);
            }
            table.appendChild(body);
            target.appendChild(table);
            continue;
        }
        const listMatch = line.match(/^\s*([-*+]|\d+[.)])\s+(.+)$/);
        if (listMatch) {
            const ordered = /^\d/.test(listMatch[1]);
            const list = document.createElement(ordered ? "ol" : "ul");
            while (index < lines.length) {
                const item = lines[index].match(/^\s*([-*+]|\d+[.)])\s+(.+)$/);
                if (!item || /^\d/.test(item[1]) !== ordered) break;
                const li = document.createElement("li");
                appendInlineMarkdown(li, item[2]);
                list.appendChild(li);
                index++;
            }
            target.appendChild(list);
            continue;
        }
        if (/^\s*>\s?/.test(line)) {
            const quote = document.createElement("blockquote");
            while (index < lines.length && /^\s*>/.test(lines[index])) {
                const p = document.createElement("p");
                appendInlineMarkdown(p, lines[index++].replace(/^\s*>\s?/, ""));
                quote.appendChild(p);
            }
            target.appendChild(quote);
            continue;
        }
        if (/^\s*([-*_]\s*){3,}$/.test(line)) {
            target.appendChild(document.createElement("hr"));
            index++;
            continue;
        }
        const paragraph = document.createElement("p");
        const paragraphLines = [line];
        index++;
        while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index]) && !(index + 1 < lines.length && lines[index].includes("|") && isMarkdownTableDivider(lines[index + 1]))) {
            paragraphLines.push(lines[index++]);
        }
        paragraphLines.forEach((paragraphLine, lineIndex) => {
            if (lineIndex) paragraph.appendChild(document.createElement("br"));
            appendInlineMarkdown(paragraph, paragraphLine);
        });
        target.appendChild(paragraph);
    }
}

function addMessage(text, type, messageId = null, priority = 0) {
    const message = document.createElement("div");
    message.classList.add("message", type);
    const messageText = document.createElement("div");
    messageText.classList.add("message-text");
    if (type === "ai" && text !== "Thinking...") {
        messageText.classList.add("markdown-content");
        renderAssistantMarkdown(messageText, text);
    } else messageText.textContent = text;
    const starButton = document.createElement("button");
    starButton.classList.add("message-star");
    starButton.type = "button";
    starButton.setAttribute("aria-label", "Star message");
    starButton.setAttribute("title", "Star message");
    starButton.innerHTML = "☆";
    starButton.addEventListener("click", (event) => {
        event.stopPropagation();
        const thread = getActiveThread();
        const target = thread?.messages.find(item => item.message_id === messageId);
        const nextPriority = ((target?.priority || priority || 0) + 1) % 4;
        if (!target) {
            showPopup("Could Not Update Priority", "This message has no saved priority record yet.", "warning");
            return;
        }
        fetch(`/api/threads/${encodeURIComponent(thread.id)}/messages/${encodeURIComponent(messageId)}/priority`, {
            method: "PATCH", credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ priority: nextPriority })
        }).then(async response => {
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || "Priority update failed.");
            target.priority = nextPriority;
            saveThreadsToStorage();
            message.classList.toggle("starred", nextPriority > 0);
            starButton.textContent = nextPriority > 0 ? "★" : "☆";
            starButton.setAttribute("aria-label", nextPriority > 0 ? `${nextPriority} star priority` : "Star message");
            starButton.setAttribute("title", `Priority ${nextPriority} (0–3)`);
        }).catch(error => showPopup("Could Not Update Priority", error.message, "error"));
    });
    message.dataset.messageId = messageId || "";
    message.classList.toggle("starred", priority > 0);
    if (priority > 0) starButton.textContent = "★";
    message.appendChild(messageText);
    message.appendChild(starButton);
    chat?.appendChild(message);
    chat?.scrollTo({ top: chat.scrollHeight, behavior: "smooth" });
    return message;
}

sendButton?.addEventListener("click", sendMessage);

messageInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
});

messageInput?.addEventListener("input", autoResize);
function autoResize() {
    if (!messageInput) return;
    messageInput.style.height = "auto";
    messageInput.style.height = Math.min(messageInput.scrollHeight, 150) + "px";
}
/* ========================================================= THEME MANAGEMENT SYSTEM ========================================================= */
const themeGallery = document.getElementById("themeGallery");

function renderThemeCards() {
    if (!themeGallery) return;
    themeGallery.replaceChildren();
    Object.entries(window.CLOUD_THEMES || {}).forEach(([themeId, theme]) => {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "theme-card";
        card.dataset.theme = themeId;
        card.setAttribute("aria-label", `Apply ${theme.name} theme`);
        const preview = document.createElement("div");
        preview.className = "theme-preview";
        preview.style.backgroundImage = `url("${theme.image}")`;
        preview.style.setProperty("--preview-user", theme.user);
        preview.style.setProperty("--preview-ai", theme.ai);
        const overlay = document.createElement("div");
        overlay.className = "preview-overlay";
        const system = document.createElement("div");
        system.className = "preview-system";
        system.textContent = "● System · Ready";
        const ai = document.createElement("div");
        ai.className = "preview-ai";
        ai.textContent = "Hi! How can I help?";
        const user = document.createElement("div");
        user.className = "preview-user";
        user.textContent = "Let's build something.";
        const aiSmall = document.createElement("div");
        aiSmall.className = "preview-ai preview-small";
        aiSmall.textContent = "Sure — let's get started.";
        preview.append(overlay, system, ai, user, aiSmall);
        const name = document.createElement("div");
        name.className = "theme-name";
        const dot = document.createElement("span");
        dot.className = "theme-dot";
        dot.style.backgroundColor = theme.user;
        const label = document.createElement("span");
        label.textContent = theme.name;
        name.append(dot, label);
        card.append(preview, name);
        card.addEventListener("click", () => { changeTheme(themeId); });
        themeGallery.appendChild(card);
    });
}
renderThemeCards();

function changeTheme(themeName) {
    const selected = themes?.[themeName];
    if (!selected || !chat) return;
    chat.style.backgroundImage = `url("${selected.image}")`;
    document.documentElement.style.setProperty("--user-color", selected.user);
    document.documentElement.style.setProperty("--ai-color", selected.ai);
    localStorage.setItem("selectedTheme", themeName);
    closePages();
}

const savedTheme = localStorage.getItem("selectedTheme");
if (savedTheme && themes?.[savedTheme] && chat) {
    chat.style.backgroundImage = `url("${themes[savedTheme].image}")`;
    document.documentElement.style.setProperty("--user-color", themes[savedTheme].user);
    document.documentElement.style.setProperty("--ai-color", themes[savedTheme].ai);
}

if (customThemeInput) {
    customThemeInput.addEventListener("change", (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            showPopup("Invalid Image", "Please select an image file.", "warning");
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const image = reader.result;
            if (chat) chat.style.backgroundImage = `url("${image}")`;
            localStorage.setItem("customTheme", image);
            localStorage.setItem("selectedTheme", "custom");
            closePages();
        };
        reader.readAsDataURL(file);
    });
}
/* ========================================================= SECURE CREDENTIAL DATA LOADERS ========================================================= */
const apiSecrets = new Map();
let isLoadingApis = false;

async function loadApiEntries() {
    if (isLoadingApis) return;
    isLoadingApis = true;
    try {
        const response = await fetch("/api/keys", {
            method: "GET",
            credentials: "same-origin",
            headers: { "Accept": "application/json" }
        });
        if (response.status === 401) return;
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load API keys.");
        if (!Array.isArray(data.keys)) throw new Error("Unexpected response from the server.");

        let savedActiveId = null;
        try { savedActiveId = localStorage.getItem("activeApiId"); } catch (e) {}

        apiEntries = data.keys.map((item) => ({
            id: item.id,
            name: item.label,
            provider: PROVIDERS[item.provider] ? item.provider : "groq",
            model: item.model || PROVIDERS[item.provider]?.model,
            endpoint: item.endpoint,
            maskLength: 16,
            active: false
        }));

        const activeEntry = apiEntries.find((entry) => String(entry.id) === String(savedActiveId));
        if (activeEntry) {
            activeEntry.active = true;
        } else if (apiEntries.length > 0) {
            apiEntries[0].active = true;
        }

        normalizeActiveApi();
        renderApiEntries();
        renderApiSwitcher();
    } catch (error) {
        console.error("Loading API keys failed:", error);
        showPopup("Could Not Load APIs", "Check your connection and try again.", "error");
    } finally {
        isLoadingApis = false;
    }
}
loadApiEntries();

function openApiCreateForm() {
    if (!apiCreateCard || !addApiKeyButton) return;
    apiCreateCard.hidden = false;
    addApiKeyButton.hidden = true;
    apiNameInput?.focus();
}

function closeApiCreateForm() {
    if (!apiCreateCard || !addApiKeyButton) return;
    apiCreateCard.hidden = true;
    addApiKeyButton.hidden = false;
    if (apiNameInput) apiNameInput.value = "";
    if (apiKeyInput) apiKeyInput.value = "";
    selectedProvider = "groq";
    if (providerSelectValue) providerSelectValue.textContent = "Groq";
   
    providerSelectMenu?.classList.remove("open");
    if (customEndpointInput) {
    customEndpointInput.value = "";
}

if (customEndpointGroup) {
    customEndpointGroup.hidden = true;
}
}

addApiKeyButton?.addEventListener("click", async () => {
    try {
        const response = await fetch("/auth/me", { credentials: "same-origin" });
        if (!response.ok) {
            showPopup("Login Required", "Please log in with Google to add an API key.", "warning");
            return;
        }
        const auth = await response.json();
        if (!auth.authenticated) {
            showPopup("Login Required", "Please log in with Google to add an API key.", "warning");
            return;
        }
        openApiCreateForm();
    } catch (error) {
        showPopup("Unable to verify login", "Please try again.", "error");
    }
});

cancelCreateApiButton?.addEventListener("click", closeApiCreateForm);

providerSelectButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    providerSelectMenu?.classList.toggle("open");
});
providerOptions.forEach((option) => {
    option.addEventListener("click", (event) => {
        event.stopPropagation();

        selectedProvider = option.dataset.value || "groq";

        if (providerSelectValue) {
            providerSelectValue.textContent = option.textContent.trim();
        }

        providerOptions.forEach((item) => {
            item.classList.toggle("selected", item === option);
        });

        if (customEndpointGroup) {
            customEndpointGroup.hidden = selectedProvider !== "custom";
        }

        providerSelectMenu?.classList.remove("open");
    });
});
document.addEventListener("click", () => { providerSelectMenu?.classList.remove("open"); });
/* ========================================================= API KEYS INTERACTION & PERSISTENCE MANAGEMENT ========================================================= */

createApiButton?.addEventListener("click", async () => {
    const model = apiNameInput?.value.trim();
    const key = apiKeyInput?.value.trim();

    const endpoint =
        selectedProvider === "custom"
            ? customEndpointInput?.value.trim()
            : PROVIDERS[selectedProvider]?.endpoint;

    if (!model || !key) {
        showPopup(
            "Missing Details",
            "Enter the model name and API key.",
            "warning"
        );
        return;
    }

    if (selectedProvider === "custom" && !endpoint) {
    showPopup("Missing Endpoint", "Enter a valid provider endpoint.", "warning");
    return;
}

    try {
        await saveApi(model, key, selectedProvider, endpoint);
        closeApiCreateForm();
    } catch (error) {
        return;
    }
});

async function saveApi(model, key, providerKey, endpoint) {
    try {
        const response = await fetch("/api/keys", {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                provider: providerKey,
                label: model,
                model,
                endpoint,
                apiKey: key
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Could not save API key."
            );
        }

        const saved = data.key;

        if (!saved?.id) {
            throw new Error(
                "The server did not return the saved API."
            );
        }

        const entry = {
            id: saved.id,
            name: saved.label,
            provider: saved.provider,
            model: saved.model,
            endpoint: saved.endpoint,
            maskLength: 16,
            active: apiEntries.length === 0
        };

        apiEntries.push(entry);
        apiSecrets.delete(entry.id);

        if (entry.active) {
            localStorage.setItem("activeApiId", entry.id);
        }

        renderApiEntries();
        renderApiSwitcher();

        showPopup(
            "API Saved",
            "Your API key was encrypted and saved.",
            "success"
        );

    } catch (error) {
        console.error("Saving API key failed:", error);

        showPopup(
            "Could Not Save API",
            error.message || "Please try again.",
            "error"
        );

        throw error;
    }
}


function saveApiMetadata() {
    const metadata = apiEntries.map((entry) => ({
        id: entry.id, name: entry.name, provider: entry.provider, model: entry.model, maskLength: entry.maskLength, active: entry.active
    }));
    localStorage.setItem("apiMetadata", JSON.stringify(metadata));
}

function normalizeActiveApi() {
    let activeFound = false;
    apiEntries.forEach((entry) => {
        if (entry.active && !activeFound) { activeFound = true; return; }
        if (entry.active) entry.active = false;
    });
    if (apiEntries.length > 0 && !apiEntries.some((entry) => entry.active)) {
        apiEntries[0].active = true;
    }
}

function getActiveApi() { 
    return apiEntries.find((entry) => entry.active); 
}

function renderApiEntries() {
    if (!apiList) return;
    apiList.innerHTML = "";
    const sortedEntries = [...apiEntries].sort((a, b) => {
        if (a.active && !b.active) return -1;
        if (!a.active && b.active) return 1;
        return 0;
    });
    sortedEntries.forEach((entry) => { renderApiEntry(entry); });
}
/* ========================================================= CREDENTIAL COMPONENT RENDERING ========================================================= */
function renderApiEntry(entry) {
    const card = document.createElement("div");
    card.className = "api-card saved-api-card";
    const mask = "#".repeat(entry.maskLength);
    card.innerHTML = `
        <div class="api-field">
            <div class="api-field-label">Name</div>
            <div class="api-value-box">${escapeHtml(entry.name)}</div>
        </div>
        <div class="api-field">
            <div class="api-field-label">Provider</div>
            <div class="api-value-box">${escapeHtml(PROVIDERS[entry.provider]?.label || "Unknown")}</div>
        </div>
        <div class="api-field">
            <div class="api-field-label">API Key</div>
            <div class="api-value-box api-key-container">
                <span class="api-key-mask">${mask}</span>
                <button class="api-key-toggle" type="button" aria-label="Show API key" title="Show API key">
                    <svg class="eye-icon" xmlns="http://w3.org" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                </button>
            </div>
        </div>
        <div class="api-status-row">
            <div class="api-status ${entry.active ? "active" : "inactive"}">
                <span class="status-dot"></span>
                <span>${entry.active ? "Active" : "Inactive"}</span>
            </div>
            <div class="api-actions">
                <button class="api-edit" type="button">Edit</button>
                <button class="api-delete" type="button">Delete</button>
                <button class="api-switch ${entry.active ? "" : "inactive-switch"}" type="button">${entry.active ? "Active" : "Switch"}</button>
            </div>
        </div>
    `;

    const keyToggleButton = card.querySelector(".api-key-toggle");
    const keyMask = card.querySelector(".api-key-mask");

    keyToggleButton?.addEventListener("click", async () => {
        const isVisible = keyToggleButton.dataset.visible === "true";
        if (isVisible) {
            keyMask.textContent = mask;
            keyToggleButton.dataset.visible = "false";
            keyToggleButton.innerHTML = `<svg xmlns="http://w3.org" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>`;
            keyToggleButton.setAttribute("aria-label", "Show API key");
            return;
        }
        keyToggleButton.disabled = true;
        try {
            const response = await fetch(`/api/keys/${encodeURIComponent(entry.id)}/reveal`, { method: "GET", credentials: "same-origin", headers: { Accept: "application/json" }, cache: "no-store" });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || "Could not reveal API key.");
            keyMask.textContent = data.apiKey;
            keyToggleButton.dataset.visible = "true";
            keyToggleButton.innerHTML = `<svg xmlns="http://w3.org" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 3 18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 5.2A11 11 0 0 1 12 5c6.4 0 10 7 10 7a15.5 15.5 0 0 1-4 4.7"/><path d="M6.2 6.2C3.5 8 2 12 2 12s3.6 7 10 7c1.4 0 2.7-.3 3.8-.8"/></svg>`;
            keyToggleButton.setAttribute("aria-label", "Hide API key");
        } catch (error) {
            showPopup("Could Not Reveal API Key", error.message, "error");
        } finally { keyToggleButton.disabled = false; }
    });

    apiList?.appendChild(card);
    card.querySelector(".api-switch")?.addEventListener("click", () => { if (!entry.active) activateApi(entry.id); });
    card.querySelector(".api-delete")?.addEventListener("click", () => { deleteApi(entry.id); });
    card.querySelector(".api-edit")?.addEventListener("click", () => { editApi(entry, card); });
}

function activateApi(id) {
    apiEntries.forEach((entry) => { entry.active = entry.id === id; });
    saveApiMetadata();
    renderApiEntries();
    renderApiSwitcher();
}

function deleteApi(id) {
    const api = apiEntries.find((entry) => entry.id === id);
    if (!api) return;
    apiToDelete = id;
    if (deleteModalText) deleteModalText.textContent = `Are you sure you want to delete "${api.name}"?`;
    deleteModal?.classList.add("open");
    deleteModal?.setAttribute("aria-hidden", "false");
}
/* ========================================================= DATA MODIFICATION HANDLERS ========================================================= */
confirmDeleteButton?.addEventListener("click", async () => {
    if (!apiToDelete) return;
    const id = apiToDelete;
    const deletedApi = apiEntries.find((entry) => String(entry.id) === String(id));
    const wasActive = deletedApi?.active;
    confirmDeleteButton.disabled = true;

    try {
        const response = await fetch(`/api/keys/${encodeURIComponent(id)}`, { method: "DELETE", credentials: "same-origin", headers: { Accept: "application/json" } });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Failed to delete API key.");

        apiSecrets.delete(id);
        apiEntries = apiEntries.filter((entry) => String(entry.id) !== String(id));

        if (wasActive && apiEntries.length > 0) {
            apiEntries.forEach((entry) => { entry.active = false; });
            apiEntries[0].active = true;
            try { localStorage.setItem("activeApiId", String(apiEntries[0].id)); } catch (e) {}
        } else if (wasActive) {
            try { localStorage.removeItem("activeApiId"); } catch (e) {}
        }

        saveApiMetadata();
        renderApiEntries();
        renderApiSwitcher();
        closeDeleteModal();
    } catch (error) {
        showPopup("Delete failed", error.message, "error");
    } finally { confirmDeleteButton.disabled = false; }
});

cancelDeleteButton?.addEventListener("click", closeDeleteModal);
deleteModal?.addEventListener("click", (event) => { if (event.target === deleteModal) closeDeleteModal(); });

function closeDeleteModal() {
    apiToDelete = null;
    deleteModal?.classList.remove("open");
    deleteModal?.setAttribute("aria-hidden", "true");
}

function editApi(entry, card) {
    card.innerHTML = `
        <div class="api-field">
            <div class="api-field-label">Name</div>
            <input type="text" class="edit-name-input" value="${escapeHtml(entry.name)}" maxlength="100">
        </div>
        <div class="api-field">
    <div class="api-field-label">Provider</div>
    <select class="edit-provider-input">
        <option value="groq" ${entry.provider === "groq" ? "selected" : ""}>Groq</option>
        <option value="openai" ${entry.provider === "openai" ? "selected" : ""}>OpenAI</option>
        <option value="google" ${entry.provider === "google" ? "selected" : ""}>Google Gemini</option>
        <option value="anthropic" ${entry.provider === "anthropic" ? "selected" : ""}>Anthropic</option>
        <option value="openrouter" ${entry.provider === "openrouter" ? "selected" : ""}>OpenRouter</option>
        <option value="together" ${entry.provider === "together" ? "selected" : ""}>Together AI</option>
        <option value="fireworks" ${entry.provider === "fireworks" ? "selected" : ""}>Fireworks AI</option>
        <option value="cerebras" ${entry.provider === "cerebras" ? "selected" : ""}>Cerebras</option>
        <option value="mistral" ${entry.provider === "mistral" ? "selected" : ""}>Mistral AI</option>
        <option value="deepseek" ${entry.provider === "deepseek" ? "selected" : ""}>DeepSeek</option>
        <option value="custom" ${entry.provider === "custom" ? "selected" : ""}>Custom Endpoint</option>
    </select>
</div>
        <div class="api-field edit-endpoint-group">
    <div class="api-field-label">Custom Endpoint</div>
    <input
        type="url"
        class="edit-endpoint-input"
        value="${escapeHtml(entry.endpoint || "")}"
        placeholder="https://your-provider.com/v1/chat/completions"
        maxlength="2000"
    >
</div>
        <div class="api-field">
            <div class="api-field-label">API Key</div>
            <input type="password" class="edit-key-input" placeholder="Leave empty to keep current key" autocomplete="off" maxlength="10000">
        </div>
        <div class="api-edit-controls">
            <button class="api-cancel-edit" type="button">Cancel</button>
            <button class="api-save-edit" type="button">Save</button>
        </div>
    `;
    const editProviderInput = card.querySelector(".edit-provider-input");
const editEndpointGroup = card.querySelector(".edit-endpoint-group");

function toggleEditEndpoint() {
    if (editEndpointGroup) {
        editEndpointGroup.style.display =
            editProviderInput?.value === "custom" ? "block" : "none";
    }
}

editProviderInput?.addEventListener("change", toggleEditEndpoint);
toggleEditEndpoint();

    const saveButton = card.querySelector(".api-save-edit");
    saveButton?.addEventListener("click", async () => {
        const newName = card.querySelector(".edit-name-input").value.trim();
        const newProvider = card.querySelector(".edit-provider-input").value;
        const newKey = card.querySelector(".edit-key-input").value.trim();
        const newEndpoint =
    newProvider === "custom"
        ? card.querySelector(".edit-endpoint-input")?.value.trim()
        : null;

        if (!newName) { showPopup("Invalid API Name", "API name cannot be empty.", "warning"); return; }
        if (newProvider === "custom" && !newEndpoint) {
    showPopup("Missing Endpoint", "Please enter your custom endpoint.", "warning");
    return;
}
        saveButton.disabled = true;
        saveButton.textContent = "Saving...";

        try {
            const response = await fetch(`/api/keys/${encodeURIComponent(entry.id)}`, {
                method: "PUT",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
               body: JSON.stringify({
                    label: newName,
                    provider: newProvider,
                    model: entry.model,
                    endpoint: newEndpoint,
                    ...(newKey ? { apiKey: newKey } : {})
                })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || "Could not save API changes.");

            entry.name = data.key.label;
            entry.provider = data.key.provider;
            entry.model = data.key.model;
            entry.endpoint = data.key.endpoint;
            apiSecrets.delete(entry.id);

            saveApiMetadata();
            renderApiEntries();
            renderApiSwitcher();
            showPopup("API Updated", "Your changes have been saved.", "success");
        } catch (error) {
            showPopup("Update Failed", error.message, "error");
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.textContent = "Save";
            }
        }
    });
    card.querySelector(".api-cancel-edit")?.addEventListener("click", () => { renderApiEntries(); });
}
/* ========================================================= GLOBAL HEADER SWITCHER DROP DOWN ========================================================= */
apiSwitcherButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    renderApiSwitcher();
    apiSwitcherMenu?.classList.toggle("open");
});

function renderApiSwitcher() {
    if (!apiSwitcherList || !apiSwitcherCurrent) return;
    apiSwitcherList.innerHTML = "";
    const activeApi = getActiveApi();
    apiSwitcherCurrent.textContent = activeApi ? "Using: " + activeApi.name : "No API selected";
    
    if (apiEntries.length === 0) {
        apiSwitcherList.innerHTML = `<div class="api-switcher-empty">No APIs added yet.</div>`;
        return;
    }
    
    const sortedApis = [...apiEntries].sort((a, b) => {
        if (a.active && !b.active) return -1;
        if (!a.active && b.active) return 1;
        return 0;
    });
    
    sortedApis.forEach((api) => {
        const option = document.createElement("div");
        option.className = `api-switcher-option ${api.active ? "selected" : ""}`;
        option.innerHTML = `
            <span class="api-switcher-dot"></span>
            <span class="api-switcher-name">${escapeHtml(api.name)}</span>
            <button class="api-switch-button ${api.active ? "active" : ""}" type="button" ${api.active ? "disabled" : ""}>
                ${api.active ? "Active" : "Switch"}
            </button>
        `;
        
        if (!api.active) {
            option.querySelector(".api-switch-button")?.addEventListener("click", (e) => {
                e.stopPropagation();
                activateApi(api.id);
                renderApiSwitcher();
            });
        }
        apiSwitcherList.appendChild(option);
    });
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        sideMenu?.classList.remove("open");
        apiSwitcherMenu?.classList.remove("open");
        closeDeleteModal();
    }
});
/* ========================================================= LOCAL CONVERSATION SYSTEM LOGIC ========================================================= */
async function testLocalStorage() {
    try {
        const folderName = await LocalConversationStorage.chooseFolder();
        await LocalConversationStorage.saveMessage("thread_test123", "user", "This is a test message.");
        alert("Storage test successful! Check your folder.");
    } catch (error) { 
        alert("Storage test failed: " + error.message); 
    }
}
document.getElementById("testStorageButton")?.addEventListener("click", testLocalStorage);

const chooseStorageFolderButton = document.getElementById("chooseStorageFolderButton");
const checkAndBackupButton = document.getElementById("checkAndBackupButton");
const storageFolderStatus = document.getElementById("storageFolderStatus");
const storageBackupStatus = document.getElementById("storageBackupStatus");

chooseStorageFolderButton?.addEventListener("click", async () => {
    try {
        const folderName = await LocalConversationStorage.chooseFolder();
        if (storageFolderStatus) storageFolderStatus.textContent = `Selected folder: ${folderName}`;
        if (storageBackupStatus) storageBackupStatus.textContent = "Backup status has not been checked yet.";
    } catch (error) {
        if (error.name === "AbortError") return;
        showPopup("Folder selection failed", error.message, "error");
    }
});

checkAndBackupButton?.addEventListener("click", async () => {
    try {
        if (!LocalConversationStorage.isFolderSelected()) {
            showPopup("Choose a folder first", "Select your storage folder before backing up.", "warning");
            return;
        }
        if (storageBackupStatus) storageBackupStatus.textContent = "Checking backup status...";
        const report = await LocalConversationStorage.verifyArchive(threads);

        if (report.conflicts.length > 0 || report.invalidFiles.length > 0 || report.extraMessages.length > 0) {
            if (storageBackupStatus) storageBackupStatus.textContent = "Backup needs attention. Files left unchanged.";
            showPopup("Backup needs attention", "Some saved conversations differ.", "warning");
            return;
        }
        const missingIds = new Set(report.missingArchiveFiles || []);
        if (missingIds.size === 0) {
            if (storageBackupStatus) storageBackupStatus.textContent = "All current conversations are backed up.";
            showPopup("Backup up to date", "All current conversations are present in folder.", "success");
            return;
        }
        let backedUp = 0;
        for (const thread of threads) {
            if (!missingIds.has(thread.id)) continue;
            try {
                await LocalConversationStorage.recoverMissingConversation(thread);
                backedUp++;
            } catch (error) {
                showPopup("Backup failed", `Could not back up conversation ${thread.id}.`, "error");
                return;
            }
        }
        const finalReport = await LocalConversationStorage.verifyArchive(threads);
        if (finalReport.missingArchiveFiles.length === 0) {
            if (storageBackupStatus) storageBackupStatus.textContent = "All current conversations are backed up.";
            showPopup("Backup complete", `${backedUp} missing conversation(s) backed up.`, "success");
        }
    } catch (error) {
        showPopup("Backup failed", error.message, "error");
    }
});

async function testConversationExport() {
    try {
        await LocalConversationStorage.chooseFolder();
        const testThread = { id: "thread_export_test", title: "Export Test", messages: [{ role: "user", content: "Test user" }, { role: "ai", content: "Test ai" }] };
        const result = await LocalConversationStorage.saveConversation(testThread);
        showPopup("Export test passed", `Saved ${result.messageCount} messages.`, "success");
    } catch (error) {
        if (error.name === "AbortError") return;
        showPopup("Export test failed", error.message, "error");
    }
}
document.getElementById("testConversationExportButton")?.addEventListener("click", testConversationExport);

const migrateStorageButton = document.getElementById("migrateStorageButton");
migrateStorageButton?.addEventListener("click", async () => {
    try {
        if (!LocalConversationStorage.isFolderSelected()) {
            showPopup("Choose a folder first", "Select folder before migrating.", "warning");
            return;
        }
        const result = await LocalConversationStorage.migrateStorageFolder();
        showPopup("Migration complete", `Verified ${result.copiedFiles} file(s).`, "success", 7000);
    } catch (error) {
        if (error.name === "AbortError") return;
        showPopup("Migration failed", error.message, "error", 7000);
    }
});

const verifyArchiveButton = document.getElementById("verifyArchiveButton");
const archiveVerificationStatus = document.getElementById("archiveVerificationStatus");
const archiveVerificationResults = document.getElementById("archiveVerificationResults");

verifyArchiveButton?.addEventListener("click", async () => {
    verifyArchiveButton.disabled = true;
    if (archiveVerificationStatus) archiveVerificationStatus.textContent = "Checking archive...";
    try {
        const report = await LocalConversationStorage.verifyArchive(threads);
        if (archiveVerificationResults) {
            archiveVerificationResults.textContent = JSON.stringify(report, null, 2);
            archiveVerificationResults.hidden = false;
        }
        if (archiveVerificationStatus) {
            archiveVerificationStatus.textContent = `Verification complete. Checked ${report.matching.length} items.`;
        }
    } catch (error) {
        if (archiveVerificationStatus) archiveVerificationStatus.textContent = "Archive check failed.";
    } finally { 
        verifyArchiveButton.disabled = false; 
    }
});
