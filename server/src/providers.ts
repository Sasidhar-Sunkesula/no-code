import { google, GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { extractReasoningMiddleware, wrapLanguageModel } from "ai";
import dotenv from "dotenv";
import { MAX_THINK_TOKENS } from "./constants";
dotenv.config();

type ModelConfig = {
  provider: "openai" | "groq";
  models: {
    name: string;
    think: boolean;
  }[];
  apiKey: string | undefined;
  baseURL: string;
};

// Centralized model configuration
const modelConfigs: Record<string, ModelConfig> = {
  groq: {
    provider: "groq",
    models: [
      { name: "deepseek-r1-distill-llama-70b", think: true },
      { name: "meta-llama/llama-4-maverick-17b-128e-instruct", think: false },
    ],
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  },
  chutes: {
    provider: "openai",
    models: [
      { name: "deepseek-ai/DeepSeek-V3-0324", think: false },
      { name: "deepseek-ai/DeepSeek-R1-0528", think: true },
      { name: "Qwen/Qwen3-235B-A22B", think: true },
      { name: "chutesai/Llama-4-Maverick-17B-128E-Instruct-FP8", think: false },
    ],
    apiKey: process.env.CHUTES_API_KEY,
    baseURL: "https://llm.chutes.ai/v1",
  },
  novita: {
    provider: "openai",
    models: [
      { name: "deepseek/deepseek-r1", think: true },
      { name: "deepseek/deepseek-v3-0324", think: false },
    ],
    apiKey: process.env.NOVITA_API_KEY,
    baseURL: "https://api.novita.ai/v3/openai",
  },
  cerebras: {
    provider: "openai",
    models: [{ name: "qwen-3-32b", think: true }],
    apiKey: process.env.CEREBRAS_API_KEY,
    baseURL: "https://api.cerebras.ai/v1",
  },
};

function getInstance(config: ModelConfig) {
  switch (config.provider) {
    case "openai":
      return createOpenAI({
        baseURL: config.baseURL,
        apiKey: config.apiKey,
      });
    case "groq":
      return createGroq({
        baseURL: config.baseURL,
        apiKey: config.apiKey,
      });
    default:
      throw new Error("Invalid provider");
  }
}

function getModel(key: keyof typeof modelConfigs, variantIndex: number) {
  const config = modelConfigs[key];
  const factory = getInstance(config);
  const model = config.models[variantIndex];
  if (model.think) {
    return wrapLanguageModel({
      model: factory(model.name),
      middleware: extractReasoningMiddleware({ tagName: "think" }),
    });
  }
  return factory(model.name);
}

// Refactored exports using generic getModel
export const selectorModel = getModel("groq", 1);
export const coderModel = getModel("chutes", 0);
export const googleReasoningModel = google("gemini-2.5-flash-preview-05-20", {
  useSearchGrounding: true,
  dynamicRetrievalConfig: {
    mode: "MODE_DYNAMIC",
  },
});
const googleReasoningThinkingConfig = {
  thinkingBudget: MAX_THINK_TOKENS,
  includeThoughts: true,
};
const googleNonReasoningThinkingConfig = {
  thinkingBudget: 0,
  includeThoughts: false,
};
export const getGoogleProviderOptions = (reasoning: boolean) => {
  const thinkingConfig = reasoning
    ? googleReasoningThinkingConfig
    : googleNonReasoningThinkingConfig;
  return {
    google: {
      thinkingConfig,
      responseModalities: ["TEXT"],
    } satisfies GoogleGenerativeAIProviderOptions,
  };
};
