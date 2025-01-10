import { buildHierarchy } from "@/lib/buildHierarchy";
import { StreamingMessageParser } from "@/lib/StreamingMessageParser";
import { File, Folders } from "@repo/common/types";
import { ChevronRight, FileIcon, FolderIcon } from "lucide-react";
import { useEffect, useState } from "react";
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
    onClick: (name: string) => void;
}) {
    return (
        <div
            className={`flex rounded-sm items-center gap-x-1 px-1 py-1 text-sm cursor-pointer 
                ${isSelected ? "bg-sky-200" : "hover:bg-gray-200"}`
            }
            onClick={() => onClick(name)}
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
    onFileClick: (name: string) => void;
}) {
    return (
        <div className="max-h-[75vh] overflow-y-auto">
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
                            onClick={onFileClick}
                        />
                    );
                }
            })}
        </div>
    );
}
function findFileContent(folders: Folders[], selectedFileName: string): string | undefined {
    for (const item of folders) {
        if (item.type === "file" && item.name === selectedFileName) {
            return item.content; // Return the content if the file matches
        }

        if (item.type === "folder" && item.children) {
            const result = findFileContent(item.children, selectedFileName); // Recursively search in children
            if (result) {
                return result; // Return the content if found in children
            }
        }
    }
    return undefined; // Return undefined if not found
}
export function FileExplorer({ templateFiles }: { templateFiles: File[] }) {
    const [folders, setFolders] = useState<Folders[]>(buildHierarchy(templateFiles));
    const [selectedFileName, setSelectedFileName] = useState<string>("");

    useEffect(() => {
        const interval = setInterval(() => {
            const filesFromState = StreamingMessageParser.filesMap.get("1234") ?? [];
            if (filesFromState.length === 0) {
                return;
            }
            for (const file of filesFromState) {
                const existingFileIndex = templateFiles.findIndex((f) => f.path === file.path);

                if (existingFileIndex !== -1) {
                    // Update content of the matching file
                    templateFiles[existingFileIndex] = file;
                } else {
                    // Add new file
                    templateFiles.push(file);
                }
            }
            const hierarchicalFolders = buildHierarchy(templateFiles);
            setFolders(hierarchicalFolders);
        }, 100);

        setTimeout(() => {
            clearInterval(interval);
        }, 15000);

        return () => clearInterval(interval);
    }, []);

    const handleFileClick = (name: string) => {
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
            <CodeEditor code={findFileContent(folders, selectedFileName) ?? ""} />
        </div>
    );
}