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

async function updateAuthButton() {
    try {
        const response = await fetch("/auth/me", { credentials: "same-origin" });
        const auth = await response.json();
        isUserAuthenticated = response.ok && auth.authenticated === true;
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
let threads = JSON.parse(localStorage.getItem("cloud_ai_threads") || "[]");
let activeThreadId = localStorage.getItem("cloud_ai_active_thread") || null;

function saveThreadsToStorage() {
    localStorage.setItem("cloud_ai_threads", JSON.stringify(threads));
    localStorage.setItem("cloud_ai_active_thread", activeThreadId);
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
    welcome?.classList.remove("hidden");
    if (messageInput) messageInput.value = "";
    autoResize();
    renderThreads();
    sideMenu?.classList.remove("open");
    messageInput?.focus();
}

function loadThread(id) {
    const thread = threads.find((item) => item.id === id);
    if (!thread) return;
    activeThreadId = id;
    saveThreadsToStorage();
    clearChatMessages();
    if (thread.messages.length === 0) {
        welcome?.classList.remove("hidden");
    } else {
        welcome?.classList.add("hidden");
        thread.messages.forEach((message) => {
            addMessage(message.content, message.role);
        });
    }
    renderThreads();
    sideMenu?.classList.remove("open");
}

function deleteThread(id, event) {
    event.stopPropagation();
    threads = threads.filter((thread) => thread.id !== id);
    if (activeThreadId === id) {
        if (threads.length > 0) {
            activeThreadId = threads[0].id;
            loadThread(activeThreadId);
        } else {
            createNewThread();
            return;
        }
    }
    saveThreadsToStorage();
    renderThreads();
}

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

if (threads.length === 0) {
    createNewThread();
} else {
    if (!activeThreadId || !threads.some((thread) => thread.id === activeThreadId)) {
        activeThreadId = threads[0].id;
    }
    loadThread(activeThreadId);
}

chat?.addEventListener("click", () => {
    sideMenu?.classList.remove("open");
    dismissWelcome();
});

inputContainer?.addEventListener("click", () => {
    sideMenu?.classList.remove("open");
    dismissWelcome();
});

function openPage(pageId) {
    sideMenu.classList.remove("open");
    apiSwitcherMenu.classList.remove("open");
    pages.forEach((page) => {
        page.classList.remove("open");
    });
    const page = document.getElementById(pageId);
    if (!page) {
        console.error("Page not found:", pageId);
        return;
    }
    page.classList.add("open");
    page.scrollTop = 0;
window.scrollTo({
    top: 0,
    behavior: "instant"
});
    /* Hide message input while Settings / Themes / API is open. */
    inputContainer.classList.add("page-hidden");
}
/* ========================================================= CLOSE PAGES ========================================================= */
backButtons.forEach((button) => {
    button.addEventListener("click", closePages);
});
function closePages() {
    pages.forEach((page) => {
        page.classList.remove("open");
    });
    inputContainer.classList.remove("page-hidden");
}
/* ========================================================= WELCOME ========================================================= */
function dismissWelcome() {
    if (!welcome) return;
    welcome.classList.add("hidden");
}

async function saveMessageToServer(conversationId, role, content) {
    if (LocalConversationStorage?.isFolderSelected()) {
        try {
            const localRole = role === "ai" ? "assistant" : role;
            await LocalConversationStorage.saveMessage(conversationId, localRole, content);
        } catch (error) {
            console.error("Local file save failed:", error);
            showPopup("Local Archive Save Failed", "This message may not be saved in your selected folder.", "error", 7000);
        }
    }
    try {
        const response = await fetch("/api/conversations/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversationId, role, content })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Message could not be saved.");
        }
        return true;
    } catch (error) {
        console.error("Conversation storage error:", error);
        return false;
    }
}
/* ========================================================= SECURE ENGINE CHAT SYSTEM ========================================================= */
async function sendMessage() {
    try {
        const authResponse = await fetch("/auth/me", { credentials: "same-origin" });
        if (!authResponse.ok) {
            showPopup("Login Required", "Please log in with Google to send AI messages.", "warning");
            return;
        }
        const auth = await authResponse.json();
        if (!auth.authenticated) {
            showPopup("Login Required", "Please log in with Google to send AI messages.", "warning");
            return;
        }

        const text = messageInput.value.trim();
        if (!text) {
            showPopup("Empty Message", "Please enter a message before sending.", "warning");
            return;
        }
        
        const activeApi = getActiveApi();
        if (!activeApi) {
            showPopup("No API Selected", "Please add an API key and select it before sending a message.", "warning");
            return;
        }

        dismissWelcome();
        addMessage(text, "user");
        messageInput.value = "";
        autoResize();

        const currentThread = getActiveThread();
        if (currentThread) {
            if (currentThread.messages.length === 0) {
                currentThread.title = text.slice(0, 24) + (text.length > 24 ? "..." : "");
            }
            currentThread.messages.push({ role: "user", content: text });
            saveThreadsToStorage();
            renderThreads();
            await saveMessageToServer(currentThread.id, "user", text);
        }

        const loadingMessage = addMessage("Thinking...", "ai");
        
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ apiId: activeApi.id, message: text })
        });

        let data = null;
        try {
            data = await response.json();
        } catch (jsonError) {
            console.error("Could not read chat response:", jsonError);
        }

        loadingMessage.remove();

        if (!response.ok) {
            console.error("Chat request failed:", response.status, data);
            const errorMessage = data?.error || `The chat request failed (${response.status}).`;
            showPopup("Chat Error", errorMessage, "error");
            return;
        }

        const aiResponse = data?.reply;
        if (typeof aiResponse !== "string" || !aiResponse.trim()) {
            showPopup("Empty Response", "The server did not return an AI message.", "warning");
            return;
        }

        addMessage(aiResponse, "ai");

        if (currentThread) {
            currentThread.messages.push({ role: "ai", content: aiResponse });
            saveThreadsToStorage();
            await saveMessageToServer(currentThread.id, "assistant", aiResponse);
        }
    } catch (error) {
        console.error("SEND MESSAGE ERROR:", error);
        showPopup("Something Went Wrong", error?.message || "The message could not be sent. Check configurations.", "error");
    }
}

function addMessage(text, type) {
    const message = document.createElement("div");
    message.classList.add("message", type);
    const messageText = document.createElement("div");
    messageText.classList.add("message-text");
    messageText.textContent = text;
    const starButton = document.createElement("button");
    starButton.classList.add("message-star");
    starButton.type = "button";
    starButton.setAttribute("aria-label", "Star message");
    starButton.setAttribute("title", "Star message");
    starButton.innerHTML = "☆";
    starButton.addEventListener("click", (event) => {
        event.stopPropagation();
        const starred = message.classList.toggle("starred");
        if (starred) {
            starButton.innerHTML = "★";
            starButton.setAttribute("aria-label", "Unstar message");
            starButton.setAttribute("title", "Unstar message");
        } else {
            starButton.innerHTML = "☆";
            starButton.setAttribute("aria-label", "Star message");
            starButton.setAttribute("title", "Star message");
        }
    });
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
let apiEntries = [];
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
