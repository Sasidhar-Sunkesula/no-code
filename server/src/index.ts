import { createOpenAI } from '@ai-sdk/openai';
import { chatSchema, promptSchema } from "@repo/common/zod";
import prisma from "@repo/db/client";
import { generateText, smoothStream, streamText } from 'ai';
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { MAX_TOKENS, STARTER_TEMPLATES } from "./constants";
import { sseMiddleware } from "./middlewares/sseMiddleware";
import { enhancerPrompt } from "./prompts/enhancerPrompt";
import { getTemplates, parseSelectedTemplate, starterTemplateSelectionPrompt } from "./prompts/starterTemplateSelection";
import { getSystemPrompt } from "./prompts/systemPrompt";
dotenv.config();

const openai = createOpenAI({
  baseURL: "https://api-inference.huggingface.co/v1"
});

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/template", async (req, res) => {
  const validation = promptSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      msg: validation.error.errors[0].message,
    });
    return;
  }
  const { prompt } = validation.data;

  try {
    // Enhance the prompt
    const { text: enhancedPrompt } = await generateText({
      model: openai('Qwen/Qwen2.5-Coder-32B-Instruct'),
      system: enhancerPrompt(),
      prompt: prompt
    });

    // Select the template
    const { text: templateXML } = await generateText({
      model: openai('Qwen/Qwen2.5-Coder-32B-Instruct'),
      system: starterTemplateSelectionPrompt(STARTER_TEMPLATES),
      prompt: enhancedPrompt
    });

    const templateName = parseSelectedTemplate(templateXML);
    if (!templateName) {
      // Indicates that LLM hasn't generated any template name. It doesn't happen mostly. 
      throw new Error("Error occurred while identifying a template");
    }
    const newProject = await prisma.project.create({
      data: {
        name: prompt,
        status: "NEW",
        userId: "cm59k02420000ff6m7t1a7ret"
      }
    });
    if (templateName !== "blank") {
      const temResp = await getTemplates(templateName);
      if (temResp) {
        const { templateFiles, templatePrompt } = temResp;
        res.json({
          projectId: newProject.id,
          enhancedPrompt,
          templateFiles,
          templatePrompt
        });
        return;
      }
    } else {
      res.json({
        projectId: newProject.id,
        projectName: newProject.name,
        enhancedPrompt
      });
      return;
    }
  } catch (error) {
    res.status(500).json({
      msg:
        error instanceof Error ? error.message : "Failed to generate template",
    });
  }
});

app.post("/api/chat", sseMiddleware, async (req, res) => {
  const validation = chatSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      msg: validation.error.errors[0].message,
    });
    return;
  }
  const { messages } = validation.data;
  try {
    const result = streamText({
      model: openai('Qwen/Qwen2.5-Coder-32B-Instruct'),
      system: getSystemPrompt(),
      messages: messages,
      experimental_transform: smoothStream(),
      maxTokens: MAX_TOKENS
      // onFinish({ text, finishReason, usage, response }) {
      // your own logic, e.g. for saving the chat history or recording usage
      // const messages = response.messages; // messages that were generated
    });

    for await (const chunk of result.textStream) {
      // Accumulate the chunk in the buffer
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }
    res.end();
  } catch (error) {
    console.error("Failed to process chat", error);
    res.write(
      `data: ${JSON.stringify({ error: "Failed to process chat" })}\n\n`
    );
    res.end();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
