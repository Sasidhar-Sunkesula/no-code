import { TabsSwitch } from "@/components/TabsSwitch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Workbench } from "@/components/Workbench";
import { useInitProject } from "@/hooks/useInitProject";
import { useMessageParser } from "@/hooks/useMessageParser";
import { API_URL } from "@/lib/constants";
import { constructMessages, startShell } from "@/lib/runtime";
import { useGeneralStore } from "@/store/generalStore";
import { useProjectStore } from "@/store/projectStore";
import { useChat } from 'ai/react';
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useParams } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";

export default function ProjectInfo() {
    const params = useParams();
    const { webContainerInstance,
        terminal,
        setShellProcess,
    } = useGeneralStore(
        useShallow(state => ({
            webContainerInstance: state.webContainerInstance,
            terminal: state.terminal,
            setShellProcess: state.setShellProcess,
        }))
    );
    const { messageHistory,
        projectFiles,
        currentMessageId,
        ignorePatterns,
        upsertMessage,
        setCurrentMessageId,
    } = useProjectStore(
        useShallow(state => ({
            messageHistory: state.messageHistory,
            projectFiles: state.projectFiles,
            ignorePatterns: state.ignorePatterns,
            upsertMessage: state.upsertMessage,
            setCurrentMessageId: state.setCurrentMessageId,
            currentMessageId: state.currentMessageId
        }))
    );
    const { messages, input, setInput, handleInputChange, isLoading, stop, error, reload, setMessages } = useChat({
        api: `${API_URL}/api/chat`,
        body: {
            projectId: params.projectId
        },
        sendExtraMessageFields: true,
        experimental_throttle: 100,
        // onFinish: (message, { usage, finishReason }) => {
        // console.log('Finished streaming message:', message);
        // console.log('Token usage:', usage);
        // console.log('Finish reason:', finishReason);
        // },
        onError: error => {
            console.error('An error occurred:', error);
            toast.error('There was an error processing your request');
        }
    });

    const { initializeProject } = useInitProject(setMessages, reload);

    useEffect(() => {
        if (!params.projectId) return;
        initializeProject(params.projectId);
    }, [params.projectId]);

    useEffect(() => {
        async function initializeShell() {
            if (!webContainerInstance || !terminal) return;
            try {
                const process = await startShell(terminal, webContainerInstance);
                setShellProcess(process);
            } catch (error) {
                console.error('Failed to initialize shell:', error);
                setShellProcess(null);
            }
        }
        initializeShell();
    }, [webContainerInstance, terminal]);

    const handleNewMessage = useMessageParser();

    useEffect(() => {
        if (messages.length === 0) return;
        const recentMessage = messages.at(-1);
        if (recentMessage) {
            handleNewMessage(recentMessage);
        }
    }, [messages]);

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        upsertMessage({ id: crypto.randomUUID(), role: 'user', content: input, timestamp: Date.now() });
        if (!currentMessageId || !projectFiles.length) return;
        const newMessages = constructMessages(input, currentMessageId, projectFiles, messageHistory, ignorePatterns);
        setMessages(newMessages);
        reload();
        setCurrentMessageId(crypto.randomUUID());
        setInput('');
    }

    // if (isLoading) {
    //     return (
    //         <div className="min-h-screen w-full flex justify-center items-center">
    //             <Loader2 className="w-5 h-5 animate-spin" />
    //         </div>
    //     );
    // }
    return (
        <>
            <Toaster />
            <div className="w-full py-14 pl-12 pr-4 max-h-screen max-w-screen-2xl mx-auto grid grid-cols-12 gap-x-14">
                <div className="flex flex-col gap-y-5 col-span-4">
                    <Workbench />
                    {error && (
                        <>
                            <div>An error occurred.</div>
                            <Button type="button" onClick={() => reload()}>
                                Retry
                            </Button>
                        </>
                    )}
                    {isLoading && (
                        <div>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <Button
                                disabled={!isLoading}
                                type="button"
                                onClick={() => stop()}>
                                Stop
                            </Button>
                        </div>
                    )}
                    <Button onClick={() => reload()} disabled={isLoading}>Regenerate</Button>
                    <form onSubmit={handleSubmit}>
                        <Textarea
                            value={input}
                            placeholder="How can we refine it..."
                            onChange={handleInputChange}
                            // disabled={isLoading || error !== null}
                            disabled={isLoading}
                        />
                        <Button type="submit">Submit</Button>
                    </form>
                    {/* <Input placeholder="How can we refine it..." handleSubmit={handleSubmit} /> */}
                </div>
                <TabsSwitch />
            </div>
        </>
    );
}