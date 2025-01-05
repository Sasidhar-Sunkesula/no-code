import { File, Folders } from "@repo/common/types";

export function buildHierarchy(files: File[]): Folders[] {
    const root: Folders = { type: "folder", name: "root", children: [] };

    files.forEach(({ path, content }) => {
        const parts = path.split("/");
        let currentFolder = root;

        parts.forEach((part, index) => {
            if (index === parts.length - 1) {
                // Add file to the current folder
                currentFolder.children = currentFolder.children || [];
                currentFolder.children.push({ type: "file", name: part, content });
            } else {
                // Ensure the folder exists
                currentFolder.children = currentFolder.children || [];
                let folder = currentFolder.children.find(
                    (child) => child.type === "folder" && child.name === part
                ) as Folders;

                if (!folder) {
                    folder = { type: "folder", name: part, children: [] };
                    currentFolder.children.push(folder);
                }

                currentFolder = folder;
            }
        });
    });

    return root.children || [];
}