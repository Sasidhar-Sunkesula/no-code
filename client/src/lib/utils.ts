import { TemplateFiles } from "@repo/common/types";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getAssistantMsg(templateFiles: TemplateFiles) {
  const assistantMessage = `
  <boltArtifact id="imported-files" title="Importing Starter Files" type="bundled">
  ${templateFiles.map((file) =>
    `<boltAction type="file" filePath="${file.path}">
${file.content}
</boltAction>`).join('\n')}
</boltArtifact>`;

  return assistantMessage;
}