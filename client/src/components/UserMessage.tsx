import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser } from "@clerk/clerk-react";

export function UserMessage({ content }: { content: string }) {
    const { user, isLoaded } = useUser()
    return (
        <div className="flex items-center gap-x-4 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-4">
            <div className="flex-shrink-0">
                <Avatar>
                    <AvatarImage src={user?.imageUrl} />
                    <AvatarFallback>
                        {(!isLoaded || !user) ? "SH" : user.fullName?.slice(0, 2) || "SH"}
                    </AvatarFallback>
                </Avatar>
            </div>
            <div className="break-words overflow-wrap-anywhere min-w-0 flex-1">
                {content}
            </div>
        </div>
    )
}
