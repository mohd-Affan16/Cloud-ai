// Cloud Hybrid AI — Local Conversation Storage

const LocalConversationStorage = (() => {
    let selectedDirectory = null;
    
async function readArchive() {
    if (!selectedDirectory) {
        throw new Error("Please select a storage folder first.");
    }

    // Open the existing archive root without creating it.
  const conversationsFolder =
    await selectedDirectory.getDirectoryHandle(
        "conversations",
        { create: true }
    );
    const archivedThreads = [];

    for await (const [id, entry] of conversationsFolder.entries()) {
        // Ignore files and unrelated folders.
        if (
            entry.kind !== "directory" ||
            !/^thread_[a-zA-Z0-9_-]+$/.test(id)
        ) {
            continue;
        }

        // Open existing files only; never create archive files.
        const conversationFolder =
            await conversationsFolder.getDirectoryHandle(id);

        const fileHandle =
            await conversationFolder.getFileHandle("conversation.jsonl");

        const file = await fileHandle.getFile();
        const text = await file.text();

        const messages = text
            .split(/\r?\n/)
            .filter((line) => line.trim() !== "")
            .map((line) => {
                const record = JSON.parse(line);

                if (
                    !record ||
                    !["user", "assistant"].includes(record.role) ||
                    typeof record.content !== "string"
                ) {
                    throw new Error(
                        `Invalid message record in archive: ${id}`
                    );
                }

                return {
                    role: record.role === "assistant" ? "ai" : "user",
                    content: record.content
                };
            });

        archivedThreads.push({
            id,
            title: id,
            messages
        });
    }

    return archivedThreads;
}

async function saveConversation(thread) {
    if (!selectedDirectory) {
        throw new Error("Please select a storage folder first.");
    }

    if (!thread || !/^thread_[a-zA-Z0-9_-]+$/.test(thread.id)) {
        throw new Error("Invalid conversation.");
    }

    if (!Array.isArray(thread.messages)) {
        throw new Error("Conversation messages are invalid.");
    }

    const conversationsFolder =
        await selectedDirectory.getDirectoryHandle(
            "conversations",
            { create: true }
        );

    const conversationFolder =
        await conversationsFolder.getDirectoryHandle(
            thread.id,
            { create: true }
        );

    const jsonlContent = thread.messages.map((message) => {
        const role =
            message.role === "ai" ? "assistant" : message.role;

        if (!["user", "assistant"].includes(role)) {
            throw new Error("Unsupported message role in conversation.");
        }

        return JSON.stringify({
            timestamp: new Date().toISOString(),
            role,
            content: String(message.content ?? "")
        });
    }).join("\n");

    const fileHandle =
        await conversationFolder.getFileHandle(
            "conversation.jsonl",
            { create: true }
        );

    const writable = await fileHandle.createWritable();

    try {
        await writable.write(
            jsonlContent ? jsonlContent + "\n" : ""
        );
        await writable.close();
    } catch (error) {
        await writable.abort().catch(() => {});
        throw error;
    }

    return {
        saved: true,
        conversationId: thread.id,
        messageCount: thread.messages.length
    };
}

async function migrateConversation(thread) {
    if (!selectedDirectory) {
        throw new Error("Please select a storage folder first.");
    }

    if (!thread || !/^thread_[a-zA-Z0-9_-]+$/.test(thread.id)) {
        throw new Error("Invalid conversation.");
    }

    if (!Array.isArray(thread.messages)) {
        throw new Error("Conversation messages are invalid.");
    }

    // Validate and normalize the source history.
    const sourceMessages = thread.messages.map((message) => {
        const role =
            message.role === "ai" ? "assistant" : message.role;

        if (!["user", "assistant"].includes(role)) {
            throw new Error("Unsupported message role.");
        }

        return {
            role,
            content: String(message.content ?? "")
        };
    });

    const conversationsFolder =
        await selectedDirectory.getDirectoryHandle(
            "conversations",
            { create: true }
        );

    const conversationFolder =
        await conversationsFolder.getDirectoryHandle(
            thread.id,
            { create: true }
        );

    let fileHandle;
    let existingMessages = [];

    // Read an existing archive without overwriting it.
    try {
        fileHandle = await conversationFolder.getFileHandle(
            "conversation.jsonl"
        );

        const file = await fileHandle.getFile();
        const text = await file.text();

        existingMessages = text
            .split("\n")
            .filter((line) => line.trim())
            .map((line) => {
                const item = JSON.parse(line);

                if (
                    !["user", "assistant"].includes(item.role) ||
                    typeof item.content !== "string"
                ) {
                    throw new Error("Existing archive has an invalid message.");
                }

                return {
                    role: item.role,
                    content: item.content
                };
            });
    } catch (error) {
        if (error.name !== "NotFoundError") {
            throw error;
        }

        fileHandle = await conversationFolder.getFileHandle(
            "conversation.jsonl",
            { create: true }
        );
    }

    const sameMessage = (a, b) =>
        a.role === b.role && a.content === b.content;

    const commonLength = Math.min(
        existingMessages.length,
        sourceMessages.length
    );

    // Require matching history before safely extending either archive.
    for (let i = 0; i < commonLength; i++) {
        if (!sameMessage(existingMessages[i], sourceMessages[i])) {
            throw new Error(
                `History conflict in ${thread.id} at message ${i + 1}. ` +
                "No changes were made to this conversation file."
            );
        }
    }

    // If the file already contains the entire browser history,
    // leave it untouched.
    if (existingMessages.length >= sourceMessages.length) {
        return {
            conversationId: thread.id,
            saved: false,
            messageCount: existingMessages.length,
            status: "already-current"
        };
    }

    // Append only messages missing from the end of the file.
    const missingMessages = sourceMessages.slice(
        existingMessages.length
    );

    const lines = missingMessages.map((message) =>
        JSON.stringify({
            timestamp: new Date().toISOString(),
            role: message.role,
            content: message.content
        })
    );

    const writable = await fileHandle.createWritable({
        keepExistingData: true
    });

    try {
        await writable.seek((await fileHandle.getFile()).size);

        await writable.write(lines.join("\n") + "\n");
        await writable.close();
    } catch (error) {
        await writable.abort().catch(() => {});
        throw error;
    }

    return {
        conversationId: thread.id,
        saved: true,
        messageCount: sourceMessages.length,
        status: "migrated"
    };
}
// SAFE RECOVERY — refuses to overwrite an existing archive file.

    // SAFE RECOVERY — validates first and refuses existing conversation folders.
    async function recoverMissingConversation(thread) {
        if (!selectedDirectory) {
            throw new Error("Please select a storage folder first.");
        }

        if (
            !thread ||
            typeof thread.id !== "string" ||
            !/^thread_[a-zA-Z0-9_-]+$/.test(thread.id) ||
            !Array.isArray(thread.messages)
        ) {
            throw new Error("Invalid conversation data.");
        }

        // Validate every message before accessing or creating archive folders.
        const lines = thread.messages.map((message) => {
            if (!message || typeof message !== "object") {
                throw new Error("Invalid message in recovery source.");
            }

            const role =
                message.role === "ai" ? "assistant" : message.role;

            if (
                !["user", "assistant"].includes(role) ||
                typeof message.content !== "string"
            ) {
                throw new Error("Invalid message in recovery source.");
            }

            return JSON.stringify({
                timestamp: new Date().toISOString(),
                role,
                content: message.content
            });
        });

        // Require the archive root to exist; do not create it during recovery.
       const conversationsFolder =
    await selectedDirectory.getDirectoryHandle(
        "conversations",
        { create: true }
    );

        // Refuse to use any existing conversation folder, even if empty.
        try {
            await conversationsFolder.getDirectoryHandle(thread.id);
            throw new Error(
                `Conversation folder already exists for ${thread.id}. Recovery stopped.`
            );
        } catch (error) {
            if (error.name !== "NotFoundError") throw error;
        }

        // Create the new folder only after validation and existence checks.
        const conversationFolder =
            await conversationsFolder.getDirectoryHandle(
                thread.id,
                { create: true }
            );

        const fileHandle =
            await conversationFolder.getFileHandle(
                "conversation.jsonl",
                { create: true }
            );

        const writable = await fileHandle.createWritable();

        try {
            await writable.write(
                lines.join("\n") + (lines.length ? "\n" : "")
            );
            await writable.close();
        } catch (error) {
            await writable.abort().catch(() => {});
            throw error;
        }

        
        // Read the newly written file back and verify its contents.
        const savedFile = await fileHandle.getFile();
        const savedText = await savedFile.text();

        const savedMessages = savedText
            .split(/\r?\n/)
            .filter((line) => line.trim())
            .map((line) => JSON.parse(line));

        const matches =
            savedMessages.length === thread.messages.length &&
            savedMessages.every((saved, index) => {
                const source = thread.messages[index];
                const expectedRole =
                    source.role === "ai" ? "assistant" : source.role;

                return (
                    saved.role === expectedRole &&
                    saved.content === source.content
                );
            });

        if (!matches) {
            throw new Error(
                `Recovery verification failed for ${thread.id}. Preserve the folder for inspection.`
            );
        }

        return {
            conversationId: thread.id,
            messageCount: savedMessages.length,
            status: "recovered",
            verified: true
        };

    }

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
        console.log("[Archive Debug] Selected root:", selectedDirectory.name);
console.log("[Archive Debug] Child folder:", conversationsFolder.name);

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
    
    async function getSelectedConversationsFolder() {
        if (!selectedDirectory) {
            throw new Error("Please select a storage folder first.");
        }

        return await selectedDirectory.getDirectoryHandle(
            "conversations"
        );
    }

    
    // READ-ONLY ARCHIVE VERIFICATION
    // This function never creates, edits, or deletes files.
    async function verifyArchive(sourceThreads) {
        if (!selectedDirectory) {
            throw new Error("Please select a storage folder first.");
        }

        if (!Array.isArray(sourceThreads)) {
            throw new Error("Browser conversation history is invalid.");
        }

        const normalizeMessage = (message) => {
            const role =
                message.role === "ai" ? "assistant" : message.role;

            if (
                !["user", "assistant"].includes(role) ||
                typeof message.content !== "string"
            ) {
                throw new Error("Invalid browser message found.");
            }

            return { role, content: message.content };
        };

        const sameMessage = (a, b) =>
            a.role === b.role && a.content === b.content;

        const sourceById = new Map();

        for (const thread of sourceThreads) {
            if (
                !thread ||
                !/^thread_[a-zA-Z0-9_-]+$/.test(thread.id) ||
                !Array.isArray(thread.messages) ||
                sourceById.has(thread.id)
            ) {
                throw new Error(
                    "Invalid or duplicate browser conversation ID."
                );
            }

            sourceById.set(
                thread.id,
                thread.messages.map(normalizeMessage)
            );
        }

        const report = {
            checked: 0,
            matching: [],
            missingArchiveFiles: [],
            missingBrowserConversations: [],
            conflicts: [],
            invalidFiles: [],
            extraMessages: [],
            readOnly: true
        };

        let conversationsFolder;

        try {
            // No { create: true }: verification must not create folders.
            conversationsFolder =
                await selectedDirectory.getDirectoryHandle("conversations");
                console.log(
    "[Archive Verification] Selected root:",
    selectedDirectory.name
);

console.log(
    "[Archive Verification] Scanning folder:",
    conversationsFolder.name
);
        } catch (error) {
            if (error.name === "NotFoundError") {
                report.missingArchiveFiles.push(...sourceById.keys());
                report.checked = sourceById.size;
                return report;
            }

            throw error;
        }

        
        const archiveIds = new Set();

        for await (const [id, entry] of conversationsFolder.entries()) {
            console.log(
                "[Archive Debug] Entry:",
                id,
                "| Kind:",
                entry.kind
            );

            // Ignore unrelated folders and files.
            if (
                entry.kind !== "directory" ||
                !/^thread_[a-zA-Z0-9_-]+$/.test(id)
            ) {
                continue;
            }

            archiveIds.add(id);

            let fileHandle;

            try {
                fileHandle =
                    await entry.getFileHandle("conversation.jsonl");

                const file = await fileHandle.getFile();
                const text = await file.text();

                const archivedMessages = text
                    .split(/\r?\n/)
                    .filter((line) => line.trim())
                    .map((line) => {
                        const item = JSON.parse(line);

                        if (
                            !["user", "assistant"].includes(item.role) ||
                            typeof item.content !== "string"
                        ) {
                            throw new Error("Invalid message record.");
                        }

                        return {
                            role: item.role,
                            content: item.content
                        };
                    });

                if (!sourceById.has(id)) {
                    report.missingBrowserConversations.push({
                        conversationId: id,
                        archivedMessages: archivedMessages.length
                    });
                    continue;
                }

                report.checked++;

                const sourceMessages = sourceById.get(id);
                const commonLength = Math.min(
                    sourceMessages.length,
                    archivedMessages.length
                );

                let mismatchAt = -1;

                for (let i = 0; i < commonLength; i++) {
                    if (!sameMessage(sourceMessages[i], archivedMessages[i])) {
                        mismatchAt = i + 1;
                        break;
                    }
                }

                if (mismatchAt !== -1) {
                    report.conflicts.push({
                        conversationId: id,
                        messageNumber: mismatchAt,
                        browserMessages: sourceMessages.length,
                        archivedMessages: archivedMessages.length
                    });
                } else if (archivedMessages.length < sourceMessages.length) {
                    report.extraMessages.push({
                        conversationId: id,
                        missingFromArchive:
                            sourceMessages.length - archivedMessages.length,
                        status: "Browser history has additional messages"
                    });
                } else if (archivedMessages.length > sourceMessages.length) {
                    report.extraMessages.push({
                        conversationId: id,
                        extraInArchive:
                            archivedMessages.length - sourceMessages.length,
                        status: "Archive has additional messages"
                    });
                } else {
                    report.matching.push({
                        conversationId: id,
                        messages: sourceMessages.length
                    });
                }
            } catch (error) {
                if (error.name === "NotFoundError") {
                    if (sourceById.has(id)) {
                        report.checked++;
                        report.missingArchiveFiles.push(id);
                    } else {
                        report.missingBrowserConversations.push({
                            conversationId: id,
                            archivedMessages: null,
                            reason: "No conversation.jsonl file"
                        });
                    }
                } else {
                    report.invalidFiles.push({
                        conversationId: id,
                        reason: error.message
                    });
                }
            }
        }

        for (const id of sourceById.keys()) {
            if (!archiveIds.has(id)) {
                report.checked++;
                report.missingArchiveFiles.push(id);
            }
        }

        return report;
    }


    // READ-ONLY BACKUP PREVIEW — does not create or modify archive files.
    async function previewBackupRecovery(backupText) {
        if (!selectedDirectory) {
            throw new Error("Please select a storage folder first.");
        }

        if (typeof backupText !== "string") {
            throw new Error("Backup must be supplied as JSON text.");
        }

        let threads;

        try {
            threads = JSON.parse(backupText);
        } catch {
            throw new Error("Backup is not valid JSON.");
        }

        if (!Array.isArray(threads)) {
            throw new Error("Backup must contain an array of conversations.");
        }

        const seenIds = new Set();

        // Validate all records before inspecting the archive.
        for (const thread of threads) {
            if (
                !thread ||
                typeof thread.id !== "string" ||
                !/^thread_[a-zA-Z0-9_-]+$/.test(thread.id) ||
                seenIds.has(thread.id) ||
                !Array.isArray(thread.messages)
            ) {
                throw new Error(
                    "Backup contains an invalid or duplicate conversation."
                );
            }

            seenIds.add(thread.id);

            for (const message of thread.messages) {
                const role =
                    message?.role === "ai" ? "assistant" : message?.role;

                if (
                    !["user", "assistant"].includes(role) ||
                    typeof message.content !== "string"
                ) {
                    throw new Error(
                        `Invalid message in conversation ${thread.id}.`
                    );
                }
            }
        }

        const conversationsFolder =
            await selectedDirectory.getDirectoryHandle("conversations");

        const results = [];

        for (const thread of threads) {
            let folderExists = false;
            let fileExists = false;

            try {
                const folder =
                    await conversationsFolder.getDirectoryHandle(thread.id);

                folderExists = true;

                try {
                    await folder.getFileHandle("conversation.jsonl");
                    fileExists = true;
                } catch (error) {
                    if (error.name !== "NotFoundError") throw error;
                }
            } catch (error) {
                if (error.name !== "NotFoundError") throw error;
            }

            results.push({
                id: thread.id,
                title: String(thread.title ?? ""),
                messages: thread.messages.length,
                folderExists,
                archiveFileExists: fileExists,
                status: folderExists
                    ? "REVIEW EXISTING FOLDER"
                    : "CANDIDATE — NO FOLDER FOUND"
            });
        }
        
   

        return {
            readOnly: true,
            totalConversations: threads.length,
            totalMessages: threads.reduce(
                (sum, thread) => sum + thread.messages.length,
                0
            ),
            results
        };
    }

     // CONTROLLED RESTORE — restores only folders confirmed absent by preview.
    
    // CONTROLLED RESTORE — validates first, restores one at a time, verifies each file.
    async function restoreBackupConversations(backupText) {
        // Validate the complete backup before any archive writes.
        const preview = await previewBackupRecovery(backupText);

        if (
            preview.readOnly !== true ||
            preview.totalConversations !== preview.results.length
        ) {
            throw new Error("Safety check failed. Restore cancelled.");
        }

        const threads = JSON.parse(backupText);
        const restored = [];
        const skipped = [];
        const failed = [];

        for (const result of preview.results) {
            // Existing folders are never overwritten or reused.
            if (result.folderExists || result.archiveFileExists) {
                skipped.push({
                    id: result.id,
                    reason: "Existing destination requires manual review."
                });
                continue;
            }

            const thread = threads.find(item => item.id === result.id);

            if (!thread) {
                failed.push({
                    id: result.id,
                    error: "Validated conversation was not found in backup."
                });
                break;
            }

            try {
                // Recheck the destination immediately before writing.
                const conversationsFolder =
                    await selectedDirectory.getDirectoryHandle("conversations");

                try {
                    await conversationsFolder.getDirectoryHandle(thread.id);

                    skipped.push({
                        id: thread.id,
                        reason: "Destination folder appeared before restore."
                    });
                    continue;
                } catch (error) {
                    if (error.name !== "NotFoundError") throw error;
                }

                const outcome =
                    await recoverMissingConversation(thread);

                // Read back the new file and verify message count and content.
                const folder =
                    await conversationsFolder.getDirectoryHandle(thread.id);
                const fileHandle =
                    await folder.getFileHandle("conversation.jsonl");
                const file = await fileHandle.getFile();
                const lines = (await file.text())
                    .split(/\r?\n/)
                    .filter(line => line.trim());

                const archived = lines.map(line => JSON.parse(line));

                const matches =
                    archived.length === thread.messages.length &&
                    archived.every((message, index) => {
                        const source = thread.messages[index];
                        const role = source.role === "ai"
                            ? "assistant"
                            : source.role;

                        return (
                            message.role === role &&
                            message.content === source.content
                        );
                    });

                if (!matches) {
                    failed.push({
                        id: thread.id,
                        error: "Read-back verification failed. Preserve this folder for inspection."
                    });
                    break;
                }

                restored.push({
                    ...outcome,
                    verified: true
                });
            } catch (error) {
                failed.push({
                    id: result.id,
                    error: error.message
                });
                break;
            }
        }

        return {
            restored,
            skipped,
            failed,
            completed: failed.length === 0 && skipped.length === 0 &&
                restored.length === preview.totalConversations,
            note: "Inspect restored, skipped, and failed records. A failed run may have restored earlier conversations."
        };
    }

/* SAFE STORAGE MIGRATION — copy and verify before source removal */

async function migrateStorageFolder() {
    if (!selectedDirectory) {
        throw new Error("Please select your current storage folder first.");
    }

    const source = selectedDirectory;

    if (!window.showDirectoryPicker) {
        throw new Error("Folder selection is not supported in this browser.");
    }

    // Ask the user to choose the destination folder.
    const destination = await window.showDirectoryPicker({
        mode: "readwrite"
    });

    if (await source.isSameEntry(destination)) {
        throw new Error("Choose a different destination folder.");
    }

    let copiedFiles = 0;

    async function copyDirectory(sourceDir, destinationDir) {
        for await (const [name, entry] of sourceDir.entries()) {
            if (entry.kind === "directory") {
                const sourceSubdir =
                    await sourceDir.getDirectoryHandle(name);

                const destinationSubdir =
                    await destinationDir.getDirectoryHandle(
                        name,
                        { create: true }
                    );

                await copyDirectory(sourceSubdir, destinationSubdir);
                continue;
            }

            const sourceHandle = await sourceDir.getFileHandle(name);
            const sourceFile = await sourceHandle.getFile();
            const sourceText = await sourceFile.text();

            let destinationHandle;
            let destinationExists = true;

            try {
                destinationHandle =
                    await destinationDir.getFileHandle(name);
            } catch (error) {
                if (error.name !== "NotFoundError") throw error;

                destinationExists = false;
                destinationHandle =
                    await destinationDir.getFileHandle(
                        name,
                        { create: true }
                    );
            }

            if (destinationExists) {
                // Existing identical files are safe to keep.
                const existingFile = await destinationHandle.getFile();
                const existingText = await existingFile.text();

                if (existingText !== sourceText) {
                    throw new Error(
                        `Migration stopped because "${name}" already exists with different content. Your source archive was kept.`
                    );
                }

                copiedFiles++;
                continue;
            }

            const writable = await destinationHandle.createWritable();

            try {
                await writable.write(sourceText);
                await writable.close();
            } catch (error) {
                await writable.abort().catch(() => {});
                throw error;
            }

            // Verify the copied file by reading it back.
            const copiedFile = await destinationHandle.getFile();

            if (await copiedFile.text() !== sourceText) {
                throw new Error(
                    `Verification failed for "${name}". Your source archive was kept.`
                );
            }

            copiedFiles++;
        }
    }

    await copyDirectory(source, destination);

    return {
        copiedFiles,
        sourceName: source.name,
        destinationName: destination.name,
        verified: true
    };
}

return {
    readArchive,
    chooseFolder,
    isFolderSelected,
    getSelectedConversationsFolder,
    saveMessage,
    saveConversation,
    migrateConversation,
    migrateStorageFolder,
    verifyArchive,
    recoverMissingConversation,
    previewBackupRecovery,
    restoreBackupConversations
};
})();