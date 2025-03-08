import { File, Folders, Directory, Files, Project } from "@repo/common/types";

export function buildHierarchy(files: File[]): Folders[] {
    const root: Folders = { type: "folder", name: "root", children: [] };

    files.forEach(({ filePath, content }) => {
        const parts = filePath.split("/");
        let currentFolder = root;
        let currentPath = "";

        parts.forEach((part, index) => {
            // Build the current path
            currentPath = currentPath ? `${currentPath}/${part}` : part;

            if (index === parts.length - 1) {
                // Add file to the current folder with full path
                currentFolder.children = currentFolder.children || [];
                currentFolder.children.push({
                    type: "file",
                    name: part,
                    content,
                    filePath: currentPath
                });
            } else {
                // Ensure the folder exists and add its path
                currentFolder.children = currentFolder.children || [];
                let folder = currentFolder.children.find(
                    (child) => child.type === "folder" && child.name === part
                ) as Folders;

                if (!folder) {
                    folder = {
                        type: "folder",
                        name: part,
                        children: [],
                        filePath: currentPath
                    };
                    currentFolder.children.push(folder);
                }
                currentFolder = folder;
            }
        });
    });

    return root.children || [];
}

export function formatFilesToMount(folders: Folders[], result: Files = {}): Files {
    folders.forEach((item) => {
        if (item.type === "file") {
            result[item.name] = {
                file: {
                    contents: item.content || "",
                },
            };
        } else if (item.type === "folder") {
            result[item.name] = {
                directory: {},
            };
            formatFilesToMount(item.children || [], (result[item.name] as Directory).directory);
        }
    });
    return result;
}
export function formatProjectsByDate(projects: Project[]) {
    const formattedProjects: Record<string, Project[]> = {};
    projects.forEach((project) => {
        const date = new Date(project.createdAt).toDateString();
        if (!formattedProjects[date]) {
            formattedProjects[date] = [];
        }
        formattedProjects[date].push(project);
    });
    return formattedProjects;
}

export const formatNumber = (num: number) => {
    return num >= 1000 ? Math.round(num / 1000) + 'K' : num;
};