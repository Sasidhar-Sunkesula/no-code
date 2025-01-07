export type File = {
    path: string,
    content: string
};
export type ParsedXML = {
    projectTitle: string,
    files: File[]
}
export type Folders = {
    type: "folder" | "file",
    name: string,
    children?: Folders[],
    content?: string
}
export type HeadersInit = [string, string][] | Record<string, string> | Headers;
export type ActionType = 'file' | 'shell';
export interface BaseAction {
    content: string;
}
export interface FileAction extends BaseAction {
    type: 'file';
    filePath: string;
}
export interface ShellAction extends BaseAction {
    type: 'shell';
}
export type BoltAction = FileAction | ShellAction;

export type BoltActionData = BoltAction | BaseAction;
export interface BoltArtifactData {
    id: string;
    title: string;
}