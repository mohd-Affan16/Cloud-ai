/* =========================================================
   CLOUD HYBRID AI
   FRONTEND JAVASCRIPT
========================================================= */


/* =========================================================
   ELEMENT REFERENCES
========================================================= */

const menuButton =
    document.getElementById("menuButton");

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

menuButton.addEventListener(
    "click",
    event => {

        event.stopPropagation();

        dismissWelcome();

        sideMenu.classList.toggle("open");

    }
);


sideMenu.addEventListener(
    "click",
    event => {

        event.stopPropagation();

    }
);


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


    /*
       Hide message input while
       Settings / Themes / API is open.
    */

    inputContainer.classList.add(
        "page-hidden"
    );

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


    inputContainer.classList.remove(
        "page-hidden"
    );

}



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

function sendMessage() {

    const text =
        messageInput.value.trim();


    if (!text) {

        return;

    }


    dismissWelcome();


    addMessage(
        text,
        "user"
    );


    messageInput.value =
        "";


    autoResize();


    /*
       Temporary response until
       backend/API integration.
    */

    setTimeout(
        () => {

            addMessage(
                "This is a temporary AI response. The real API will be connected in the next phase.",
                "ai"
            );

        },
        700
    );

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

}


sendButton.addEventListener(
    "click",
    sendMessage
);



/* =========================================================
   ENTER TO SEND
========================================================= */

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



/* =========================================================
   TEXTAREA AUTO RESIZE
========================================================= */

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

    chat.style.backgroundImage =
        `url("${savedCustomTheme}")`;

}



/* =========================================================
   API DATA
========================================================= */

/*
   IMPORTANT:

   Raw API keys are NOT stored in localStorage.

   They are kept only in this in-memory Map
   until the backend is implemented.
*/

const apiSecrets =
    new Map();

let apiEntries = [];



/* =========================================================
   LOAD API METADATA
========================================================= */

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
   CREATE API
========================================================= */

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

            alert(
                "Enter both the API name and API key."
            );

            return;

        }


        saveApi(
            name,
            key
        );


        apiNameInput.value =
            "";

        apiKeyInput.value =
            "";

    }
);



/* =========================================================
   SAVE API
========================================================= */

function saveApi(
    name,
    key
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



/* =========================================================
   SAVE SAFE API METADATA
========================================================= */

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



/* =========================================================
   NORMALIZE ACTIVE API
========================================================= */

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


    /*
       If metadata somehow has APIs
       but none is active, activate first.
    */

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



/* =========================================================
   GET ACTIVE API
========================================================= */

function getActiveApi() {

    return apiEntries.find(
        entry =>
            entry.active
    );

}



/* =========================================================
   RENDER API LIST
========================================================= */

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



/* =========================================================
   RENDER ONE API
========================================================= */

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



/* =========================================================
   ACTIVATE API
========================================================= */

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



/* =========================================================
   DELETE API
========================================================= */

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



/* =========================================================
   CONFIRM DELETE
========================================================= */

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


        /*
           If the active API was deleted,
           make the first remaining API active.
        */

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



/* =========================================================
   CLOSE DELETE MODAL
========================================================= */

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



/* =========================================================
   EDIT API
========================================================= */

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


            const newKey =
                card.querySelector(
                    ".edit-key-input"
                ).value.trim();


            if (!newName) {

                alert(
                    "API name cannot be empty."
                );

                return;

            }


            entry.name =
                newName;


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



/* =========================================================
   API SWITCHER
========================================================= */

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



/* =========================================================
   RENDER API SWITCHER
========================================================= */

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



/* =========================================================
   ESCAPE HTML
========================================================= */

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



/* =========================================================
   ESCAPE KEY
========================================================= */

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