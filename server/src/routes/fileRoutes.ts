import { saveFileSchema } from '@repo/common/zod';
import prisma from '@repo/db/client';
import express, { Request, Response } from 'express';
import { validateProjectOwnership } from '../services/projectService';
import { ensureUserExists } from '../middleware/ensureUser';

const router = express.Router();
// Owner can only save files
router.post('/saveFiles', ensureUserExists, async (req: Request, res: Response) => {
    const validation = saveFileSchema.safeParse(req.body);
    if (!validation.success) {
        res.status(400).json({
            msg: validation.error.errors[0].message,
        });
        return;
    }
    const { projectId, files } = validation.data;
    try {
        await validateProjectOwnership(projectId, req.auth.userId!);
        await prisma.$transaction(
            files.map(file =>
                prisma.file.upsert({
                    where: {
                        projectId_filePath: {
                            projectId,
                            filePath: file.filePath
                        }
                    },
                    update: {
                        content: file.content,
                        timestamp: new Date()
                    },
                    create: {
                        projectId,
                        filePath: file.filePath,
                        content: file.content
                    }
                })
            )
        );
        res.status(201).json({
            msg: "File saved successfully",
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            msg: error instanceof Error ? error.message : "Failed to save files",
        });
    }
});

export default router;