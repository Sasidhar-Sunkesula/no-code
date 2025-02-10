import { ActionState, MessageHistory, FileAction } from '@repo/common/types';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface ProjectState {
    // messageId, message with json string
    messageHistory: MessageHistory[];
    projectFiles: FileAction[];
    // messageId, actions
    actions: Map<string, ActionState[]>;
    currentMessageId: string | null;
    ignorePatterns: string[];
    lastModified: number;
    selectedFile: string | null;

    // Actions
    upsertMessage: (message: MessageHistory) => void;
    setCurrentMessageId: (messageId: string) => void;
    addAction: (messageId: string, action: ActionState) => void;
    getActionStatus: (actionId: string) => ActionState['state'] | null;
    updateActionStatus: (actionId: string, status: ActionState['state']) => void;
    updateFile: (filePath: string, content: string) => void;
    setSelectedFile: (filePath: string | null) => void;
    updateProjectFiles: (files: FileAction[]) => void;
    setIgnorePatterns: (patterns: string[]) => void;
}

export const useProjectStore = create<ProjectState>()(
    devtools(
        (set, get) => ({
            projectFiles: [],
            currentMessageId: null,
            actions: new Map(),
            lastModified: Date.now(),
            selectedFile: null,
            messageHistory: [],
            ignorePatterns: [],

            upsertMessage: (message) =>
                set((state) => {
                    const messages = [...state.messageHistory];
                    const index = messages.findIndex(m => m.id === message.id);
                    if (index !== -1) {
                        messages[index] = message;
                    } else {
                        messages.push(message);
                    }
                    return { messageHistory: messages };
                }),

            setCurrentMessageId: (messageId) =>
                set({ currentMessageId: messageId }),

            updateFile: (filePath, content) =>
                set((state) => {
                    if (!state.currentMessageId) {
                        return {
                            currentMessage: null
                        };
                    }
                    const newFiles = state.projectFiles.map(file =>
                        file.filePath === filePath ? {
                            ...file,
                            content: content,
                            timestamp: Date.now()
                        } : file
                    );
                    return {
                        projectFiles: newFiles,
                        lastModified: Date.now()
                    };
                }),

            setSelectedFile: (filePath) =>
                set({ selectedFile: filePath }),

            updateProjectFiles: (files) =>
                set({ projectFiles: files }),

            setIgnorePatterns: (patterns) =>
                set({ ignorePatterns: patterns }),

            addAction: (messageId, action) =>
                set((state) => {
                    const actions = new Map(state.actions);
                    const currentMessage = actions.get(messageId);
                    const newActions = currentMessage ? [...currentMessage, action] : [action];
                    actions.set(messageId, newActions);
                    return {
                        actions: actions,
                        lastModified: Date.now()
                    };
                }),

            getActionStatus: (actionId: string) => {
                const currentMessageId = get().currentMessageId;
                if (!currentMessageId) return null;

                return get().actions
                    .get(currentMessageId)
                    ?.find(action => action.id === actionId)
                    ?.state ?? null;
            },

            updateActionStatus: (actionId, status) =>
                set((state) => {
                    const actions = new Map(state.actions);
                    if (!state.currentMessageId) {
                        return {
                            actions: state.actions
                        };
                    }
                    const currentMessage = actions.get(state.currentMessageId);
                    if (!currentMessage) {
                        return {
                            actions: state.actions
                        };
                    }
                    const newActions = currentMessage.map(action =>
                        action.id === actionId ? { ...action, state: status } : action
                    ) as ActionState[];
                    actions.set(state.currentMessageId, newActions);
                    return { actions };
                }),
        }),
        { name: 'project-store' }
    )
) 