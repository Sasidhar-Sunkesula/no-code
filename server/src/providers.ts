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
    model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
};
const googleModels = ['gemini-2.0-flash-001', 'gemini-2.5-pro-exp-03-25'];
const openaiNineteen: ModelConfig = {
    provider: 'openai',
    model: 'casperhansen/deepseek-r1-distill-qwen-32b-awq',
    apiKey: process.env.NINETEEN_API_KEY,
    baseURL: 'https://api.nineteen.ai/v1',
};
const openaiNovita: ModelConfig = {
    provider: 'openai',
    model: ['deepseek/deepseek-r1-turbo', 'deepseek/deepseek-v3-0324'],
    apiKey: process.env.NOVITA_API_KEY,
    baseURL: 'https://api.novita.ai/v3/openai',
};

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
export const coderModel = getInstance(openaiNovita)(openaiNovita.model[1]);
export const reasoningModel = wrapLanguageModel({
    model: getInstance(openaiNovita)(openaiNovita.model[0]),
    middleware: extractReasoningMiddleware({ tagName: 'think' }),
});