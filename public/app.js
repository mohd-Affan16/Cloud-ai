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
const settingsNavigationItems =
    document.querySelectorAll(".settings-navigation-item");

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
const createApiButton = document.getElementById("createApiButton");
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

function showPopup(
    title,
    message,
    type = "error",
    duration = 5000
) {

    /* Find elements when the popup is actually needed.
       This is important because the popup HTML is loaded
       after app.js in index.html. */

    const popup =
        document.getElementById(
            "notificationPopup"
        );

    const icon =
        document.getElementById(
            "notificationIcon"
        );

    const titleElement =
        document.getElementById(
            "notificationTitle"
        );

    const messageElement =
        document.getElementById(
            "notificationMessage"
        );


    /* Safety check */

    if (
        !popup ||
        !icon ||
        !titleElement ||
        !messageElement
    ) {

        console.error(
            "Notification popup elements were not found."
        );

        return;
    }


    /* Clear previous timer */

    clearTimeout(
        notificationTimer
    );


    /* Set popup text */

    titleElement.textContent =
        title;

    messageElement.textContent =
        message;


    /* Set popup type */

    popup.classList.remove(
        "error",
        "warning",
        "success"
    );

    popup.classList.add(
        type
    );


    /* Set icon */

    const icons = {
        error: "×",
        warning: "!",
        success: "✓"
    };

    icon.textContent =
        icons[type] || "!";


    /* Show popup */

    popup.classList.add(
        "show"
    );

    popup.setAttribute(
        "aria-hidden",
        "false"
    );


    /* Automatically hide */

    notificationTimer =
        setTimeout(
            hidePopup,
            duration
        );
}


/* =========================================================
   HIDE POPUP
========================================================= */

function hidePopup() {

    const popup =
        document.getElementById(
            "notificationPopup"
        );

    if (!popup) {
        return;
    }


    popup.classList.remove(
        "show"
    );

    popup.setAttribute(
        "aria-hidden",
        "true"
    );

    clearTimeout(
        notificationTimer
    );
}


/* =========================================================
   CLOSE POPUP
========================================================= */

document.addEventListener(
    "click",
    event => {

        if (
            event.target.closest(
                "#notificationClose"
            )
        ) {

            hidePopup();
        }
    }
);
/* ========================================================= THEME DATA ========================================================= */
const themes = {
    purple: {
        image:
            "assets/themes/purple.jpeg",
        user:
            "#8b5cf6",
        ai:
            "rgba(20,20,24,0.88)"
    },
    green: {
        image:
            "assets/themes/green.jpeg",
        user:
            "#15803d",
        ai:
            "rgba(14,24,18,0.88)"
    },
    orange: {
        image:
            "assets/themes/orange.jpeg",
        user:
            "#ea580c",
        ai:
            "rgba(25,18,13,0.88)"
    },
    blue: {
        image:
            "assets/themes/blue.jpeg",
        user:
            "#1d4ed8",
        ai:
            "rgba(13,19,30,0.88)"
    }
};
const PROVIDERS = {
    groq: {
        label:
            "Groq",
        endpoint:
            "https://api.groq.com/openai/v1/chat/completions",
        model:
            "openai/gpt-oss-20b"
    },
    huggingface: {
        label:
            "Hugging Face",
        endpoint:
            "https://router.huggingface.co/v1/chat/completions",
        model:
            "openai/gpt-oss-120b:fastest"
    },
    openai: {
        label:
            "OpenAI",
        endpoint:
            "https://api.openai.com/v1/chat/completions",
        model:
            "gpt-4o-mini"
    }
};
function getProviderConfig(providerKey) {
    const provider =
        PROVIDERS[providerKey] || PROVIDERS.huggingface;
    return provider;
}
/* ========================================================= SIDE MENU ========================================================= */
menuButton.addEventListener(
    "click",
    event => {
        event.stopPropagation();
        sideMenu.classList.toggle("open");
    }
);
sideMenu.addEventListener(
    "click",
    event => {
        event.stopPropagation();
    }
);
//new code 8-10-26
logoutButton.addEventListener(
    "click",
    () => {
        window.location.href = "/auth/logout";
    }
);
//=====
/* =========================================================
   THREAD / CHAT HISTORY ENGINE
========================================================= */

const threadsList =
    document.getElementById("threadsList");

let threads =
    JSON.parse(
        localStorage.getItem(
            "cloud_ai_threads"
        ) || "[]"
    );

let activeThreadId =
    localStorage.getItem(
        "cloud_ai_active_thread"
    ) || null;


/* =========================================================SAVE THREADS========================================================= */
function saveThreadsToStorage() {
    localStorage.setItem("cloud_ai_threads",JSON.stringify(threads));
    localStorage.setItem("cloud_ai_active_thread",activeThreadId);
}
/* =========================================================
   GET ACTIVE THREAD
========================================================= */

function getActiveThread() {

    return threads.find(
        thread =>
            thread.id === activeThreadId
    );
}


/* =========================================================
   CLEAR CHAT
========================================================= */

function clearChatMessages() {

    const messages =
        chat.querySelectorAll(
            ".message"
        );

    messages.forEach(
        message => {
            message.remove();
        }
    );
}


/* =========================================================
   CREATE NEW THREAD
========================================================= */

function createNewThread() {

    const newThread = {

        id:
            "thread_" +
            Date.now(),

        title:
            "New Conversation",

        messages:
            []
    };

    threads.unshift(
        newThread
    );

    activeThreadId =
        newThread.id;

    saveThreadsToStorage();

    clearChatMessages();

    welcome.classList.remove(
        "hidden"
    );

    messageInput.value =
        "";

    autoResize();

    renderThreads();

    sideMenu.classList.remove(
        "open"
    );

    messageInput.focus();
}


/* =========================================================
   LOAD THREAD
========================================================= */

function loadThread(id) {

    const thread =
        threads.find(
            item =>
                item.id === id
        );

    if (!thread) {
        return;
    }

    activeThreadId =
        id;

    saveThreadsToStorage();

    clearChatMessages();

    if (
        thread.messages.length === 0
    ) {

        welcome.classList.remove(
            "hidden"
        );

    } else {

        welcome.classList.add(
            "hidden"
        );

        thread.messages.forEach(
            message => {

                addMessage(
                    message.content,
                    message.role
                );

            }
        );
    }

    renderThreads();

    sideMenu.classList.remove(
        "open"
    );
}


/* =========================================================
   DELETE THREAD
========================================================= */

function deleteThread(
    id,
    event
) {

    event.stopPropagation();

    threads =
        threads.filter(
            thread =>
                thread.id !== id
        );

    if (
        activeThreadId === id
    ) {

        if (
            threads.length > 0
        ) {

            activeThreadId =
                threads[0].id;

            loadThread(
                activeThreadId
            );

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

    threadsList.innerHTML =
        "";

    threads.forEach(
        thread => {

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                `thread-item ${
                    thread.id === activeThreadId
                        ? "active"
                        : ""
                }`;

            item.onclick =
                () =>
                    loadThread(
                        thread.id
                    );

            item.innerHTML = `
                <span class="thread-title">
                    ${escapeHtml(
                        thread.title
                    )}
                </span>

                <button
                    class="thread-delete-btn"
                    title="Delete conversation"
                >
                    &times;
                </button>
            `;

            const deleteButton =
                item.querySelector(
                    ".thread-delete-btn"
                );

            deleteButton.onclick =
                event =>
                    deleteThread(
                        thread.id,
                        event
                    );

            threadsList.appendChild(
                item
            );
        }
    );
}


/* =========================================================
   NEW CHAT BUTTON
========================================================= */

newConversationButton.addEventListener(
    "click",
    event => {

        event.stopPropagation();

        createNewThread();
    }
);


/* =========================================================
   INITIALIZE CHAT HISTORY
========================================================= */

if (
    threads.length === 0
) {

    createNewThread();

} else {

    if (
        !activeThreadId ||
        !threads.some(
            thread =>
                thread.id ===
                activeThreadId
        )
    ) {

        activeThreadId =
            threads[0].id;
    }

    loadThread(
        activeThreadId
    );
}
chat.addEventListener(
    "click",
    () => {
        sideMenu.classList.remove("open");
        dismissWelcome();
    }
);
inputContainer.addEventListener(
    "click",
    () => {
        sideMenu.classList.remove("open");
        dismissWelcome();
    }
);
/* ========================================================= OPEN SETTINGS / THEMES / API ========================================================= */
menuItems.forEach(
    item => {
        item.addEventListener(
            "click",
            event => {
                event.stopPropagation();
                const pageId =
                    item.dataset.page;
                openPage(pageId);
            }
        );
    }
);
settingsNavigationItems.forEach(item => {
    item.addEventListener("click", event => {
        event.stopPropagation();

        const pageId = item.dataset.page;
        openPage(pageId);
    });
});
function openPage(pageId) {
    sideMenu.classList.remove("open");
    apiSwitcherMenu.classList.remove("open");
    pages.forEach(
        page => {
            page.classList.remove("open");
        }
    );
    const page =
        document.getElementById(pageId);
    if (!page) {
        console.error(
            "Page not found:",
            pageId
        );
        return;
    }
    page.classList.add("open");
    /* Hide message input while Settings / Themes / API is open. */
    inputContainer.classList.add(
        "page-hidden"
    );
}
/* ========================================================= CLOSE PAGES ========================================================= */
backButtons.forEach(
    button => {
        button.addEventListener(
            "click",
            closePages
        );
    }
);
function closePages() {
    pages.forEach(
        page => {
            page.classList.remove("open");
        }
    );
    inputContainer.classList.remove(
        "page-hidden"
    );
}
/* ========================================================= WELCOME ========================================================= */
function dismissWelcome() {
    if (!welcome) {
        return;
    }
    welcome.classList.add("hidden");
}
/* ========================================================= CHAT ========================================================= */
async function sendMessage() {

    try {

        /* =========================================
           GET MESSAGE
        ========================================= */

        const text =
            messageInput.value.trim();

        if (!text) {

            showPopup(
                "Empty Message",
                "Please enter a message before sending.",
                "warning"
            );

            return;
        }


        /* =========================================
           GET ACTIVE API
        ========================================= */

        const activeApi =
            getActiveApi();

        if (!activeApi) {

            showPopup(
                "No API Selected",
                "Please add an API and select it before sending a message.",
                "warning"
            );

            return;
        }


        /* =========================================
           GET API KEY
        ========================================= */

        const apiKey =
            apiSecrets.get(
                activeApi.id
            );

        if (!apiKey) {

            showPopup(
                "API Key Missing",
                `The API key for "${activeApi.name}" is not available. Please edit this API and enter the key again.`,
                "warning"
            );

            return;
        }


        /* =========================================
           GET PROVIDER CONFIG
        ========================================= */

        const providerConfig =
            getProviderConfig(
                activeApi.provider
            );

        if (!providerConfig) {

            showPopup(
                "Provider Error",
                `The configuration for "${activeApi.provider}" could not be found.`,
                "error"
            );

            return;
        }


        const endpoint =
            providerConfig.endpoint;

        const model =
            activeApi.model ||
            providerConfig.model;


        if (!endpoint || !model) {

            showPopup(
                "Configuration Error",
                "The selected API is missing its endpoint or model configuration.",
                "error"
            );

            return;
        }


        /* =========================================
           SHOW USER MESSAGE
        ========================================= */

        dismissWelcome();

        addMessage(
            text,
            "user"
        );

        messageInput.value = "";

        autoResize();


        /* =========================================
           SAVE USER MESSAGE
        ========================================= */

        const currentThread =
            getActiveThread();

        if (currentThread) {

            if (
                currentThread.messages.length === 0
            ) {

                currentThread.title =
                    text.slice(0, 24) +
                    (
                        text.length > 24
                            ? "..."
                            : ""
                    );
            }

            currentThread.messages.push({
                role: "user",
                content: text
            });

            saveThreadsToStorage();

            renderThreads();
        }


        /* =========================================
           SHOW LOADING MESSAGE
        ========================================= */

        const loadingMessage =
            addMessage(
                "Thinking...",
                "ai"
            );


        /* =========================================
           SEND REQUEST
        ========================================= */

        const response =
            await fetch(
                endpoint,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${apiKey}`
                    },

                    body:
                        JSON.stringify({
                            model: model,

                            messages: [
                                {
                                    role: "user",
                                    content: text
                                }
                            ]
                        })
                }
            );


        /* =========================================
           READ RESPONSE
        ========================================= */

        let data = null;

        try {

            data =
                await response.json();

        } catch (jsonError) {

            console.error(
                "Could not read API response:",
                jsonError
            );

        }


        /* =========================================
           REMOVE LOADING
        ========================================= */

        loadingMessage.remove();


        /* =========================================
           HANDLE API ERROR
        ========================================= */

        if (!response.ok) {

            console.error(
                "API error:",
                data
            );

            const errorMessage =
                data?.error?.message ||
                data?.error ||
                `The API returned an error (${response.status}).`;

            showPopup(
                "API Error",
                errorMessage,
                "error"
            );

            return;
        }


        /* =========================================
           GET AI RESPONSE
        ========================================= */

        const aiResponse =
            data?.choices?.[0]?.message?.content;


        if (!aiResponse) {

            showPopup(
                "Empty Response",
                "The API responded successfully, but no AI message was returned.",
                "warning"
            );

            return;
        }


        /* =========================================
           DISPLAY AI RESPONSE
        ========================================= */

        addMessage(
            aiResponse,
            "ai"
        );


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

    }

    /* =========================================
       UNEXPECTED ERROR
    ========================================= */

    catch (error) {

        console.error(
            "SEND MESSAGE ERROR:",
            error
        );


        showPopup(
            "Something Went Wrong",
            error?.message ||
            "The message could not be sent. Please check your API configuration and try again.",
            "error"
        );
    }
}
function addMessage(
    text,
    type
) {
    const message =
        document.createElement("div");

    message.classList.add(
        "message",
        type
    );

    /* =====================================================
       MESSAGE CONTENT
    ===================================================== */

    const messageText =
        document.createElement("div");

    messageText.classList.add(
        "message-text"
    );

    messageText.textContent =
        text;

    /* =====================================================
       STAR BUTTON
       Available for both user and AI messages.
    ===================================================== */

    const starButton =
        document.createElement("button");

    starButton.classList.add(
        "message-star"
    );

    starButton.type =
        "button";

    starButton.setAttribute(
        "aria-label",
        "Star message"
    );

    starButton.setAttribute(
        "title",
        "Star message"
    );

    starButton.innerHTML = "☆";

    /* =====================================================
       STAR TOGGLE
    ===================================================== */

    starButton.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            const starred =
                message.classList.toggle(
                    "starred"
                );

            if (starred) {

                starButton.innerHTML =
                    "★";

                starButton.setAttribute(
                    "aria-label",
                    "Unstar message"
                );

                starButton.setAttribute(
                    "title",
                    "Unstar message"
                );

            } else {

                starButton.innerHTML =
                    "☆";

                starButton.setAttribute(
                    "aria-label",
                    "Star message"
                );

                starButton.setAttribute(
                    "title",
                    "Star message"
                );
            }
        }
    );

    /* =====================================================
       ADD CONTENT + STAR
    ===================================================== */

    message.appendChild(
        messageText
    );

    message.appendChild(
        starButton
    );

    chat.appendChild(
        message
    );

    chat.scrollTo({
        top:
            chat.scrollHeight,
        behavior:
            "smooth"
    });

    return message;
}
sendButton.addEventListener(
    "click",
    sendMessage
);
/* ========================================================= ENTER TO SEND ========================================================= */
messageInput.addEventListener(
    "keydown",
    event => {
        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {
            event.preventDefault();
            sendMessage();
        }
    }
);
/* ========================================================= TEXTAREA AUTO RESIZE ========================================================= */
messageInput.addEventListener(
    "input",
    autoResize
);
function autoResize() {
    messageInput.style.height =
        "auto";
    messageInput.style.height =
        Math.min(
            messageInput.scrollHeight,
            150
        ) + "px";
}
/* ========================================================= THEMES ========================================================= */
themeCards.forEach(
    card => {
        card.addEventListener(
            "click",
            () => {
                changeTheme(
                    card.dataset.theme
                );
            }
        );
    }
);
function changeTheme(themeName) {
    const selected =
        themes[themeName];
    if (!selected) {
        return;
    }
    chat.style.backgroundImage =
        `url("${selected.image}")`;
    document.documentElement.style
        .setProperty(
            "--user-color",
            selected.user
        );
    document.documentElement.style
        .setProperty(
            "--ai-color",
            selected.ai
        );
    localStorage.setItem(
        "selectedTheme",
        themeName
    );
    closePages();
}
/* ========================================================= LOAD SAVED THEME ========================================================= */
const savedTheme =
    localStorage.getItem(
        "selectedTheme"
    );
if (
    savedTheme &&
    themes[savedTheme]
) {
    chat.style.backgroundImage =
        `url("${themes[savedTheme].image}")`;
    document.documentElement.style
        .setProperty(
            "--user-color",
            themes[savedTheme].user
        );
    document.documentElement.style
        .setProperty(
            "--ai-color",
            themes[savedTheme].ai
        );
}
/* ========================================================= CUSTOM WALLPAPER ========================================================= */
if (customThemeInput) {
    customThemeInput.addEventListener(
        "change",
        event => {
            const file =
                event.target.files[0];
            if (!file) {
                return;
            }
            if (
                !file.type.startsWith("image/")
            ) {
                showPopup(
    "Invalid Image",
    "Please select an image file.",
    "warning"
);
                return;
            }
            const reader =
                new FileReader();
            reader.onload =
                () => {
                    const image =
                        reader.result;
                    chat.style.backgroundImage =
                        `url("${image}")`;
                    localStorage.setItem(
                        "customTheme",
                        image
                    );
                    localStorage.setItem(
                        "selectedTheme",
                        "custom"
                    );
                    closePages();
                };
            reader.readAsDataURL(file);
        }
    );
}
/* ========================================================= LOAD CUSTOM WALLPAPER ========================================================= */
const savedCustomTheme =
    localStorage.getItem(
        "customTheme"
    );
if (
    savedCustomTheme &&
    savedTheme === "custom"
) {
    chat.style.backgroundImage =
        `url("${savedCustomTheme}")`;
}
/* ========================================================= API DATA ========================================================= */
/* IMPORTANT: Raw API keys are NOT stored in localStorage. They are kept only in this in-memory Map until the backend is implemented. */
const apiSecrets =
    new Map();
let apiEntries = [];
/* ========================================================= LOAD API METADATA ========================================================= */
let savedApiMetadata = [];
try {
    savedApiMetadata =
        JSON.parse(
            localStorage.getItem(
                "apiMetadata"
            ) || "[]"
        );
    if (
        !Array.isArray(
            savedApiMetadata
        )
    ) {
        savedApiMetadata = [];
    }
} catch (error) {
    console.warn(
        "Could not read API metadata.",
        error
    );
    savedApiMetadata = [];
}
savedApiMetadata.forEach(
    entry => {
        const provider =
            PROVIDERS[entry.provider]
                ? entry.provider
                : (
                    entry.name
                        .toLowerCase()
                        .includes("groq")
                        ? "groq"
                        : "huggingface"
                );
        apiEntries.push({
            id:
                entry.id,
            name:
                entry.name,
            provider,
            model:
                entry.model ||
                PROVIDERS[provider].model,
            maskLength:
                entry.maskLength || 16,
            active:
                Boolean(entry.active)
        });
    }
);
normalizeActiveApi();
renderApiEntries();
renderApiSwitcher();
/* ========================================================= CREATE API ========================================================= */
providerSelectButton?.addEventListener(
    "click",
    event => {
        event.stopPropagation();
        providerSelectMenu?.classList.toggle("open");
    }
);
providerOptions.forEach(
    option => {
        option.addEventListener(
            "click",
            event => {
                event.stopPropagation();
                selectedProvider =
                    option.dataset.value || "groq";
                providerSelectValue.textContent =
                    option.textContent.trim();
                providerOptions.forEach(
                    item => {
                        item.classList.toggle(
                            "selected",
                            item === option
                        );
                    }
                );
                providerSelectMenu?.classList.remove("open");
            }
        );
    }
);
document.addEventListener(
    "click",
    () => {
        providerSelectMenu?.classList.remove("open");
    }
);
createApiButton.addEventListener(
    "click",
    () => {
        const name =
            apiNameInput.value.trim();
        const key =
            apiKeyInput.value.trim();
        if (
            !name ||
            !key
        ) {
            showPopup(
    "Missing API Details",
    "Enter both the API name and API key.",
    "warning"
);
            return;
        }
        saveApi(
            name,
            key,
            selectedProvider
        );
        apiNameInput.value =
            "";
        apiKeyInput.value =
            "";
        selectedProvider = "groq";
        if (providerSelectValue) {
            providerSelectValue.textContent =
                "Groq";
        }
        providerOptions.forEach(
            option => {
                option.classList.toggle(
                    "selected",
                    option.dataset.value === "groq"
                );
            }
        );
        providerSelectMenu?.classList.remove("open");
    }
);
/* ========================================================= SAVE API ========================================================= */
function saveApi(
    name,
    key,
    providerKey = "groq"
) {
    const id =
        Date.now().toString() +
        Math.random()
            .toString(36)
            .slice(2,7);
    const maskLength =
        Math.floor(
            Math.random() * 9
        ) + 12;
    const active =
        apiEntries.length === 0;
    const provider =
        PROVIDERS[providerKey]
            ? providerKey
            : "groq";
    apiSecrets.set(
        id,
        key
    );
    apiEntries.push({
        id,
        name,
        provider,
        model:
            PROVIDERS[provider].model,
        maskLength,
        active
    });
    saveApiMetadata();
    renderApiEntries();
    renderApiSwitcher();
}
/* ========================================================= SAVE SAFE API METADATA ========================================================= */
function saveApiMetadata() {
    const metadata =
        apiEntries.map(
            entry => ({
                id:
                    entry.id,
                name:
                    entry.name,
                provider:
                    entry.provider,
                model:
                    entry.model,
                maskLength:
                    entry.maskLength,
                active:
                    entry.active
            })
        );
    localStorage.setItem(
        "apiMetadata",
        JSON.stringify(metadata)
    );
}
/* ========================================================= NORMALIZE ACTIVE API ========================================================= */
function normalizeActiveApi() {
    let activeFound =
        false;
    apiEntries.forEach(
        entry => {
            if (
                entry.active &&
                !activeFound
            ) {
                activeFound =
                    true;
                return;
            }
            if (
                entry.active
            ) {
                entry.active =
                    false;
            }
        }
    );
    /* If metadata somehow has APIs but none is active, activate first. */
    if (
        apiEntries.length > 0 &&
        !apiEntries.some(
            entry => entry.active
        )
    ) {
        apiEntries[0].active =
            true;
    }
}
/* ========================================================= GET ACTIVE API ========================================================= */
function getActiveApi() {
    return apiEntries.find(
        entry =>
            entry.active
    );
}
/* ========================================================= RENDER API LIST ========================================================= */
function renderApiEntries() {
    apiList.innerHTML =
        "";
    const sortedEntries =
        [...apiEntries].sort(
            (a, b) => {
                if (
                    a.active &&
                    !b.active
                ) {
                    return -1;
                }
                if (
                    !a.active &&
                    b.active
                ) {
                    return 1;
                }
                return 0;
            }
        );
    sortedEntries.forEach(
        entry => {
            renderApiEntry(
                entry
            );
        }
    );
}
/* ========================================================= RENDER ONE API ========================================================= */
function renderApiEntry(
    entry
) {
    const card =
        document.createElement("div");
    card.className =
        "api-card saved-api-card";
    const mask =
        "#".repeat(
            entry.maskLength
        );
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
                ${escapeHtml(
                    PROVIDERS[entry.provider]?.label ||
                    "Unknown"
                )}
            </div>
        </div>
        <div class="api-field">
            <div class="api-field-label">
                API Key
            </div>
            <div class="api-value-box api-key-mask">
                ${mask}
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
    apiList.appendChild(card);
    /* SWITCH */
    const switchButton =
        card.querySelector(
            ".api-switch"
        );
    switchButton.addEventListener(
        "click",
        () => {
            if (!entry.active) {
                activateApi(
                    entry.id
                );
            }
        }
    );
    /* DELETE */
    const deleteButton =
        card.querySelector(
            ".api-delete"
        );
    deleteButton.addEventListener(
        "click",
        () => {
            deleteApi(
                entry.id
            );
        }
    );
    /* EDIT */
    const editButton =
        card.querySelector(
            ".api-edit"
        );
    editButton.addEventListener(
        "click",
        () => {
            editApi(
                entry,
                card
            );
        }
    );
}
/* ========================================================= ACTIVATE API ========================================================= */
function activateApi(id) {
    apiEntries.forEach(
        entry => {
            entry.active =
                entry.id === id;
        }
    );
    saveApiMetadata();
    renderApiEntries();
    renderApiSwitcher();
}
/* ========================================================= DELETE API ========================================================= */
function deleteApi(id) {
    const api =
        apiEntries.find(
            entry =>
                entry.id === id
        );
    if (!api) {
        return;
    }
    apiToDelete =
        id;
    deleteModalText.textContent =
        `Are you sure you want to delete "${api.name}"?`;
    deleteModal.classList.add(
        "open"
    );
    deleteModal.setAttribute(
        "aria-hidden",
        "false"
    );
}
/* ========================================================= CONFIRM DELETE ========================================================= */
confirmDeleteButton.addEventListener(
    "click",
    () => {
        if (!apiToDelete) {
            return;
        }
        const id =
            apiToDelete;
        const deletedApi =
            apiEntries.find(
                entry =>
                    entry.id === id
            );
        const wasActive =
            deletedApi?.active;
        apiSecrets.delete(id);
        apiEntries =
            apiEntries.filter(
                entry =>
                    entry.id !== id
            );
        /* If the active API was deleted, make the first remaining API active. */
        if (
            wasActive &&
            apiEntries.length > 0
        ) {
            apiEntries.forEach(
                entry => {
                    entry.active =
                        false;
                }
            );
            apiEntries[0].active =
                true;
        }
        saveApiMetadata();
        renderApiEntries();
        renderApiSwitcher();
        closeDeleteModal();
    }
);
/* ========================================================= CLOSE DELETE MODAL ========================================================= */
cancelDeleteButton.addEventListener(
    "click",
    closeDeleteModal
);
deleteModal.addEventListener(
    "click",
    event => {
        if (
            event.target ===
            deleteModal
        ) {
            closeDeleteModal();
        }
    }
);
function closeDeleteModal() {
    apiToDelete =
        null;
    deleteModal.classList.remove(
        "open"
    );
    deleteModal.setAttribute(
        "aria-hidden",
        "true"
    );
}
/* ========================================================= EDIT API ========================================================= */
function editApi(
    entry,
    card
) {
    const currentKey =
        apiSecrets.get(
            entry.id
        ) || "";
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
                ${Object.entries(PROVIDERS).map(
                    ([key, value]) => `
                        <option value="${key}" ${entry.provider === key ? "selected" : ""}>
                            ${escapeHtml(value.label)}
                        </option>
                    `
                ).join("")}
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
    const saveButton =
        card.querySelector(
            ".api-save-edit"
        );
    saveButton.addEventListener(
        "click",
        () => {
            const newName =
                card.querySelector(
                    ".edit-name-input"
                ).value.trim();
            const newProvider =
                card.querySelector(
                    ".edit-provider-input"
                ).value;
            const newKey =
                card.querySelector(
                    ".edit-key-input"
                ).value.trim();
            if (!newName) {
                showPopup(
    "Invalid API Name",
    "API name cannot be empty.",
    "warning"
);
                return;
            }
            entry.name =
                newName;
            entry.provider =
                PROVIDERS[newProvider]
                    ? newProvider
                    : "groq";
            entry.model =
                PROVIDERS[entry.provider].model;
            if (newKey) {
                apiSecrets.set(
                    entry.id,
                    newKey
                );
            }
            else if (currentKey) {
                apiSecrets.set(
                    entry.id,
                    currentKey
                );
            }
            saveApiMetadata();
            renderApiEntries();
            renderApiSwitcher();
        }
    );
    const cancelButton =
        card.querySelector(
            ".api-cancel-edit"
        );
    cancelButton.addEventListener(
        "click",
        () => {
            renderApiEntries();
        }
    );
}
/* ========================================================= API SWITCHER ========================================================= */
apiSwitcherButton.addEventListener(
    "click",
    event => {
        event.stopPropagation();
        renderApiSwitcher();
        apiSwitcherMenu.classList.toggle(
            "open"
        );
    }
);
apiSwitcherMenu.addEventListener(
    "click",
    event => {
        event.stopPropagation();
    }
);
document.addEventListener(
    "click",
    () => {
        apiSwitcherMenu.classList.remove(
            "open"
        );
    }
);
/* ========================================================= RENDER API SWITCHER ========================================================= */
function renderApiSwitcher() {
    apiSwitcherList.innerHTML =
        "";
    const activeApi =
        getActiveApi();
    if (activeApi) {
        apiSwitcherCurrent.textContent =
            "Using: " +
            activeApi.name;
    }
    else {
        apiSwitcherCurrent.textContent =
            "No API selected";
    }
    if (
        apiEntries.length === 0
    ) {
        apiSwitcherList.innerHTML = `
            <div class="api-switcher-empty">
                No APIs added yet.
            </div>
        `;
        return;
    }
    const sortedApis =
        [...apiEntries].sort(
            (a, b) => {
                if (
                    a.active &&
                    !b.active
                ) {
                    return -1;
                }
                if (
                    !a.active &&
                    b.active
                ) {
                    return 1;
                }
                return 0;
            }
        );
    sortedApis.forEach(
        api => {
            const option =
                document.createElement(
                    "div"
                );
            option.className =
                "api-switcher-option";
            if (api.active) {
                option.classList.add(
                    "selected"
                );
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
            const switchButton =
                option.querySelector(
                    ".api-switch-button"
                );
            if (!api.active) {
                switchButton.addEventListener(
                    "click",
                    event => {
                        event.stopPropagation();
                        activateApi(
                            api.id
                        );
                        renderApiSwitcher();
                    }
                );
            }
            apiSwitcherList.appendChild(
                option
            );
        }
    );
}
/* ========================================================= ESCAPE HTML ========================================================= */
function escapeHtml(value) {
    return String(value)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}
/* ========================================================= ESCAPE KEY ========================================================= */
document.addEventListener(
    "keydown",
    event => {
        if (
            event.key === "Escape"
        ) {
            sideMenu.classList.remove(
                "open"
            );
            apiSwitcherMenu.classList.remove(
                "open"
            );
            closeDeleteModal();
        }
    }
);
