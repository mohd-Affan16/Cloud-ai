// Cloud Hybrid AI — Local Conversation Storage

const LocalConversationStorage = (() => {
    let selectedDirectory = null;
    async function saveMessage(conversationId, role, content) {
    if (!selectedDirectory) {
        throw new Error("Please select a storage folder first.");
    }

    if (!/^thread_[a-zA-Z0-9_-]+$/.test(conversationId)) {
        throw new Error("Invalid conversation ID.");
    }

    if (!["user", "assistant"].includes(role)) {
        throw new Error("Invalid message role.");
    }

    if (typeof content !== "string" || !content.trim()) {
        throw new Error("Message content cannot be empty.");
    }

    const conversationsFolder =
        await selectedDirectory.getDirectoryHandle(
            "conversations",
            { create: true }
        );

    const conversationFolder =
        await conversationsFolder.getDirectoryHandle(
            conversationId,
            { create: true }
        );

    const fileName = "conversation.jsonl";

    const fileHandle = await conversationFolder.getFileHandle(
        fileName,
        { create: true }
    );

    const existingFile = await fileHandle.getFile();
    const existingContent = await existingFile.text();

    const message = {
        timestamp: new Date().toISOString(),
        role,
        content
    };

    const updatedContent =
        existingContent +
        JSON.stringify(message) +
        "\n";

    const writable = await fileHandle.createWritable();

    await writable.write(updatedContent);
    await writable.close();

    return { saved: true, fileName };
}
    async function chooseFolder() {
        if (!window.showDirectoryPicker) {
            throw new Error(
                "Folder access is not supported in this browser."
            );
        }

        selectedDirectory =
            await window.showDirectoryPicker({
                mode: "readwrite"
            });

        return selectedDirectory.name;
    }

    function isFolderSelected() {
        return selectedDirectory !== null;
    }

    return {
    chooseFolder,
    isFolderSelected,
    saveMessage
};
})();