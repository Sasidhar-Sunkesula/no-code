import { ActionState } from "@repo/common/types";
import { parse } from "best-effort-json-parser";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { FileActionDisplay, ShellActionDisplay } from "./ActionDisplay";
import { Button } from "./ui/button";

function parseContent(content: string) {
    try {
        return parse(content);
    } catch {
        return null;
    }
}
export function AssistantResponse({ content, actions, reasoning }: { content: string, actions: ActionState[], reasoning?: string }) {
    const [isExpanded, setIsExpanded] = useState(false);
    return (
        <div className="flex flex-col gap-y-4 bg-gray-100 dark:bg-gray-800 text-sm/6 rounded-lg px-4 py-3">
            {reasoning &&
                <Button onClick={() => setIsExpanded(!isExpanded)} variant="outline" className="w-full flex items-center justify-between px-4">
                    <div>Thinking...</div>
                    <div>{isExpanded
                        ? <ChevronUp className="w-4 h-4" />
                        : <ChevronDown className="w-4 h-4" />
                    }
                    </div>
                </Button>
            }
            {isExpanded && <div className="bg-primary-foreground px-2 py-2 text-sm italic">{reasoning}</div>}
            <div className="break-words overflow-wrap-anywhere min-w-0 flex-1">
                {parseContent(content)?.artifact?.initialContext ?? ''}
            </div>
            {actions.length > 0 && (
                <div className="flex flex-col gap-y-3 bg-primary-foreground rounded-md px-4 py-4">
                    {actions.map(action => action.type === 'file'
                        ? <FileActionDisplay key={action.id} action={action} />
                        : <ShellActionDisplay key={action.id} action={action} />
                    )}
                </div>
            )}
            <div className="break-words overflow-wrap-anywhere min-w-0 flex-1">
                {parseContent(content)?.artifact?.endingContext ?? ''}
            </div>
        </div>
    )
}