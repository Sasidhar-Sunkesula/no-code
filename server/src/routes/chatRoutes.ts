import { Artifact } from "@repo/common/types";
import { chatSchema } from "@repo/common/zod";
import prisma from "@repo/db/client";
import { smoothStream, streamText } from "ai";
import { parse } from "best-effort-json-parser";
import express from "express";
import { MAX_TOKENS } from "../constants";
import { ensureUserExists } from "../middleware/ensureUser";
import { resetLimits } from "../middleware/resetLimits";
import { getSystemPrompt } from "../prompts/systemPrompt";
import { google2FlashModel } from "../providers";
import { validateProjectOwnership } from "../services/projectService";
import { checkLimits, updateSubscription } from "../services/subscriptionService";
import { ApplicationError, getDaysBetweenDates } from "../utils";

const router = express.Router();

router.post('/chat', ensureUserExists, resetLimits, async (req, res) => {
    const validation = chatSchema.safeParse(req.body);
    if (!validation.success) {
        res.status(400).json({
            msg: validation.error.errors[0].message,
        });
        return;
    }
    if (!req.plan) {
        res.status(403).json({ msg: "Unable to get token limits for the user" });
        return;
    }
    const { messages, projectId } = validation.data;
    try {
        // Validate ownership
        await validateProjectOwnership(projectId, req.auth.userId!);
        // Check the limits
        const limitsCheck = checkLimits(req.plan);

        if (!limitsCheck.success) {
            throw new ApplicationError(
                limitsCheck.message ?? "You have reached your token limit",
                'TOKEN_LIMIT_EXCEEDED'
            );
        }
        const result = streamText({
            model: google2FlashModel,
            system: getSystemPrompt(),
            messages: messages,
            experimental_transform: smoothStream(),
            maxTokens: MAX_TOKENS,
            async onFinish({ text, finishReason, usage, response, reasoning }) {
                try {
                    // Update token usage and check limits
                    req.plan!.dailyTokensUsed += usage.totalTokens;
                    req.plan!.monthlyTokensUsed += usage.totalTokens;
                    console.log(req.plan);
                    await updateSubscription(req.plan!);
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
                                tokensUsed: usage.totalTokens,
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
    } catch (error) {
        console.log(error);
        if (error instanceof ApplicationError && error.code === 'TOKEN_LIMIT_EXCEEDED') {
            res.status(402).json({ msg: error.message });
            return;
        }
        res.status(500).json({
            msg: error instanceof Error ? error.message : "Failed to generate chat"
        });
    }
});

router.get('/subscription', resetLimits, async (req, res) => {

    if (!req.plan) {
        res.status(403).json({ msg: "Unable to get token limits for the user" });
        return;
    }
    const { dailyTokensUsed,
        dailyTokenLimit,
        monthlyTokensUsed,
        monthlyTokenLimit,
        endDate,
        planType,
        startDate
    } = req.plan;
    // Calculate peak usage
    const peakUsage = Math.max(dailyTokensUsed, monthlyTokensUsed);
    // Calculate daily average
    const totalDaysElapsed = getDaysBetweenDates(startDate, new Date());
    const dailyAverage = totalDaysElapsed > 0 ? monthlyTokensUsed / totalDaysElapsed : 0;

    res.json({
        plan: planType,
        startDate: startDate,
        endDate: endDate,
        tokenUsage: {
            daily: {
                used: dailyTokensUsed,
                limit: dailyTokenLimit,
                percentage: (dailyTokensUsed / dailyTokenLimit) * 100,
            },
            monthly: {
                used: monthlyTokensUsed,
                limit: monthlyTokenLimit,
                percentage: (monthlyTokensUsed / monthlyTokenLimit) * 100,
            }
        },
        peakUsage: peakUsage,
        dailyAverage: dailyAverage
    });
});

export default router;