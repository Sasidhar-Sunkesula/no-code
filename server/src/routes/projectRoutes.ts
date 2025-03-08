import type { NewProject } from "@repo/common/types";
import { promptSchema } from "@repo/common/zod";
import prisma from "@repo/db/client";
import express, { Request, Response } from "express";
import { ensureUserExists } from "../middleware/ensureUser";
import { resetLimits } from "../middleware/resetLimits";
import { createProject, createProjectFiles, enhanceProjectPrompt, getProject, getTemplateData, selectTemplate } from "../services/projectService";
import { checkLimits, updateSubscription, updateTokenUsage } from "../services/subscriptionService";
import { ApplicationError } from "../utils";

const router = express.Router();

router.post('/new', async (req: Request, res: Response) => {
    const validation = promptSchema.safeParse(req.body);
    if (!validation.success) {
        res.status(400).json({
            msg: validation.error.errors[0].message,
        });
        return;
    }
    if (!req.auth.userId) {
        res.status(401).json({ msg: 'Unauthorized' });
        return;
    }
    const { prompt } = validation.data;
    try {
        const newProject = await createProject(prompt, req.auth.userId);
        res.json({
            projectId: newProject.id
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            msg: "Failed to create project",
        });
    }
});

// OPEN ROUTE: Anyone can access a project and its messages
router.get('/project/:projectId', async (req, res) => {
    try {
        const project = await getProject(req.params.projectId);

        if (!project) {
            res.status(404).json({ msg: "Project not found" });
            return;
        }
        if (project.state !== 'existing') {
            throw new Error("Project has not been initialized. Please generate a new project.");
        }

        res.json({
            messages: project.messages,
            projectFiles: project.files,
        });
    } catch (error) {
        res.status(500).json({
            msg: error instanceof Error ? error.message : "Failed to retrieve project"
        });
    }
});

// Route to generate a new project - requires auth + subscription
router.post('/project/:projectId/generate', ensureUserExists, resetLimits, async (req, res) => {
    const { projectId } = req.params;
    try {
        // Validate project state
        const project = await getProject(projectId);
        if (!project || project.messages.length === 0) {
            res.status(404).json({ msg: "Project not found" });
            return;
        }

        if (project.messages.length !== 1
            || project.messages[0].role !== 'user'
            || project.state === 'existing'
        ) {
            res.status(400).json({ msg: "Project already generated" });
            return;
        }

        if (!req.plan) {
            res.status(403).json({ msg: "Unable to get token limits for the user" });
            return;
        }
        // Check the limits
        const limitsCheck = checkLimits(req.plan);

        if (!limitsCheck.success) {
            throw new ApplicationError(
                limitsCheck.message ?? "You have reached your token limit",
                'TOKEN_LIMIT_EXCEEDED'
            );
        }

        // Step 1: Enhance the prompt
        const { enhancedPrompt, usage: enhanceUsage } = await enhanceProjectPrompt(project.name);

        // Update token usage and check limits
        req.plan.dailyTokensUsed += enhanceUsage.totalTokens;
        req.plan.monthlyTokensUsed += enhanceUsage.totalTokens;

        // Check the limits
        await updateTokenUsage(req.plan);

        // Step 2: Select appropriate template based on the enhanced prompt
        const { templateName, projectTitle, usage: templateUsage } = await selectTemplate(enhancedPrompt);

        // Update token usage and check limits
        req.plan.dailyTokensUsed += templateUsage.totalTokens;
        req.plan.monthlyTokensUsed += templateUsage.totalTokens;

        await updateTokenUsage(req.plan);

        // Step 3: Get template data and create project files
        const templateData = await getTemplateData(templateName);

        if (project.files.length === 0) {
            await createProjectFiles(project.id, templateData.templateFiles);
        }

        // Update the project with new title and state
        await prisma.project.update({
            where: { id: projectId },
            data: {
                state: 'inProgress',
                name: projectTitle ?? project.name.slice(0, 25),
            }
        });

        // Persist updated token usage
        await updateSubscription(req.plan);

        res.json({
            enhancedPrompt: enhancedPrompt,
            templateFiles: templateData.templateFiles,
            templatePrompt: templateData.templatePrompt,
            ignorePatterns: templateData.ignorePatterns
        } as NewProject);
    } catch (error) {
        console.error('Project generation failed:', error);

        if (error instanceof ApplicationError) {
            if (error.code === 'TOKEN_LIMIT_EXCEEDED') {
                res.status(402).json({ msg: error.message });
                return;
            }

            if (error.code === 'TEMPLATE_ERROR') {
                res.status(422).json({ msg: error.message });
                return;
            }
        }

        res.status(500).json({
            msg: error instanceof Error ? error.message : "Failed to generate template"
        });
    }
});

router.get('/projects', ensureUserExists, resetLimits, async (req, res) => {
    const { page = '0', limit = '10' } = req.query;
    if (isNaN(Number(page)) || isNaN(Number(limit))) {
        res.status(400).json({
            msg: "Invalid page or limit",
        });
        return;
    }
    if (!req.plan) {
        res.status(403).json({ msg: "Unable to get token limits for the user" });
        return;
    }
    try {
        const projects = await prisma.project.findMany({
            where: {
                userId: req.auth.userId!
            },
            select: {
                id: true,
                name: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: 'desc'
            },
            skip: Number(page) * Number(limit),
            take: Number(limit)
        });
        res.json({
            projects
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            msg: "Failed to get projects",
        });
    }
});

export default router;