import { z } from "zod";

export const promptSchema = z.object({
    prompt: z.string().min(2, "Please provide some prompt")
});
export const messageSchema = z.object({
    id: z.string(),
    role: z.enum(["user", "assistant"]),
    content: z.string(),
    rawContent: z.string().optional(),
});
export const chatSchema = z.object({
    projectId: z.string(),
    reasoning: z.boolean(),
    messages: z.array(messageSchema)
});
export const saveFileSchema = z.object({
    projectId: z.string(),
    files: z.array(z.object({
        filePath: z.string(),
        content: z.string()
    }))
});
export type PromptSchema = z.infer<typeof promptSchema>;