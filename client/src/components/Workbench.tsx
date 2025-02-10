import { useShallow } from "zustand/react/shallow"
import { useProjectStore } from "@/store/projectStore";
import { AssistantResponse } from "./AssistantResponse";
import { UserMessage } from "./UserMessage";

export function Workbench() {
    const { actions, messageHistory } = useProjectStore(
        useShallow(state => ({
            actions: state.actions,
            messageHistory: state.messageHistory
        }))
    );
    const filteredMessageHistory = messageHistory.filter(
        message => message.role === 'user' || message.role === 'assistant' 
    );
    return (
        <div style={{ scrollbarWidth: 'none' }} className="h-[75vh] overflow-y-auto space-y-3">
            {filteredMessageHistory.map((message) =>
                message.role === 'user'
                    ? <UserMessage
                        key={message.id}
                        content={message.content}
                    />
                    : <AssistantResponse
                        key={message.id}
                        reasoning={message?.reasoning}
                        content={message.content}
                        actions={actions.get(message.id) || []}
                    />
            )}
        </div>
    );
}