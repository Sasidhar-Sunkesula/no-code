import { requireAuth } from "@clerk/express";
import { Artifact } from "@repo/common/types";
import { chatSchema } from "@repo/common/zod";
import prisma from "@repo/db/client";
import { smoothStream, streamText } from "ai";
import { parse } from "best-effort-json-parser";
import express from "express";
import { MAX_TOKENS } from "../constants";
import { getSystemPrompt } from "../prompts/systemPrompt";
import { google2FlashModel } from "../providers";
import { validateProjectOwnership } from "../services/projectService";
import { ensureUserExists } from "../middleware/ensureUser";

const router = express.Router();

router.post('/chat', ensureUserExists, async (req, res) => {
    const validation = chatSchema.safeParse(req.body);
    if (!validation.success) {
        res.status(400).json({
            msg: validation.error.errors[0].message,
        });
        return;
    }
    const { messages, projectId } = validation.data;
    // Validate ownership
    await validateProjectOwnership(projectId, req.auth.userId!);
    const result = streamText({
        model: google2FlashModel,
        system: getSystemPrompt(),
        messages: messages,
        experimental_transform: smoothStream(),
        maxTokens: MAX_TOKENS,
        async onFinish({ text, finishReason, usage, response, reasoning }) {
            try {
                // Remove JSON markdown wrapper and parse
                const jsonContent = parse(text.slice('```json\n'.length, -3)); // Parse the JSON string
                const currentMessage = messages.find(message => message.role === 'user' && message.id === 'currentMessage');
                await prisma.message.createMany({
                    data: [
                        ...(currentMessage ? [{
                            role: 'user' as const,
                            projectId: projectId,
                            createdAt: new Date(),
                            content: { text: currentMessage.rawContent ?? '' } // Wrap in object to make it valid JSON
                        }] : []),
                        {
                            role: 'assistant',
                            projectId: projectId,
                            createdAt: new Date(),
                            content: jsonContent
                        }
                    ]
                });
                // Update files
                const { actions } = jsonContent?.artifact as Artifact;
                const files = actions.filter(action => action.type === 'file');

                files.forEach(async file => {
                    await prisma.file.upsert({
                        where: {
                            // Unique identifier to find the record
                            projectId_filePath: {
                                projectId: projectId,
                                filePath: file.filePath
                            }
                        },
                        update: {
                            // Update these fields if record exists
                            content: file.content,
                            timestamp: new Date()
                        },
                        create: {
                            // Create new record with these fields if not found
                            projectId: projectId,
                            filePath: file.filePath,
                            content: file.content,
                            timestamp: new Date()
                        }
                    });
                });
            } catch (error) {
                console.error('Failed to parse JSON or saving messages', error);
                throw error;
            }
        }
    });
    return result.pipeDataStreamToResponse(res);
});

export default router;