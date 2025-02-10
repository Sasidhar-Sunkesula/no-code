import { File, FileAction, ShellAction, MessageHistory, ExistingProject, Artifact } from "@repo/common/types";
import type { WebContainer } from "@webcontainer/api";
import type { Terminal as XTerm } from "@xterm/xterm";
import { buildHierarchy, formatFilesToMount } from "./formatterHelpers";
import { chatHistoryMsg, projectFilesMsg } from "./utils";

export function isNewFile(filePath: string, templateFiles: File[]) {
    return templateFiles.every(file => file.filePath !== filePath);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseActions(actions: any[]): (FileAction | ShellAction)[] {
    return actions.map(action => {
        if (action.type === 'file') {
            return {
                type: 'file',
                filePath: action.filePath || '',
                content: action.content || ''
            }
        } else if (action.type === 'shell') {
            return {
                type: 'shell',
                command: action.command || ''
            }
        }
        return null;
    })
        .filter(action => action !== null)
        .filter(action => action.type === 'file'
            ? !!(action.type === 'file' && action.filePath && action.content)
            : !!(action.type === 'shell' && action.command)
        ) as (FileAction | ShellAction)[];
}

export async function startShell(terminal: XTerm, webContainer: WebContainer) {
    const process = await webContainer.spawn('/bin/jsh', {
        terminal: {
            cols: terminal.cols ?? 80,
            rows: terminal.rows ?? 15,
        },
    });
    process.output.pipeTo(
        new WritableStream({
            write(data) {
                terminal.write(data);
            },
        })
    );

    const input = process.input.getWriter();
    terminal.onData((data) => {
        input.write(data);
    });

    return process;
}
export async function mountFiles(files: File | File[], webContainerInstance: WebContainer) {
    const filesArray = Array.isArray(files) ? files : [files];
    const hierarchy = buildHierarchy(filesArray);
    const formattedFiles = formatFilesToMount(hierarchy);
    await webContainerInstance.mount(formattedFiles);
}

export function constructMessages(
    currentInput: string,
    currentMessageId: string,
    projectFiles: File[],
    messageHistory: MessageHistory[],
    ignorePatterns: string[]
) {
    const payload: MessageHistory[] = [];
    payload.push({ id: crypto.randomUUID(), role: 'user', content: projectFilesMsg(projectFiles, ignorePatterns), timestamp: Date.now() });
    payload.push({ id: crypto.randomUUID(), role: 'user', content: chatHistoryMsg(), timestamp: Date.now() });
    let currentIndex = 0;
    for (const message of messageHistory) {
        const nextMessage = messageHistory[currentIndex + 1];
        if (message.id === currentMessageId) {
            const upperMessage = `Assistant Response to Message #${currentIndex}`;
            payload.push({ ...message, content: `${upperMessage}\n ${message.content}` });
        } else if (nextMessage?.id === currentMessageId) {
            const upperMessage = `Previous Message #${currentIndex + 1}`
            const lowerMessage = `(Assistant response below)`
            payload.push({ ...message, role: 'user', content: `${upperMessage}\n ${message.content} \n ${lowerMessage}` });
        } else if (message.role !== 'assistant') {
            const upperMessage = `Previous Message #${currentIndex + 1}`
            const lowerMessage = `(Assistant response omitted)`
            payload.push({ ...message, role: 'user', content: `${upperMessage}\n ${message.content} \n ${lowerMessage}` });
        }
        currentIndex++;
    }
    payload.push({
        id: 'currentMessage',
        role: 'user',
        content: `Current Message : ${currentInput}`,
        rawContent: currentInput,
        timestamp: Date.now()
    });
    return payload;
}

export function getImportArtifact(messages: ExistingProject['messages']) {
    const recentAssistantMessage = messages.findLastIndex(m => m.role === 'assistant');
    const startCommand = (messages[recentAssistantMessage].content as { artifact: Artifact })
        .artifact.actions.find(action => action.type === 'shell')?.command ?? 'npm run dev';
    const currentActions: (Pick<ShellAction, 'type' | 'command'>)[] = [
        {
            type: 'shell',
            command: 'npm install',
        },
        {
            type: 'shell',
            command: startCommand,
        }
    ];
    const artifact: Artifact = {
        id: crypto.randomUUID(),
        title: 'Importing Project',
        initialContext: "I'm setting up your project. This may take a moment as I set everything up. Once it's ready, you'll be able to explore and interact with your code.",
        actions: currentActions,
        endingContext: "I've successfully imported your project. I'm ready to assist you with analyzing and improving your code."
    };
    return { artifact, currentActions };
}

export async function runCommand(
    webContainerInstance: WebContainer,
    terminal: XTerm,
    commands: string[],
    willExit: boolean
) {
    const process = await webContainerInstance.spawn(commands[0], commands.slice(1));
    process.output.pipeTo(
        new WritableStream({
            write(data) {
                terminal.write(data);
            },
        })
    );
    if (willExit) {
        const exitCode = await process.exit;
        return exitCode;
    }
    return null;
}