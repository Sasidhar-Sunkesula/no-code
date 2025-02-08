import { z } from "zod";

export const promptSchema = z.object({
    prompt: z.string().min(3, "Please provide some prompt")
});
export const messageSchema = z.object({
    id: z.string(),
    role: z.enum(["user", "assistant"]),
    content: z.string(),
    rawContent: z.string().optional(),
});
export const chatSchema = z.object({
    projectId: z.string(),
    messages: z.array(messageSchema)
});
export type PromptSchema = z.infer<typeof promptSchema>;