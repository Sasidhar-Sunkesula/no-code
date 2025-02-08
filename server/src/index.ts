import { google } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { Artifact, Template } from '@repo/common/types';
import { chatSchema, promptSchema } from "@repo/common/zod";
import prisma from "@repo/db/client";
import {
  extractReasoningMiddleware,
  generateText,
  smoothStream,
  streamText,
  wrapLanguageModel
} from 'ai';
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { promises as fs } from 'fs';
import path from 'path';
import { MAX_TOKENS, STARTER_TEMPLATES } from "./constants";
import { enhancerPrompt } from "./prompts/enhancerPrompt";
import { getTemplates, parseSelectedTemplate, starterTemplateSelectionPrompt } from "./prompts/starterTemplateSelection";
import { getSystemPrompt } from "./prompts/systemPrompt";
dotenv.config();

const openaiOVH = createOpenAI({
  baseURL: "https://deepseek-r1-distill-llama-70b.endpoints.kepler.ai.cloud.ovh.net/api/openai_compat/v1",
  apiKey: process.env.OVH_API_KEY,
});

const openaiChutes = createOpenAI({
  baseURL: 'https://chutes-qwen-qwen2-5-72b-instruct.chutes.ai/v1',
  apiKey: process.env.CHUTES_API_KEY,
});

const openaiChutes2 = createOpenAI({
  baseURL: 'https://chutes-deepseek-ai-deepseek-r1-distill-llama-70b.chutes.ai/v1',
  apiKey: process.env.CHUTES_API_KEY,
});

const openaiChutes3 = createOpenAI({
  baseURL: 'https://chutes-unsloth-mistral-nemo-instruct-2407.chutes.ai/v1',
  apiKey: process.env.CHUTES_API_KEY,
});

const openaiOpenRouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

const openaiGROQ = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
});

const openaiTargon = createOpenAI({
  baseURL: 'https://api.targon.com/v1',
  apiKey: process.env.TARGON_API_KEY,
});

const google2FlashModel = google('gemini-2.0-flash-001');
const queenVLPlusModel = openaiOpenRouter('qwen/qwen-vl-plus:free');
const queenModel = openaiChutes('Qwen/Qwen2.5-72B-Instruct');
const llamaModel = openaiGROQ('llama-3.3-70b-versatile');
const mistralModel = openaiChutes3('unsloth/Mistral-Nemo-Instruct-2407');

const ovhR1Model = openaiOVH('DeepSeek-R1-Distill-Llama-70B');
const chutesR1Model = openaiChutes2('deepseek-ai/DeepSeek-R1-Distill-Llama-70B');
const targonR1Model = openaiTargon('deepseek-ai/DeepSeek-R1-Distill-Llama-70B');

const coderModel = wrapLanguageModel({
  model: chutesR1Model,
  middleware: extractReasoningMiddleware({ tagName: 'think' }),
});

const app = express();
app.use(cors());
app.use(express.json({
  limit: '10MB'
}));

app.post('/api/new', async (req, res) => {
  const validation = promptSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      msg: validation.error.errors[0].message,
    });
    return;
  }
  const { prompt } = validation.data;
  try {
    const newProject = await prisma.project.create({
      data: {
        name: prompt,
        createdAt: new Date(),
        userId: "cm6v8wm2v0000jcdbyeckox9d",
        messages: {
          create: {
            role: 'user',
            content: { text: prompt }
          }
        },
      }
    });
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

app.get('/api/project/:projectId', async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.projectId },
      include: {
        files: true,
        messages: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    if (!project) {
      throw new Error("Project not found");
    }
    // If the project has only one message and it's from the user
    if (project.messages.length === 1 && project.messages[0].role === 'user') {
      // Enhance the prompt
      const { text: enhancedPrompt } = await generateText({
        model: llamaModel,
        system: enhancerPrompt(),
        prompt: project.name
      });
      // Select the template
      const { text: templateXML } = await generateText({
        model: llamaModel,
        system: starterTemplateSelectionPrompt(STARTER_TEMPLATES),
        prompt: enhancedPrompt
      });

      const templateName = parseSelectedTemplate(templateXML);
      // Indicates that LLM hasn't generated any template name. It doesn't happen mostly. 
      if (!templateName) {
        throw new Error("Error occurred while identifying a template");
      }
      // Check if the template is cached
      const templatePath = path.join(__dirname, 'cache', `${templateName}.json`);
      // Try to read from cache first
      const templateData: Template = await fs.access(templatePath)
        .then(() => fs.readFile(templatePath, 'utf8'))
        .then(data => JSON.parse(data))
        .catch(async () => {
          // If cache read fails, fetch from GitHub
          const temResp = await getTemplates(templateName);
          if (!temResp) {
            throw new Error("Unable to initialize the project. Please try again with a different prompt.");
          }
          return temResp;
        });

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

app.post('/api/chat', async (req, res) => {
  const validation = chatSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      msg: validation.error.errors[0].message,
    });
    return;
  }
  const { messages, projectId } = validation.data;
  const result = streamText({
    model: google2FlashModel,
    system: getSystemPrompt(),
    messages: messages,
    experimental_transform: smoothStream(),
    maxTokens: MAX_TOKENS,
    async onFinish({ text, finishReason, usage, response, reasoning }) {
      try {
        // Remove JSON markdown wrapper and parse
        const jsonContent = text.slice('```json\n'.length, -3);
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
        const { actions } = JSON.parse(jsonContent) as Artifact;
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
  result.pipeDataStreamToResponse(res);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
