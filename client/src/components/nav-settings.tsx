import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useGeneralStore } from "@/store/generalStore";
import { CogIcon } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { Label } from "./ui/label";

export function NavSettings() {
    const { wordWrap, setWordWrap, reasoning, setReasoning } = useGeneralStore(
        useShallow(state => ({
            wordWrap: state.wordWrap,
            setWordWrap: state.setWordWrap,
            reasoning: state.reasoning,
            setReasoning: state.setReasoning
        }))
    );
    return (
        <Dialog>
            <DialogTrigger className="flex items-center gap-2">
                <CogIcon className="size-4" />
                <span className="text-sm font-medium">Settings</span>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CogIcon className="size-5" />
                        Settings
                    </DialogTitle>
                    <DialogDescription>Customize your workspace</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-4 w-full">
                    <div className="flex items-center justify-between gap-4">
                        <Label htmlFor="word-wrap" className="text-right">
                            Word Wrap
                        </Label>
                        <Switch
                            id="word-wrap"
                            checked={wordWrap}
                            onCheckedChange={setWordWrap}
                        />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <Label htmlFor="reasoning" className="text-right">
                            Reasoning
                        </Label>
                        <Switch
                            id="reasoning"
                            checked={reasoning}
                            onCheckedChange={setReasoning}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose>
                        <Button variant="outline">
                            Cancel
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}