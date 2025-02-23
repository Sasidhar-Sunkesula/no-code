import { getWebContainer } from "@/config/webContainer";
import { API_URL } from "@/lib/constants";
import { getImportArtifact, mountFiles } from "@/lib/runtime";
import { projectFilesMsg, projectInstructionsMsg } from "@/lib/utils";
import { actionExecutor } from "@/services/ActionExecutor";
import { useFilesStore } from "@/store/filesStore";
import { usePreviewStore } from "@/store/previewStore";
import { useProjectStore } from "@/store/projectStore";
import { Artifact, ExistingProject, File, FileAction, NewProject, ShellAction } from "@repo/common/types";
import { Message } from 'ai/react';
import toast from "react-hot-toast";
import { useShallow } from "zustand/react/shallow";

export function useInitProject(
    setMessages: (messages: Message[] | ((messages: Message[]) => Message[])) => void,
    reload: () => Promise<string | null | undefined>
) {
    const { setWebContainerInstance } = usePreviewStore(
        useShallow(state => ({
            setWebContainerInstance: state.setWebContainer
        }))
    );
    const { setSelectedFile, updateProjectFiles } = useFilesStore(
        useShallow(state => ({
            updateProjectFiles: state.updateProjectFiles,
            setSelectedFile: state.setSelectedFile,
        }))
    );
    const { addAction,
        upsertMessage,
        setCurrentMessageId
    } = useProjectStore(
        useShallow(state => ({
            addAction: state.addAction,
            upsertMessage: state.upsertMessage,
            setCurrentMessageId: state.setCurrentMessageId,
        }))
    );
    async function initializeProject(projectId: string) {
        try {
            const container = await getWebContainer();
            setWebContainerInstance(container);
            const response = await fetch(`${API_URL}/api/project/${projectId}`);
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.msg);
            }
            let files: File[] = [];
            if (result.type === 'existing') {
                const { messages, projectFiles } = result as ExistingProject;
                messages.forEach(message => {
                    if (message.role === 'user') {
                        // For user messages, content is always { text: string }
                        const userContent = message.content as { text: string };
                        upsertMessage({
                            id: message.id,
                            role: message.role,
                            content: userContent.text,
                            timestamp: new Date(message.createdAt).getTime()
                        });
                    } else if (message.role === 'assistant') {
                        // For assistant messages, content is always Artifact
                        const assistantContent = message.content as { artifact: Artifact };
                        upsertMessage({
                            id: message.id,
                            role: message.role,
                            content: JSON.stringify(assistantContent),
                            timestamp: new Date(message.createdAt).getTime()
                        });
                        assistantContent.artifact.actions.forEach(action => {
                            const currentAction: FileAction | ShellAction = {
                                id: crypto.randomUUID(),
                                timestamp: Date.now(),
                                ...action
                            };
                            if (currentAction.type === 'file') {
                                addAction(message.id, {
                                    state: 'created',
                                    ...currentAction
                                });
                            } else if (action.type === 'shell') {
                                addAction(message.id, {
                                    state: 'completed',
                                    ...currentAction
                                });
                            }
                        });
                    }
                });
                const currentMessageId = 'import-artifact';
                const { artifact, currentActions } = getImportArtifact(messages);
                upsertMessage({
                    id: currentMessageId,
                    role: 'assistant',
                    timestamp: Date.now(),
                    content: JSON.stringify({ artifact: artifact })
                });
                currentActions.forEach(action => {
                    const currentAction: ShellAction = {
                        id: crypto.randomUUID(),
                        timestamp: Date.now(),
                        ...action
                    }
                    addAction(currentMessageId, {
                        state: 'queued',
                        ...currentAction
                    });
                    actionExecutor.addAction(currentMessageId, currentAction);
                });
                files = [...projectFiles];
                updateProjectFiles(projectFiles.map(file => ({
                    type: 'file',
                    ...file,
                })));
                const lastFile = projectFiles.at(-1);
                if (lastFile) setSelectedFile(lastFile.filePath);
            }
            else {
                const { enhancedPrompt, templateFiles, templatePrompt, ignorePatterns } = result as NewProject;
                const messages = [
                    { id: '1', role: 'user', content: projectFilesMsg(templateFiles, ignorePatterns) },
                    ...(templatePrompt
                        ? [
                            { id: '2', role: 'user', content: templatePrompt },
                            { id: '3', role: 'user', content: projectInstructionsMsg(enhancedPrompt) }
                        ]
                        : [{ id: '2', role: 'user', content: projectInstructionsMsg(enhancedPrompt) }]
                    )
                ];
                setMessages(messages as Message[]);
                reload();
                upsertMessage({ id: crypto.randomUUID(), role: 'data', content: templatePrompt, timestamp: Date.now() });
                files = [...templateFiles];
                // Add files to project store
                updateProjectFiles(templateFiles.map(file => ({
                    id: crypto.randomUUID(),
                    type: 'file',
                    timestamp: Date.now(),
                    ...file,
                })));
            }
            setCurrentMessageId(crypto.randomUUID());
            await mountFiles(files, container);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Error while initializing project"
            toast.error(errorMessage)
        }
    }
    return { initializeProject }
}