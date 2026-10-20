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
// const menuItems = document.querySelectorAll(".menu-item");
// new code 8-10-26=====
const menuItems = document.querySelectorAll(".menu-item[data-page]");
const logoutButton = document.getElementById("logoutButton");
const settingsNavigationItems = document.querySelectorAll(".settings-navigation-item");
// ========
const backButtons = document.querySelectorAll(".back-button");
const themeCards = document.querySelectorAll(".theme-card");
/* ========================================================= CUSTOM THEME ========================================================= */
const customThemeInput = document.getElementById("customThemeInput");
/* ========================================================= API ELEMENTS ========================================================= */
const apiList = document.getElementById("apiList");
const apiNameInput = document.getElementById("apiNameInput");
const apiKeyInput = document.getElementById("apiKeyInput");
const providerSelectButton = document.getElementById("providerSelectButton");
const providerSelectValue = document.getElementById("providerSelectValue");
const providerSelectMenu = document.getElementById("providerSelectMenu");
const providerOptions = document.querySelectorAll(".provider-option");
// const createApiButton = document.getElementById("createApiButton");
// let selectedProvider = "groq"; 
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
   CUSTOM NOTIFICATION POPUP
========================================================= */
let notificationTimer = null;
/* =========================================================
   SHOW POPUP
========================================================= */
function showPopup(title, message, type = "error", duration = 5000) {
    /* Find elements when the popup is actually needed.
       This is important because the popup HTML is loaded
       after app.js in index.html. */
    const popup = document.getElementById("notificationPopup");
    const icon = document.getElementById("notificationIcon");
    const titleElement = document.getElementById("notificationTitle");
    const messageElement = document.getElementById("notificationMessage");
    /* Safety check */
    if (!popup || !icon || !titleElement || !messageElement) {
        console.error("Notification popup elements were not found.");
        return;
    }
    /* Clear previous timer */
    clearTimeout(notificationTimer);
    /* Set popup text */
    titleElement.textContent = title;
    messageElement.textContent = message;
    /* Set popup type */
    popup.classList.remove("error", "warning", "success");
    popup.classList.add(type);
    /* Set icon */
    const icons = {
        error: "×",
        warning: "!",
        success: "✓"
    };
    icon.textContent = icons[type] || "!";
    /* Show popup */
    popup.classList.add("show");
    popup.setAttribute("aria-hidden", "false");
    /* Automatically hide */
    notificationTimer = setTimeout(hidePopup, duration);
}
/* =========================================================
   HIDE POPUP
========================================================= */
function hidePopup() {
    const popup = document.getElementById("notificationPopup");
    if (!popup) {
        return;
    }
    popup.classList.remove("show");
    popup.setAttribute("aria-hidden", "true");
    clearTimeout(notificationTimer);
}
/* =========================================================
   CLOSE POPUP
========================================================= */
document.addEventListener("click", (event) => {
    if (event.target.closest("#notificationClose")) {
        hidePopup();
    }
});
/* ========================================================= THEME DATA ========================================================= */
const themes = window.CLOUD_THEMES;
const PROVIDERS = {
    groq: {
        label: "Groq",
        endpoint: "https://api.groq.com/openai/v1/chat/completions",
        model: "openai/gpt-oss-20b"
    },
    huggingface: {
        label: "Hugging Face",
        endpoint: "https://router.huggingface.co/v1/chat/completions",
        model: "openai/gpt-oss-120b:fastest"
    },
    openai: {
        label: "OpenAI",
        endpoint: "https://api.openai.com/v1/chat/completions",
        model: "gpt-4o-mini"
    }
};
function getProviderConfig(providerKey) {
    const provider = PROVIDERS[providerKey] || PROVIDERS.huggingface;
    return provider;
}
/* ========================================================= SIDE MENU ========================================================= */
menuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    sideMenu.classList.toggle("open");
});
sideMenu.addEventListener("click", (event) => {
    event.stopPropagation();
});
//new code 8-10-26
logoutButton.addEventListener("click", () => {
    window.location.href = "/auth/logout";
});
//=====
/* =========================================================
   THREAD / CHAT HISTORY ENGINE
========================================================= */
const threadsList = document.getElementById("threadsList");
let threads = JSON.parse(localStorage.getItem("cloud_ai_threads") || "[]");
let activeThreadId = localStorage.getItem("cloud_ai_active_thread") || null;
/* =========================================================SAVE THREADS========================================================= */
function saveThreadsToStorage() {
    localStorage.setItem("cloud_ai_threads", JSON.stringify(threads));
    localStorage.setItem("cloud_ai_active_thread", activeThreadId);
}
/* =========================================================
   GET ACTIVE THREAD
========================================================= */
function getActiveThread() {
    return threads.find((thread) => thread.id === activeThreadId);
}
/* =========================================================
   CLEAR CHAT
========================================================= */
function clearChatMessages() {
    const messages = chat.querySelectorAll(".message");
    messages.forEach((message) => {
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
    clearChatMessages();
    if (thread.messages.length === 0) {
        welcome.classList.remove("hidden");
    } else {
        welcome.classList.add("hidden");
        thread.messages.forEach((message) => {
            addMessage(message.content, message.role);
        });
    }
    renderThreads();
    sideMenu.classList.remove("open");
}
/* =========================================================
   DELETE THREAD
========================================================= */
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
/* =========================================================
   RENDER THREADS
========================================================= */
function renderThreads() {
    if (!threadsList) {
        return;
    }
    threadsList.innerHTML = "";
    threads.forEach((thread) => {
        const item = document.createElement("div");
        item.className = `thread-item ${thread.id === activeThreadId ? "active" : ""}`;
        item.onclick = () => loadThread(thread.id);
        item.innerHTML = `
                <span class="thread-title">
                    ${escapeHtml(thread.title)}
                </span>
                <button
                    class="thread-delete-btn"
                    title="Delete conversation"
                >
                    &times;
                </button>
            `;
        const deleteButton = item.querySelector(".thread-delete-btn");
        deleteButton.onclick = (event) => deleteThread(thread.id, event);
        threadsList.appendChild(item);
    });
}
/* =========================================================
   NEW CHAT BUTTON
========================================================= */
newConversationButton.addEventListener("click", (event) => {
    event.stopPropagation();
    createNewThread();
});
/* =========================================================
   INITIALIZE CHAT HISTORY
========================================================= */
if (threads.length === 0) {
    createNewThread();
} else {
    if (!activeThreadId || !threads.some((thread) => thread.id === activeThreadId)) {
        activeThreadId = threads[0].id;
    }
    loadThread(activeThreadId);
}
chat.addEventListener("click", () => {
    sideMenu.classList.remove("open");
    dismissWelcome();
});
inputContainer.addEventListener("click", () => {
    sideMenu.classList.remove("open");
    dismissWelcome();
});
/* ========================================================= OPEN SETTINGS / THEMES / API ========================================================= */
menuItems.forEach((item) => {
    item.addEventListener("click", (event) => {
        event.stopPropagation();
        const pageId = item.dataset.page;
        openPage(pageId);
    });
});

/* SETTINGS PAGE NAVIGATION */
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
    if (!welcome) {
        return;
    }
    welcome.classList.add("hidden");
}

async function saveMessageToServer(conversationId, role, content) {
    // 1. Save the message to the selected local folder
    if (LocalConversationStorage.isFolderSelected()) {
        try {
            const localRole =
                role === "ai" ? "assistant" : role;

            await LocalConversationStorage.saveMessage(
                conversationId,
                localRole,
                content
            );

            console.log("Message saved locally:", localRole);
        
        } catch (error) {
            console.error("Local file save failed:", error);

            showPopup(
                "Local Archive Save Failed",
                "This message may not be saved in your selected folder. Check the folder permissions and storage location.",
                "error",
                7000
            );
        }

    }

    // 2. Save the message to the existing server storage
    try {
        const response = await fetch(
            "/api/conversations/messages",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    conversationId,
                    role,
                    content
                })
            }
        );

        if (!response.ok) {
            const error = await response.json();

            throw new Error(
                error.error || "Message could not be saved."
            );
        }

        return true;
    } catch (error) {
        console.error("Conversation storage error:", error);
        return false;
    }
}

/* ========================================================= CHAT ========================================================= */
async function sendMessage() {
    try {
        /* =========================================
           GET MESSAGE
        ========================================= */
        const text = messageInput.value.trim();
        if (!text) {
            showPopup("Empty Message", "Please enter a message before sending.", "warning");
            return;
        }
        /* =========================================
           GET ACTIVE API
        ========================================= */
        const activeApi = getActiveApi();
        if (!activeApi) {
            showPopup("No API Selected", "Please add an API and select it before sending a message.", "warning");
            return;
        }
        //x-x-x-x-x-x-xx--x-x-x-x-x-x-x-x-x-x-x--x-x-x-x-x-x-x--xx-x-x-xx--x-x-x-x--x-x-x-x-x-x-x--x-x-x-x-x-x-x-x-x--xx--x-x--x-x-x-x-x-x
        //  =========================================
        //    GET API KEY
        // ========================================= 
        // const apiKey = apiSecrets.get(activeApi.id);
        // if (!apiKey) {
        //     showPopup(
        //         "API Key Missing",
        //         `The API key for "${activeApi.name}" is not available. Please edit this API and enter the key again.`,
        //         "warning"
        //     );
        //     return;
        // }
        //  =========================================
        //    GET PROVIDER CONFIG
        // ========================================= 
        // const providerConfig = getProviderConfig(activeApi.provider);
        // if (!providerConfig) {
        //     showPopup("Provider Error", `The configuration for "${activeApi.provider}" could not be found.`, "error");
        //     return;
        // }
        // const endpoint = providerConfig.endpoint;
        // const model = activeApi.model || providerConfig.model;
        // if (!endpoint || !model) {
        //     showPopup(
        //         "Configuration Error",
        //         "The selected API is missing its endpoint or model configuration.",
        //         "error"
        //     );
        //     return;
        // }
        //x-x-x-x-x-x-xx--x-x-x-x-x-x-x-x-x-x-x--x-x-x-x-x-x-x--xx-x-x-xx--x-x-x-x--x-x-x-x-x-x-x--x-x-x-x-x-x-x-x-x--xx--x-x--x-x-x-x-x-x by leader 17 oct 
        /* =========================================
           SHOW USER MESSAGE
        ========================================= */
        dismissWelcome();
        addMessage(text, "user");
        messageInput.value = "";
        autoResize();
        /* =========================================
           SAVE USER MESSAGE
        ========================================= */
        const currentThread = getActiveThread();
        if (currentThread) {
            if (currentThread.messages.length === 0) {
                currentThread.title = text.slice(0, 24) + (text.length > 24 ? "..." : "");
            }
            currentThread.messages.push({
                role: "user",
                content: text
            });
            saveThreadsToStorage();
            renderThreads();
        }
        if (currentThread) {
    await saveMessageToServer(currentThread.id, "user", text);
}
        /* =========================================
           SHOW LOADING MESSAGE
        ========================================= */
        const loadingMessage = addMessage("Thinking...", "ai");

//x-x-x-x-x-x-xx--x-x-x-x-x-x-x-x-x-x-x--x-x-x-x-x-x-x--xx-x-x-xx--x-x-x-x--x-x-x-x-x-x-x--x-x-x-x-x-x-x-x-x--xx--x-x--x-x-x-x-x-x
        //  =========================================
        //    SEND REQUEST
        // ========================================= 
        // const response = await fetch(endpoint, {
        //     method: "POST",
        //     headers: {
        //         "Content-Type": "application/json",
        //         Authorization: `Bearer ${apiKey}`
        //     },
        //     body: JSON.stringify({
        //         model: model,
        //         messages: [
        //             {
        //                 role: "user",
        //                 content: text
        //             }
        //         ]
        //     })
        // });
        
        /* =========================================
           SEND REQUEST TO OUR BACKEND
        ========================================= */
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                apiId: activeApi.id,
                message: text
            })
        });

        /* =========================================
           READ RESPONSE
        ========================================= */
        let data = null;

        try {
            data = await response.json();
        } catch (jsonError) {
            console.error("Could not read chat response:", jsonError);
        }

        /* =========================================
           REMOVE LOADING
        ========================================= */
        loadingMessage.remove();

        /* =========================================
           HANDLE API ERROR
        ========================================= */
        if (!response.ok) {
            console.error("Chat request failed:", response.status, data);

            const errorMessage =
                data?.error ||
                `The chat request failed (${response.status}).`;

            showPopup("Chat Error", errorMessage, "error");
            return;
        }

        /* =========================================
           GET AI RESPONSE
        ========================================= */
        const aiResponse = data?.reply;

        if (typeof aiResponse !== "string" || !aiResponse.trim()) {
            showPopup(
                "Empty Response",
                "The server did not return an AI message.",
                "warning"
            );
            return;
        }

        
        // =========================================
        //    READ RESPONSE
        // ========================================= 
        // let data = null;
        // try {
        //     data = await response.json();
        // } catch (jsonError) {
        //     console.error("Could not read API response:", jsonError);
        // }
        /* =========================================
           REMOVE LOADING
        ========================================= */
        loadingMessage.remove();
        /* =========================================
           HANDLE API ERROR
        ========================================= */
        if (!response.ok) {
            console.error("API error:", data);
            const errorMessage =
                data?.error?.message || data?.error || `The API returned an error (${response.status}).`;
            showPopup("API Error", errorMessage, "error");
            return;
        }

        //  =========================================
        //    GET AI RESPONSE
        // ========================================= 
        // const aiResponse = data?.choices?.[0]?.message?.content;
        // if (!aiResponse) {
        //     showPopup("Empty Response", "The API responded successfully, but no AI message was returned.", "warning");
        //     return;
        // }
        /* =========================================
           DISPLAY AI RESPONSE
        ========================================= */
        addMessage(aiResponse, "ai");
        /* =========================================
           SAVE AI RESPONSE
        ========================================= */
        if (currentThread) {
            currentThread.messages.push({
                role: "ai",
                content: aiResponse
            });
            saveThreadsToStorage();
        }
        if (currentThread) {
    await saveMessageToServer(currentThread.id, "assistant", aiResponse);
}
    } catch (error) {
        /* =========================================
       UNEXPECTED ERROR
    ========================================= */
        console.error("SEND MESSAGE ERROR:", error);
        showPopup(
            "Something Went Wrong",
            error?.message || "The message could not be sent. Please check your API configuration and try again.",
            "error"
        );
    }
}
function addMessage(text, type) {
    const message = document.createElement("div");
    message.classList.add("message", type);
    /* =====================================================
       MESSAGE CONTENT
    ===================================================== */
    const messageText = document.createElement("div");
    messageText.classList.add("message-text");
    messageText.textContent = text;
    /* =====================================================
       STAR BUTTON
       Available for both user and AI messages.
    ===================================================== */
    const starButton = document.createElement("button");
    starButton.classList.add("message-star");
    starButton.type = "button";
    starButton.setAttribute("aria-label", "Star message");
    starButton.setAttribute("title", "Star message");
    starButton.innerHTML = "☆";
    /* =====================================================
       STAR TOGGLE
    ===================================================== */
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
    /* =====================================================
       ADD CONTENT + STAR
    ===================================================== */
    message.appendChild(messageText);
    message.appendChild(starButton);
    chat.appendChild(message);
    chat.scrollTo({
        top: chat.scrollHeight,
        behavior: "smooth"
    });
    return message;
}
sendButton.addEventListener("click", sendMessage);
/* ========================================================= ENTER TO SEND ========================================================= */
messageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
});
/* ========================================================= TEXTAREA AUTO RESIZE ========================================================= */
messageInput.addEventListener("input", autoResize);
function autoResize() {
    messageInput.style.height = "auto";
    messageInput.style.height = Math.min(messageInput.scrollHeight, 150) + "px";
}
/* ========================================================= THEMES ========================================================= */

/* =========================================
   GENERATE THEME CARDS
========================================= */

const themeGallery = document.getElementById("themeGallery");

function renderThemeCards() {
    if (!themeGallery) return;

    themeGallery.replaceChildren();

    Object.entries(window.CLOUD_THEMES || {}).forEach(
        ([themeId, theme]) => {
            const card = document.createElement("button");

            card.type = "button";
            card.className = "theme-card";
            card.dataset.theme = themeId;
            card.setAttribute(
                "aria-label",
                `Apply ${theme.name} theme`
            );

            const preview = document.createElement("div");
            preview.className = "theme-preview";

            preview.style.backgroundImage =
                `url("${theme.image}")`;

            preview.style.setProperty(
                "--preview-user",
                theme.user
            );

            preview.style.setProperty(
                "--preview-ai",
                theme.ai
            );

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

            preview.append(
                overlay,
                system,
                ai,
                user,
                aiSmall
            );

            const name = document.createElement("div");
            name.className = "theme-name";

            const dot = document.createElement("span");
            dot.className = "theme-dot";
            dot.style.backgroundColor = theme.user;

            const label = document.createElement("span");
            label.textContent = theme.name;

            name.append(dot, label);
            card.append(preview, name);

            card.addEventListener("click", () => {
                changeTheme(themeId);
            });

            themeGallery.appendChild(card);
        }
    );
}

renderThemeCards();

function changeTheme(themeName) {
    const selected = themes[themeName];
    if (!selected) {
        return;
    }
    chat.style.backgroundImage = `url("${selected.image}")`;
    document.documentElement.style.setProperty("--user-color", selected.user);
    document.documentElement.style.setProperty("--ai-color", selected.ai);
    localStorage.setItem("selectedTheme", themeName);
    closePages();
}
/* ========================================================= LOAD SAVED THEME ========================================================= */
const savedTheme = localStorage.getItem("selectedTheme");
if (savedTheme && themes[savedTheme]) {
    chat.style.backgroundImage = `url("${themes[savedTheme].image}")`;
    document.documentElement.style.setProperty("--user-color", themes[savedTheme].user);
    document.documentElement.style.setProperty("--ai-color", themes[savedTheme].ai);
}
/* ========================================================= CUSTOM WALLPAPER ========================================================= */
if (customThemeInput) {
    customThemeInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (!file) {
            return;
        }
        if (!file.type.startsWith("image/")) {
            showPopup("Invalid Image", "Please select an image file.", "warning");
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const image = reader.result;
            chat.style.backgroundImage = `url("${image}")`;
            localStorage.setItem("customTheme", image);
            localStorage.setItem("selectedTheme", "custom");
            closePages();
        };
        reader.readAsDataURL(file);
    });
}

//  ========================================================= LOAD CUSTOM WALLPAPER ========================================================= 
// const savedCustomTheme = localStorage.getItem("customTheme");
// if (savedCustomTheme && savedTheme === "custom") {
//     chat.style.backgroundImage = `url("${savedCustomTheme}")`;
// }
//  ========================================================= API DATA ========================================================= 
// /* IMPORTANT: Raw API keys are NOT stored in localStorage. They are kept only in this in-memory Map until the backend is implemented. */
// const apiSecrets = new Map();
// let apiEntries = [];
//  ========================================================= LOAD API METADATA ========================================================= 
// let savedApiMetadata = [];
// try {
//     savedApiMetadata = JSON.parse(localStorage.getItem("apiMetadata") || "[]");
//     if (!Array.isArray(savedApiMetadata)) {
//         savedApiMetadata = [];
//     }
// } catch (error) {
//     console.warn("Could not read API metadata.", error);
//     savedApiMetadata = [];
// }
// savedApiMetadata.forEach((entry) => {
//     const provider = PROVIDERS[entry.provider]
//         ? entry.provider
//         : entry.name.toLowerCase().includes("groq")
//           ? "groq"
//           : "huggingface";
//     apiEntries.push({
//         id: entry.id,
//         name: entry.name,
//         provider,
//         model: entry.model || PROVIDERS[provider].model,
//         maskLength: entry.maskLength || 16,
//         active: Boolean(entry.active)
//     });
// });
// normalizeActiveApi();
// renderApiEntries();
// renderApiSwitcher(); 

//x-x-x-x-x-x-xx--x-x-x-x-x-x-x-x-x-x-x--x-x-x-x-x-x-x--xx-x-x-xx--x-x-x-x--x-x-x-x-x-x-x--x-x-x-x-x-x-x-x-x--xx--x-x--x-x-x-x-x-x
/* ========================================================= API DATA ========================================================= */

const apiSecrets = new Map();
let apiEntries = [];
let isLoadingApis = false;

/* ========================================================= LOAD API KEYS FROM NEON ========================================================= */

async function loadApiEntries() {
    if (isLoadingApis) return;
    isLoadingApis = true;

    try {
        const response = await fetch("/api/keys", {
            method: "GET",
            credentials: "same-origin",
            headers: {
                "Accept": "application/json"
            }
        });

        if (response.status === 401) {
            showPopup(
                "Login Required",
                "Please log in to load your saved API keys.",
                "warning"
            );
            return;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Could not load API keys.");
        }

        if (!Array.isArray(data.keys)) {
            throw new Error("Unexpected response from the server.");
        }

        // Preserve the user's active selection between refreshes.
        let savedActiveId = null;

        try {
            savedActiveId = localStorage.getItem("activeApiId");
        } catch (error) {
            console.warn("Could not read active API selection.");
        }

        apiEntries = data.keys.map((item) => ({
            id: item.id,
            name: item.label,
            provider: PROVIDERS[item.provider]
                ? item.provider
                : "groq",
            model: item.model || PROVIDERS[item.provider]?.model,
            maskLength: 16,
            active: false
        }));

        const activeEntry = apiEntries.find(
            (entry) => entry.id === savedActiveId
        );

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
        showPopup(
            "Could Not Load APIs",
            "Check your connection and try again.",
            "error"
        );
    } finally {
        isLoadingApis = false;
    }
}

loadApiEntries();
//x-x-x-x-x-x-xx--x-x-x-x-x-x-x-x-x-x-x--x-x-x-x-x-x-x--xx-x-x-xx--x-x-x-x--x-x-x-x-x-x-x--x-x-x-x-x-x-x-x-x--xx--x-x--x-x-x-x-x-x by leader at 17 oct
/* ========================================================= CREATE API ========================================================= */
/* =========================================================
   ADD NEW API KEY FORM
========================================================= */

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

    apiNameInput.value = "";
    apiKeyInput.value = "";

    selectedProvider = "groq";

    if (providerSelectValue) {
        providerSelectValue.textContent = "Groq";
    }

    providerOptions.forEach((option) => {
        option.classList.toggle(
            "selected",
            option.dataset.value === "groq"
        );
    });

    providerSelectMenu?.classList.remove("open");
}

addApiKeyButton?.addEventListener("click", openApiCreateForm);

cancelCreateApiButton?.addEventListener(
    "click",
    closeApiCreateForm
);

providerSelectButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    providerSelectMenu?.classList.toggle("open");
});
providerOptions.forEach((option) => {
    option.addEventListener("click", (event) => {
        event.stopPropagation();
        selectedProvider = option.dataset.value || "groq";
        providerSelectValue.textContent = option.textContent.trim();
        providerOptions.forEach((item) => {
            item.classList.toggle("selected", item === option);
        });
        providerSelectMenu?.classList.remove("open");
    });
});
document.addEventListener("click", () => {
    providerSelectMenu?.classList.remove("open");
});
createApiButton.addEventListener("click",async () => {
    const name = apiNameInput.value.trim();
    const key = apiKeyInput.value.trim();
    if (!name || !key) {
        showPopup("Missing API Details", "Enter both the API name and API key.", "warning");
        return;
    }
    // saveApi(name, key, selectedProvider);
    //x-x-x-x-x-x-xx--x-x-x-x-x-x-x-x-x-x-x--x-x-x-x-x-x-x--xx-x-x-xx--x-x-x-x--x-x-x-x-x-x-x--x-x-x-x-x-x-x-x-x--xx--x-x--x-x-x-x-x-x
    try {
    await saveApi(name, key, selectedProvider);
} catch {
    return;
}
//x-x-x-x-x-x-xx--x-x-x-x-x-x-x-x-x-x-x--x-x-x-x-x-x-x--xx-x-x-xx--x-x-x-x--x-x-x-x-x-x-x--x-x-x-x-x-x-x-x-x--xx--x-x--x-x-x-x-x-x by leader oct 17
    apiNameInput.value = "";
    apiKeyInput.value = "";
    selectedProvider = "groq";
    if (providerSelectValue) {
        providerSelectValue.textContent = "Groq";
    }
    providerOptions.forEach((option) => {
        option.classList.toggle("selected", option.dataset.value === "groq");
    });
        closeApiCreateForm();
});


// ========================================================= SAVE API ========================================================= 
// function saveApi(name, key, providerKey = "groq") {
//     const id = Date.now().toString() + Math.random().toString(36).slice(2, 7);
//     const maskLength = Math.floor(Math.random() * 9) + 12;
//     const active = apiEntries.length === 0;
//     const provider = PROVIDERS[providerKey] ? providerKey : "groq";
//     apiSecrets.set(id, key);
//     apiEntries.push({
//         id,
//         name,
//         provider,
//         model: PROVIDERS[provider].model,
//         maskLength,
//         active
//     });
//     saveApiMetadata();
//     renderApiEntries();
//     renderApiSwitcher();
// }

//x-x-x-x-x-x-xx--x-x-x-x-x-x-x-x-x-x-x--x-x-x-x-x-x-x--xx-x-x-xx--x-x-x-x--x-x-x-x-x-x-x--x-x-x-x-x-x-x-x-x--xx--x-x--x-x-x-x-x-x
/* ========================================================= SAVE API TO NEON ========================================================= */

async function saveApi(name, key, providerKey = "groq") {
    const provider = PROVIDERS[providerKey]
        ? providerKey
        : "groq";

    try {
        const response = await fetch("/api/keys", {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                provider,
                label: name,
                model: PROVIDERS[provider].model,
                apiKey: key
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Could not save API key.");
        }

        // Use the database-generated ID, not a browser-generated ID.
        const saved = data.key;

        if (!saved || !saved.id) {
            throw new Error("The server did not return the saved API.");
        }

        const entry = {
            id: saved.id,
            name: saved.label,
            provider: saved.provider,
            model: saved.model || PROVIDERS[provider].model,
            maskLength: 16,
            active: apiEntries.length === 0
        };

        apiEntries.push(entry);

        // Do not persist the plaintext API key in browser storage.
        apiSecrets.delete(entry.id);

        if (entry.active) {
            try {
                localStorage.setItem("activeApiId", entry.id);
            } catch (error) {
                console.warn("Could not save active API selection.");
            }
        }

        renderApiEntries();
        renderApiSwitcher();

        showPopup(
            "API Saved",
            "Your API key was encrypted and saved to the database.",
            "success"
        );

    } catch (error) {
        console.error("Saving API key failed:", error);

        showPopup(
            "Could Not Save API",
            error.message || "Check your connection and try again.",
            "error"
        );

        throw error;
    }
}
//x-x-x-x-x-x-xx--x-x-x-x-x-x-x-x-x-x-x--x-x-x-x-x-x-x--xx-x-x-xx--x-x-x-x--x-x-x-x-x-x-x--x-x-x-x-x-x-x-x-x--xx--x-x--x-x-x-x-x-x by leader  oct 17
/* ========================================================= SAVE SAFE API METADATA ========================================================= */
function saveApiMetadata() {
    const metadata = apiEntries.map((entry) => ({
        id: entry.id,
        name: entry.name,
        provider: entry.provider,
        model: entry.model,
        maskLength: entry.maskLength,
        active: entry.active
    }));
    localStorage.setItem("apiMetadata", JSON.stringify(metadata));
}
/* ========================================================= NORMALIZE ACTIVE API ========================================================= */
function normalizeActiveApi() {
    let activeFound = false;
    apiEntries.forEach((entry) => {
        if (entry.active && !activeFound) {
            activeFound = true;
            return;
        }
        if (entry.active) {
            entry.active = false;
        }
    });
    /* If metadata somehow has APIs but none is active, activate first. */
    if (apiEntries.length > 0 && !apiEntries.some((entry) => entry.active)) {
        apiEntries[0].active = true;
    }
}
/* ========================================================= GET ACTIVE API ========================================================= */
function getActiveApi() {
    return apiEntries.find((entry) => entry.active);
}
/* ========================================================= RENDER API LIST ========================================================= */
function renderApiEntries() {
    apiList.innerHTML = "";
    const sortedEntries = [...apiEntries].sort((a, b) => {
        if (a.active && !b.active) {
            return -1;
        }
        if (!a.active && b.active) {
            return 1;
        }
        return 0;
    });
    sortedEntries.forEach((entry) => {
        renderApiEntry(entry);
    });
}
/* ========================================================= RENDER ONE API ========================================================= */
function renderApiEntry(entry) {
    const card = document.createElement("div");
    card.className = "api-card saved-api-card";
    const mask = "#".repeat(entry.maskLength);
    card.innerHTML = `
        <div class="api-field">
            <div class="api-field-label">
                Name
            </div>
            <div class="api-value-box">
                ${escapeHtml(entry.name)}
            </div>
        </div>
        <div class="api-field">
            <div class="api-field-label">
                Provider
            </div>
            <div class="api-value-box">
                ${escapeHtml(PROVIDERS[entry.provider]?.label || "Unknown")}
            </div>
        </div>
        <div class="api-field">
            <div class="api-field-label">
                API Key
            </div>
           <div class="api-value-box api-key-container">
    <span class="api-key-mask">${mask}</span>
<button
    class="api-key-toggle"
    type="button"
    aria-label="Show API key"
    title="Show API key"
>
    <svg
        class="eye-icon"
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
    >
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/>
        <circle cx="12" cy="12" r="3"/>
    </svg>
</button>
</div>
        </div>
        <div class="api-status-row">
            <div class="
                api-status
                ${entry.active ? "active" : "inactive"}
            ">
                <span class="status-dot"></span>
                <span>
                    ${entry.active ? "Active" : "Inactive"}
                </span>
            </div>
            <div class="api-actions">
                <button
                    class="api-edit"
                    type="button"
                >
                    Edit
                </button>
                <button
                    class="api-delete"
                    type="button"
                >
                    Delete
                </button>
                <button
                    class="
                        api-switch
                        ${entry.active ? "" : "inactive-switch"}
                    "
                    type="button"
                >
                    ${entry.active ? "Active" : "Switch"}
                </button>
            </div>
        </div>
    `;

    /* SHOW / HIDE API KEY */
    const keyToggleButton = card.querySelector(".api-key-toggle");
    const keyMask = card.querySelector(".api-key-mask");

    keyToggleButton.addEventListener("click", async () => {
        const isVisible = keyToggleButton.dataset.visible === "true";

        // Hide the key without making another server request.
        if (isVisible) {
            keyMask.textContent = mask;
            keyToggleButton.dataset.visible = "false";
            keyToggleButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg"
        width="18" height="18" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="1.8"
        stroke-linecap="round" stroke-linejoin="round"
        aria-hidden="true">
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/>
        <circle cx="12" cy="12" r="3"/>
    </svg>
`;
            keyToggleButton.setAttribute("aria-label", "Show API key");
            keyToggleButton.title = "Show API key";
            return;
        }

        keyToggleButton.disabled = true;

        try {
            const response = await fetch(
                `/api/keys/${encodeURIComponent(entry.id)}/reveal`,
                {
                    method: "GET",
                    credentials: "same-origin",
                    headers: {
                        Accept: "application/json"
                    },
                    cache: "no-store"
                }
            );

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.error || "Could not reveal the API key."
                );
            }

            if (typeof data.apiKey !== "string" || !data.apiKey) {
                throw new Error("The server returned no API key.");
            }

            keyMask.textContent = data.apiKey;
            keyToggleButton.dataset.visible = "true";
            keyToggleButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg"
        width="18" height="18" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="1.8"
        stroke-linecap="round" stroke-linejoin="round"
        aria-hidden="true">
        <path d="m3 3 18 18"/>
        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/>
        <path d="M9.9 5.2A11 11 0 0 1 12 5c6.4 0 10 7 10 7a15.5 15.5 0 0 1-4 4.7"/>
        <path d="M6.2 6.2C3.5 8 2 12 2 12s3.6 7 10 7c1.4 0 2.7-.3 3.8-.8"/>
    </svg>
`;
            keyToggleButton.setAttribute("aria-label", "Hide API key");
            keyToggleButton.title = "Hide API key";

        } catch (error) {
            console.error("API key reveal failed:", error.message);

            showPopup(
                "Could Not Reveal API Key",
                error.message || "Please try again.",
                "error"
            );
        } finally {
            keyToggleButton.disabled = false;
        }
    });

 
    apiList.appendChild(card);
    /* SWITCH */
    const switchButton = card.querySelector(".api-switch");
    switchButton.addEventListener("click", () => {
        if (!entry.active) {
            activateApi(entry.id);
        }
    });
    /* DELETE */
    const deleteButton = card.querySelector(".api-delete");
    deleteButton.addEventListener("click", () => {
        deleteApi(entry.id);
    });
    /* EDIT */
    const editButton = card.querySelector(".api-edit");
    editButton.addEventListener("click", () => {
        editApi(entry, card);
    });
}
/* ========================================================= ACTIVATE API ========================================================= */
function activateApi(id) {
    apiEntries.forEach((entry) => {
        entry.active = entry.id === id;
    });
    saveApiMetadata();
    renderApiEntries();
    renderApiSwitcher();
}
/* ========================================================= DELETE API ========================================================= */
function deleteApi(id) {
    const api = apiEntries.find((entry) => entry.id === id);
    if (!api) {
        return;
    }
    apiToDelete = id;
    deleteModalText.textContent = `Are you sure you want to delete "${api.name}"?`;
    deleteModal.classList.add("open");
    deleteModal.setAttribute("aria-hidden", "false");
}
/* ========================================================= CONFIRM DELETE ========================================================= */

confirmDeleteButton.addEventListener("click", async () => {
    if (!apiToDelete) {
        return;
    }

    const id = apiToDelete;
    const deletedApi = apiEntries.find(
        (entry) => String(entry.id) === String(id)
    );
    const wasActive = deletedApi?.active;

    confirmDeleteButton.disabled = true;

    try {
        const response = await fetch(
            `/api/keys/${encodeURIComponent(id)}`,
            {
                method: "DELETE",
                credentials: "same-origin",
                headers: {
                    Accept: "application/json"
                }
            }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.error || "Failed to delete API key.");
        }

        // Update the frontend only after backend deletion succeeds.
        apiSecrets.delete(id);
        apiEntries = apiEntries.filter(
            (entry) => String(entry.id) !== String(id)
        );

        // Select another API if the active one was deleted.
        if (wasActive && apiEntries.length > 0) {
            apiEntries.forEach((entry) => {
                entry.active = false;
            });

            apiEntries[0].active = true;

            try {
                localStorage.setItem(
                    "activeApiId",
                    String(apiEntries[0].id)
                );
            } catch (error) {
                console.warn("Could not save active API selection.", error);
            }
        } else if (wasActive) {
            try {
                localStorage.removeItem("activeApiId");
            } catch (error) {
                console.warn("Could not clear active API selection.", error);
            }
        }

        saveApiMetadata();
        renderApiEntries();
        renderApiSwitcher();
        closeDeleteModal();

    } catch (error) {
        console.error("API deletion failed:", error);

        showPopup(
            "Delete failed",
            error.message || "Could not delete the API key. Please try again.",
            "error"
        );
    } finally {
        confirmDeleteButton.disabled = false;
    }
});

/* ========================================================= CLOSE DELETE MODAL ========================================================= */
cancelDeleteButton.addEventListener("click", closeDeleteModal);
deleteModal.addEventListener("click", (event) => {
    if (event.target === deleteModal) {
        closeDeleteModal();
    }
});
function closeDeleteModal() {
    apiToDelete = null;
    deleteModal.classList.remove("open");
    deleteModal.setAttribute("aria-hidden", "true");
}
/* ========================================================= EDIT API ========================================================= */
function editApi(entry, card) {
    const currentKey = apiSecrets.get(entry.id) || "";
    card.innerHTML = `
        <div class="api-field">
            <div class="api-field-label">
                Name
            </div>
            <input
                type="text"
                class="edit-name-input"
                value="${escapeHtml(entry.name)}"
            >
        </div>
        <div class="api-field">
            <div class="api-field-label">
                Provider
            </div>
            <select class="edit-provider-input">
                ${Object.entries(PROVIDERS)
                    .map(
                        ([key, value]) => `
                        <option value="${key}" ${entry.provider === key ? "selected" : ""}>
                            ${escapeHtml(value.label)}
                        </option>
                    `
                    )
                    .join("")}
            </select>
        </div>
        <div class="api-field">
            <div class="api-field-label">
                API Key
            </div>
            <input
                type="password"
                class="edit-key-input"
                placeholder="Leave empty to keep current key"
                autocomplete="off"
            >
        </div>
        <div class="api-edit-controls">
            <button
                class="api-cancel-edit"
                type="button"
            >
                Cancel
            </button>
            <button
                class="api-save-edit"
                type="button"
            >
                Save
            </button>
        </div>
    `;
    const saveButton = card.querySelector(".api-save-edit");
    saveButton.addEventListener("click", () => {
        const newName = card.querySelector(".edit-name-input").value.trim();
        const newProvider = card.querySelector(".edit-provider-input").value;
        const newKey = card.querySelector(".edit-key-input").value.trim();
        if (!newName) {
            showPopup("Invalid API Name", "API name cannot be empty.", "warning");
            return;
        }
        entry.name = newName;
        entry.provider = PROVIDERS[newProvider] ? newProvider : "groq";
        entry.model = PROVIDERS[entry.provider].model;
        if (newKey) {
            apiSecrets.set(entry.id, newKey);
        } else if (currentKey) {
            apiSecrets.set(entry.id, currentKey);
        }
        saveApiMetadata();
        renderApiEntries();
        renderApiSwitcher();
    });
    const cancelButton = card.querySelector(".api-cancel-edit");
    cancelButton.addEventListener("click", () => {
        renderApiEntries();
    });
}
/* ========================================================= API SWITCHER ========================================================= */
apiSwitcherButton.addEventListener("click", (event) => {
    event.stopPropagation();
    renderApiSwitcher();
    apiSwitcherMenu.classList.toggle("open");
});
apiSwitcherMenu.addEventListener("click", (event) => {
    event.stopPropagation();
});
document.addEventListener("click", () => {
    apiSwitcherMenu.classList.remove("open");
});
/* ========================================================= RENDER API SWITCHER ========================================================= */
function renderApiSwitcher() {
    apiSwitcherList.innerHTML = "";
    const activeApi = getActiveApi();
    if (activeApi) {
        apiSwitcherCurrent.textContent = "Using: " + activeApi.name;
    } else {
        apiSwitcherCurrent.textContent = "No API selected";
    }
    if (apiEntries.length === 0) {
        apiSwitcherList.innerHTML = `
            <div class="api-switcher-empty">
                No APIs added yet.
            </div>
        `;
        return;
    }
    const sortedApis = [...apiEntries].sort((a, b) => {
        if (a.active && !b.active) {
            return -1;
        }
        if (!a.active && b.active) {
            return 1;
        }
        return 0;
    });
    sortedApis.forEach((api) => {
        const option = document.createElement("div");
        option.className = "api-switcher-option";
        if (api.active) {
            option.classList.add("selected");
        }
        option.innerHTML = `
                <span
                    class="api-switcher-dot"
                ></span>
                <span
                    class="api-switcher-name"
                >
                    ${escapeHtml(api.name)}
                </span>
                <button
                    class="
                        api-switch-button
                        ${api.active ? "active" : ""}
                    "
                    type="button"
                    ${api.active ? "disabled" : ""}
                >
                    ${api.active ? "Active" : "Switch"}
                </button>
            `;
        const switchButton = option.querySelector(".api-switch-button");
        if (!api.active) {
            switchButton.addEventListener("click", (event) => {
                event.stopPropagation();
                activateApi(api.id);
                renderApiSwitcher();
            });
        }
        apiSwitcherList.appendChild(option);
    });
}
/* ========================================================= ESCAPE HTML ========================================================= */
function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
/* ========================================================= ESCAPE KEY ========================================================= */
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        sideMenu.classList.remove("open");
        apiSwitcherMenu.classList.remove("open");
        closeDeleteModal();
    }
});
// TEMPORARY TEST — Local conversation storage
async function testLocalStorage() {
    try {
        const folderName =
            await LocalConversationStorage.chooseFolder();

        console.log("Selected folder:", folderName);

        const result =
            await LocalConversationStorage.saveMessage(
                "thread_test123",
                "user",
                "This is a test message."
            );

        console.log("Storage test successful:", result);
        alert("Storage test successful! Check your selected folder.");
    } catch (error) {
        console.error("Storage test failed:", error);
        alert("Storage test failed: " + error.message);
    }
}

document
    .getElementById("testStorageButton")
    ?.addEventListener("click", testLocalStorage);


/* LOCAL CONVERSATION STORAGE — Choose Folder & Backup */

const chooseStorageFolderButton =
    document.getElementById("chooseStorageFolderButton");

const checkAndBackupButton =
    document.getElementById("checkAndBackupButton");

const storageFolderStatus =
    document.getElementById("storageFolderStatus");

const storageBackupStatus =
    document.getElementById("storageBackupStatus");


/* ACTION 1: Select a folder only. Do not check or back up here. */
chooseStorageFolderButton?.addEventListener("click", async () => {
    try {
        const folderName =
            await LocalConversationStorage.chooseFolder();

        if (storageFolderStatus) {
            storageFolderStatus.textContent =
                `Selected folder: ${folderName}`;
        }

        if (storageBackupStatus) {
            storageBackupStatus.textContent =
                "Backup status has not been checked yet.";
        }

    } catch (error) {
        if (error.name === "AbortError") return;

        console.error("Folder selection failed:", error);

        showPopup(
            "Folder selection failed",
            error.message || "Could not select the storage folder.",
            "error"
        );
    }
});


/* ACTION 2: Check the folder, then back up missing conversations. */
checkAndBackupButton?.addEventListener("click", async () => {
    try {
        if (!LocalConversationStorage.isFolderSelected()) {
            showPopup(
                "Choose a folder first",
                "Select your storage folder before backing up conversations.",
                "warning"
            );
            return;
        }

        if (storageBackupStatus) {
            storageBackupStatus.textContent =
                "Checking backup status...";
        }

        const report =
            await LocalConversationStorage.verifyArchive(threads);

        // Stop if the archive has conflicts or invalid data.
        if (
            report.conflicts.length > 0 ||
            report.invalidFiles.length > 0 ||
            report.extraMessages.length > 0
        ) {
            if (storageBackupStatus) {
                storageBackupStatus.textContent =
                    "Backup needs attention. Existing files were left unchanged.";
            }

            showPopup(
                "Backup needs attention",
                "Some saved conversations differ. No backup was started.",
                "warning"
            );
            console.warn("Archive needs attention:", report);
            return;
        }

        const missingIds =
            new Set(report.missingArchiveFiles || []);

        if (missingIds.size === 0) {
            if (storageBackupStatus) {
                storageBackupStatus.textContent =
                    "All current conversations are backed up.";
            }

            showPopup(
                "Backup up to date",
                "All current conversations are present in your selected folder.",
                "success"
            );
            return;
        }

        // Tell the user the archive is incomplete before copying.
        if (storageBackupStatus) {
            storageBackupStatus.textContent =
                `${missingIds.size} conversation(s) are not backed up yet.`;
        }

        showPopup(
            "Conversations not backed up",
            `${missingIds.size} conversation(s) are missing. Backing them up now.`,
            "warning"
        );

        let backedUp = 0;

        for (const thread of threads) {
            if (!missingIds.has(thread.id)) continue;

            // This helper must refuse to overwrite an existing folder.
           try {
    await LocalConversationStorage.recoverMissingConversation(
        thread
    );

    backedUp++;
} catch (error) {
    console.error(
        "Backup failed for conversation:",
        thread.id,
        error.name,
        error.message,
        error.stack
    );

    showPopup(
        "Backup failed",
        `Could not back up conversation ${thread.id}. Check the browser console for details.`,
        "error"
    );

    return;
}
        }

        // Check again after the backup.
        const finalReport =
            await LocalConversationStorage.verifyArchive(threads);

        if (
            finalReport.missingArchiveFiles.length === 0 &&
            finalReport.conflicts.length === 0 &&
            finalReport.invalidFiles.length === 0
        ) {
            if (storageBackupStatus) {
                storageBackupStatus.textContent =
                    "All current conversations are backed up.";
            }

            showPopup(
                "Backup complete",
                `${backedUp} missing conversation(s) backed up successfully.`,
                "success"
            );
        } else {
            if (storageBackupStatus) {
                storageBackupStatus.textContent =
                    "Some conversations still need backup or review.";
            }

            showPopup(
                "Backup needs review",
                "The backup finished, but some conversations still need attention.",
                "warning"
            );
        }

    } catch (error) {
        console.error("Conversation backup failed:", error);

        if (storageBackupStatus) {
            storageBackupStatus.textContent =
                "Backup failed. Please check the folder and try again.";
        }

        showPopup(
            "Backup failed",
            error.message || "Could not back up conversations.",
            "error"
        );
    }
});

/* LOCAL STORAGE SETTINGS — NAVIGATION ONLY
   Folder selection happens only through Choose Storage Folder. */
const localStorageSettingsButton =
    document.getElementById("localStorageSettingsButton");

// Do not open the folder picker from this navigation button.
// The existing settings-navigation handler opens localStoragePage.

/* TEMPORARY TEST — Full conversation export */
async function testConversationExport() {
    try {
        const folderName =
            await LocalConversationStorage.chooseFolder();

        const testThread = {
            id: "thread_export_test",
            title: "Export Test",
            messages: [
                {
                    role: "user",
                    content: "Test message from user"
                },
                {
                    role: "ai",
                    content: "Test response from assistant"
                }
            ]
        };

        const result =
            await LocalConversationStorage.saveConversation(testThread);

        console.log("Conversation export result:", result);

        showPopup(
            "Export test passed",
            `Saved ${result.messageCount} test messages to ${folderName}.`,
            "success"
        );
    } catch (error) {
        if (error.name === "AbortError") return;

        console.error("Conversation export test failed:", error);

        showPopup(
            "Export test failed",
            error.message || "Could not export test conversation.",
            "error"
        );
    }
}
document
    .getElementById("testConversationExportButton")
    ?.addEventListener("click", testConversationExport);
    
/* TEMPORARY TEST — Safe conversation migration */
async function testSafeMigration() {
    try {
        const folderName =
            await LocalConversationStorage.chooseFolder();

        const testThread = {
            id: "thread_migration_test",
            title: "Migration Test",
            messages: [
                { role: "user", content: "Migration test message 1" },
                { role: "ai", content: "Migration test message 2" }
            ]
        };

        // First run: create the archive.
        const firstResult =
            await LocalConversationStorage.migrateConversation(testThread);

        // Second run: ensure it does not duplicate messages.
        const secondResult =
            await LocalConversationStorage.migrateConversation(testThread);

        console.log("First migration:", firstResult);
        console.log("Second migration:", secondResult);

        if (
            firstResult.messageCount !== 2 ||
            secondResult.messageCount !== 2 ||
            secondResult.status !== "already-current"
        ) {
            throw new Error(
                "Migration verification failed. Check the console and test file."
            );
        }

        showPopup(
            "Migration test passed",
            `Test archive verified in ${folderName}. Two messages, no duplicates.`,
            "success"
        );
    } catch (error) {
        if (error.name === "AbortError") return;

        console.error("Safe migration test failed:", error);

        showPopup(
            "Migration test failed",
            error.message || "Could not verify safe migration.",
            "error"
        );
    }
}

document
    .getElementById("testSafeMigrationButton")
    ?.addEventListener("click", testSafeMigration);

/* STORAGE MIGRATION — Button handler */

const migrateStorageButton =
    document.getElementById("migrateStorageButton");

migrateStorageButton?.addEventListener("click", async () => {
    try {
        if (!LocalConversationStorage.isFolderSelected()) {
            showPopup(
                "Choose a folder first",
                "Select your current storage folder before migrating.",
                "warning"
            );
            return;
        }

        showPopup(
            "Migration started",
            "Choose a destination folder for your archive.",
            "info"
        );

        const result =
            await LocalConversationStorage.migrateStorageFolder();

        showPopup(
            "Migration complete",
            `Copied and verified ${result.copiedFiles} file(s) from "${result.sourceName}" to "${result.destinationName}". Your original archive is still safe.`,
            "success",
            7000
        );

    } catch (error) {
        if (error.name === "AbortError") {
            showPopup(
                "Migration cancelled",
                "Your original archive has not been changed.",
                "info"
            );
            return;
        }

        console.error("Storage migration failed:", error);

        showPopup(
            "Migration failed",
            error.message || "Could not migrate the storage folder.",
            "error",
            7000
        );
    }
});

/* TEMPORARY TEST — Migration conflict protection */
async function testMigrationConflict() {
    try {
        const folderName =
            await LocalConversationStorage.chooseFolder();

        const conversationId = "thread_migration_conflict_test";

        // Create a known baseline in a dedicated test folder.
        const baseline = {
            id: conversationId,
            title: "Conflict Test",
            messages: [
                {
                    role: "user",
                    content: "Original archive message"
                }
            ]
        };

        await LocalConversationStorage.saveConversation(baseline);

        // Simulate browser history that conflicts with the archive.
        const conflictingThread = {
            id: conversationId,
            title: "Conflict Test",
            messages: [
                {
                    role: "user",
                    content: "Different browser history message"
                }
            ]
        };

        try {
            await LocalConversationStorage.migrateConversation(
                conflictingThread
            );

            throw new Error(
                "SAFETY FAILURE: conflicting history was not rejected."
            );
        } catch (error) {
            if (
                error.message.startsWith("SAFETY FAILURE:")
            ) {
                throw error;
            }

            if (!error.message.includes("History conflict")) {
                throw error;
            }

            console.log(
                "Expected conflict detected:",
                error.message
            );

            showPopup(
                "Conflict detected",
                `Migration stopped safely. Check the test archive in ${folderName}.`,
                "success"
            );
        }
    } catch (error) {
        if (error.name === "AbortError") return;

        console.error("Conflict test failed:", error);

        showPopup(
            "Conflict test failed",
            error.message || "Could not verify conflict protection.",
            "error"
        );
    }
}

document
    .getElementById("testMigrationConflictButton")
    ?.addEventListener("click", testMigrationConflict);

/* TEMPORARY TEST — Migration preview only */
function previewConversationMigration() {
    try {
        // Read the existing in-memory copy of browser history.
        const sourceThreads = threads;

        if (!Array.isArray(sourceThreads)) {
            throw new Error("Browser conversation history is invalid.");
        }

        let totalMessages = 0;
        let emptyConversations = 0;

        for (const thread of sourceThreads) {
            if (
                !thread ||
                typeof thread.id !== "string" ||
                !Array.isArray(thread.messages)
            ) {
                throw new Error(
                    "Invalid conversation found. Preview stopped."
                );
            }

            totalMessages += thread.messages.length;

            if (thread.messages.length === 0) {
                emptyConversations++;
            }
        }

        const preview = {
            conversations: sourceThreads.length,
            messages: totalMessages,
            emptyConversations,
            writesPerformed: 0
        };

        console.table([preview]);
        console.log("Migration preview:", preview);

        showPopup(
            "Migration preview ready",
            `${preview.conversations} conversations, ` +
            `${preview.messages} messages. No files were changed.`,
            "success"
        );
    } catch (error) {
        console.error("Migration preview failed:", error);

        showPopup(
            "Preview failed",
            error.message || "Could not inspect browser history.",
            "error"
        );
    }
}

document
    .getElementById("previewConversationMigrationButton")
    ?.addEventListener("click", previewConversationMigration);

/* LOCAL CONVERSATION STORAGE — Preview button */
const previewMigrationButton =
    document.getElementById("previewMigrationButton");

const migrationConversationCount =
    document.getElementById("migrationConversationCount");

const migrationMessageCount =
    document.getElementById("migrationMessageCount");

const migrationStatus =
    document.getElementById("migrationStatus");

previewMigrationButton?.addEventListener("click", () => {
    try {
        const sourceThreads = threads;

        if (!Array.isArray(sourceThreads)) {
            throw new Error("Browser conversation history is invalid.");
        }

        let totalMessages = 0;

        for (const thread of sourceThreads) {
            if (!thread || !Array.isArray(thread.messages)) {
                throw new Error("Invalid conversation found. Preview stopped.");
            }

            totalMessages += thread.messages.length;
        }

        migrationConversationCount.textContent = sourceThreads.length;
        migrationMessageCount.textContent = totalMessages;
        migrationStatus.textContent =
            "Preview complete. No files have been changed.";

        console.log("Conversation migration preview:", {
            conversations: sourceThreads.length,
            messages: totalMessages,
            writesPerformed: 0
        });
    } catch (error) {
        console.error("Migration preview failed:", error);

        migrationStatus.textContent = error.message;

        showPopup(
            "Preview Failed",
            error.message || "Could not preview conversation history.",
            "error"
        );
    }
});

/* READ-ONLY — Verify existing local archive */
const verifyArchiveButton =
    document.getElementById("verifyArchiveButton");

/* READ-ONLY — Preview conversations available for import */
async function previewArchiveImport() {
    try {
        const browserThreads = JSON.parse(
            localStorage.getItem("cloud_ai_threads") || "[]"
        );

        if (!Array.isArray(browserThreads)) {
            throw new Error("Browser conversation history is invalid.");
        }

        const archivedThreads =
            await LocalConversationStorage.readArchive();

        // Exclude the two known test conversations.
        const testIds = new Set([
            "thread_export_test",
            "thread_test123"
        ]);

        const browserById = new Map(
            browserThreads.map(thread => [thread.id, thread])
        );

        const preview = archivedThreads
            .filter(thread => !testIds.has(thread.id))
            .map(archive => {
                const existing = browserById.get(archive.id);

                if (!existing) {
                    return {
                        id: archive.id,
                        status: "Archive only — review before import",
                        browserMessages: 0,
                        archiveMessages: archive.messages.length
                    };
                }

                const browserMessages = existing.messages || [];
                const archiveMessages = archive.messages;

                const exactMatch =
                    browserMessages.length === archiveMessages.length &&
                    browserMessages.every((message, index) => {
                        const archived = archiveMessages[index];

                        const role =
                            message.role === "assistant" ||
                            message.role === "ai"
                                ? "ai"
                                : message.role;

                        return (
                            role === archived.role &&
                            message.content === archived.content
                        );
                    });

                return {
                    id: archive.id,
                    status: exactMatch
                        ? "Already present — exact match"
                        : "Conflict — review required",
                    browserMessages: browserMessages.length,
                    archiveMessages: archiveMessages.length
                };
            });

        console.table(preview);

        const summary = {
            browserConversations: browserThreads.length,
            archivedConversations: archivedThreads.length,
            testFoldersExcluded: testIds.size,
            exactMatches: preview.filter(
                item => item.status === "Already present — exact match"
            ).length,
            archiveOnly: preview.filter(
                item => item.status.startsWith("Archive only")
            ).length,
            conflicts: preview.filter(
                item => item.status.startsWith("Conflict")
            ).length,
            writesPerformed: 0
        };

        
console.log("Archive import preview:", summary);

// Update the existing archive status area.
if (archiveVerificationStatus) {
    archiveVerificationStatus.textContent =
        `Import preview: ${summary.exactMatches} exact matches, ` +
        `${summary.archiveOnly} archive-only conversations, ` +
        `${summary.conflicts} conflicts. No data was changed.`;
}

// Display the preview details in the existing results area.
if (archiveVerificationResults) {
    archiveVerificationResults.textContent = JSON.stringify(
        { summary, conversations: preview },
        null,
        2
    );

    archiveVerificationResults.hidden = false;
}

showPopup(
    "Import preview complete",
    `${summary.exactMatches} exact matches, ` +
    `${summary.archiveOnly} archive-only conversations, ` +
    `${summary.conflicts} conflicts. No data was changed.`,
    summary.conflicts ? "warning" : "success",
    7000
);

return { preview, summary };

    } catch (error) {
        console.error("Archive import preview failed:", error);

        showPopup(
            "Import preview failed",
            error.message || "Could not preview the archive.",
            "error"
        );
    }
}
const archiveVerificationStatus =
    document.getElementById("archiveVerificationStatus");

const archiveVerificationResults =
    document.getElementById("archiveVerificationResults");

verifyArchiveButton?.addEventListener("click", async () => {
    verifyArchiveButton.disabled = true;
    archiveVerificationStatus.textContent =
        "Checking existing archive. No files will be changed.";

    try {
        const report =
            await LocalConversationStorage.verifyArchive(threads);
console.log("[Archive Verification Report]", report);
        archiveVerificationResults.textContent =
            JSON.stringify(report, null, 2);

        archiveVerificationResults.hidden = false;

        const hasProblems =
            report.conflicts.length > 0 ||
            report.invalidFiles.length > 0 ||
            report.missingArchiveFiles.length > 0 ||
            report.missingBrowserConversations.length > 0 ||
            report.extraMessages.length > 0;

        
        const recoveredCount = report.matching.length;
        const extraArchiveCount = report.missingBrowserConversations.length;

        archiveVerificationStatus.textContent = hasProblems
            ? `Archive check: ${recoveredCount} browser conversations match. ` +
              `${extraArchiveCount} archive-only conversations found. ` +
              `Review differences before migration.`
            : `Verification complete: ${recoveredCount} conversations match. No files were changed.`;

        console.log("Read-only archive verification:", report);
    } catch (error) {
        console.error("Archive verification failed:", error);

        archiveVerificationStatus.textContent =
            error.message || "Archive verification failed.";

        showPopup(
            "Archive Verification Failed",
            error.message || "Could not verify the archive.",
            "error"
        );
    } finally {
        verifyArchiveButton.disabled = false;
    }
});
