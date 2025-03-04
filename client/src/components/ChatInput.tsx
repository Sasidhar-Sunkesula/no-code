import { useProjectStore } from "@/store/projectStore";
import { CircleStop, CornerDownLeft, RotateCcw } from "lucide-react";
import { memo } from "react";
import { useShallow } from "zustand/react/shallow";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

interface ButtonConfig {
    show: boolean;
    icon: React.ReactNode;
    onClick: () => void;
}

export const ChatInput = memo(({
    input,
    isLoading,
    reload,
    stop,
    setInput,
    placeholder,
    handleSubmit,
    error
}: {
    placeholder: string,
    handleSubmit: () => void
    input: string,
    setInput: React.Dispatch<React.SetStateAction<string>>
    isLoading: boolean
    reload?: () => Promise<string | null | undefined>
    stop?: () => void
    error?: Error | undefined
}) => {
    const buttonConfigs: ButtonConfig[] = [
        {
            show: Boolean(input && !isLoading),
            icon: <CornerDownLeft className="size-4" />,
            onClick: handleSubmit
        },
        {
            show: Boolean(isLoading && stop),
            icon: <CircleStop className="size-4" />,
            onClick: stop || (() => { })
        },
        {
            show: Boolean(error && reload),
            icon: <RotateCcw className="size-4" />,
            onClick: reload || (() => { })
        }
    ];
    const { subscriptionData } = useProjectStore(
        useShallow(state => ({
            subscriptionData: state.subscriptionData
        }))
    )
    const activeButton = buttonConfigs.find(config => config.show);

    return (
        <div className="relative">
            {subscriptionData && (
                <div className="absolute w-11/12 left-1/2 -translate-x-1/2 shadow-md shadow-sky-600 text-center -top-5 px-2 border rounded-t-md text-sm bg-white">
                    {(subscriptionData.tokenUsage.daily.limit - subscriptionData.tokenUsage.daily.used).toLocaleString()}
                    {' '}
                    daily tokens left out of
                    {' '}
                    {subscriptionData.tokenUsage.daily.limit.toLocaleString()}
                    {' '}
                    tokens
                </div>
            )}
            <Textarea
                rows={5}
                className="relative"
                placeholder={placeholder}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                        handleSubmit();
                    }
                }}
            />
            {activeButton && (
                <Button
                    size="sm"
                    onClick={activeButton.onClick}
                    className="absolute bottom-3 right-2"
                >
                    {activeButton.icon}
                </Button>
            )}
        </div>
    );
});

ChatInput.displayName = 'ChatInput';