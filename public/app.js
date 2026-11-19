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
const menuAnimation = document.getElementById("menuAnimation");
const ANIMATION_SPEED = 1.3; // Smooth, natural, attractive speed (not quick/hard)

if (menuAnimation) {
    menuAnimation.addEventListener("ready", () => {
        try { menuAnimation.setSpeed(ANIMATION_SPEED); } catch (e) {}
    });
    try { menuAnimation.setSpeed(ANIMATION_SPEED); } catch (e) {}
}

let isMenuOpen = false;
let currentIconState = "hamburger"; // "hamburger" or "x"

function setButtonIcon(target, animate = true) {
    if (!menuAnimation) return;
    if (currentIconState === target) return;
    currentIconState = target;

    if (target === "x") {
        menuButton?.setAttribute("aria-label", "Close");
        menuButton?.setAttribute("aria-expanded", "true");
        if (animate) {
            menuAnimation.setDirection(1);
            menuAnimation.play();
        } else {
            menuAnimation.seek(59);
        }
    } else {
        menuButton?.setAttribute("aria-label", "Open menu");
        menuButton?.setAttribute("aria-expanded", "false");
        if (animate) {
            menuAnimation.setDirection(-1);
            menuAnimation.play();
        } else {
            menuAnimation.seek(0);
        }
    }
}

function updateMenuIconState(animate = true) {
    // If sidebar drawer is open OR any sub-page/tab is open, button stays as 'X'
    const shouldBeX = Boolean(sideMenu?.classList.contains("open") || (typeof pageHistory !== "undefined" && pageHistory.length > 0));
    setButtonIcon(shouldBeX ? "x" : "hamburger", animate);
}

function setMenuState(open, animate = true) {
    isMenuOpen = open;
    if (open) {
        sideMenu?.classList.add("open");
    } else {
        sideMenu?.classList.remove("open");
    }
    updateMenuIconState(animate);
}

function toggleMenuState() {
    setMenuState(!sideMenu?.classList.contains("open"), true);
}
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
let pageHistory = [];

function openPage(pageId, pushToHistory = true) {
    // Close sidebar without triggering reverse animation
    sideMenu?.classList.remove("open");
    isMenuOpen = false;
    apiSwitcherMenu?.classList.remove("open");

    pages.forEach((page) => {
        page.classList.remove("open");
    });

    const page = document.getElementById(pageId);
    if (!page) {
        console.error("Page not found:", pageId);
        return;
    }

    if (pushToHistory) {
        if (pageHistory.length === 0 || pageHistory[pageHistory.length - 1] !== pageId) {
            pageHistory.push(pageId);
        }
    }

    page.classList.add("open");
    inputContainer?.classList.add("page-hidden");

    // Maintain 'X' icon while on a page
    updateMenuIconState(true);
}

function goBackPage() {
    if (pageHistory.length > 1) {
        // Pop current page and return to previous tab
        pageHistory.pop();
        const previousPageId = pageHistory[pageHistory.length - 1];
        openPage(previousPageId, false);
        // Still on a page: button stays as 'X'
        updateMenuIconState(false);
    } else {
        // Returning to start (chat): smoothly animate from 'X' back to hamburger
        closePages();
    }
}

function closePages() {
    pageHistory = [];
    pages.forEach((page) => {
        page.classList.remove("open");
    });
    inputContainer?.classList.remove("page-hidden");
    // Returning to chat: smoothly animate from 'X' back to 3 horizontal lines
    updateMenuIconState(true);
}

menuButton?.addEventListener("click", (event) => {
    event.stopPropagation();

    // If sidebar is currently open, close it
    if (sideMenu?.classList.contains("open")) {
        setMenuState(false);
        return;
    }

    // If viewing a page/tab, navigate back to previous tab
    if (pageHistory.length > 0) {
        goBackPage();
        return;
    }

    // Otherwise, toggle the side menu drawer
    toggleMenuState();
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

backButtons.forEach((button) => {
    button.addEventListener("click", goBackPage);
});
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
    if (typeof updateWelcomeVisibility === "function") {
        updateWelcomeVisibility();
    } else {
        welcome?.classList.remove("hidden");
    }
    if (messageInput) messageInput.value = "";
    autoResize();
    renderThreads();
    setMenuState(false);
    messageInput?.focus();
}

function loadThread(id) {
    closePages();
    const thread = threads.find((item) => item.id === id);
    if (!thread) return;
    activeThreadId = id;
    saveThreadsToStorage();
    clearChatMessages();
    if (thread.messages.length === 0) {
        updateWelcomeVisibility();
    } else {
        welcome?.classList.add("hidden");
        thread.messages.forEach((message) => {
            addMessage(message.content, message.role);
        });
    }
    renderThreads();
    setMenuState(false);
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

let threadSearchTerm = "";

const threadsSearchInput = document.getElementById("threadsSearchInput");
threadsSearchInput?.addEventListener("input", (e) => {
    threadSearchTerm = e.target.value.toLowerCase().trim();
    renderThreads();
});

function exportThread(threadId) {
    const thread = threads.find((t) => t.id === threadId);
    if (!thread) return;
    let md = `# ${thread.title || "Conversation"}\n\n`;
    if (thread.messages && thread.messages.length > 0) {
        thread.messages.forEach((m) => {
            const role = m.role === "user" ? "### You" : "### Cloud Hybrid AI";
            md += `${role}\n\n${m.content}\n\n---\n\n`;
        });
    } else {
        md += "_No messages in this conversation._\n";
    }
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(thread.title || "conversation").replace(/[^a-z0-9]/gi, "_")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function renderThreads() {
    if (!threadsList) return;
    threadsList.innerHTML = "";
    
    const filteredThreads = threadSearchTerm
        ? threads.filter((t) => (t.title || "").toLowerCase().includes(threadSearchTerm))
        : threads;

    if (filteredThreads.length === 0) {
        const emptyMsg = document.createElement("div");
        emptyMsg.style.cssText = "padding: 12px; font-size: 12px; color: rgba(255,255,255,0.4); text-align: center;";
        emptyMsg.textContent = threadSearchTerm ? "No matching chats" : "No recent chats";
        threadsList.appendChild(emptyMsg);
        return;
    }

    filteredThreads.forEach((thread) => {
        const item = document.createElement("div");
        item.className = `thread-item ${thread.id === activeThreadId ? "active" : ""}`;
        item.onclick = () => loadThread(thread.id);
        item.innerHTML = `
                <span class="thread-title">${escapeHtml(thread.title)}</span>
                <button class="thread-action-btn thread-export-btn" title="Export conversation as Markdown" aria-label="Export chat">📥</button>
                <button class="thread-action-btn thread-delete-btn" title="Delete conversation">&times;</button>
            `;
        const exportButton = item.querySelector(".thread-export-btn");
        if (exportButton) {
            exportButton.onclick = (event) => {
                event.stopPropagation();
                exportThread(thread.id);
            };
        }
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

// Don't dismiss welcome card on clicks; only close sidebar if opened
chat?.addEventListener("click", () => {
    setMenuState(false);
});

inputContainer?.addEventListener("click", () => {
    setMenuState(false);
});


// Real-time welcome visibility: stays until user types something, and reappears when untyped!
function updateWelcomeVisibility() {
    if (!welcome) return;
    const currentThread = getActiveThread();
    const hasMessages = currentThread && Array.isArray(currentThread.messages) && currentThread.messages.length > 0;
    
    // If the conversation already has sent messages, keep welcome hidden
    if (hasMessages) {
        welcome.classList.add("hidden");
        return;
    }

    // If no messages sent yet: hide when user types, reappear when untyped/cleared
    const typedText = messageInput ? messageInput.value.trim() : "";
    if (typedText.length > 0) {
        welcome.classList.add("hidden");
    } else {
        welcome.classList.remove("hidden");
    }
}

function dismissWelcome() {
    if (!welcome) return;
    welcome.classList.add("hidden");
}

// Listen to typing in real-time
messageInput?.addEventListener("input", updateWelcomeVisibility);
messageInput?.addEventListener("keyup", updateWelcomeVisibility);
messageInput?.addEventListener("change", updateWelcomeVisibility);

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

        const loadingMessage = createQuantumThinkingMessage();
        
        const conversationMessages = currentThread
    ? currentThread.messages.map(message => ({
        role: message.role === "ai" ? "assistant" : message.role,
        content: message.content
    }))
    : [{ role: "user", content: text }];

const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        apiId: activeApi.id,
        messages: conversationMessages
    })
});

        let data = null;
        try {
            data = await response.json();
        } catch (jsonError) {
            console.error("Could not read chat response:", jsonError);
        }

        if (loadingMessage && typeof loadingMessage.stop === "function") { loadingMessage.stop(); } else if (loadingMessage) { loadingMessage.remove(); }

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

    if (type === "ai" && typeof marked !== "undefined") {
        try {
            messageText.innerHTML = marked.parse(text);

            messageText.querySelectorAll("pre code").forEach((block) => {
                if (typeof hljs !== "undefined") {
                    hljs.highlightElement(block);
                }
                const pre = block.parentElement;
                if (pre && !pre.querySelector(".code-header")) {
                    const header = document.createElement("div");
                    header.className = "code-header";
                    const lang = (block.className.match(/language-(\w+)/) || [])[1] || "code";
                    header.innerHTML = '<span>' + lang + '</span><button class="code-copy-btn" type="button">Copy</button>';

                    const copyBtn = header.querySelector(".code-copy-btn");
                    copyBtn?.addEventListener("click", () => {
                        navigator.clipboard.writeText(block.innerText).then(() => {
                            copyBtn.textContent = "Copied!";
                            setTimeout(() => { copyBtn.textContent = "Copy"; }, 2000);
                        });
                    });

                    pre.insertBefore(header, block);
                }
            });
        } catch (e) {
            console.error("Markdown parse error:", e);
            messageText.textContent = text;
        }
    } else {
        messageText.textContent = text;
    }

    const actions = document.createElement("div");
    actions.classList.add("message-actions");

    const copyBtn = document.createElement("button");
    copyBtn.classList.add("message-action-btn");
    copyBtn.type = "button";
    copyBtn.title = "Copy message";
    copyBtn.setAttribute("aria-label", "Copy message");
    copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
    copyBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => {
            copyBtn.style.color = "#a78bfa";
            setTimeout(() => { copyBtn.style.color = ""; }, 1500);
        });
    });

    const starButton = document.createElement("button");
    starButton.classList.add("message-action-btn");
    starButton.type = "button";
    starButton.title = "Star message";
    starButton.setAttribute("aria-label", "Star message");
    starButton.innerHTML = "☆";
    starButton.addEventListener("click", (event) => {
        event.stopPropagation();
        const starred = message.classList.toggle("starred");
        if (starred) {
            starButton.innerHTML = "★";
            starButton.classList.add("starred");
            starButton.title = "Unstar message";
        } else {
            starButton.innerHTML = "☆";
            starButton.classList.remove("starred");
            starButton.title = "Star message";
        }
    });

    actions.appendChild(copyBtn);
    actions.appendChild(starButton);

    message.appendChild(messageText);
    message.appendChild(actions);

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
let cachedInputScrollHeight = 0;
function autoResize() {
    if (!messageInput) return;
    messageInput.style.height = "auto";
    const newHeight = Math.min(messageInput.scrollHeight, 150);
    if (newHeight !== cachedInputScrollHeight) {
        cachedInputScrollHeight = newHeight;
    }
    messageInput.style.height = newHeight + "px";
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
    if (typeof window.restoreApiProvidersDirectory === "function") {
        window.restoreApiProvidersDirectory();
    }
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
    if (apiEntries.length === 0) {
        const emptyBanner = document.createElement("div");
        emptyBanner.className = "api-empty-banner";
        emptyBanner.innerHTML = `
            <div class="api-empty-icon">
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
            </div>
            <div class="api-empty-text">
                <h3>No API Keys Configured</h3>
                <p>You haven't added any AI model provider keys yet. Click <strong>+ Add New Key</strong> above or select any official provider from the directory below to get started for free!</p>
            </div>
        `;
        apiList.appendChild(emptyBanner);
        return;
    }
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
        if (sideMenu?.classList.contains("open")) {
            setMenuState(false);
        } else if (pageHistory.length > 0) {
            goBackPage();
        }
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


/* =========================================================
   WELCOME PROMPTS & BREADCRUMBS
========================================================= */
document.querySelectorAll(".welcome-prompt-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
        const prompt = chip.dataset.prompt;
        if (!prompt || !messageInput) return;
        messageInput.value = prompt;
        autoResize();
        messageInput.focus();
        updateWelcomeVisibility();
    });
});

function selectProvider(providerKey, recommendedModel = "") {
    selectedProvider = providerKey;
    const targetOption = document.querySelector(`.provider-option[data-value="${providerKey}"]`);
    if (targetOption && providerSelectValue) {
        providerSelectValue.textContent = targetOption.textContent.trim();
        providerOptions.forEach((opt) => opt.classList.remove("selected"));
        targetOption.classList.add("selected");
    }
    if (customEndpointGroup) {
        customEndpointGroup.hidden = providerKey !== "custom";
    }
    if (recommendedModel && apiNameInput) {
        apiNameInput.value = recommendedModel;
    }
}

document.addEventListener("click", (event) => {
    const breadcrumb = event.target.closest(".breadcrumb-link, .breadcrumb-back-chip");
    if (breadcrumb) {
        event.preventDefault();
        goBackPage();
        return;
    }

    const useBtn = event.target.closest(".provider-use-btn");
    if (useBtn) {
        event.preventDefault();
        const provider = useBtn.dataset.provider;
        const model = useBtn.dataset.model || "";
        openApiCreateForm();
        if (provider) {
            selectProvider(provider, model);
        }
        if (apiKeyInput) {
            apiKeyInput.focus();
        }
        apiCreateCard?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
    }
});


/* =========================================================
   CLAUDE AI PARTICLE BURST ENGINE
========================================================= */
(function() {
    let canvas = null;
    let ctx = null;
    let particles = [];
    let animationId = null;
    let isDissolved = false;

    const COLORS = [
        '#c084fc', // purple light
        '#a855f7', // violet
        '#818cf8', // indigo
        '#38bdf8', // sky cyan
        '#fbbf24', // warm gold
        '#f59e0b', // amber
        '#ffffff', // pure white
        '#f43f5e', // coral spark
        '#e0e7ff'  // soft ice
    ];

    function ensureCanvas() {
        if (canvas) return;
        canvas = document.createElement("canvas");
        canvas.id = "claudeParticleCanvas";
        canvas.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9999;";
        document.body.appendChild(canvas);
        ctx = canvas.getContext("2d");

        const updateSize = () => {
            if (!canvas || !ctx) return;
            const dpr = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(dpr, dpr);
        };
        window.addEventListener("resize", updateSize);
        updateSize();
    }

    function createBurstParticle(x, y, vx, vy, isStar = false) {
        return {
            x,
            y,
            vx,
            vy,
            size: Math.random() * 3 + 1.2,
            initialSize: Math.random() * 3 + 1.2,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            alpha: Math.random() * 0.4 + 0.6,
            decay: Math.random() * 0.016 + 0.014,
            gravity: -0.06, // buoyant upward drift like Claude sparks
            drag: 0.965,
            wobble: Math.random() * Math.PI * 2,
            wobbleSpeed: Math.random() * 0.12 + 0.04,
            isStar: isStar || Math.random() > 0.65,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.2
        };
    }

    function triggerBurst(dirElement) {
        ensureCanvas();
        if (!dirElement) return;

        const cards = dirElement.querySelectorAll(".provider-directory-card");
        const dirRect = dirElement.getBoundingClientRect();
        if (dirRect.width === 0 || dirRect.height === 0) return;

        // Spawn particles across each card
        cards.forEach((card) => {
            const rect = card.getBoundingClientRect();
            if (rect.bottom < 0 || rect.top > window.innerHeight) return;

            const count = 35 + Math.floor(Math.random() * 15);
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            for (let i = 0; i < count; i++) {
                const px = rect.left + Math.random() * rect.width;
                const py = rect.top + Math.random() * rect.height;

                // Outward radial direction from card center
                const angle = Math.atan2(py - centerY, px - centerX) + (Math.random() - 0.5) * 0.8;
                const speed = Math.random() * 4.5 + 1.2;
                const vx = Math.cos(angle) * speed + (Math.random() - 0.5) * 1.5;
                const vy = Math.sin(angle) * speed - Math.random() * 2.8 - 0.8;

                particles.push(createBurstParticle(px, py, vx, vy, Math.random() > 0.6));
            }
        });

        // Also spawn floating particles from the header badge & title
        const header = dirElement.querySelector(".providers-directory-header");
        if (header) {
            const hRect = header.getBoundingClientRect();
            for (let i = 0; i < 40; i++) {
                const px = hRect.left + Math.random() * hRect.width;
                const py = hRect.top + Math.random() * hRect.height;
                const vx = (Math.random() - 0.5) * 3;
                const vy = -Math.random() * 3.5 - 1;
                particles.push(createBurstParticle(px, py, vx, vy, true));
            }
        }

        if (!animationId) {
            animate();
        }
    }

    function triggerReassemble(dirElement) {
        ensureCanvas();
        if (!dirElement) return;

        const cards = dirElement.querySelectorAll(".provider-directory-card");
        cards.forEach((card) => {
            const rect = card.getBoundingClientRect();
            if (rect.bottom < 0 || rect.top > window.innerHeight) return;

            const count = 18;
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * 70 + 40;
                const px = centerX + Math.cos(angle) * dist;
                const py = centerY + Math.sin(angle) * dist;

                const vx = -Math.cos(angle) * 3;
                const vy = -Math.sin(angle) * 3;

                const p = createBurstParticle(px, py, vx, vy, true);
                p.decay = 0.025;
                p.gravity = 0;
                particles.push(p);
            }
        });

        if (!animationId) {
            animate();
        }
    }

    function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius, color, alpha) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.fill();
        ctx.restore();
    }

    function animate() {
        if (!ctx || !canvas) return;
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];

            p.x += p.vx + Math.cos(p.wobble) * 0.8;
            p.y += p.vy;
            p.vx *= p.drag;
            p.vy = (p.vy + p.gravity) * p.drag;
            p.wobble += p.wobbleSpeed;
            p.rotation += p.rotSpeed;
            p.alpha -= p.decay;
            p.size *= 0.985;

            if (p.alpha <= 0.01 || p.size <= 0.3) {
                particles.splice(i, 1);
                continue;
            }

            if (p.isStar && p.size > 1.5) {
                drawStar(ctx, p.x, p.y, 4, p.size * 1.8, p.size * 0.6, p.color, p.alpha);
            } else {
                ctx.save();
                ctx.beginPath();
                ctx.arc(p.x, p.y, Math.max(0.3, p.size), 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = Math.max(0, p.alpha);
                ctx.shadowBlur = 8;
                ctx.shadowColor = p.color;
                ctx.fill();
                ctx.restore();
            }
        }

        if (particles.length > 0) {
            animationId = requestAnimationFrame(animate);
        } else {
            animationId = null;
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        }
    }

    function dissolveDirectory() {
        const dir = document.getElementById("apiProvidersDirectory");
        if (!dir || isDissolved) return;
        isDissolved = true;

        // Trigger Claude AI particle explosion!
        triggerBurst(dir);

        // Transition the element itself
        dir.classList.remove("burst-visible");
        dir.classList.add("burst-dissolved");
    }

    function restoreDirectory() {
        const dir = document.getElementById("apiProvidersDirectory");
        if (!dir || !isDissolved) return;
        isDissolved = false;

        // Transition the element back
        dir.classList.remove("burst-dissolved");
        dir.classList.add("burst-visible");

        // Trigger reassemble sparkles
        triggerReassemble(dir);
    }

    // Connect to apiKeyInput
    const apiKeyInputEl = document.getElementById("apiKeyInput");
    apiKeyInputEl?.addEventListener("input", () => {
        const hasText = apiKeyInputEl.value.trim().length > 0;
        if (hasText) {
            dissolveDirectory();
        } else {
            restoreDirectory();
        }
    });

    // Connect to closeApiCreateForm
    window.restoreApiProvidersDirectory = restoreDirectory;
})();


/* =========================================================
   MAJOR UPGRADES: VOICE INPUT, SPEECH TTS, CHAR COUNTER, SCROLL TO BOTTOM
========================================================= */
(function() {
    // 1. Character Counter
    const charCounter = document.getElementById("charCounter");
    messageInput?.addEventListener("input", () => {
        if (!charCounter || !messageInput) return;
        const len = messageInput.value.length;
        if (len > 0) {
            charCounter.textContent = len > 999 ? (len / 1000).toFixed(1) + "k" : len;
            charCounter.style.display = "inline-block";
        } else {
            charCounter.style.display = "none";
        }
    });

    // 2. Voice Input (Speech-to-Text via Web Speech API)
    const voiceBtn = document.getElementById("voiceInputButton");
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    let isListening = false;

    if (SpeechRecognition && voiceBtn) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onstart = () => {
            isListening = true;
            voiceBtn.classList.add("listening");
            voiceBtn.title = "Listening... Speak into microphone";
        };

        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(r => r[0].transcript)
                .join("");
            if (messageInput) {
                messageInput.value = transcript;
                autoResize();
            }
        };

        recognition.onerror = (e) => {
            console.warn("Speech recognition error:", e.error);
            isListening = false;
            voiceBtn.classList.remove("listening");
        };

        recognition.onend = () => {
            isListening = false;
            voiceBtn.classList.remove("listening");
            voiceBtn.title = "Voice Input (Speech to Text)";
            if (messageInput) {
                messageInput.focus();
            }
        };

        voiceBtn.addEventListener("click", () => {
            if (!isListening) {
                try { recognition.start(); } catch (e) { console.error(e); }
            } else {
                try { recognition.stop(); } catch (e) { console.error(e); }
            }
        });
    } else if (voiceBtn) {
        voiceBtn.title = "Voice input supported in Chrome / Edge / Safari";
    }

    // 3. Floating Scroll To Bottom Button
    const scrollBtn = document.getElementById("scrollToBottomBtn");
    if (chat && scrollBtn) {
        let isScrollTicking = false;
        chat.addEventListener("scroll", () => {
            if (!isScrollTicking) {
                requestAnimationFrame(() => {
                    const distanceFromBottom = chat.scrollHeight - chat.scrollTop - chat.clientHeight;
                    scrollBtn.hidden = (distanceFromBottom <= 160);
                    isScrollTicking = false;
                });
                isScrollTicking = true;
            }
        }, { passive: true });

        scrollBtn.addEventListener("click", () => {
            chat.scrollTo({ top: chat.scrollHeight, behavior: "smooth" });
            scrollBtn.hidden = true;
        });
    }
})();


/* =========================================================
   QUANTUM AURORA THINKING INDICATOR ENGINE
========================================================= */
function createQuantumThinkingMessage() {
    const message = document.createElement("div");
    message.className = "message ai thinking-message";

    let startTime = Date.now();
    const phases = [
        "Analyzing prompt intent...",
        "Querying neural model weights...",
        "Synthesizing deep reasoning...",
        "Formulating structured answer..."
    ];
    let phaseIdx = 0;

    message.innerHTML = `
        <div class="message-header-tag">
            <span class="ai-pulse-dot"></span>
            <span>Cloud Hybrid AI</span>
            <span class="thinking-timer" id="quantumTimer">0.0s</span>
        </div>
        <div class="quantum-thinking-wrap">
            <div class="quantum-thinking-orb">
                <div class="quantum-ring ring-1"></div>
                <div class="quantum-ring ring-2"></div>
                <div class="quantum-core"></div>
            </div>
            <div class="quantum-thinking-content">
                <div class="quantum-thinking-status">
                    <span class="quantum-status-text" id="quantumStatus">${phases[0]}</span>
                    <span class="quantum-sparkle">✦</span>
                </div>
                <div class="quantum-aurora-beam">
                    <div class="aurora-wave"></div>
                </div>
            </div>
        </div>
    `;

    chat?.appendChild(message);
    chat?.scrollTo({ top: chat.scrollHeight, behavior: "smooth" });

    const timerEl = message.querySelector("#quantumTimer");
    const statusEl = message.querySelector("#quantumStatus");

    const timerInterval = setInterval(() => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        if (timerEl) timerEl.textContent = elapsed + "s";
    }, 100);

    const phaseInterval = setInterval(() => {
        phaseIdx = (phaseIdx + 1) % phases.length;
        if (statusEl) {
            statusEl.style.opacity = "0";
            setTimeout(() => {
                if (statusEl) {
                    statusEl.textContent = phases[phaseIdx];
                    statusEl.style.opacity = "1";
                }
            }, 200);
        }
    }, 1400);

    return {
        element: message,
        stop: function() {
            clearInterval(timerInterval);
            clearInterval(phaseInterval);
            message.remove();
        }
    };
}

/* =========================================================
   ANIMATED CURSOR ENGINE (PARTICLE STARDUST & FLUID FOLLOWER)
========================================================= */
(function initAnimatedCursor() {
    // Only initialize on devices with fine pointer (mouse/trackpad)
    if (window.matchMedia("(pointer: coarse)").matches) return;

    // 1. Create Canvas for dynamic particle stardust trail & click ripples
    const canvas = document.createElement("canvas");
    canvas.id = "customCursorCanvas";
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    function resizeCanvas() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // 2. Create Precision Dot
    const dot = document.createElement("div");
    dot.id = "customCursorDot";
    document.body.appendChild(dot);

    // 3. Create Fluid Follower Ring
    const follower = document.createElement("div");
    follower.id = "customCursorFollower";
    document.body.appendChild(follower);

    // Cursor tracking state
    let mouseX = -100;
    let mouseY = -100;
    let followerX = -100;
    let followerY = -100;
    let followerScale = 1;
    let targetScale = 1;
    let isVisible = false;
    let isClicking = false;
    let isHovering = false;

    // Particle pool for high-performance 60fps trail
    const particles = [];
    const ripples = [];
    const colors = [
        "rgba(168, 85, 247, ", // Violet
        "rgba(192, 132, 252, ", // Purple
        "rgba(56, 189, 248, ",  // Sky Blue
        "rgba(129, 140, 248, ", // Indigo
        "rgba(244, 114, 182, ", // Pink
        "rgba(52, 211, 153, "   // Emerald
    ];

    let lastSpawnX = 0;
    let lastSpawnY = 0;

    window.addEventListener("mousemove", (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        if (!isVisible) {
            isVisible = true;
            dot.style.opacity = "1";
            follower.style.opacity = "1";
            followerX = mouseX;
            followerY = mouseY;
        }

        // Snap precision dot directly to cursor with zero latency
        dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;

        // Spawn trailing stardust particles when cursor travels
        const dist = Math.hypot(mouseX - lastSpawnX, mouseY - lastSpawnY);
        if (dist > 7) {
            lastSpawnX = mouseX;
            lastSpawnY = mouseY;

            const count = Math.min(3, Math.floor(dist / 14) + 1);
            for (let i = 0; i < count; i++) {
                if (particles.length < 80) {
                    particles.push({
                        x: mouseX + (Math.random() - 0.5) * 8,
                        y: mouseY + (Math.random() - 0.5) * 8,
                        vx: (Math.random() - 0.5) * 1.2,
                        vy: (Math.random() - 0.5) * 1.2 - 0.2,
                        size: Math.random() * 3.2 + 1.2,
                        colorBase: colors[Math.floor(Math.random() * colors.length)],
                        life: 1.0,
                        decay: Math.random() * 0.03 + 0.02
                    });
                }
            }
        }
    });

    window.addEventListener("mouseleave", () => {
        isVisible = false;
        dot.style.opacity = "0";
        follower.style.opacity = "0";
    });

    window.addEventListener("mouseenter", () => {
        isVisible = true;
        dot.style.opacity = "1";
        follower.style.opacity = "1";
    });

    // Hover detection on interactive elements
    const interactiveSelector = "button, a, input, textarea, select, [role='button'], .thread-item, .welcome-prompt-chip, .guide-card, .shortcut-pill, .provider-card, .model-pill";
    
    document.addEventListener("mouseover", (e) => {
        if (e.target && e.target.closest && e.target.closest(interactiveSelector)) {
            isHovering = true;
            targetScale = 1.6;
            follower.classList.add("cursor-hover");
            dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) scale(1.4)`;
        }
    });

    document.addEventListener("mouseout", (e) => {
        if (e.target && e.target.closest && e.target.closest(interactiveSelector)) {
            isHovering = false;
            targetScale = 1;
            follower.classList.remove("cursor-hover");
            dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) scale(1)`;
        }
    });

    // Click compression and ripple burst
    window.addEventListener("mousedown", (e) => {
        isClicking = true;
        targetScale = isHovering ? 1.2 : 0.72;
        follower.classList.add("cursor-click");

        ripples.push({
            x: e.clientX,
            y: e.clientY,
            r: 6,
            maxR: 38,
            alpha: 0.85
        });
    });

    window.addEventListener("mouseup", () => {
        isClicking = false;
        targetScale = isHovering ? 1.6 : 1;
        follower.classList.remove("cursor-click");
    });

    // 60FPS animation loop for fluid follower lerp & particle trail rendering
    function animateCursor() {
        // Fluid spring interpolation for trailing ring
        followerX += (mouseX - followerX) * 0.16;
        followerY += (mouseY - followerY) * 0.16;
        followerScale += (targetScale - followerScale) * 0.2;

        follower.style.transform = `translate3d(${followerX}px, ${followerY}px, 0) scale(${followerScale.toFixed(3)})`;

        // Render Canvas Particles & Ripples
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw and update stardust particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;

            if (p.life <= 0) {
                particles.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fillStyle = p.colorBase + p.life.toFixed(2) + ")";
            ctx.shadowColor = p.colorBase + "0.8)";
            ctx.shadowBlur = 6;
            ctx.fill();
            ctx.restore();
        }

        // Draw expanding click ripples
        for (let i = ripples.length - 1; i >= 0; i--) {
            const r = ripples[i];
            r.r += (r.maxR - r.r) * 0.18 + 0.5;
            r.alpha -= 0.045;

            if (r.alpha <= 0) {
                ripples.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(192, 132, 252, " + r.alpha.toFixed(2) + ")";
            ctx.lineWidth = 1.8;
            ctx.shadowColor = "rgba(168, 85, 247, 0.7)";
            ctx.shadowBlur = 8;
            ctx.stroke();
            ctx.restore();
        }

        if (!document.hidden) {
            animFrameId = requestAnimationFrame(animateCursor);
        }
    }

    let animFrameId = requestAnimationFrame(animateCursor);
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
            cancelAnimationFrame(animFrameId);
            animFrameId = requestAnimationFrame(animateCursor);
        }
    });
})();
