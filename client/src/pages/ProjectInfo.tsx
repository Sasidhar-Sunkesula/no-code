import { ChatInput } from "@/components/ChatInput";
import { TabsSwitch } from "@/components/TabsSwitch";
import { Workbench } from "@/components/Workbench";
import useFetch from "@/hooks/useFetch";
import { useInitProject } from "@/hooks/useInitProject";
import { useMessageParser } from "@/hooks/useMessageParser";
import { API_URL } from "@/lib/constants";
import { constructMessages, startShell } from "@/lib/runtime";
import { customToast } from "@/lib/utils";
import { useFilesStore } from "@/store/filesStore";
import { useGeneralStore } from "@/store/generalStore";
import { usePreviewStore } from "@/store/previewStore";
import { useProjectStore } from "@/store/projectStore";
import { useChat } from 'ai/react';
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { useParams } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";

export default function ProjectInfo() {
    const params = useParams();
    const { terminal, setShellProcess, reasoning } = useGeneralStore(
        useShallow(state => ({
            terminal: state.terminal,
            setShellProcess: state.setShellProcess,
            reasoning: state.reasoning
        }))
    );
    const { webContainer } = usePreviewStore(
        useShallow(state => ({
            webContainer: state.webContainer
        }))
    );
    const { customFetch } = useFetch();
    const { messageHistory,
        currentMessageId,
        refreshTokens,
        upsertMessage,
        setCurrentMessageId,
        setCurrentProjectId,
        setRefreshTokens
    } = useProjectStore(
        useShallow(state => ({
            messageHistory: state.messageHistory,
            currentMessageId: state.currentMessageId,
            refreshTokens: state.refreshTokens,
            upsertMessage: state.upsertMessage,
            setRefreshTokens: state.setRefreshTokens,
            setCurrentProjectId: state.setCurrentProjectId,
            setCurrentMessageId: state.setCurrentMessageId,
        }))
    );
    const { ignorePatterns, projectFiles } = useFilesStore(
        useShallow(state => ({
            projectFiles: state.projectFiles,
            ignorePatterns: state.ignorePatterns,
        }))
    );
    const { messages, input, setInput, error, isLoading, stop, reload, setMessages } = useChat({
        api: `${API_URL}/api/chat`,
        body: {
            projectId: params.projectId,
            reasoning
        },
        fetch: customFetch,
        sendExtraMessageFields: true,
        experimental_throttle: 100,
        onFinish: async (_, { finishReason }) => {
            if (finishReason !== 'stop') {
                customToast('An error occurred while processing your request. Please try again.');
                return;
            }
            setRefreshTokens(!refreshTokens);
        },
        onError: error => {
            customToast(JSON.parse(error.message)?.msg ??
                'An error occurred while processing your request. Please try again.'
            );
        }
    });

    const { initializeProject, initializingProject } = useInitProject(setMessages, reload);

    useEffect(() => {
        if (!params.projectId) return;
        setCurrentProjectId(params.projectId);
        initializeProject(params.projectId);
    }, [params.projectId]);

    useEffect(() => {
        async function initializeShell() {
            if (!webContainer || !terminal) return;
            try {
                const process = await startShell(terminal, webContainer);
                setShellProcess(process);
            } catch (error) {
                terminal.write('Failed to spawn shell\n\n' + (error as Error)?.message);
                setShellProcess(null);
            }
        }
        initializeShell();
    }, [webContainer, terminal]);

    const handleNewMessage = useMessageParser();

    useEffect(() => {
        if (messages.length === 0) return;
        const recentMessage = messages.at(-1);
        if (recentMessage) {
            handleNewMessage(recentMessage);
        }
    }, [messages]);

    function handleSubmit() {
        upsertMessage({ id: crypto.randomUUID(), role: 'user', content: input, timestamp: Date.now() });
        if (!currentMessageId || !projectFiles.length) return;
        const newMessages = constructMessages(input, currentMessageId, projectFiles, messageHistory, ignorePatterns);
        setMessages(newMessages);
        reload();
        setCurrentMessageId(crypto.randomUUID());
        setInput('');
    }

    return (
        <>
            <Toaster />
            <div className="w-full pr-2 pl-8 pt-2 max-h-screen max-w-screen-2xl mx-auto grid grid-cols-12 gap-x-14">
                {initializingProject ? (
                    <div className="flex col-span-12 h-full md:h-[90vh] items-center justify-center">
                        <Loader2 className="animate-spin size-5" />
                    </div>
                ) : (
                    <div className="flex flex-col gap-y-5 col-span-4">
                        <Workbench />
                        <div className="flex-1">
                            <ChatInput
                                placeholder="How can we refine it..."
                                handleSubmit={handleSubmit}
                                input={input}
                                setInput={setInput}
                                isLoading={isLoading}
                                reload={reload}
                                stop={stop}
                                error={error}
                            />
                        </div>
                    </div>
                )}
                <TabsSwitch initializingProject={initializingProject} />
            </div>
        </>
    );
}