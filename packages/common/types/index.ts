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
    path: string;
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
export interface ArtifactCallbackData extends BoltArtifactData {
    messageId: string;
}
export interface ActionCallbackData {
    artifactId: string;
    messageId: string;
    actionId: string;
    action: BoltAction;
}
export type ArtifactCallback = (data: ArtifactCallbackData) => void;
export type ActionCallback = (data: ActionCallbackData) => void;
export interface ParserCallbacks {
    onArtifactOpen?: ArtifactCallback;
    onArtifactClose?: ArtifactCallback;
    onActionOpen?: ActionCallback;
    onActionClose?: ActionCallback;
}
export interface StreamingMessageParserOptions {
    callbacks?: ParserCallbacks;
}
export interface MessageState {
    position: number;
    insideArtifact: boolean;
    insideAction: boolean;
    currentArtifact?: BoltArtifactData;
    currentAction: BoltActionData;
    actionId: number;
}

