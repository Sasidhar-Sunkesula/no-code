import { isNewFile, parseActions } from "@/lib/runtime";
import { actionExecutor } from "@/services/ActionExecutor";
import { useGeneralStore } from "@/store/generalStore";
import { useProjectStore } from "@/store/projectStore";
import { FileAction, ShellAction } from "@repo/common/types";
import type { Message } from "ai/react";
import { parse } from "best-effort-json-parser";
import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";

export function useMessageParser() {
    const [streamingAction, setStreamingAction] = useState<FileAction | ShellAction | null>(null);
    const [lastStreamedAction, setLastStreamedAction] = useState<FileAction | ShellAction | null>(null);
    const { selectedFileName, setSelectedFileName } = useGeneralStore(
        useShallow(state => ({
            selectedFileName: state.selectedFileName,
            setSelectedFileName: state.setSelectedFileName,
        }))
    );
    const { upsertMessage,
        addAction,
        updateActionStatus,
        updateProjectFiles,
        getActionStatus,
        currentMessageId,
        projectFiles
    } = useProjectStore(
        useShallow(state => ({
            upsertMessage: state.upsertMessage,
            currentMessageId: state.currentMessageId,
            projectFiles: state.projectFiles,
            getActionStatus: state.getActionStatus,
            updateProjectFiles: state.updateProjectFiles,
            addAction: state.addAction,
            updateActionStatus: state.updateActionStatus,
        }))
    );

    const parseMessage = (message: Message) => {
        try {
            const startIndex = message.content.indexOf('{');
            if (startIndex === -1) return null;

            const trimmedJSON = message.content.slice(startIndex);
            const parsedData = parse(trimmedJSON);

            if (!parsedData?.artifact) return null;

            return {
                actions: parseActions(parsedData.artifact.actions ?? []),
                actionsStreamed: !!(parsedData.artifact.endingContext)
            };
        } catch (error) {
            console.error('Failed to parse message:', error);
            return null;
        }
    };

    const updateStore = (filteredActions: (FileAction | ShellAction)[]) => {
        const updatedFiles = [...projectFiles];
        const parsedFiles = filteredActions.filter(action => action.type === 'file');

        for (const parsedFile of parsedFiles) {
            const existingFileIndex = projectFiles.findIndex(existingFile =>
                existingFile.filePath === parsedFile.filePath
            );
            if (existingFileIndex !== -1) {
                updatedFiles[existingFileIndex].content = parsedFile.content;
            } else {
                updatedFiles.push(parsedFile);
            }
        }
        updateProjectFiles(updatedFiles);
    }

    const handleLastStreamedAction = (
        actionsStreamed: boolean,
        validActions: (FileAction | ShellAction)[]
    ) => {
        if (!actionsStreamed) {
            const lastStreamedAction = validActions.at(-2);
            if (lastStreamedAction) {
                setLastStreamedAction({
                    ...lastStreamedAction,
                    id: (validActions.length - 2).toString()
                });
            }
        }
        else {
            const lastStreamedAction = validActions.at(-1);
            if (lastStreamedAction) {
                setLastStreamedAction({
                    ...lastStreamedAction,
                    id: (validActions.length - 1).toString()
                });
            }
        }
    }

    const handleStreamingAction = (validActions: (FileAction | ShellAction)[]) => {
        if (validActions.length > 0) {
            const streamingAction = validActions.at(-1);
            if (streamingAction) {
                setStreamingAction({
                    ...streamingAction,
                    id: (validActions.length - 1).toString()
                });
            }
        }
    }

    function handleNewMessage(message: Message) {
        if (message.role !== 'assistant' || !currentMessageId) {
            return;
        }
        try {
            upsertMessage({
                id: currentMessageId,
                role: 'assistant' as const,
                content: message.content,
                reasoning: message.reasoning,
                timestamp: Date.now()
            });
            const parsedMessage = parseMessage(message);
            if (!parsedMessage) {
                return;
            }
            const validActions = parsedMessage.actions;
            updateStore(validActions);
            handleStreamingAction(validActions);
            handleLastStreamedAction(parsedMessage.actionsStreamed, validActions);
        } catch (error) {
            console.error('An error occurred while parsing the message:', error as Error);
        }
    }

    useEffect(() => {
        if (!streamingAction || !currentMessageId || projectFiles.length === 0) {
            return;
        }
        if (streamingAction.type === 'file') {
            addAction(currentMessageId, {
                id: streamingAction.id,
                timestamp: streamingAction.timestamp,
                type: 'file',
                filePath: streamingAction.filePath,
                state: isNewFile(streamingAction.filePath, projectFiles) ? 'creating' : 'updating'
            });
        }
        if (streamingAction.type === 'file' && streamingAction.filePath !== selectedFileName) {
            // Get the file name from the file path
            const currentStreamingFileName = streamingAction.filePath.split('/').at(-1);
            if (currentStreamingFileName) {
                setSelectedFileName(currentStreamingFileName);
            }
        }
    }, [streamingAction?.id]);

    useEffect(() => {
        if (lastStreamedAction && currentMessageId && projectFiles.length > 0) {
            if (lastStreamedAction.type === 'file') {
                const prevStatus = getActionStatus(lastStreamedAction.id);
                updateActionStatus(
                    lastStreamedAction.id,
                    prevStatus === 'creating' || prevStatus === 'created'
                        ? 'created'
                        : 'updated'
                );
            } else if (lastStreamedAction.type === 'shell') {
                addAction(currentMessageId, {
                    id: lastStreamedAction.id,
                    timestamp: lastStreamedAction.timestamp,
                    type: 'shell',
                    state: 'queued',
                    command: lastStreamedAction.command
                });
            }
            actionExecutor.addAction(lastStreamedAction);
        }
    }, [lastStreamedAction?.id]);

    return handleNewMessage;
}