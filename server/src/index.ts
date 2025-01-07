import type { GenerateContentStreamResult } from "@google/generative-ai";
import { chatSchema, promptSchema } from "@repo/common/zod";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { STARTER_TEMPLATES } from "./constants";
import { sseMiddleware } from "./middlewares/sseMiddleware";
import { enhancerPrompt } from "./prompts/enhancerPrompt";
import { getTemplates, parseSelectedTemplate, starterTemplateSelectionPrompt } from "./prompts/starterTemplateSelection";
import { getSystemPrompt } from "./prompts/systemPrompt";
import { callLLM } from "./utils/callLLM";
import prisma from "@repo/db/client";
dotenv.config();

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
    const enhancedPrompt = await callLLM({
      type: "regular",
      prompt: enhancerPrompt(prompt)
    }) as string;

    // Select the template
    const templateXML = await callLLM({
      type: "regular",
      prompt: enhancedPrompt,
      systemPrompt: starterTemplateSelectionPrompt(STARTER_TEMPLATES)
    }) as string;

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
        const { assistantMessage, userMessage } = temResp;
        res.json({
          projectId: newProject.id,
          enhancedPrompt,
          assistantMessage,
          userMessage
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
    const result = await callLLM({
      type: "stream",
      messages: messages,
      systemPrompt: getSystemPrompt()
    }) as GenerateContentStreamResult;

    let buffer = ""; // Buffer to accumulate chunks
    let interval = 100; // Send data every 100ms
    // Set an interval to send data every 100ms
    const sendInterval = setInterval(() => {
      if (buffer.trim() !== "") {
        res.write(`data: ${JSON.stringify({ chunk: buffer })}\n\n`); // Send accumulated data
        buffer = ""; // Clear buffer after sending
      }
    }, interval);

    for await (const chunk of result.stream) {
      const chunkText = chunk.text ? chunk.text() : ""; // Get chunk text safely
      // Accumulate the chunk in the buffer
      buffer += chunkText;
    }
    // Clear the interval when the stream ends
    clearInterval(sendInterval);

    // Ensure no leftover data after stream ends
    if (buffer.trim() !== "") {
      res.write(`data: ${JSON.stringify({ chunk: buffer })}\n\n`);
    }
    res.end();
  } catch (error) {
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
