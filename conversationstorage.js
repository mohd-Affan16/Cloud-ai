const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const conversationsDirectory = path.join(__dirname, "conversations");
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
module.exports = {
    appendMessage,
    getConversationDirectory
};