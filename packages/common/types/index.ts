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
    type: 'existing';
    projectFiles: (File & BaseAction)[]; // File with id and timestamp
    messages: {
        id: string;
        role: Exclude<Role, 'data'>;
        content: { text: string } | { artifact: Artifact };
        createdAt: string;
    }[];
}
export type NewProject = Template & {
    type: 'new';
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
export type Files = Record<string, ContentFile | Directory>;
