import { ChatMessages, ChatSchema } from "@repo/common/zod";
import { baseModelConfig, genAIInstance } from "../constants";

type CallLLMParams =
    { type: "regular"; systemPrompt?: string; prompt: string; messages?: undefined }
    | { type: "stream"; systemPrompt?: string; prompt?: undefined; messages: ChatMessages };

export async function callLLM(params: CallLLMParams) {
    const { type, systemPrompt, prompt, messages } = params;
    const model = genAIInstance().getGenerativeModel({
        ...baseModelConfig,
        systemInstruction: systemPrompt
    });
    try {
        if (type === "regular" && prompt) {
            const result = await model.generateContent(prompt);
            return result.response.text();
        } else if (type === "stream" && messages) {
            const result = await model.generateContentStream({
                contents: messages
            });
            return result;
        } else {
            throw new Error("Invalid parameters for callLLM function");
        }
    } catch (error) {
        console.error("Error in callLLM:", error);
        throw error; // Re-throw the error to be handled by the caller
    }
}