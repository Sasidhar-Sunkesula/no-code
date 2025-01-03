import { z } from "zod";

export const promptSchema = z.object({
    prompt: z.string().min(3, "Please provide some prompt")
});
export const messagesSchema = z.array(z.object({
    role: z.enum(["user", "model"]),
    parts: z.array(z.object({ text: z.string() }))
}))
export const chatSchema = z.object({
    messages: messagesSchema
});
export type ChatMessages = z.infer<typeof messagesSchema>;
export type PromptSchema = z.infer<typeof promptSchema>;
export type ChatSchema = z.infer<typeof chatSchema>;