export const MAX_TOKENS = 8192;
export const WORK_DIR_NAME = 'project';
export const WORK_DIR = `/home/${WORK_DIR_NAME}`;
export const MODIFICATIONS_TAG_NAME = 'bolt_file_modifications';
export const PORT = process.env.PORT || 3000;
export const modelConfig = {
    model: "gemini-1.5-flash",
    generationConfig: {
        candidateCount: 1,
        maxOutputTokens: MAX_TOKENS,
    },
}