const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
// ============================================
// CLOUD HYBRID STORAGE CONFIGURATION
// ============================================

const CLOUD_HYBRID_DIRECTORY = path.join(__dirname, "Cloud_Hybrid");
const ACCOUNTS_DIRECTORY = path.join(CLOUD_HYBRID_DIRECTORY, "Accounts");

// Existing storage - retained for migration
const LEGACY_CONVERSATIONS_DIRECTORY = path.join(__dirname, "conversations");
const conversationsDirectory = LEGACY_CONVERSATIONS_DIRECTORY;

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
// Convert an account ID into a safe, consistent folder name.
function getUserDirectory(userId) {
    if (!userId || typeof userId !== "string") {
        throw new Error("A valid user ID is required.");
    }
    const userFolder = crypto
        .createHash("sha256")
        .update(userId)
        .digest("hex");
    return path.join(conversationsDirectory, `user_${userFolder}`);
}
// ============================================
// CLOUD HYBRID ACCOUNT DIRECTORY MANAGEMENT
// ============================================

// Get the account directory
function getAccountDirectory(userId) {

    if (!userId || typeof userId !== "string") {
        throw new Error("A valid user ID is required.");
    }

    // Hash the Google account ID for privacy
    const userFolder = crypto
        .createHash("sha256")
        .update(userId)
        .digest("hex");

    return path.join(
        ACCOUNTS_DIRECTORY,
        `user_${userFolder}`
    );
}


// Get the conversation history directory
function getThreadsHistoryDirectory(userId) {

    return path.join(
        getAccountDirectory(userId),
        "Threads_History"
    );
}


// Get the archive directory
function getThreadsArchiveDirectory(userId) {

    return path.join(
        getAccountDirectory(userId),
        "Threads_Archive"
    );
}


// Create the account's complete folder structure
function ensureAccountDirectories(userId) {

    const accountDirectory = getAccountDirectory(userId);

    // Create account folder
    fs.mkdirSync(accountDirectory, {
        recursive: true
    });

    // Create conversation history folder
    fs.mkdirSync(
        getThreadsHistoryDirectory(userId),
        { recursive: true }
    );

    // Create archive folder
    fs.mkdirSync(
        getThreadsArchiveDirectory(userId),
        { recursive: true }
    );

    return accountDirectory;
}
// ============================================
// ACCOUNT METADATA MANAGEMENT
// ============================================

function initializeAccount(user) {

    if (!user || !user.id) {
        throw new Error("Valid account information is required.");
    }

    // Create the account folders
    const accountDirectory = ensureAccountDirectories(
        String(user.id)
    );

    const accountFile = path.join(
        accountDirectory,
        "account.json"
    );

    // Do not overwrite existing account information
    if (fs.existsSync(accountFile)) {
        return JSON.parse(
            fs.readFileSync(accountFile, "utf8")
        );
    }

    const accountData = {
        account_id: crypto
            .createHash("sha256")
            .update(String(user.id))
            .digest("hex"),

        provider: "google",

        display_name: user.name || "User",

        email: user.email || null,

        created_at: new Date().toISOString()
    };

    fs.writeFileSync(
        accountFile,
        JSON.stringify(accountData, null, 2),
        "utf8"
    );

    return accountData;
}
// ============================================
// CONVERSATION / THREAD MANAGEMENT
// ============================================

// Convert a conversation title into a safe folder/file name
function sanitizeThreadTitle(title) {
    const safeTitle = String(title || "New Chat")
        .trim()
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
        .replace(/[. ]+$/g, "")
        .replace(/\s+/g, "_");

    return safeTitle || "New_Chat";
}


// Create a new conversation
function createConversation(userId, title = "New Chat") {

    if (!userId || typeof userId !== "string") {
        throw new Error("A valid user ID is required.");
    }

    // Ensure the account folders exist
    ensureAccountDirectories(userId);

    // Generate a permanent unique thread ID
    const threadId = `thread_${crypto.randomUUID()}`;

    // Prepare a safe folder and file name
    const safeTitle = sanitizeThreadTitle(title);

    const historyDirectory = getThreadsHistoryDirectory(userId);

    // Avoid folder name collisions
    let folderName = safeTitle;
    let counter = 1;

    while (
        fs.existsSync(path.join(historyDirectory, folderName))
    ) {
        folderName = `${safeTitle}_${counter}`;
        counter++;
    }

    // Create the conversation folder
    const conversationDirectory = path.join(
        historyDirectory,
        folderName
    );

    fs.mkdirSync(conversationDirectory, {
        recursive: true
    });

    const now = new Date().toISOString();

    // Conversation data
    const conversationData = {
        thread_id: threadId,
        title: title,
        created_at: now,
        updated_at: now,
        status: "active",
        messages: []
    };

    // Metadata
    const metadata = {
        thread_id: threadId,
        title: title,
        folder_name: folderName,
        status: "active",
        created_at: now,
        updated_at: now
    };

    // Save the conversation JSON file
    const conversationFile = path.join(
        conversationDirectory,
        `${folderName}.json`
    );

    fs.writeFileSync(
        conversationFile,
        JSON.stringify(conversationData, null, 2),
        "utf8"
    );

    // Save metadata
    fs.writeFileSync(
        path.join(conversationDirectory, "metadata.json"),
        JSON.stringify(metadata, null, 2),
        "utf8"
    );

    return {
        thread_id: threadId,
        title: title,
        folder_name: folderName,
        conversation_directory: conversationDirectory,
        conversation_file: conversationFile,
        status: "active"
    };
}
// ============================================
// CONVERSATION RETRIEVAL
// ============================================

// Find a conversation folder using its permanent thread ID
// Find a conversation in History or Archive using its permanent ID
function getConversationPath(userId, threadId) {

    if (!userId || typeof userId !== "string") {
        throw new Error("A valid user ID is required.");
    }

    if (!threadId || !/^thread_[a-zA-Z0-9_-]+$/.test(threadId)) {
        throw new Error("Invalid conversation ID.");
    }

    const directories = [
        getThreadsHistoryDirectory(userId),
        getThreadsArchiveDirectory(userId)
    ];

    for (const parentDirectory of directories) {

        if (!fs.existsSync(parentDirectory)) {
            continue;
        }

        const folders = fs.readdirSync(parentDirectory, {
            withFileTypes: true
        });

        for (const folder of folders) {

            if (!folder.isDirectory()) {
                continue;
            }

            const conversationDirectory = path.join(
                parentDirectory,
                folder.name
            );

            const metadataFile = path.join(
                conversationDirectory,
                "metadata.json"
            );

            if (!fs.existsSync(metadataFile)) {
                continue;
            }

            const metadata = JSON.parse(
                fs.readFileSync(metadataFile, "utf8")
            );

            if (metadata.thread_id === threadId) {
                return conversationDirectory;
            }
        }
    }

    return null;
}


// Retrieve the complete conversation
function getConversation(userId, threadId) {

    const conversationDirectory = getConversationPath(
        userId,
        threadId
    );

    if (!conversationDirectory) {
        return null;
    }

    const metadataFile = path.join(
        conversationDirectory,
        "metadata.json"
    );

    const metadata = JSON.parse(
        fs.readFileSync(metadataFile, "utf8")
    );

    const conversationFile = path.join(
        conversationDirectory,
        `${metadata.folder_name}.json`
    );

    if (!fs.existsSync(conversationFile)) {
        throw new Error("Conversation data file is missing.");
    }

    return JSON.parse(
        fs.readFileSync(conversationFile, "utf8")
    );
}
// ============================================
// LIST USER CONVERSATIONS
// ============================================

function getAllConversations(userId) {

    if (!userId || typeof userId !== "string") {
        throw new Error("A valid user ID is required.");
    }

    const historyDirectory = getThreadsHistoryDirectory(userId);

    if (!fs.existsSync(historyDirectory)) {
        return [];
    }

    const folders = fs.readdirSync(historyDirectory, {
        withFileTypes: true
    });

    const conversations = [];

    for (const folder of folders) {

        if (!folder.isDirectory()) {
            continue;
        }

        const conversationDirectory = path.join(
            historyDirectory,
            folder.name
        );

        const metadataFile = path.join(
            conversationDirectory,
            "metadata.json"
        );

        if (!fs.existsSync(metadataFile)) {
            continue;
        }

        try {
            const metadata = JSON.parse(
                fs.readFileSync(metadataFile, "utf8")
            );

            if (metadata.status !== "active") {
                continue;
            }

            conversations.push({
                thread_id: metadata.thread_id,
                title: metadata.title,
                folder_name: metadata.folder_name,
                created_at: metadata.created_at,
                updated_at: metadata.updated_at,
                status: metadata.status
            });

        } catch (error) {
            console.error(
                `Could not read metadata for ${folder.name}:`,
                error.message
            );
        }
    }

    // Show most recently updated conversations first
    conversations.sort((a, b) =>
        new Date(b.updated_at) - new Date(a.updated_at)
    );

    return conversations;
}
// ============================================
// LIST USER CONVERSATIONS
// ============================================

function getAllConversations(userId) {

    if (!userId || typeof userId !== "string") {
        throw new Error("A valid user ID is required.");
    }

    const historyDirectory = getThreadsHistoryDirectory(userId);

    if (!fs.existsSync(historyDirectory)) {
        return [];
    }

    const folders = fs.readdirSync(historyDirectory, {
        withFileTypes: true
    });

    const conversations = [];

    for (const folder of folders) {

        if (!folder.isDirectory()) {
            continue;
        }

        const conversationDirectory = path.join(
            historyDirectory,
            folder.name
        );

        const metadataFile = path.join(
            conversationDirectory,
            "metadata.json"
        );

        if (!fs.existsSync(metadataFile)) {
            continue;
        }

        try {
            const metadata = JSON.parse(
                fs.readFileSync(metadataFile, "utf8")
            );

            if (metadata.status !== "active") {
                continue;
            }

            conversations.push({
                thread_id: metadata.thread_id,
                title: metadata.title,
                folder_name: metadata.folder_name,
                created_at: metadata.created_at,
                updated_at: metadata.updated_at,
                status: metadata.status
            });

        } catch (error) {
            console.error(
                `Could not read metadata for ${folder.name}:`,
                error.message
            );
        }
    }

    // Show most recently updated conversations first
    conversations.sort((a, b) =>
        new Date(b.updated_at) - new Date(a.updated_at)
    );

    return conversations;
}
// ============================================
// RENAME CONVERSATION
// ============================================

function renameConversation(userId, threadId, newTitle) {

    if (!newTitle || typeof newTitle !== "string" || !newTitle.trim()) {
        throw new Error("A valid conversation title is required.");
    }

    const conversationDirectory = getConversationPath(
        userId,
        threadId
    );

    if (!conversationDirectory) {
        throw new Error("Conversation not found.");
    }

    const metadataFile = path.join(
        conversationDirectory,
        "metadata.json"
    );

    const metadata = JSON.parse(
        fs.readFileSync(metadataFile, "utf8")
    );

    const conversationFile = path.join(
        conversationDirectory,
        `${metadata.folder_name}.json`
    );

    if (!fs.existsSync(conversationFile)) {
        throw new Error("Conversation data file is missing.");
    }

    const conversation = JSON.parse(
        fs.readFileSync(conversationFile, "utf8")
    );

    const cleanTitle = newTitle.trim();
    const safeTitle = sanitizeThreadTitle(cleanTitle);

    const historyDirectory = getThreadsHistoryDirectory(userId);

    // Avoid collisions with other conversation folders
    let newFolderName = safeTitle;
    let counter = 1;

    while (
        fs.existsSync(path.join(historyDirectory, newFolderName)) &&
        newFolderName !== metadata.folder_name
    ) {
        newFolderName = `${safeTitle}_${counter}`;
        counter++;
    }

    const newDirectory = path.join(
        historyDirectory,
        newFolderName
    );

    const newConversationFile = path.join(
        newDirectory,
        `${newFolderName}.json`
    );

    // Update conversation information
    conversation.title = cleanTitle;
    conversation.updated_at = new Date().toISOString();

    // Update metadata
    metadata.title = cleanTitle;
    metadata.folder_name = newFolderName;
    metadata.updated_at = conversation.updated_at;

    // Rename the folder if necessary
    if (newDirectory !== conversationDirectory) {
        fs.renameSync(conversationDirectory, newDirectory);
    }

    // Rename the conversation JSON file
    const renamedConversationFile = path.join(
        newDirectory,
        `${metadata.folder_name}.json`
    );

    if (conversationFile !== renamedConversationFile) {
        fs.renameSync(
            path.join(newDirectory, path.basename(conversationFile)),
            renamedConversationFile
        );
    }

    // Save updated conversation data
    fs.writeFileSync(
        renamedConversationFile,
        JSON.stringify(conversation, null, 2),
        "utf8"
    );

    // Save updated metadata
    fs.writeFileSync(
        path.join(newDirectory, "metadata.json"),
        JSON.stringify(metadata, null, 2),
        "utf8"
    );

    return {
        thread_id: threadId,
        title: cleanTitle,
        folder_name: newFolderName,
        status: metadata.status
    };
}
// ============================================
// ARCHIVE CONVERSATION
// ============================================

function archiveConversation(userId, threadId) {

    const conversationDirectory = getConversationPath(
        userId,
        threadId
    );

    if (!conversationDirectory) {
        throw new Error("Conversation not found.");
    }

    const metadataFile = path.join(
        conversationDirectory,
        "metadata.json"
    );

    const metadata = JSON.parse(
        fs.readFileSync(metadataFile, "utf8")
    );

    const conversationFile = path.join(
        conversationDirectory,
        `${metadata.folder_name}.json`
    );

    if (!fs.existsSync(conversationFile)) {
        throw new Error("Conversation data file is missing.");
    }

    const conversation = JSON.parse(
        fs.readFileSync(conversationFile, "utf8")
    );

    // Update status and timestamp
    const now = new Date().toISOString();

    metadata.status = "archived";
    metadata.updated_at = now;

    conversation.status = "archived";
    conversation.updated_at = now;

    // Save updated conversation data
    fs.writeFileSync(
        conversationFile,
        JSON.stringify(conversation, null, 2),
        "utf8"
    );

    // Save updated metadata
    fs.writeFileSync(
        metadataFile,
        JSON.stringify(metadata, null, 2),
        "utf8"
    );

    // Move the conversation folder to archive
    const archiveDirectory = getThreadsArchiveDirectory(userId);

    const archivedConversationDirectory = path.join(
        archiveDirectory,
        metadata.folder_name
    );

    if (fs.existsSync(archivedConversationDirectory)) {
        throw new Error("An archived folder with this name already exists.");
    }

    fs.renameSync(
        conversationDirectory,
        archivedConversationDirectory
    );

    return {
        thread_id: threadId,
        title: metadata.title,
        status: "archived"
    };
}
// ============================================
// RESTORE ARCHIVED CONVERSATION
// ============================================

function restoreConversation(userId, threadId) {

    const conversationDirectory = getConversationPath(
        userId,
        threadId
    );

    if (!conversationDirectory) {
        throw new Error("Conversation not found.");
    }

    // Make sure the conversation is actually archived
    const archiveDirectory = getThreadsArchiveDirectory(userId);

    if (path.dirname(conversationDirectory) !== archiveDirectory) {
        throw new Error("Conversation is not archived.");
    }

    const metadataFile = path.join(
        conversationDirectory,
        "metadata.json"
    );

    const metadata = JSON.parse(
        fs.readFileSync(metadataFile, "utf8")
    );

    const conversationFile = path.join(
        conversationDirectory,
        `${metadata.folder_name}.json`
    );

    if (!fs.existsSync(conversationFile)) {
        throw new Error("Conversation data file is missing.");
    }

    const conversation = JSON.parse(
        fs.readFileSync(conversationFile, "utf8")
    );

    const now = new Date().toISOString();

    metadata.status = "active";
    metadata.updated_at = now;

    conversation.status = "active";
    conversation.updated_at = now;

    const historyDirectory = getThreadsHistoryDirectory(userId);

    // Avoid overwriting an existing conversation folder
    let newFolderName = metadata.folder_name;
    let counter = 1;

    while (fs.existsSync(path.join(historyDirectory, newFolderName))) {
        newFolderName = `${metadata.folder_name}_${counter}`;
        counter++;
    }

    const newConversationDirectory = path.join(
        historyDirectory,
        newFolderName
    );

    const newConversationFile = path.join(
        newConversationDirectory,
        `${newFolderName}.json`
    );

    // Update folder name in metadata
    metadata.folder_name = newFolderName;

    fs.mkdirSync(newConversationDirectory, {
        recursive: true
    });

    // Update the conversation and metadata files
    fs.writeFileSync(
        newConversationFile,
        JSON.stringify(conversation, null, 2),
        "utf8"
    );

    fs.writeFileSync(
        path.join(newConversationDirectory, "metadata.json"),
        JSON.stringify(metadata, null, 2),
        "utf8"
    );

    // Remove the old archived folder after successful copying
    fs.rmSync(conversationDirectory, {
        recursive: true,
        force: true
    });

    return {
        thread_id: threadId,
        title: metadata.title,
        status: "active",
        folder_name: newFolderName
    };
}
// ============================================
// PERMANENTLY DELETE CONVERSATION
// ============================================

function deleteConversation(userId, threadId) {

    if (!userId || typeof userId !== "string") {
        throw new Error("A valid user ID is required.");
    }

    if (!threadId || !/^thread_[a-zA-Z0-9_-]+$/.test(threadId)) {
        throw new Error("Invalid conversation ID.");
    }

    // Find the conversation in History or Archive
    const conversationDirectory = getConversationPath(
        userId,
        threadId
    );

    if (!conversationDirectory) {
        throw new Error("Conversation not found.");
    }

    // Confirm that the folder belongs to this account's
    // History or Archive directory
    const allowedDirectories = [
        getThreadsHistoryDirectory(userId),
        getThreadsArchiveDirectory(userId)
    ];

    const parentDirectory = path.dirname(conversationDirectory);

    if (!allowedDirectories.includes(parentDirectory)) {
        throw new Error("Invalid conversation location.");
    }

    // Verify that the metadata belongs to the requested thread
    const metadataFile = path.join(
        conversationDirectory,
        "metadata.json"
    );

    if (!fs.existsSync(metadataFile)) {
        throw new Error("Conversation metadata is missing.");
    }

    const metadata = JSON.parse(
        fs.readFileSync(metadataFile, "utf8")
    );

    if (metadata.thread_id !== threadId) {
        throw new Error("Conversation ID verification failed.");
    }

    // Permanently remove the conversation folder
    fs.rmSync(conversationDirectory, {
        recursive: true,
        force: false
    });

    return {
        thread_id: threadId,
        deleted: true
    };
}
// ============================================
// APPEND MESSAGE TO CONVERSATION
// ============================================

function appendThreadMessage(
    userId,
    threadId,
    role,
    content,
    priority = 0
) {

    if (!["user", "assistant"].includes(role)) {
        throw new Error("Invalid message role.");
    }

    if (typeof content !== "string" || !content.trim()) {
        throw new Error("Message content cannot be empty.");
    }

    if (![0, 1, 2, 3].includes(priority)) {
        throw new Error("Priority must be between 0 and 3.");
    }

    // Find the conversation
    const conversationDirectory = getConversationPath(
        userId,
        threadId
    );

    if (!conversationDirectory) {
        throw new Error("Conversation not found.");
    }

    const metadataFile = path.join(
        conversationDirectory,
        "metadata.json"
    );

    const metadata = JSON.parse(
        fs.readFileSync(metadataFile, "utf8")
    );

    // Do not add messages to archived conversations
    if (metadata.status !== "active") {
        throw new Error("Cannot add messages to an archived conversation.");
    }

    const conversationFile = path.join(
        conversationDirectory,
        `${metadata.folder_name}.json`
    );

    if (!fs.existsSync(conversationFile)) {
        throw new Error("Conversation data file is missing.");
    }

    const conversation = JSON.parse(
        fs.readFileSync(conversationFile, "utf8")
    );

    const now = new Date().toISOString();

    // Create the message
    const message = {
        message_id: `msg_${crypto.randomUUID()}`,
        role: role,
        content: content,
        priority: priority,
        created_at: now,
        updated_at: now
    };

    // Add message to conversation
    conversation.messages.push(message);

    conversation.updated_at = now;
    metadata.updated_at = now;

    // Write to a temporary file first
    const tempFile = `${conversationFile}.tmp`;

    fs.writeFileSync(
        tempFile,
        JSON.stringify(conversation, null, 2),
        "utf8"
    );

    // Replace the original file
    fs.renameSync(tempFile, conversationFile);

    // Update metadata
    fs.writeFileSync(
        metadataFile,
        JSON.stringify(metadata, null, 2),
        "utf8"
    );

    return message;
}
// ============================================
// GET CONVERSATION MESSAGES
// ============================================

function getConversationMessages(userId, threadId) {

    const conversation = getConversation(userId, threadId);

    if (!conversation) {
        return null;
    }

    return conversation.messages || [];
}


// ============================================
// UPDATE MESSAGE CONTENT
// ============================================

function updateThreadMessage(
    userId,
    threadId,
    messageId,
    newContent
) {

    if (typeof newContent !== "string" || !newContent.trim()) {
        throw new Error("Message content cannot be empty.");
    }

    const conversationDirectory = getConversationPath(
        userId,
        threadId
    );

    if (!conversationDirectory) {
        throw new Error("Conversation not found.");
    }

    const metadataFile = path.join(
        conversationDirectory,
        "metadata.json"
    );

    const metadata = JSON.parse(
        fs.readFileSync(metadataFile, "utf8")
    );

    if (metadata.status !== "active") {
        throw new Error("Cannot edit an archived conversation.");
    }

    const conversationFile = path.join(
        conversationDirectory,
        `${metadata.folder_name}.json`
    );

    const conversation = JSON.parse(
        fs.readFileSync(conversationFile, "utf8")
    );

    const message = conversation.messages.find(
        item => item.message_id === messageId
    );

    if (!message) {
        throw new Error("Message not found.");
    }

    // Update only the message content and timestamp
    message.content = newContent;
    message.updated_at = new Date().toISOString();

    conversation.updated_at = message.updated_at;
    metadata.updated_at = message.updated_at;

    // Write conversation data safely using a temporary file
    const tempFile = `${conversationFile}.tmp`;

    fs.writeFileSync(
        tempFile,
        JSON.stringify(conversation, null, 2),
        "utf8"
    );

    fs.renameSync(tempFile, conversationFile);

    fs.writeFileSync(
        metadataFile,
        JSON.stringify(metadata, null, 2),
        "utf8"
    );

    return message;
}
// ============================================
// DELETE INDIVIDUAL MESSAGE
// ============================================

function deleteThreadMessage(userId, threadId, messageId) {

    if (!messageId || typeof messageId !== "string") {
        throw new Error("A valid message ID is required.");
    }

    const conversationDirectory = getConversationPath(
        userId,
        threadId
    );

    if (!conversationDirectory) {
        throw new Error("Conversation not found.");
    }

    const metadataFile = path.join(
        conversationDirectory,
        "metadata.json"
    );

    const metadata = JSON.parse(
        fs.readFileSync(metadataFile, "utf8")
    );

    if (metadata.status !== "active") {
        throw new Error("Cannot delete messages from an archived conversation.");
    }

    const conversationFile = path.join(
        conversationDirectory,
        `${metadata.folder_name}.json`
    );

    const conversation = JSON.parse(
        fs.readFileSync(conversationFile, "utf8")
    );

    const messageIndex = conversation.messages.findIndex(
        message => message.message_id === messageId
    );

    if (messageIndex === -1) {
        throw new Error("Message not found.");
    }

    // Remove the selected message
    const deletedMessage = conversation.messages.splice(
        messageIndex,
        1
    )[0];

    const now = new Date().toISOString();

    conversation.updated_at = now;
    metadata.updated_at = now;

    // Save updated conversation
    const tempFile = `${conversationFile}.tmp`;

    fs.writeFileSync(
        tempFile,
        JSON.stringify(conversation, null, 2),
        "utf8"
    );

    fs.renameSync(tempFile, conversationFile);

    // Save updated metadata
    fs.writeFileSync(
        metadataFile,
        JSON.stringify(metadata, null, 2),
        "utf8"
    );

    return {
        thread_id: threadId,
        message_id: deletedMessage.message_id,
        deleted: true,
        released_priority: deletedMessage.priority || 0
    };
}
// ============================================
// UPDATE MESSAGE STAR PRIORITY
// ============================================

function updateThreadMessagePriority(
    userId,
    threadId,
    messageId,
    newPriority
) {
    if (![0, 1, 2, 3].includes(newPriority)) {
        throw new Error("Priority must be between 0 and 3.");
    }

    const conversationDirectory = getConversationPath(
        userId,
        threadId
    );

    if (!conversationDirectory) {
        throw new Error("Conversation not found.");
    }

    const metadataFile = path.join(
        conversationDirectory,
        "metadata.json"
    );

    const metadata = JSON.parse(
        fs.readFileSync(metadataFile, "utf8")
    );

    if (metadata.status !== "active") {
        throw new Error("Cannot change priority in an archived conversation.");
    }

    const conversationFile = path.join(
        conversationDirectory,
        `${metadata.folder_name}.json`
    );

    const conversation = JSON.parse(
        fs.readFileSync(conversationFile, "utf8")
    );

    const message = conversation.messages.find(
        item => item.message_id === messageId
    );

    if (!message) {
        throw new Error("Message not found.");
    }

    const currentPriority = message.priority || 0;

    // No change required
    if (currentPriority === newPriority) {
        return message;
    }

    // Count priorities excluding the selected message
    const otherMessages = conversation.messages.filter(
        item => item.message_id !== messageId
    );

    const priorityCount = otherMessages.filter(
        item => (item.priority || 0) === newPriority
    ).length;

    const totalStarred = otherMessages.filter(
        item => (item.priority || 0) > 0
    ).length;

    // Enforce individual priority limits
    const priorityLimits = {
        1: 10,
        2: 7,
        3: 3
    };

    if (
        newPriority > 0 &&
        priorityCount >= priorityLimits[newPriority]
    ) {
        throw new Error(
            `Maximum ${priorityLimits[newPriority]} messages allowed at ${newPriority} star priority.`
        );
    }

    // Enforce total starred message limit
    if (newPriority > 0 && totalStarred >= 20) {
        throw new Error(
            "Maximum of 20 starred messages reached in this conversation."
        );
    }

    // Update priority
    const now = new Date().toISOString();

    message.priority = newPriority;
    message.updated_at = now;

    conversation.updated_at = now;
    metadata.updated_at = now;

    // Save conversation using a temporary file
    const tempFile = `${conversationFile}.tmp`;

    fs.writeFileSync(
        tempFile,
        JSON.stringify(conversation, null, 2),
        "utf8"
    );

    fs.renameSync(tempFile, conversationFile);

    // Update metadata
    fs.writeFileSync(
        metadataFile,
        JSON.stringify(metadata, null, 2),
        "utf8"
    );

    return message;
}
// ============================================
// CYCLE MESSAGE STAR PRIORITY
// ============================================

function cycleThreadMessagePriority(
    userId,
    threadId,
    messageId
) {
    const conversation = getConversation(userId, threadId);

    if (!conversation) {
        throw new Error("Conversation not found.");
    }

    const message = conversation.messages.find(
        item => item.message_id === messageId
    );

    if (!message) {
        throw new Error("Message not found.");
    }

    const currentPriority = message.priority || 0;

    // Cycle: 0 -> 1 -> 2 -> 3 -> 0
    const nextPriority = (currentPriority + 1) % 4;

    return updateThreadMessagePriority(
        userId,
        threadId,
        messageId,
        nextPriority
    );
}
// Validate conversation IDs before using them in filesystem paths.
function validateConversationId(conversationId) {
    if (typeof conversationId !== "string" || !/^thread_[a-zA-Z0-9_-]+$/.test(conversationId))
    {
        throw new Error("Invalid conversation ID.");
    }
}
// Resolve the conversation directory belonging to one user.
function getConversationDirectory(userId, conversationId) {
    validateConversationId(conversationId);
    const userDirectory = getUserDirectory(userId);
    const conversationDirectory = path.join(userDirectory, conversationId);
    fs.mkdirSync(conversationDirectory, { recursive: true });
    return conversationDirectory;
}
// Append one message to the appropriate rolling 24-hour file.
function appendMessage(userId, conversationId, role, content) {
    if (!["user", "assistant"].includes(role)) {
        throw new Error("Invalid message role.");
    }
    if (typeof content !== "string" || !content.trim()) {
        throw new Error("Message content cannot be empty.");
    }
    const conversationDirectory = getConversationDirectory(userId,conversationId);
    // Create folders only when the first message is saved.
    fs.mkdirSync(conversationDirectory, { recursive: true });
    const metadataPath = path.join(
        conversationDirectory,
        "metadata.json"
    );
    const now = Date.now();
    let metadata;
    if (fs.existsSync(metadataPath)) {
        metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8")
        );
    } else {
        metadata = {
            startedAt: now,
            lastDayNumber: 0
        };
    }
    // Day 1 starts at the first message, not at midnight.
    const elapsedTime = now - metadata.startedAt;
    const dayNumber = Math.floor(elapsedTime / DAY_IN_MILLISECONDS) + 1;
    const dayFile = path.join(conversationDirectory,`day_${String(dayNumber).padStart(3, "0")}.jsonl`);
    const message = {
        timestamp: new Date(now).toISOString(),
        role,
        content
    };
    // Append one JSON object per line.
    fs.appendFileSync(dayFile,JSON.stringify(message) + "\n","utf8");
    // Record the highest day number that actually received a message.
    if (dayNumber > metadata.lastDayNumber) {
        metadata.lastDayNumber = dayNumber;
        fs.writeFileSync(metadataPath,JSON.stringify(metadata, null, 2),"utf8");
    }
    return {
        saved: true,
        dayNumber,
        fileName: path.basename(dayFile)
    };
}
    // ============================================
// EXPORT STORAGE FUNCTIONS
// ============================================

module.exports = {

    // Legacy JSONL storage (preserved for migration)
    appendMessage,
    getConversationDirectory,

    // Account management
    getAccountDirectory,
    getThreadsHistoryDirectory,
    getThreadsArchiveDirectory,
    ensureAccountDirectories,
    initializeAccount,

    // Conversation management
    createConversation,
    getConversationPath,
    getConversation,
    getAllConversations,
    renameConversation,
    archiveConversation,
    restoreConversation,
    deleteConversation,

    // Message management
    appendThreadMessage,
    getConversationMessages,
    updateThreadMessage,
    deleteThreadMessage,

    // Star Feature
    updateThreadMessagePriority,
    cycleThreadMessagePriority
};