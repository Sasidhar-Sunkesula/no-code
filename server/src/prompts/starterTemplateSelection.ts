import { STARTER_TEMPLATES, StarterTemplate } from "../constants";
import { HeadersInit } from "@repo/common/types";

export const starterTemplateSelectionPrompt = (templates: StarterTemplate[]) => `
You are an experienced developer who helps people choose the best starter template for their projects.

Available templates:
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
  <templateName>bolt-vite-react</templateName>
  <reasoning>Simple React setup perfect for building a todo application</reasoning>
</selection>
</example>

<example>
User: Write a script to generate numbers from 1 to 100
Response:
<selection>
  <templateName>bolt-node</templateName>
  <reasoning>A simple script that can be run in a Node.js environment</reasoning>
</selection>
</example>

Instructions:
1. Try to find the framework name from the prompt and use the tags to make a decision.
2. Do not select based on the order, go through all the templates and tags before making a decision.
3. For trivial tasks and simple scripts, recommend the "node" template
4. For more complex projects, recommend templates of libraries and frameworks from the provided list
5. Follow the exact XML format.
6. Consider both technical requirements and tags.
7. If no perfect match exists, recommend the closest option
8. If the user asks for a specific language or framework, prioritize that.
9. If no specific library or framework is mentioned, recommend the "react" template.

Ultra-Important: Provide only the selection tags in your response, no additional text. 
The template name you provide should be from the above provided available list only!`;

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
  filePath: string = ''
): Promise<{ name: string; filePath: string; content: string }[]> => {
  const baseUrl = 'https://api.github.com';
  const token = process.env.GITHUB_ACCESS_TOKEN;

  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
  };

  if (token) {
    headers.Authorization = 'token ' + token;
  }
  try {
    const response = await fetch(`${baseUrl}/repos/${repoName}/contents/${filePath}`, {
      headers: headers,
    });

    if (!response.ok) {
      throw new Error(`Unable to fetch repository contents: ${response.statusText}`);
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
            filePath: data.path,
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
              filePath: item.path,
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

export async function getTemplates(templateName: string) {
  const template = STARTER_TEMPLATES.find((t) => t.name == templateName);

  if (!template) {
    return null;
  }
  const { githubRepo, folder } = template;
  const files = await getGitHubRepoContent(githubRepo, folder);

  // Removes the folder from the file path, ex: node/package.json -> package.json, only needed when folder is provided
  let filteredFiles = folder
    ? files.map(file => ({ ...file, filePath: file.filePath.replace(`${folder}/`, '') }))
    : files;

  /*
   * ignoring common unwanted files
   * exclude    .git
   */
  filteredFiles = filteredFiles.filter((x) => x.filePath.startsWith('.git') == false);

  // exclude    lock files
  const commonLockFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
  filteredFiles = filteredFiles.filter((x) => commonLockFiles.includes(x.name) == false);

  // exclude    .bolt
  filteredFiles = filteredFiles.filter((x) => x.filePath.startsWith('.bolt') == false);

  // check for ignore file in .bolt folder
  const templateIgnoreFile = files.find((x) => x.filePath.startsWith('.bolt') && x.name == 'ignore');
  let ignorePatterns: string[] = [];
  if (templateIgnoreFile) {
    // redacting files specified in ignore file
    ignorePatterns = templateIgnoreFile.content.split('\n').map((x) => x.trim()).filter(x => x.length > 0);
  }
  const templatePromptFile = files.filter((x) => x.filePath.startsWith('.bolt')).find((x) => x.name == 'prompt');

  return {
    templateFiles: filteredFiles,
    ignorePatterns: ignorePatterns,
    templatePrompt: templatePromptFile?.content ?? '',
  };
}