import { requireAuth } from '@clerk/express';
import { promptSchema } from "@repo/common/zod";
import prisma from "@repo/db/client";
import { generateText } from "ai";
import express from "express";
import { STARTER_TEMPLATES } from "../constants";
import { enhancerPrompt } from "../prompts/enhancerPrompt";
import { parseSelectedTemplate, starterTemplateSelectionPrompt } from "../prompts/starterTemplateSelection";
import { selectorModel } from "../providers";
import { createProject, getProject, getTemplateData } from "../services/projectService";

const router = express.Router();

router.post('/new', requireAuth(), async (req, res) => {
    const validation = promptSchema.safeParse(req.body);
    if (!validation.success) {
        res.status(400).json({
            msg: validation.error.errors[0].message,
        });
        return;
    }
    const { prompt } = validation.data;
    try {
        const newProject = await createProject(prompt, req.user?.id!);
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
            throw new Error("Project not found");
        }
        // If the project has only one message and it's from the user
        if (project.messages.length === 1 && project.messages[0].role === 'user') {
            // Enhance the prompt
            const { text: enhancedPrompt } = await generateText({
                model: selectorModel,
                system: enhancerPrompt(),
                prompt: project.name
            });
            // Select the template
            const { text: templateXML } = await generateText({
                model: selectorModel,
                system: starterTemplateSelectionPrompt(STARTER_TEMPLATES),
                prompt: enhancedPrompt
            });

            const templateName = parseSelectedTemplate(templateXML);
            // Indicates that LLM hasn't generated any template name. It doesn't happen mostly. 
            if (!templateName) {
                throw new Error("Error occurred while identifying a template");
            }
            // Get the template data
            const templateData = await getTemplateData(templateName);

            if (project.files.length === 0) {
                // Save the files to the project
                await prisma.file.createMany({
                    data: templateData.templateFiles.map(file => ({
                        projectId: project.id,
                        filePath: file.filePath,
                        content: file.content
                    }))
                });
            }

            res.json({
                type: 'new',
                enhancedPrompt,
                ...templateData
            });
        } else {
            res.json({
                type: 'existing',
                messages: project.messages,
                projectFiles: project.files
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({
            msg: error instanceof Error ? error.message : "Failed to generate template",
        });
    }
});

router.get('/projects', requireAuth(), async (req, res) => {
    const { page = '0', limit = '10' } = req.query;
    if (isNaN(Number(page)) || isNaN(Number(limit))) {
        res.status(400).json({
            msg: "Invalid page or limit",
        });
        return;
    }
    try {
        const projects = await prisma.project.findMany({
            where: {
                userId: req.user?.id!
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
        res.json(projects);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            msg: "Failed to get projects",
        });
    }
});

export default router;