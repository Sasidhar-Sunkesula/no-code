import { useProjectStore } from "@/store/projectStore";
import { FileIcon } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

export function FileComponent({ name, filePath }: { name: string, filePath: string }) {
    const { selectedFile, setSelectedFile } = useProjectStore(
        useShallow(state => ({
            selectedFile: state.selectedFile,
            setSelectedFile: state.setSelectedFile
        }))
    );
    const isSelected = selectedFile === filePath;
    return (
        <div
            className={`flex items-center gap-x-1 px-1 py-1 text-sm cursor-pointer 
                ${isSelected ? "bg-sky-200" : "hover:bg-gray-200"}`
            }
            onClick={() => setSelectedFile(filePath)}
        >
            <FileIcon className="h-4" />
            {name}
        </div>
    );
}