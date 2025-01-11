import { useState } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { CornerDownLeft } from "lucide-react";

export function Input({ placeholder, handleSubmit }: {
    placeholder: string,
    handleSubmit: (input: string) => void
}) {
    const [input, setInput] = useState("");
    return (
        <div className="relative">
            <Textarea
                className="relative"
                placeholder={placeholder}
                value={input}
                onChange={(e) => setInput(e.target.value)}
            />
            <Button onClick={() => handleSubmit(input)} size={"sm"} className="absolute bottom-2 right-2 flex items-center">
                Send
                <CornerDownLeft className="w-4 h-4" />
            </Button>
        </div>
    );
}