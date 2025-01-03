import { API_URL } from "@/lib/constants";
import type { BoltAction, BoltActionData, BoltArtifactData, FileAction, ParsedXML, ShellAction } from "@repo/common/types";
import { ChatMessages } from "@repo/common/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useLocation, useParams } from "react-router-dom";
import { SSE } from "sse.js";

const ARTIFACT_TAG_OPEN = '<boltArtifact';
const ARTIFACT_TAG_CLOSE = '</boltArtifact>';
const ARTIFACT_ACTION_TAG_OPEN = '<boltAction';
const ARTIFACT_ACTION_TAG_CLOSE = '</boltAction>';

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
interface ElementFactoryProps {
    messageId: string;
}

type ElementFactory = (props: ElementFactoryProps) => string;

export interface StreamingMessageParserOptions {
    callbacks?: ParserCallbacks;
    artifactElement?: ElementFactory;
}

interface MessageState {
    position: number;
    insideArtifact: boolean;
    insideAction: boolean;
    currentArtifact?: BoltArtifactData;
    currentAction: BoltActionData;
    actionId: number;
}

export class StreamingMessageParser {
    #messages = new Map<string, MessageState>();

    constructor(private _options: StreamingMessageParserOptions = {}) { }

    parse(messageId: string, input: string) {
        let state = this.#messages.get(messageId);

        if (!state) {
            state = {
                position: 0,
                insideAction: false,
                insideArtifact: false,
                currentAction: { content: '' },
                actionId: 0,
            };

            this.#messages.set(messageId, state);
        }

        let output = '';
        let i = state.position;
        let earlyBreak = false;

        while (i < input.length) {
            if (state.insideArtifact) {
                const currentArtifact = state.currentArtifact;

                if (currentArtifact === undefined) {
                    console.log('Artifact not initialized');
                }

                if (state.insideAction) {
                    const closeIndex = input.indexOf(ARTIFACT_ACTION_TAG_CLOSE, i);

                    const currentAction = state.currentAction;

                    if (closeIndex !== -1) {
                        currentAction.content += input.slice(i, closeIndex);

                        let content = currentAction.content.trim();

                        if ('type' in currentAction && currentAction.type === 'file') {
                            content += '\n';
                        }

                        currentAction.content = content;

                        this._options.callbacks?.onActionClose?.({
                            artifactId: currentArtifact.id,
                            messageId,

                            /**
                             * We decrement the id because it's been incremented already
                             * when `onActionOpen` was emitted to make sure the ids are
                             * the same.
                             */
                            actionId: String(state.actionId - 1),

                            action: currentAction as BoltAction,
                        });

                        state.insideAction = false;
                        state.currentAction = { content: '' };

                        i = closeIndex + ARTIFACT_ACTION_TAG_CLOSE.length;
                    } else {
                        break;
                    }
                } else {
                    const actionOpenIndex = input.indexOf(ARTIFACT_ACTION_TAG_OPEN, i);
                    const artifactCloseIndex = input.indexOf(ARTIFACT_TAG_CLOSE, i);

                    if (actionOpenIndex !== -1 && (artifactCloseIndex === -1 || actionOpenIndex < artifactCloseIndex)) {
                        const actionEndIndex = input.indexOf('>', actionOpenIndex);

                        if (actionEndIndex !== -1) {
                            state.insideAction = true;

                            state.currentAction = this.#parseActionTag(input, actionOpenIndex, actionEndIndex);

                            this._options.callbacks?.onActionOpen?.({
                                artifactId: currentArtifact.id,
                                messageId,
                                actionId: String(state.actionId++),
                                action: state.currentAction as BoltAction,
                            });

                            i = actionEndIndex + 1;
                        } else {
                            break;
                        }
                    } else if (artifactCloseIndex !== -1) {
                        this._options.callbacks?.onArtifactClose?.({ messageId, ...currentArtifact });

                        state.insideArtifact = false;
                        state.currentArtifact = undefined;

                        i = artifactCloseIndex + ARTIFACT_TAG_CLOSE.length;
                    } else {
                        break;
                    }
                }
            } else if (input[i] === '<' && input[i + 1] !== '/') {
                let j = i;
                let potentialTag = '';

                while (j < input.length && potentialTag.length < ARTIFACT_TAG_OPEN.length) {
                    potentialTag += input[j];

                    if (potentialTag === ARTIFACT_TAG_OPEN) {
                        const nextChar = input[j + 1];

                        if (nextChar && nextChar !== '>' && nextChar !== ' ') {
                            output += input.slice(i, j + 1);
                            i = j + 1;
                            break;
                        }

                        const openTagEnd = input.indexOf('>', j);

                        if (openTagEnd !== -1) {
                            const artifactTag = input.slice(i, openTagEnd + 1);

                            const artifactTitle = this.#extractAttribute(artifactTag, 'title') as string;
                            const artifactId = this.#extractAttribute(artifactTag, 'id') as string;

                            if (!artifactTitle) {
                                console.warn('Artifact title missing');
                            }

                            if (!artifactId) {
                                console.warn('Artifact id missing');
                            }

                            state.insideArtifact = true;

                            const currentArtifact = {
                                id: artifactId,
                                title: artifactTitle,
                            } satisfies BoltArtifactData;

                            state.currentArtifact = currentArtifact;

                            this._options.callbacks?.onArtifactOpen?.({ messageId, ...currentArtifact });

                            const artifactFactory = this._options.artifactElement ?? createArtifactElement;

                            output += artifactFactory({ messageId });

                            i = openTagEnd + 1;
                        } else {
                            earlyBreak = true;
                        }

                        break;
                    } else if (!ARTIFACT_TAG_OPEN.startsWith(potentialTag)) {
                        output += input.slice(i, j + 1);
                        i = j + 1;
                        break;
                    }

                    j++;
                }

                if (j === input.length && ARTIFACT_TAG_OPEN.startsWith(potentialTag)) {
                    break;
                }
            } else {
                output += input[i];
                i++;
            }

            if (earlyBreak) {
                break;
            }
        }

        state.position = i;

        return output;
    }

    reset() {
        this.#messages.clear();
    }

    #parseActionTag(input: string, actionOpenIndex: number, actionEndIndex: number) {
        const actionTag = input.slice(actionOpenIndex, actionEndIndex + 1);

        const actionType = this.#extractAttribute(actionTag, 'type') as ActionType;

        const actionAttributes = {
            type: actionType,
            content: '',
        };

        if (actionType === 'file') {
            const filePath = this.#extractAttribute(actionTag, 'filePath') as string;

            if (!filePath) {
                console.log('File path not specified');
            }

            (actionAttributes as FileAction).filePath = filePath;
        } else if (actionType !== 'shell') {
            console.warn(`Unknown action type '${actionType}'`);
        }

        return actionAttributes as FileAction | ShellAction;
    }

    #extractAttribute(tag: string, attributeName: string): string | undefined {
        const match = tag.match(new RegExp(`${attributeName}="([^"]*)"`, 'i'));
        return match ? match[1] : undefined;
    }
}


export default function ProjectInfo() {
    const [loading, setLoading] = useState(true);
    const [parsedXML, setParsedXML] = useState<ParsedXML>({
        projectTitle: "",
        files: []
    });
    const { projectId } = useParams();
    const location = useLocation();
    const { enhancedPrompt, assistantMessage, userMessage } = location.state as {
        enhancedPrompt: string,
        assistantMessage: string,
        userMessage: string
    };

    useEffect(() => {
        let source: SSE | null = null;
        function streamCode() {
            const reqBody: ChatMessages = [
                { role: 'user', parts: [{ text: enhancedPrompt }] },
                { role: 'model', parts: [{ text: assistantMessage }] },
                { role: 'user', parts: [{ text: userMessage }] }
            ];

            source = new SSE(`${API_URL}/api/chat`, {
                headers: { "Content-Type": "application/json" },
                payload: JSON.stringify({ messages: reqBody })
            });

            if (!source) {
                toast.error("Failed to establish connection with the server.");
                setLoading(false);
                return;
            }

            let buffer = "";
            let currentFilePath: string | null = null;
            let currentFileContent: string = "";

            source.onmessage = (event) => {
                const data = event.data;
                if (data.trim() !== "") {
                    const { chunk } = JSON.parse(data);
                    buffer += chunk;

                    if (loading) setLoading(false);

                    // Extract and set project title if not already set
                    if (!parsedXML.projectTitle) {
                        const titleMatch = buffer.match(/<boltArtifact id=".+?" title="(.+?)">/);
                        if (titleMatch) {
                            setParsedXML((prev) => ({
                                ...prev,
                                projectTitle: titleMatch[1],
                            }));
                        }
                    }

                    // Process the buffer incrementally
                    while (buffer) {
                        if (!currentFilePath) {
                            // Try to find the start of a new file
                            const fileStartMatch = buffer.match(/<boltAction type="file" filePath="(.+?)">/);
                            if (fileStartMatch) {
                                currentFilePath = fileStartMatch[1];
                                currentFileContent = "";
                                buffer = buffer.slice(fileStartMatch.index! + fileStartMatch[0].length);

                                // Add the new file to state
                                setParsedXML((prev) => ({
                                    ...prev,
                                    files: [...prev.files, { path: currentFilePath!, content: "" }],
                                }));
                            } else {
                                break; // No new file start found yet
                            }
                        } else {
                            // Append content to the current file
                            const fileEndIndex = buffer.indexOf("</boltAction>");
                            if (fileEndIndex !== -1) {
                                // File end found
                                currentFileContent += buffer.slice(0, fileEndIndex);
                                buffer = buffer.slice(fileEndIndex + "</boltAction>".length);

                                // Update the current file in state
                                setParsedXML((prev) => {
                                    const updatedFiles = prev.files.map((file) =>
                                        file.path === currentFilePath
                                            ? { ...file, content: file.content + currentFileContent }
                                            : file
                                    );
                                    return { ...prev, files: updatedFiles };
                                });

                                // Reset for the next file
                                currentFilePath = null;
                                currentFileContent = "";
                            } else {
                                // File end not yet found, append the whole buffer
                                currentFileContent += buffer;
                                buffer = ""; // Clear the buffer
                            }
                        }
                    }
                }
            };

            source.onerror = () => {
                toast.error("An error occurred while streaming code.");
                setLoading(false);
                source?.close();
            };

            source.onabort = () => {
                setLoading(false);
                source?.close();
            };

            source.stream();
        }

        if (projectId) streamCode();

        return () => {
            if (source) source.close();
        };
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen w-full flex justify-center items-center">
                <Loader2 className="w-5 h-5 animate-spin" />
            </div>
        );
    }

    return (
        <div>
            <Toaster />
        </div>
    );
}
