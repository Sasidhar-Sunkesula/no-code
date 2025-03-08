export type File = {
    filePath: string,
    content: string
};
export type Folders = {
    type: "folder" | "file",
    name: string,
    filePath?: string,
    children?: Folders[],
    content?: string
};
export type HeadersInit = [string, string][] | Record<string, string> | Headers;
export type ActionType = 'file' | 'shell';
export type Role = 'user' | 'assistant' | 'data';
export type MessageHistory = {
    id: string;
    timestamp: number;
    role: Role;
    reasoning?: string;
    rawContent?: string;
    content: string;
}
export type BaseAction = {
    id: string;
    timestamp: number;
}
export type FileAction = BaseAction & {
    type: 'file';
    filePath: string;
    content: string;
}
export type ShellAction = BaseAction & {
    type: 'shell';
    command: string;
}
export type FileState = "creating" | "created" | "updating" | "updated";
export type ShellState = "queued" | "running" | "completed" | "error";
export type FileActionState = BaseAction & {
    type: 'file';
    filePath: string;
    state: FileState;
}
export type ShellActionState = BaseAction & {
    type: 'shell';
    command: string;
    state: ShellState;
}
export type ActionState = FileActionState | ShellActionState;
// This is the type of the actions array in the project store
export type Actions = (FileAction | ShellAction)[];
export interface Template {
    templateFiles: (File & { name: string })[];
    ignorePatterns: string[];
    templatePrompt: string;
}
export interface Artifact {
    id: string;
    title: string;
    initialContext: string;
    actions: (Pick<FileAction, 'type' | 'filePath' | 'content'> | Pick<ShellAction, 'type' | 'command'>)[]; // Actions with no id and timestamp
    endingContext: string;
}
export type ExistingProject = {
    projectFiles: (File & BaseAction)[]; // File with id and timestamp
    messages: {
        id: string;
        role: Exclude<Role, 'data'>;
        content: { text: string } | { artifact: Artifact };
        createdAt: string;
    }[];
}
export type NewProject = Template & {
    enhancedPrompt: string;
}
export interface ContentFile {
    file: {
        contents: string;
    };
}
export interface Directory {
    directory: Record<string, ContentFile | Directory>;
}
export interface Preview {
    id: string;
    port: number;
    ready: boolean;
    cwd: string;
    baseUrl: string;
}
export type Project = {
    id: string;
    name: string;
    createdAt: string;
}
export type PlanInfo = {
    subscriptionId: string;
    planType: string;
    dailyTokenLimit: number;
    monthlyTokenLimit: number;
    dailyTokensUsed: number;
    monthlyTokensUsed: number;
    dailyTokensReset: Date;
    monthlyTokensReset: Date;
    endDate: Date;
    startDate: Date;
}
export type SubscriptionUsage = {
    plan: 'free' | 'pro' | 'enterprise';
    startDate: string;
    endDate: string;
    tokenUsage: {
        daily: {
            used: number;
            limit: number;
            percentage: number;
        };
        monthly: {
            used: number;
            limit: number;
            percentage: number;
        };
    };
    peakUsage: number;
    dailyAverage: number;
};
export type Files = Record<string, ContentFile | Directory>;
export const cwd = 'project';
export const WORK_DIR = `/home/${cwd}`;

export function stripIndents(arg0: string | TemplateStringsArray, ...values: any[]) {
    if (typeof arg0 !== 'string') {
        const processedString = arg0.reduce((acc, curr, i) => {
            acc += curr + (values[i] ?? '');
            return acc;
        }, '');

        return _stripIndents(processedString);
    }

    return _stripIndents(arg0);
}

function _stripIndents(value: string) {
    return value
        .split('\n')
        .map((line) => line.trim())
        .join('\n')
        .trimStart()
        .replace(/[\r\n]$/, '');
}
