import { FileExplorer } from "@/components/FileExplorer";
import { buildHierarchy } from "@/lib/buildHierarchy";
import { API_URL } from "@/lib/constants";
import { parseXML } from "@/lib/parseXML";
import type { ParsedXML } from "@repo/common/types";
import { ChatMessages } from "@repo/common/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useLocation, useParams } from "react-router-dom";
import { SSE } from "sse.js";

export default function ProjectInfo() {
    const [loading, setLoading] = useState(true);
    const [parsedXML, setParsedXML] = useState<ParsedXML | null>(null);
    const { projectId } = useParams();
    const location = useLocation();
    const { enhancedPrompt, assistantMessage, userMessage } = location.state as {
        enhancedPrompt: string,
        assistantMessage: string,
        userMessage: string
    };

    useEffect(() => {
        let source: SSE | null = null;
        let buffer = "";
        let parseTimeout: NodeJS.Timeout | null = null;

        function streamCode() {
            const reqBody: ChatMessages = [
                { role: 'user', parts: [{ text: enhancedPrompt }] },
                { role: 'model', parts: [{ text: assistantMessage }] },
                { role: 'user', parts: [{ text: userMessage }] }
            ];

            source = new SSE(`${API_URL}/api/chat`, {
                headers: { "Content-Type": "application/json" },
                payload: JSON.stringify({ messages: reqBody })
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

                    // Clear any existing parse timeout
                    if (parseTimeout) {
                        clearTimeout(parseTimeout);
                    }
                    // Schedule parsing 1 seconds after the last message
                    parseTimeout = setTimeout(() => {
                        const parsed = parseXML(buffer);
                        if (parsed.files.length > 0 && parsed.files[0].content) {
                            setParsedXML(parsed);
                        }
                    }, 1000);
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
            if (parseTimeout) clearTimeout(parseTimeout);
        };
    }, []);

    if (loading || !parsedXML) {
        return (
            <div className="min-h-screen w-full flex justify-center items-center">
                <Loader2 className="w-5 h-5 animate-spin" />
            </div>
        );
    }

    return (
        <div>
            <Toaster />
            <FileExplorer folders={buildHierarchy(parsedXML.files)} />
        </div>
    );
}
