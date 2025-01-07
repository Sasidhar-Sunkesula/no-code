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

function FileComponent({
    name,
    isSelected,
    onClick,
}: {
    name: string;
    isSelected: boolean;
    onClick: () => void;
}) {
    return (
        <div
            className={`flex rounded-sm items-center gap-x-1 px-1 py-1 text-sm cursor-pointer 
                ${isSelected ? "bg-sky-200" : "hover:bg-gray-200"}`
            }
            onClick={onClick}
        >
            <FileIcon className="h-4" />
            {name}
        </div>
    );
}

function RenderStructure({
    files,
    selectedFileName,
    onFileClick,
}: {
    files: Folders[];
    selectedFileName: string;
    onFileClick: (name: string, content: string) => void;
}) {
    return (
        <div>
            {files.map((file) => {
                if (file.type === "folder") {
                    return (
                        <FolderComponent key={file.name} name={file.name}>
                            <RenderStructure
                                files={file.children ?? []}
                                selectedFileName={selectedFileName}
                                onFileClick={onFileClick}
                            />
                        </FolderComponent>
                    );
                } else {
                    return (
                        <FileComponent
                            key={file.name}
                            name={file.name}
                            isSelected={selectedFileName === file.name}
                            onClick={() => onFileClick(file.name, file.content ?? "")}
                        />
                    );
                }
            })}
        </div>
    );
}

export function FileExplorer({ folders }: { folders: Folders[] }) {
    const [currentFileContent, setCurrentFileContent] = useState<string>("");
    const [selectedFileName, setSelectedFileName] = useState<string>("");

    const handleFileClick = (name: string, content: string) => {
        setCurrentFileContent(content);
        setSelectedFileName(name);
    };

    return (
        <div className="flex h-[75vh]">
            <div className="bg-secondary rounded-sm flex flex-col px-1 w-52">
                <div className="text-sm p-2 border-b mb-2 flex items-center gap-x-1">
                    <FolderIcon className="h-4" />
                    Files
                </div>
                <RenderStructure
                    files={folders}
                    selectedFileName={selectedFileName}
                    onFileClick={handleFileClick}
                />
            </div>
            <CodeEditor code={currentFileContent} />
        </div>
    );
}
