import { GoogleGenerativeAI } from "@google/generative-ai";

export const MAX_TOKENS = 8192;
export const WORK_DIR_NAME = 'project';
export const WORK_DIR = `/home/${WORK_DIR_NAME}`;
export const MODIFICATIONS_TAG_NAME = 'bolt_file_modifications';
export const baseModelConfig = {
    model: "gemini-1.5-flash",
    generationConfig: {
        candidateCount: 1,
        maxOutputTokens: MAX_TOKENS,
    },
}
export const genAIInstance = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("Api key not found")
    }
    return new GoogleGenerativeAI(apiKey);
};
export interface StarterTemplate {
    name: string;
    label: string;
    description: string;
    githubRepo: string;
    tags: string[];
    icon?: string;
}
export const STARTER_TEMPLATES: StarterTemplate[] = [
    {
        name: 'bolt-nextjs-shadcn',
        label: 'Next.js with shadcn/ui',
        description: 'Next.js starter fullstack template integrated with shadcn/ui components and styling system',
        githubRepo: 'thecodacus/bolt-nextjs-shadcn-template',
        tags: ['nextjs', 'react', 'typescript', 'shadcn', 'tailwind'],
        icon: 'i-bolt:nextjs',
    },
    {
        name: 'bolt-vite-react',
        label: 'React + Vite + TypeScript',
        description: 'React starter template powered by Vite for fast development experience',
        githubRepo: 'thecodacus/bolt-vite-react-ts-template',
        tags: ['react', 'vite', 'frontend'],
        icon: 'i-bolt:react',
    },
    {
        name: 'bolt-node',
        label: 'Node.js',
        description: 'Node.js starter template with js',
        githubRepo: 'stackblitz/starters',
        tags: ['node', 'node.js', 'backend', 'express', 'javascript', 'simple script'],
    },
    {
        name: 'bolt-angular',
        label: 'Angular Starter',
        description: 'A modern Angular starter template with TypeScript support and best practices configuration',
        githubRepo: 'thecodacus/bolt-angular-template',
        tags: ['angular', 'typescript', 'frontend', 'spa'],
        icon: 'i-bolt:angular',
    },
    {
        name: 'bolt-vue',
        label: 'Vue.js',
        description: 'Vue.js starter template with modern tooling and best practices',
        githubRepo: 'thecodacus/bolt-vue-template',
        tags: ['vue', 'typescript', 'frontend'],
        icon: 'i-bolt:vue',
    },
    {
        name: 'bolt-remix-ts',
        label: 'Remix TypeScript',
        description: 'Remix framework starter with TypeScript for full-stack web applications',
        githubRepo: 'thecodacus/bolt-remix-ts-template',
        tags: ['remix', 'typescript', 'fullstack', 'react'],
        icon: 'i-bolt:remix',
    },
    {
        name: 'bolt-astro-basic',
        label: 'Astro Basic',
        description: 'Lightweight Astro starter template for building fast static websites',
        githubRepo: 'thecodacus/bolt-astro-basic-template',
        tags: ['astro', 'blog', 'performance'],
        icon: 'i-bolt:astro',
    },
    {
        name: 'bolt-sveltekit',
        label: 'SvelteKit',
        description: 'SvelteKit starter template for building fast, efficient web applications',
        githubRepo: 'bolt-sveltekit-template',
        tags: ['svelte', 'sveltekit', 'typescript'],
        icon: 'i-bolt:svelte',
    },
    {
        name: 'bolt-vite-ts',
        label: 'Vite + TypeScript',
        description: 'Vite starter template with TypeScript configuration for type-safe development',
        githubRepo: 'thecodacus/bolt-vite-ts-template',
        tags: ['vite', 'typescript', 'minimal'],
        icon: 'i-bolt:typescript',
    },
    {
        name: 'bolt-qwik-ts',
        label: 'Qwik TypeScript',
        description: 'Qwik framework starter with TypeScript for building resumable applications',
        githubRepo: 'thecodacus/bolt-qwik-ts-template',
        tags: ['qwik', 'typescript', 'performance', 'resumable'],
        icon: 'i-bolt:qwik',
    },
    {
        name: 'vanilla-vite',
        label: 'Vanilla + Vite',
        description: 'Minimal Vite starter template for vanilla JavaScript projects',
        githubRepo: 'thecodacus/vanilla-vite-template',
        tags: ['vite', 'vanilla-js', 'minimal'],
        icon: 'i-bolt:vite',
    },
    {
        name: 'bolt-slidev',
        label: 'Slidev Presentation',
        description: 'Slidev starter template for creating developer-friendly presentations using Markdown',
        githubRepo: 'thecodacus/bolt-slidev-template',
        tags: ['slidev', 'presentation', 'markdown'],
        icon: 'i-bolt:slidev',
    },
];
