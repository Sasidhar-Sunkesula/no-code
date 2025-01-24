import { isDevCommand, isInstallCommand } from "@/lib/utils";
import { ShellAction, FileAction } from "@repo/common/types";
import { Check, Loader2 } from "lucide-react";

export function ShellActionDisplay({ action }: { action: ShellAction }) {
    return <div className="flex flex-col gap-y-2">
        <div className="flex items-center gap-x-2">
            {
                action.state === 'running'
                    ? <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                    : <Check className="h-4 w-4 text-green-500" />
            }
            <div>
                {
                    isInstallCommand(action.command)
                        ? 'Install dependencies'
                        : isDevCommand(action.command) ? 'Start application' : 'Run command'
                }
            </div>
        </div>
        <code className="px-3 py-4 rounded-md bg-gray-100 text-gray-800 text-sm">
            {action.command}
        </code>
    </div>
}

export function FileActionDisplay({ action, isNew }: { action: FileAction, isNew: boolean }) {
    return <div className="flex items-center gap-x-2">
        {
            action.state === 'streaming'
                ? <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                : <Check className="h-4 w-4 text-green-500" />
        }
        <div>{isNew ? 'Create ' : 'Update '} {action.filePath}</div>
    </div>
}
