import { getWebContainer } from "@/config/webContainer";
import { API_URL } from "@/lib/constants";
import { getImportArtifact, mountFiles } from "@/lib/runtime";
import { customToast, projectFilesMsg, projectInstructionsMsg } from "@/lib/utils";
import { actionExecutor } from "@/services/ActionExecutor";
import { useFilesStore } from "@/store/filesStore";
import { usePreviewStore } from "@/store/previewStore";
import { useProjectStore } from "@/store/projectStore";
import { Artifact, ExistingProject, FileAction, NewProject, ShellAction } from "@repo/common/types";
import type { WebContainer } from "@webcontainer/api";
import { Message } from 'ai/react';
import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import useFetch from "./useFetch";

export function useInitProject(
    setMessages: (messages: Message[] | ((messages: Message[]) => Message[])) => void,
    reload: () => Promise<string | null | undefined>
) {
    const [initializingProject, setInitializingProject] = useState(false);
    const { authenticatedFetch } = useFetch();
    const { webContainer, setWebContainer } = usePreviewStore(
        useShallow(state => ({
            webContainer: state.webContainer,
            setWebContainer: state.setWebContainer
        }))
    );
    const { setSelectedFile, updateProjectFiles } = useFilesStore(
        useShallow(state => ({
            updateProjectFiles: state.updateProjectFiles,
            setSelectedFile: state.setSelectedFile,
        }))
    );
    const { refreshProjects,
        addAction,
        upsertMessage,
        setCurrentMessageId,
        setRefreshProjects,
    } = useProjectStore(
        useShallow(state => ({
            refreshProjects: state.refreshProjects,
            setRefreshProjects: state.setRefreshProjects,
            addAction: state.addAction,
            upsertMessage: state.upsertMessage,
            setCurrentMessageId: state.setCurrentMessageId,
        }))
    );
    async function initializeProject(projectId: string) {
        let container = webContainer;
        try {
            setInitializingProject(true);
            if (!container) {
                container = await getWebContainer();
                setWebContainer(container);
            }
            const result = await authenticatedFetch(`${API_URL}/api/project/${projectId}`);
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
            setCurrentMessageId(currentMessageId);
            const { artifact, currentActions } = getImportArtifact(messages);
            upsertMessage({
                id: currentMessageId,
                role: 'assistant',
                timestamp: Date.now(),
                content: JSON.stringify({ artifact: artifact })
            });
            await mountFiles(projectFiles, container);
            updateProjectFiles(projectFiles.map(file => ({
                type: 'file',
                ...file,
            })));
            setSelectedFile(projectFiles[0]?.filePath ?? '');
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
        } catch (error) {
            if (error instanceof Error && error.message.includes("Project has not been initialized")) {
                try {
                    // Call the generate endpoint
                    if (!container) throw new Error("WebContainer not initialized");
                    await initializeNewProject(projectId, container);
                } catch (genError) {
                    customToast(genError instanceof Error
                        ? genError.message
                        : "Something went wrong while generating project"
                    );
                }
            } else {
                const errorMessage = error instanceof Error ? error.message : "Error while initializing project";
                customToast(errorMessage);
            }
        } finally {
            setInitializingProject(false);
            setRefreshProjects(!refreshProjects);
        }
    }

    async function initializeNewProject(projectId: string, container: WebContainer) {
        const result = await authenticatedFetch(`${API_URL}/api/project/${projectId}/generate`, {
            method: 'POST'
        });

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
        upsertMessage({
            id: crypto.randomUUID(),
            role: 'data',
            content: templatePrompt,
            timestamp: Date.now()
        });
        // Add files to project store
        updateProjectFiles(templateFiles.map(file => ({
            id: crypto.randomUUID(),
            type: 'file',
            timestamp: Date.now(),
            ...file,
        })));
        await mountFiles(templateFiles, container);
        setCurrentMessageId(crypto.randomUUID());
        reload();
    }
    return { initializeProject, initializingProject }
}