/* =========================================================
   CLOUD HYBRID AI
   FRONTEND JAVASCRIPT
========================================================= */


/* =========================================================
   ELEMENT REFERENCES
========================================================= */

const menuButton =
    document.getElementById("menuButton");
const newConversationButton =
    document.getElementById("newConversationButton");

const sideMenu =
    document.getElementById("sideMenu");

const chat =
    document.getElementById("chat");

const inputContainer =
    document.getElementById("inputContainer");

const messageInput =
    document.getElementById("messageInput");

const sendButton =
    document.getElementById("sendButton");

const welcome =
    document.getElementById("welcome");

const pages =
    document.querySelectorAll(".app-page");

const menuItems =
    document.querySelectorAll(".menu-item");

const backButtons =
    document.querySelectorAll(".back-button");

const themeCards =
    document.querySelectorAll(".theme-card");



/* =========================================================
   CUSTOM THEME
========================================================= */

const customThemeInput =
    document.getElementById("customThemeInput");



/* =========================================================
   API ELEMENTS
========================================================= */

const apiList =
    document.getElementById("apiList");

const apiNameInput =
    document.getElementById("apiNameInput");

const apiKeyInput =
    document.getElementById("apiKeyInput");

const createApiButton =
    document.getElementById("createApiButton");



/* =========================================================
   DELETE MODAL
========================================================= */

const deleteModal =
    document.getElementById("deleteModal");

const deleteModalText =
    document.getElementById("deleteModalText");

const cancelDeleteButton =
    document.getElementById("cancelDeleteButton");

const confirmDeleteButton =
    document.getElementById("confirmDeleteButton");

let apiToDelete = null;



/* =========================================================
   API SWITCHER
========================================================= */

const apiSwitcherButton =
    document.getElementById("apiSwitcherButton");

const apiSwitcherMenu =
    document.getElementById("apiSwitcherMenu");

const apiSwitcherCurrent =
    document.getElementById("apiSwitcherCurrent");

const apiSwitcherList =
    document.getElementById("apiSwitcherList");



/* =========================================================
   THEME DATA
========================================================= */

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



/* =========================================================
   SIDE MENU
========================================================= */

if (menuButton) {
    menuButton.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            if (sideMenu) sideMenu.classList.toggle("open");

        }
    );
}

if (sideMenu) {
    sideMenu.addEventListener(
        "click",
        event => {

            event.stopPropagation();

        }
    );
}



/* =========================================================
   NEW CONVERSATION
========================================================= */

function startNewConversation() {

    /*
       Remove all existing chat messages.
       The welcome section itself is kept.
    */

    if (chat) {
        const messages =
            chat.querySelectorAll(".message");

        messages.forEach(
            message => {
                message.remove();
            }
        );
    }


    /*
       Show the welcome screen again.
    */

    if (welcome) {
        welcome.classList.remove("hidden");
    }


    /*
       Clear the message input.
    */

    if (messageInput) {
        messageInput.value = "";
        autoResize();
        messageInput.focus();
    }


    /*
       Close the menu.
    */

    if (sideMenu) {
        sideMenu.classList.remove("open");
    }


    /*
       Make sure the normal chat input is visible.
    */

    if (inputContainer) {
        inputContainer.classList.remove("page-hidden");
    }


    /*
       Make sure the chat is at the top.
    */

    if (chat) {
        chat.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

}

if (newConversationButton) {
    newConversationButton.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            startNewConversation();

        }
    );
}

if (chat) {
    chat.addEventListener(
        "click",
        () => {

            if (sideMenu) sideMenu.classList.remove("open");

            dismissWelcome();

        }
    );
}

if (inputContainer) {
    inputContainer.addEventListener(
        "click",
        () => {

            if (sideMenu) sideMenu.classList.remove("open");

            dismissWelcome();

        }
    );
}



/* =========================================================
   OPEN SETTINGS / THEMES / API
========================================================= */

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


function openPage(pageId) {

    if (sideMenu) sideMenu.classList.remove("open");

    if (apiSwitcherMenu) apiSwitcherMenu.classList.remove("open");


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


    /*
       Hide message input while
       Settings / Themes / API is open.
    */

    if (inputContainer) {
        inputContainer.classList.add("page-hidden");
    }

}



/* =========================================================
   CLOSE PAGES
========================================================= */

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


    if (inputContainer) {
        inputContainer.classList.remove("page-hidden");
    }

}



/* =========================================================
   CLOSE PAGE WHEN CLICKING OUTSIDE
========================================================= */

document.addEventListener(
    "click",
    event => {

        const openPage =
            document.querySelector(".app-page.open");

        if (!openPage) {
            return;
        }

        /*
           If the click happened inside
           the currently open panel,
           keep the panel open.
        */

        if (openPage.contains(event.target)) {
            return;
        }

        /*
           Click happened outside the panel.
           Return to the existing conversation.
        */

        closePages();

    }
);



/* =========================================================
   WELCOME
========================================================= */

function dismissWelcome() {

    if (!welcome) {

        return;

    }

    welcome.classList.add("hidden");

}



/* =========================================================
   CHAT
========================================================= */

async function sendMessage() {

    if (!messageInput) return;

    const text =
        messageInput.value.trim();

    if (!text) {
        return;
    }

    /*
       Get the currently selected API.
    */

    const activeApi =
        getActiveApi();

    if (!activeApi) {

        alert(
            "Please add and select an API first."
        );

        return;
    }

    /*
       Get the raw API key from memory.
    */

    const apiKey =
        apiSecrets.get(
            activeApi.id
        );

    if (!apiKey) {

        alert(
            "The API key for the selected API is not available."
        );

        return;
    }

    /*
       Show the user's message.
    */

    dismissWelcome();

    addMessage(
        text,
        "user"
    );

    messageInput.value = "";

    autoResize();

    /*
       Show a temporary loading message.
    */

    const loadingMessage =
        addMessage(
            "Thinking...",
            "ai"
        );

    try {

        /*
           Hugging Face OpenAI-compatible API.
        */

        const response =
            await fetch(
                "https://router.huggingface.co/v1/chat/completions",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${apiKey}`
                    },

                    body: JSON.stringify({

                        model:
                            "openai/gpt-oss-120b:fastest",

                        messages: [
                            {
                                role: "user",
                                content: text
                            }
                        ]

                    })
                }
            );

        /*
           Convert the response to JSON.
        */

        const data =
            await response.json();

        /*
           Remove the loading message.
        */

        if (loadingMessage) loadingMessage.remove();

        /*
           Handle API errors.
        */

        if (!response.ok) {

            console.error(
                "Hugging Face API error:",
                data
            );

            addMessage(
                data?.error ||
                "The API request failed.",
                "ai"
            );

            return;
        }

        /*
           Extract the AI response.
        */

        const aiResponse =
            data?.choices?.[0]?.message?.content;

        if (!aiResponse) {

            addMessage(
                "The API returned an empty response.",
                "ai"
            );

            return;
        }

        /*
           Display the AI response.
        */

        addMessage(
            aiResponse,
            "ai"
        );

    }
    catch (error) {

        /*
           Handle network / connection errors.
        */

        console.error(
            "API request failed:",
            error
        );

        if (loadingMessage) loadingMessage.remove();

        addMessage(
            "Could not connect to the AI service. Check your API key and internet connection.",
            "ai"
        );

    }

}

function addMessage(
    text,
    type
) {

    if (!chat) return null;

    const message =
        document.createElement("div");


    message.classList.add(
        "message",
        type
    );


    message.textContent =
        text;


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


if (sendButton) {
    sendButton.addEventListener(
        "click",
        sendMessage
    );
}



/* =========================================================
   ENTER TO SEND & AUTO RESIZE
========================================================= */

if (messageInput) {
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

    messageInput.addEventListener(
        "input",
        autoResize
    );
}


function autoResize() {

    if (!messageInput) return;

    messageInput.style.height =
        "auto";

    messageInput.style.height =
        Math.min(
            messageInput.scrollHeight,
            150
        ) + "px";

}



/* =========================================================
   THEMES
========================================================= */

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


    if (chat) {
        chat.style.backgroundImage =
            `url("${selected.image}")`;
    }


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



/* =========================================================
   LOAD SAVED THEME
========================================================= */

const savedTheme =
    localStorage.getItem(
        "selectedTheme"
    );


if (
    savedTheme &&
    themes[savedTheme]
) {

    if (chat) {
        chat.style.backgroundImage =
            `url("${themes[savedTheme].image}")`;
    }


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



/* =========================================================
   CUSTOM WALLPAPER
========================================================= */

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

                alert(
                    "Please select an image file."
                );

                return;

            }


            const reader =
                new FileReader();


            reader.onload =
                () => {

                    const image =
                        reader.result;


                    if (chat) {
                        chat.style.backgroundImage =
                            `url("${image}")`;
                    }


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



/* =========================================================
   LOAD CUSTOM WALLPAPER
========================================================= */

const savedCustomTheme =
    localStorage.getItem(
        "customTheme"
    );


if (
    savedCustomTheme &&
    savedTheme === "custom"
) {

    if (chat) {
        chat.style.backgroundImage =
            `url("${savedCustomTheme}")`;
    }

}



/* =========================================================
   API DATA & METADATA
========================================================= */

const apiSecrets =
    new Map();

let apiEntries = [];

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

        apiEntries.push({

            id:
                entry.id,

            name:
                entry.name,

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



/* =========================================================
   CREATE & SAVE API
========================================================= */

if (createApiButton) {
    createApiButton.addEventListener(
        "click",
        () => {

            const name =
                apiNameInput ? apiNameInput.value.trim() : "";

            const key =
                apiKeyInput ? apiKeyInput.value.trim() : "";


            if (
                !name ||
                !key
            ) {

                alert(
                    "Enter both the API name and API key."
                );

                return;

            }


            saveApi(
                name,
                key
            );


            if (apiNameInput) apiNameInput.value = "";

            if (apiKeyInput) apiKeyInput.value = "";

        }
    );
}


function saveApi(
    name,
    key
) {

    const id =
        Date.now().toString() +
        Math.random()
            .toString(36)
            .slice(2, 7);


    const maskLength =
        Math.floor(
            Math.random() * 9
        ) + 12;


    const active =
        apiEntries.length === 0;


    apiSecrets.set(
        id,
        key
    );


    apiEntries.push({

        id,

        name,

        maskLength,

        active

    });


    saveApiMetadata();

    renderApiEntries();

    renderApiSwitcher();

}


function saveApiMetadata() {

    const metadata =
        apiEntries.map(
            entry => ({

                id:
                    entry.id,

                name:
                    entry.name,

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


function getActiveApi() {

    return apiEntries.find(
        entry =>
            entry.active
    );

}



/* ==============================