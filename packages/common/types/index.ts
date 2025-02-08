export type File = {
    filePath: string,
    content: string
};
export type Folders = {
    type: "folder" | "file",
    name: string,
    children?: Folders[],
    content?: string
};
export type HeadersInit = [string, string][] | Record<string, string> | Headers;
export type ActionType = 'file' | 'shell';
export type MessageHistory = {
    id: string;
    timestamp: number;
    role: 'user' | 'assistant' | 'data';
    reasoning?: string;
    rawContent?: string;
    content: string;
}
export interface BaseAction {
    id: string;
    timestamp: number;
}
export interface FileAction extends BaseAction {
    type: 'file';
    filePath: string;
    content: string;
}
export interface ShellAction extends BaseAction {
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
    templateFiles: {
        name: string;
        filePath: string;
        content: string;
    }[];
    ignorePatterns: string[];
    templatePrompt: string;
}
export interface Artifact {
    id: string;
    title: string;
    initialContext: string;
    actions: Actions;
    endingContext: string;
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
