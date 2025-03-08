import useFetch from "@/hooks/useFetch";
import { API_URL } from "@/lib/constants";
import { customToast } from "@/lib/utils";
import { useProjectStore } from "@/store/projectStore";
import { PromptSchema } from "@repo/common/zod";
import { useState } from "react";
import { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router";
import { useShallow } from "zustand/react/shallow";
import { ChatInput } from "./ChatInput";

export function PromptInput() {
    const navigate = useNavigate();
    const { upsertMessage } = useProjectStore(
        useShallow(state => ({
            upsertMessage: state.upsertMessage,
        }))
    );
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { authenticatedFetch } = useFetch();

    async function handleSubmit() {
        try {
            setIsLoading(true);
            const data = await authenticatedFetch(`${API_URL}/api/new`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ prompt: input } as PromptSchema)
            });
            upsertMessage({
                id: crypto.randomUUID(),
                role: 'user',
                timestamp: Date.now(),
                content: input
            });
            navigate(`/project/${data.projectId}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Error while getting files"
            customToast(errorMessage)
        } finally {
            setIsLoading(false);
        }
    }
    return (
        <div className="relative flex flex-col w-full">
            <Toaster />
            <ChatInput
                placeholder="Type a prompt ..."
                handleSubmit={handleSubmit}
                input={input}
                setInput={setInput}
                isLoading={isLoading}
            />
        </div>
    )
}