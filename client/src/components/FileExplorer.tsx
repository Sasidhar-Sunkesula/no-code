import { Folders } from "@repo/common/types";
import { ChevronRight, FileIcon, FolderIcon } from "lucide-react";
import { useState } from "react";
import { CodeEditor } from "./CodeEditor";

function FolderComponent({ name, children }: { name: string; children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div>
            <div
                className="flex items-center gap-x-1 mb-1 px-1 py-1 text-sm cursor-pointer rounded-sm hover:bg-gray-300"
                onClick={() => setIsOpen(!isOpen)}
            >
                <ChevronRight className={`h-4 transform ${isOpen ? "rotate-90" : ""}`} />
                {name}
            </div>
            {isOpen && <div className="pl-3">{children}</div>}
        </div>
    );
}

function FileComponent({ name, onClick }: { name: string; onClick: () => void }) {
    const [clicked, setClicked] = useState(false);
    return (
        <div
            className={`flex rounded-sm items-center gap-x-1 px-1 py-1 text-sm cursor-pointer ${clicked ? "bg-sky-200" : "hover:bg-gray-200"}`}
            onClick={() => {
                onClick();
                setClicked(true);
            }}
        >
            <FileIcon className="h-4" />
            {name}
        </div>
    );
}

function RenderStructure({
    files,
    onFileClick,
}: {
    files: Folders[];
    onFileClick: (content: string) => void;
}) {
    return (
        <div>
            {files.map((file) => {
                if (file.type === "folder") {
                    return (
                        <FolderComponent key={file.name} name={file.name}>
                            <RenderStructure files={file.children ?? []} onFileClick={onFileClick} />
                        </FolderComponent>
                    );
                } else {
                    return (
                        <FileComponent
                            key={file.name}
                            name={file.name}
                            onClick={() => onFileClick(file.content ?? "")}
                        />
                    );
                }
            })}
        </div>
    );
}

export function FileExplorer({ folders }: { folders: Folders[] }) {
    const [currentFileContent, setCurrentFileContent] = useState<string>("");

    const handleFileClick = (content: string) => {
        setCurrentFileContent(content);
    };

    return (
        <div className="flex h-[75vh]">
            <div className="bg-secondary w-48 flex flex-col px-1">
                <div className="text-sm p-2 border-b mb-2 flex items-center gap-x-1">
                    <FolderIcon className="h-4" />
                    Files
                </div>
                <RenderStructure files={folders} onFileClick={handleFileClick} />
            </div>
            <CodeEditor code={currentFileContent} />
        </div>
    );
}
