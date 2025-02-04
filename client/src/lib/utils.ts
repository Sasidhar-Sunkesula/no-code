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

export function projectFilesMsg(files: File[], ignorePatterns: string[]) {
  // Filter out files that match any of the ignore patterns
  const filteredFiles = files.filter(file => !ignorePatterns.some(pattern => file.filePath.includes(pattern)));
  return `Project Files:
The following is a list of all project files and their complete contents that are currently visible and accessible to you.
${filteredFiles.map(file => `
  ${file.filePath}:
  \`\`\`
  ${file.content}
  \`\`\`
`)}`;
};

export const projectInstructionsMsg = (enhancedPrompt: string) => `
⚠️ STRICT IMPLEMENTATION REQUIREMENTS

1. ORDER OF OPERATIONS
   FOLLOW THIS SEQUENCE:
   1. Update dependencies only if needed
   2. Run install command
   3. Make file changes
   4. Start application

2. DEPENDENCY MANAGEMENT
   - IF adding dependencies:
     1. Update dependency manifest first
     2. Run package manager install command
   - IF NO new dependencies:
     - Still run install command first

3. CODE QUALITY
   - NO placeholder/commented code
   - NO incomplete implementations
   - NO TODO comments
   - MUST provide full, working code
   - NO example/template code

4. FILE MODIFICATIONS
   - Return ONLY modified/new files
   - Include COMPLETE file contents
   - NO partial updates
   - Each file must be production-ready

5. EXECUTION SEQUENCE
   Step 1: Dependencies
   - Run appropriate install command (Ex: npm install, yarn install, pnpm install, etc.)
   
   Step 2: Development
   - Start development server (Ex: npm run dev, yarn dev, pnpm dev, etc.)

YOUR CURRENT TASK:
${enhancedPrompt}

VALIDATION CHECKLIST:
✓ Complete, working code (no placeholders)
✓ Dependencies updated before install
✓ npm install runs first
✓ All file changes after install
✓ Dev server starts last
✓ No TODO/example code
✓ Full implementation included
✓ Follow the same language as the original code for a particular file. (Ex: If the original code is in TypeScript, the updated code must also be in TypeScript)

Don'ts:
✗ Don't merge commands, run them separately. 
Ex: Don't run 'npm install && npm run dev'. Instead, run 'npm install' first, then 'npm run dev'.

Treat these as strict requirements. Any deviation will result in rejection.`;

export function chatHistoryMsg() {
  return `Below is the conversation history, including all previous messages along with the most recent assistant response. 
Please reference this context to inform your future responses and maintain conversation continuity. Only install dependencies if the dependency management file (Ex:package.json) has been updated.`
};

export const installCommands = ['npm install', 'yarn install', 'pnpm install', 'npm i'];

export const devCommands = ['npm run dev', 'npm run start', 'npm start', 'yarn dev', 'yarn start', 'pnpm dev', 'pnpm start', 'pnpm run dev', 'pnpm run start'];

export function isInstallCommand(command: string) {
  return installCommands.some(cmd => cmd === command)
}

export function isDevCommand(command: string) {
  return devCommands.some(cmd => cmd === command)
}
