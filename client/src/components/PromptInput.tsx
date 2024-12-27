import { API_URL } from "@/lib/constants";
import { PromptSchema } from "@repo/common/zod";
import { CornerDownLeft } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Template } from "@repo/common/types";
import toast from "react-hot-toast";

export function PromptInput() {
    const [input, setInput] = useState("");
    const [template, setTemplate] = useState<Template | null>(null);
    async function handleSubmit() {
        const body: PromptSchema = { prompt: input };
        try {
            const response = await fetch(`${API_URL}/api/template`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.msg)
            }
            setTemplate(result);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Error while getting files"
            toast.error(errorMessage)
        }
    }
    return (
        <div className="relative flex flex-col w-full md:w-1/2">
            <Textarea
                className="relative"
                placeholder="Type your prompt here..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
            />
            <Button onClick={handleSubmit} size={"sm"} className="absolute bottom-2 right-2 flex items-center">
                Send
                <CornerDownLeft className="w-4 h-4" />
            </Button>
        </div>
    )
}