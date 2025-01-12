import { z } from "zod";

export const promptSchema = z.object({
    prompt: z.string().min(3, "Please provide some prompt")
});
export const messageSchema = z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string()
});
export const chatSchema = z.object({
    messages: z.array(messageSchema)
});
export type ChatMessage = z.infer<typeof messageSchema>;
export type PromptSchema = z.infer<typeof promptSchema>;
export type ChatSchema = z.infer<typeof chatSchema>;