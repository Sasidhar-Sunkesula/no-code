import { Sparkles } from "lucide-react";

export function Logo() {
    return (
        <div
            onClick={() => window.location.assign('/')}
            className="flex items-center gap-x-2 cursor-pointer"
        >
            <div className="flex aspect-square size-8 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
                <Sparkles className="size-5" />
            </div>
            <div className="leading-none">
                <span className="font-semibold">NoCode</span>
            </div>
        </div>
    );
}