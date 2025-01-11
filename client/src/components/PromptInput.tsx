import { API_URL } from "@/lib/constants";
import { PromptSchema } from "@repo/common/zod";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import { Input } from "./Input";

export function PromptInput() {
    const navigate = useNavigate();

    async function handleSubmit(input: string) {
        try {
            const response = await fetch(`${API_URL}/api/template`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ prompt: input } as PromptSchema)
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.msg);
            }
            navigate(`/project/${result.projectId}`, {
                state: {
                    enhancedPrompt: result.enhancedPrompt,
                    templateFiles: result.templateFiles,
                    templatePrompt: result.templatePrompt
                }
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Error while getting files"
            toast.error(errorMessage)
        }
    }
    return (
        <div className="relative flex flex-col w-full md:w-1/2">
            <Input placeholder="Type a prompt" handleSubmit={handleSubmit} />
        </div>
    )
}
