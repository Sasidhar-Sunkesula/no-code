import { File, Folders } from "@repo/common/types";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function findFileContent(folders: Folders[], selectedFileName: string): string | undefined {
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

export function projectFilesMsg(files: File[]) {
  return `Project Files:
The following is a list of all project files and their complete contents that are currently visible and accessible to you.
${files.map(file => `
  ${file.filePath}:
  \`\`\`
  ${file.content}
  \`\`\`
`)}`;
}

export function projectInstructionsMsg(enhancedPrompt: string) {
  return `Current Message:

${enhancedPrompt}

File Changes:

Here is a list of all files that have been modified since the start of the conversation.
This information serves as the true contents of these files!

The contents include either the full file contents or a diff (when changes are smaller and localized).

Use it to:
 - Understand the latest file modifications
 - Ensure your suggestions build upon the most recent version of the files
 - Make informed decisions about changes
 - Ensure suggestions are compatible with existing code

IMPORTANT: Only provide files that include the implementation changes or modifications related to the project. Return only the files that differ from the originals provided to you.
- For example, If additional dependencies are required (beyond those in the provided package.json), include the updated package.json file with the new dependencies added.`
};

export function chatHistoryMsg() {
  return `Below is the conversation history, including all previous messages along with the most recent assistant response. 
Please reference this context to inform your future responses and maintain conversation continuity.`
}