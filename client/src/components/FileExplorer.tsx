import { buildHierarchy } from "@/lib/formatterHelpers";
import { findFileContent } from "@/lib/utils";
import { useProjectStore } from "@/store/projectStore";
import { Folders } from "@repo/common/types";
import { FolderIcon } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { CodeEditor } from "./CodeEditor";
import { FileComponent } from "./FileComponent";
import { FolderComponent } from "./FolderComponent";

function RenderStructure({ files }: { files: Folders[] }) {
    return (
        <div style={{ scrollbarWidth: "thin" }} className="md:max-h-[55vh] overflow-y-auto">
            {files.map((file) => {
                if (file.type === "folder") {
                    return (
                        <FolderComponent key={file.name} name={file.name}>
                            <RenderStructure files={file.children ?? []} />
                        </FolderComponent>
                    );
                } else {
                    return (
                        <FileComponent
                            key={file.name}
                            name={file.name}
                            filePath={file.filePath ?? file.name}
                        />
                    );
                }
            })}
        </div>
    );
}

export function FileExplorer() {
    const { projectFiles, selectedFile } = useProjectStore(
        useShallow(state => ({
            projectFiles: state.projectFiles,
            selectedFile: state.selectedFile
        }))
    );
    const folders = buildHierarchy(projectFiles);
    return (
        <div className="grid grid-cols-10 gap-x-2">
            <div className="col-span-2 bg-secondary rounded-sm flex flex-col px-1">
                <div className="text-sm p-2 border-b mb-2 flex items-center gap-x-1">
                    <FolderIcon className="h-4" />
                    Files
                </div>
                <RenderStructure files={folders} />
            </div>
            <div className="col-span-8">
                <CodeEditor code={findFileContent(projectFiles, selectedFile ?? '') ?? ""} />
            </div>
        </div>
    )
}