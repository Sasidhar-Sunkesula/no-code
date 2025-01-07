import ignore from "ignore";
import { STARTER_TEMPLATES, StarterTemplate } from "../constants";
import { HeadersInit } from "@repo/common/types";

export const starterTemplateSelectionPrompt = (templates: StarterTemplate[]) => `
You are an experienced developer who helps people choose the best starter template for their projects.

Available templates:
<template>
  <name>blank</name>
  <description>Empty starter for simple scripts and trivial tasks that don't require a full template setup</description>
  <tags>basic, script</tags>
</template>
${templates.map((template) => `
<template>
  <name>${template.name}</name>
  <description>${template.description}</description>
  ${template.tags ? `<tags>${template.tags.join(', ')}</tags>` : ''}
</template>`
).join('\n')}

Response Format:
<selection>
  <templateName>{selected template name}</templateName>
  <reasoning>{brief explanation for the choice}</reasoning>
</selection>

Examples:

<example>
User: I need to build a todo app
Response:
<selection>
  <templateName>react-basic-starter</templateName>
  <reasoning>Simple React setup perfect for building a todo application</reasoning>
</selection>
</example>

<example>
User: Write a script to generate numbers from 1 to 100
Response:
<selection>
  <templateName>blank</templateName>
  <reasoning>This is a simple script that doesn't require any template setup</reasoning>
</selection>
</example>

Instructions:
1. Try to find the framework name from the prompt and use the tags to make a decision.
2. Do not select based on the order, go through all the templates and tags before making a decision.
3. For trivial tasks and simple scripts, always recommend the blank template
4. For more complex projects, recommend templates from the provided list
5. Follow the exact XML format.
6. Consider both technical requirements and tags
7. If no perfect match exists, recommend the closest option

Important: Provide only the selection tags in your response, no additional text. 
The template name you provide should be from the above provided available list only!
`;

export const parseSelectedTemplate = (llmOutput: string): string | null => {
  // Extract content between <templateName> tags
  const templateNameMatch = llmOutput.match(/<templateName>(.*?)<\/templateName>/);
  if (!templateNameMatch) {
    return null;
  }
  return templateNameMatch[1].trim();
};

const getGitHubRepoContent = async (
  repoName: string,
  path: string = ''
): Promise<{ name: string; path: string; content: string }[]> => {
  const baseUrl = 'https://api.github.com';
  const token = process.env.GITHUB_ACCESS_TOKEN;

  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
  };

  if (token) {
    headers.Authorization = 'token ' + token;
  }
  try {
    const response = await fetch(`${baseUrl}/repos/${repoName}/contents/${path}`, {
      headers: headers,
    });

    if (!response.ok) {
      throw new Error(`Github Rate Limit Hit!`);
    }
    const data: any = await response.json();

    // Return content if it's a file(not an array)
    if (!Array.isArray(data)) {
      if (data.type === "file") {
        // If it's a file, get its content and we need to only get content if the data.content is available
        if (!data.content) {
          return [];
        }
        const content = Buffer.from(data.content, 'base64').toString("utf-8");
        return [
          {
            name: data.name,
            path: data.path,
            content,
          },
        ];
      }
    }
    // Process directory contents recursively
    const contents = await Promise.all(
      data.map(async (item: any) => {
        if (item.type === "dir") {
          // Recursively get contents of subdirectories
          return await getGitHubRepoContent(repoName, item.path);
        } else if (item.type === 'file') {
          // Fetch file content
          const fileResponse = await fetch(item.url, {
            headers: headers,
          });
          const fileData: any = await fileResponse.json();
          if (!fileData.content) {
            return [];
          }
          const content = Buffer.from(fileData.content, "base64").toString("utf-8"); // Decode base64 content

          return [
            {
              name: item.name,
              path: item.path,
              content,
            },
          ];
        }

        return [];
      }),
    );
    // Flatten the array of contents
    return contents.flat();
  } catch (error) {
    throw error;
  }
}

export async function getTemplates(templateName: string, title?: string) {
  const template = STARTER_TEMPLATES.find((t) => t.name == templateName);

  if (!template) {
    return null;
  }
  const githubRepo = template.githubRepo;
  const files = await getGitHubRepoContent(githubRepo);

  let filteredFiles = files;

  /*
   * ignoring common unwanted files
   * exclude    .git
   */
  filteredFiles = filteredFiles.filter((x) => x.path.startsWith('.git') == false);

  // exclude    lock files
  const commonLockFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
  filteredFiles = filteredFiles.filter((x) => commonLockFiles.includes(x.name) == false);

  // exclude    .bolt
  filteredFiles = filteredFiles.filter((x) => x.path.startsWith('.bolt') == false);

  // check for ignore file in .bolt folder
  const templateIgnoreFile = files.find((x) => x.path.startsWith('.bolt') && x.name == 'ignore');

  const filesToImport = {
    files: filteredFiles,
    ignoreFile: [] as typeof filteredFiles,
  };

  if (templateIgnoreFile) {
    // redacting files specified in ignore file
    const ignorePatterns = templateIgnoreFile.content.split('\n').map((x) => x.trim());
    const ig = ignore().add(ignorePatterns);

    // filteredFiles = filteredFiles.filter(x => !ig.ignores(x.path))
    const ignoredFiles = filteredFiles.filter((x) => ig.ignores(x.path));

    filesToImport.files = filteredFiles;
    filesToImport.ignoreFile = ignoredFiles;
  }

  const assistantMessage = `
<boltArtifact id="imported-files" title="${title || 'Importing Starter Files'}" type="bundled">
${filesToImport.files
      .map(
        (file) =>
          `<boltAction type="file" filePath="${file.path}">
${file.content}
</boltAction>`,
      )
      .join('\n')}
</boltArtifact>
`;
  let userMessage = ``;
  const templatePromptFile = files.filter((x) => x.path.startsWith('.bolt')).find((x) => x.name == 'prompt');

  if (templatePromptFile) {
    userMessage = `
TEMPLATE INSTRUCTIONS:
${templatePromptFile.content}

IMPORTANT: Do not Forget to install the dependencies before running the app
---
`;
  }

  if (filesToImport.ignoreFile.length > 0) {
    userMessage =
      userMessage +
      `
STRICT FILE ACCESS RULES - READ CAREFULLY:

The following files are READ-ONLY and must never be modified:
${filesToImport.ignoreFile.map((file) => `- ${file.path}`).join('\n')}

Permitted actions:
✓ Import these files as dependencies
✓ Read from these files
✓ Reference these files

Strictly forbidden actions:
❌ Modify any content within these files
❌ Delete these files
❌ Rename these files
❌ Move these files
❌ Create new versions of these files
❌ Suggest changes to these files

Any attempt to modify these protected files will result in immediate termination of the operation.

If you need to make changes to functionality, create new files instead of modifying the protected ones listed above.
---
`;
  }

  userMessage += `
  ---
  The starter template files have been imported successfully. Based on the original request, please proceed to generate the implementation code for the project. Use the imported files and structure them as needed, adhering to the following constraints:
  - Only modify the files that are explicitly allowed to be changed.
  - Create new files where necessary to add features or implement functionality.
  - Address the project requirements.
  - Do not forget to divide the implementation into logical components and files.
  - Do not create big monolithic files. Split the code into smaller, manageable files.
  
  For example, if this is a TODO app, implement features like task creation, updates, deletion, and filtering in the appropriate files. Provide explanations or comments in the code if decisions are non-trivial.
  ---
  `;

  return {
    assistantMessage,
    userMessage,
  };
}