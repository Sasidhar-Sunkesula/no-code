import { google } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { createOpenAI } from '@ai-sdk/openai';
import {
    extractReasoningMiddleware,
    wrapLanguageModel
} from 'ai';
import dotenv from "dotenv";
dotenv.config();

type ProviderType = 'openai' | 'google' | 'groq';
type ModelConfig = {
    provider: ProviderType,
    model: string | string[];
    apiKey: string | undefined;
    baseURL: string;
}
const openaiOvh: ModelConfig = {
    provider: 'openai',
    model: 'DeepSeek-R1-Distill-Llama-70B',
    apiKey: process.env.OVH_API_KEY,
    baseURL: "https://deepseek-r1-distill-llama-70b.endpoints.kepler.ai.cloud.ovh.net/api/openai_compat/v1",
};
const openaiGROQ: ModelConfig = {
    provider: 'groq',
    model: 'qwen-2.5-coder-32b',
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
};
const openaiNineteen: ModelConfig = {
    provider: 'openai',
    model: 'casperhansen/deepseek-r1-distill-qwen-32b-awq',
    apiKey: process.env.NINETEEN_API_KEY,
    baseURL: 'https://api.nineteen.ai/v1',
};

export const google2FlashModel = google('gemini-2.0-flash-001');

function getInstance(config: ModelConfig) {
    switch (config.provider) {
        case 'openai':
            return createOpenAI({
                baseURL: config.baseURL,
                apiKey: config.apiKey,
            });
        case 'groq':
            return createGroq({
                baseURL: config.baseURL,
                apiKey: config.apiKey,
            });
        default:
            throw new Error('Invalid provider');
    }
};
export const selectorModel = getInstance(openaiGROQ)(openaiGROQ.model as string);

export const coderModel = wrapLanguageModel({
    model: getInstance(openaiNineteen)(openaiNineteen.model as string),
    middleware: extractReasoningMiddleware({ tagName: 'think' }),
});