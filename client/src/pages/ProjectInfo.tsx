import { FileExplorer } from "@/components/FileExplorer";
import { buildHierarchy } from "@/lib/buildHierarchy";
import { API_URL } from "@/lib/constants";
import { parseXML } from "@/lib/parseXML";
import { getAssistantMsg } from "@/lib/utils";
import type { ActionType, BoltAction, BoltActionData, BoltArtifactData, FileAction, Folders, ParsedXML, ShellAction, TemplateFiles } from "@repo/common/types";
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
const createArtifactElement: ElementFactory = (props) => {
    const elementProps = [
        'class="__boltArtifact__"',
        ...Object.entries(props).map(([key, value]) => {
            return `data-${camelToDashCase(key)}=${JSON.stringify(value)}`;
        }),
    ];

    return `<div ${elementProps.join(' ')}></div>`;
};

function camelToDashCase(input: string) {
    return input.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}
const messageParser = new StreamingMessageParser({
    callbacks: {
        onArtifactOpen: (data) => {
            console.log("onArtifactOpen", data)
        },
        onArtifactClose: (data) => {
            console.log("onArtifactClose", data)
        },
        onActionOpen: (data) => {
            console.log("onActionOpen", data)
        },
        onActionClose: (data) => {
            console.log("onActionClose", data)
        },
    },
});

export default function ProjectInfo() {
    const [loading, setLoading] = useState(true);
    const [parsedXML, setParsedXML] = useState<ParsedXML | null>(null);
    const { projectId } = useParams();
    const location = useLocation();
    const { enhancedPrompt, templateFiles, userMessage } = location.state as {
        enhancedPrompt: string,
        templateFiles: TemplateFiles,
        userMessage: string,
    };

    //     const { enhancedPrompt, templateFiles, userMessage } = {
    //         "enhancedPrompt": "Develop a React application for managing a to-do list.  The application should allow users to add new tasks with descriptions and due dates, mark tasks as complete, and delete tasks.  Implement local storage to persist data between sessions.  The user interface should be clean and intuitive, employing a modern design aesthetic.  Include unit tests for core functionality.\n",
    //         "templateFiles": [
    //             {
    //                 "name": "eslint.config.js",
    //                 "path": "eslint.config.js",
    //                 "content": "import js from '@eslint/js'\nimport globals from 'globals'\nimport reactHooks from 'eslint-plugin-react-hooks'\nimport reactRefresh from 'eslint-plugin-react-refresh'\nimport tseslint from 'typescript-eslint'\n\nexport default tseslint.config(\n  { ignores: ['dist'] },\n  {\n    extends: [js.configs.recommended, ...tseslint.configs.recommended],\n    files: ['**/*.{ts,tsx}'],\n    languageOptions: {\n      ecmaVersion: 2020,\n      globals: globals.browser,\n    },\n    plugins: {\n      'react-hooks': reactHooks,\n      'react-refresh': reactRefresh,\n    },\n    rules: {\n      ...reactHooks.configs.recommended.rules,\n      'react-refresh/only-export-components': [\n        'warn',\n        { allowConstantExport: true },\n      ],\n    },\n  },\n)\n"
    //             },
    //             {
    //                 "name": "index.html",
    //                 "path": "index.html",
    //                 "content": "<!doctype html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"UTF-8\" />\n    <link rel=\"icon\" type=\"image/svg+xml\" href=\"/vite.svg\" />\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n    <title>Vite + React + TS</title>\n  </head>\n  <body>\n    <div id=\"root\"></div>\n    <script type=\"module\" src=\"/src/main.tsx\"></script>\n  </body>\n</html>\n"
    //             },
    //             {
    //                 "name": "package.json",
    //                 "path": "package.json",
    //                 "content": "{\n  \"name\": \"vite-react-typescript-starter\",\n  \"private\": true,\n  \"version\": \"0.0.0\",\n  \"type\": \"module\",\n  \"scripts\": {\n    \"dev\": \"vite\",\n    \"build\": \"vite build\",\n    \"lint\": \"eslint .\",\n    \"preview\": \"vite preview\"\n  },\n  \"dependencies\": {\n    \"lucide-react\": \"^0.344.0\",\n    \"react\": \"^18.3.1\",\n    \"react-dom\": \"^18.3.1\"\n  },\n  \"devDependencies\": {\n    \"@eslint/js\": \"^9.9.1\",\n    \"@types/react\": \"^18.3.5\",\n    \"@types/react-dom\": \"^18.3.0\",\n    \"@vitejs/plugin-react\": \"^4.3.1\",\n    \"autoprefixer\": \"^10.4.18\",\n    \"eslint\": \"^9.9.1\",\n    \"eslint-plugin-react-hooks\": \"^5.1.0-rc.0\",\n    \"eslint-plugin-react-refresh\": \"^0.4.11\",\n    \"globals\": \"^15.9.0\",\n    \"postcss\": \"^8.4.35\",\n    \"tailwindcss\": \"^3.4.1\",\n    \"typescript\": \"^5.5.3\",\n    \"typescript-eslint\": \"^8.3.0\",\n    \"vite\": \"^5.4.2\"\n  }\n}"
    //             },
    //             {
    //                 "name": "postcss.config.js",
    //                 "path": "postcss.config.js",
    //                 "content": "export default {\n  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n  },\n}"
    //             },
    //             {
    //                 "name": "App.tsx",
    //                 "path": "src/App.tsx",
    //                 "content": `import { useState, useEffect } from 'react';
    // import { Plus, Trash, Check } from 'lucide-react';

    // const App = () => {
    //   const [tasks, setTasks] = useState<Task[]>([]);
    //   const [newTask, setNewTask] = useState('');
    //   const [newDueDate, setNewDueDate] = useState('');

    //   useEffect(() => {
    //     const storedTasks = localStorage.getItem('tasks');
    //     if (storedTasks) {
    //       setTasks(JSON.parse(storedTasks));
    //     }
    //   }, []);

    //   useEffect(() => {
    //     localStorage.setItem('tasks', JSON.stringify(tasks));
    //   }, [tasks]);

    //   const addTask = () => {
    //     if (newTask.trim() !== '') {
    //       const newTaskObj: Task = {
    //         id: Date.now(),
    //         text: newTask,
    //         dueDate: newDueDate,
    //         completed: false
    //       };
    //       setTasks([...tasks, newTaskObj]);
    //       setNewTask('');
    //       setNewDueDate('');
    //     }
    //   };

    //   const toggleComplete = (id: number) => {
    //     setTasks(tasks.map(task =>
    //       task.id === id ? { ...task, completed: !task.completed } : task
    //     ));
    //   };

    //   const deleteTask = (id: number) => {
    //     setTasks(tasks.filter(task => task.id !== id));
    //   };

    //   return (
    //     <div className="min-h-screen bg-gray-100 p-8">
    //       <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
    //         <h1 className="text-2xl font-bold mb-4">To-Do List</h1>
    //         <div className="flex mb-4">
    //           <input
    //             type="text"
    //             placeholder="Add task..."
    //             value={newTask}
    //             onChange={e => setNewTask(e.target.value)}
    //             className="flex-grow border rounded-md px-3 py-2"
    //           />
    //           <input
    //             type="date"
    //             value={newDueDate}
    //             onChange={e => setNewDueDate(e.target.value)}
    //             className="border rounded-md px-3 py-2 ml-2"
    //           />
    //           <button onClick={addTask} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md ml-2">
    //             <Plus className="inline h-5 w-5 mr-2" />
    //             Add
    //           </button>
    //         </div>
    //         <ul>
    //           {tasks.map(task => (
    //             <li key={task.id} className="flex items-center justify-between mb-2 p-2 border rounded">
    //               {task.dueDate && <span>{task.dueDate}</span>}
    //               <button onClick={() => deleteTask(task.id)} className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded-md">
    //                 <Trash className="inline h-4 w-4" />
    //               </button>
    //             </li>
    //           ))}
    //         </ul>
    //       </div>
    //     </div>
    //   );
    // };

    // interface Task {
    //   id: number;
    //   text: string;
    //   dueDate?: string;
    //   completed: boolean;
    // }

    // export default App;`
    //             },
    //             {
    //                 "name": "index.css",
    //                 "path": "src/index.css",
    //                 "content": "@tailwind base;\n@tailwind components;\n@tailwind utilities;"
    //             },
    //             {
    //                 "name": "main.tsx",
    //                 "path": "src/main.tsx",
    //                 "content": "import { StrictMode } from 'react'\nimport { createRoot } from 'react-dom/client'\nimport App from './App.tsx'\nimport './index.css'\n\ncreateRoot(document.getElementById('root')!).render(\n  <StrictMode>\n    <App />\n  </StrictMode>,\n)\n"
    //             },
    //             {
    //                 "name": "vite-env.d.ts",
    //                 "path": "src/vite-env.d.ts",
    //                 "content": "/// <reference types=\"vite/client\" />\n"
    //             },
    //             {
    //                 "name": "tailwind.config.js",
    //                 "path": "tailwind.config.js",
    //                 "content": "/** @type {import('tailwindcss').Config} */\nexport default {\n  content: [\n    \"./index.html\",\n    \"./src/**/*.{js,ts,jsx,tsx}\",\n  ],\n  theme: {\n    extend: {},\n  },\n  plugins: [],\n}"
    //             },
    //             {
    //                 "name": "tsconfig.app.json",
    //                 "path": "tsconfig.app.json",
    //                 "content": "{\n  \"compilerOptions\": {\n    \"target\": \"ES2020\",\n    \"useDefineForClassFields\": true,\n    \"lib\": [\"ES2020\", \"DOM\", \"DOM.Iterable\"],\n    \"module\": \"ESNext\",\n    \"skipLibCheck\": true,\n\n    /* Bundler mode */\n    \"moduleResolution\": \"bundler\",\n    \"allowImportingTsExtensions\": true,\n    \"isolatedModules\": true,\n    \"moduleDetection\": \"force\",\n    \"noEmit\": true,\n    \"jsx\": \"react-jsx\",\n\n    /* Linting */\n    \"strict\": true,\n    \"noUnusedLocals\": true,\n    \"noUnusedParameters\": true,\n    \"noFallthroughCasesInSwitch\": true\n  },\n  \"include\": [\"src\"]\n}\n"
    //             },
    //             {
    //                 "name": "tsconfig.json",
    //                 "path": "tsconfig.json",
    //                 "content": "{\n  \"files\": [],\n  \"references\": [\n    { \"path\": \"./tsconfig.app.json\" },\n    { \"path\": \"./tsconfig.node.json\" }\n  ]\n}\n"
    //             },
    //             {
    //                 "name": "tsconfig.node.json",
    //                 "path": "tsconfig.node.json",
    //                 "content": "{\n  \"compilerOptions\": {\n    \"target\": \"ES2022\",\n    \"lib\": [\"ES2023\"],\n    \"module\": \"ESNext\",\n    \"skipLibCheck\": true,\n\n    /* Bundler mode */\n    \"moduleResolution\": \"bundler\",\n    \"allowImportingTsExtensions\": true,\n    \"isolatedModules\": true,\n    \"moduleDetection\": \"force\",\n    \"noEmit\": true,\n\n    /* Linting */\n    \"strict\": true,\n    \"noUnusedLocals\": true,\n    \"noUnusedParameters\": true,\n    \"noFallthroughCasesInSwitch\": true\n  },\n  \"include\": [\"vite.config.ts\"]\n}\n"
    //             },
    //             {
    //                 "name": "vite.config.ts",
    //                 "path": "vite.config.ts",
    //                 "content": "import { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react'\n\n// https://vitejs.dev/config/\nexport default defineConfig({\n  plugins: [react()],\n  optimizeDeps: {\n    exclude: ['lucide-react'],\n  },\n})\n"
    //             }
    //         ],
    //         "userMessage": "\nTEMPLATE INSTRUCTIONS:\nFor all designs I ask you to make, have them be beautiful, not cookie cutter. Make webpages that are fully featured and worthy for production.\n\nBy default, this template supports JSX syntax with Tailwind CSS classes, React hooks, and Lucide React for icons. Do not install other packages for UI themes, icons, etc unless absolutely necessary or I request them.\n\nUse icons from lucide-react for logos.\n\nUse stock photos from unsplash where appropriate, only valid URLs you know exist. Do not download the images, only link to them in image tags.\n\n\n\nIMPORTANT: Do not Forget to install the dependencies before running the app\n---\n\n  ---\n  The starter template files have been imported successfully. Based on the original request, please proceed to generate the implementation code for the project. Use the imported files and structure them as needed, adhering to the following constraints:\n  - Only modify the files that are explicitly allowed to be changed.\n  - Create new files where necessary to add features or implement functionality.\n  - Address the project requirements.\n  - Do not forget to divide the implementation into logical components and files.\n  - Do not create big monolithic files. Split the code into smaller, manageable files.\n  \n  For example, if this is a TODO app, implement features like task creation, updates, deletion, and filtering in the appropriate files. Provide explanations or comments in the code if decisions are non-trivial.\n  ---\n  "
    //     }

    useEffect(() => {
        let source: SSE | null = null;
        let buffer = "";
        let parseTimeout: NodeJS.Timeout | null = null;

        function streamCode() {
            const reqBody: ChatMessages = [
                { role: 'user', parts: [{ text: enhancedPrompt }] },
                { role: 'model', parts: [{ text: getAssistantMsg(templateFiles) }] },
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

            source.onmessage = (event) => {
                const data = event.data;
                if (data.trim() !== "") {
                    const { chunk } = JSON.parse(data);
                    buffer += chunk;

                    if (loading) {
                        setLoading(false);
                    }

                    // Clear any existing parse timeout
                    if (parseTimeout) {
                        clearTimeout(parseTimeout);
                    }
                    // Schedule parsing 1 seconds after the last message
                    parseTimeout = setTimeout(() => {
                        const parsed = parseXML(buffer);
                        if (parsed.files.length > 0 && parsed.files[0].content) {
                            const newParsedContent = new InputParser();
                            console.log("newParsedContent", newParsedContent.parse(buffer));
                            setParsedXML(parsed);
                        }
                    }, 1000);
                }
            };

            source.onerror = () => {
                toast.error("An error occurred while streaming code.");
                setLoading(false);
                source?.close();
            };
        }

        if (projectId) streamCode();

        return () => {
            if (source) source.close();
            if (parseTimeout) clearTimeout(parseTimeout);
        };
    }, []);

    if (loading || !parsedXML) {
        return (
            <div className="min-h-screen w-full flex justify-center items-center">
                <Loader2 className="w-5 h-5 animate-spin" />
            </div>
        );
    }

    return (
        <div>
            <Toaster />
            <FileExplorer folders={buildHierarchy(parsedXML.files)} />
        </div>
    );
}
