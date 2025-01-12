import { API_URL } from "@/lib/constants";
import { StreamingMessageParser } from "@/lib/StreamingMessageParser";
import { projectFilesMsg, projectInstructionsMsg } from "@/lib/utils";
import { File } from "@repo/common/types";
import { ChatMessage } from "@repo/common/zod";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { SSE } from "sse.js";

const messageParser = new StreamingMessageParser({
    callbacks: {
        onArtifactOpen: (data) => {
            console.log("onArtifactOpen", data)
        },
        onArtifactClose: (data) => {
            console.log("onArtifactClose", data)
        },
        onActionOpen: (data) => {
            console.log(data)
        },
        onActionClose: (data) => {
            console.log("onActionClose", data)
        },
    },
});

export function useChat(args: {
    projectId: string | undefined,
    templateFiles: File[],
    templatePrompt: string,
    enhancedPrompt: string
}) {
    const { projectId, enhancedPrompt, templateFiles, templatePrompt } = args;
    const [loading, setLoading] = useState(true);
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'user', content: projectFilesMsg(templateFiles) },
        { role: 'user', content: templatePrompt },
        { role: 'user', content: projectInstructionsMsg(enhancedPrompt) }
    ]);
    const rawResponse = useRef("");

    useEffect(() => {
        let source: SSE | null = null;
        let buffer = "";

        function streamCode() {
            source = new SSE(`${API_URL}/api/chat`, {
                headers: { "Content-Type": "application/json" },
                payload: JSON.stringify({ messages: messages }),
            });

            if (!source) {
                toast.error("Failed to establish connection with the server.");
                setLoading(false);
                return;
            }

            source.onmessage = (event) => {
                const data = event.data;
                if (data.trim() !== "") {
                    const { chunk } = JSON.parse(data);
                    buffer += chunk;

                    if (loading) {
                        setLoading(false);
                    }
                    rawResponse.current += buffer;
                    messageParser.parse("1234", buffer);
                }
            };

            source.onerror = () => {
                toast.error("An error occurred while streaming code.");
                setLoading(false);
                source?.close();
            };
        }

        if (projectId) streamCode();

        return () => {
            if (source) source.close();
        };
    }, [messages]);

    return {
        loading,
        rawResponse,
        setMessages
    }
}