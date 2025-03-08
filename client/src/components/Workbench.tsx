import { useShallow } from "zustand/react/shallow";
import { useProjectStore } from "@/store/projectStore";
import { AssistantResponse } from "./AssistantResponse";
import { UserMessage } from "./UserMessage";
import { useEffect, useRef } from "react";

export function Workbench() {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { actions, messageHistory } = useProjectStore(
        useShallow(state => ({
            actions: state.actions,
            messageHistory: state.messageHistory
        }))
    );

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messageHistory]); // Scroll when messages change

    const filteredMessageHistory = messageHistory.filter(
        message => message.role === 'user' || message.role === 'assistant'
    );

    return (
        <div style={{ scrollbarWidth: 'none' }} className="md:h-[70vh] overflow-y-auto space-y-3">
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
            <div className="w-0 h-0" ref={messagesEndRef} />
        </div>
    );
}
