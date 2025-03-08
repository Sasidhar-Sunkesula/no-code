import { HeadersInit, stripIndents } from "@repo/common/types";
import { STARTER_TEMPLATES, StarterTemplate } from "../constants";

export const starterTemplateSelectionPrompt = (templates: StarterTemplate[]) => stripIndents`
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
  <projectTitle>{Small project title in 25 characters or less}</projectTitle>
</selection>

Examples:

<example>
User: I need to build a todo app
Response:
<selection>
  <templateName>bolt-vite-react</templateName>
  <projectTitle>React Todo App</projectTitle>
</selection>
</example>

<example>
User: Write a script to generate numbers from 1 to 100
Response:
<selection>
  <templateName>bolt-node</templateName>
  <projectTitle>Generate Numbers</projectTitle>
</selection>
</example>

<example>
User: How are you?
Response:
<selection>
  <templateName>bolt-vite-react</templateName>
  <projectTitle>Simple React project.</projectTitle>
</selection>
</example>

Instructions:
1. Try to find the framework name from the prompt and use the tags to make a decision.
2. Do not select based on the order, go through all the templates and tags before making a decision.
3. For simple tasks that only require basic scripting (like calculations, file operations, or data processing), 
   use the "node" template. However, skip this rule if the message is conversational (like greetings) or irrelevant to web development, programming, or software engineering.
4. For more complex projects, recommend templates of libraries and frameworks from the provided list
5. Follow the exact XML format.
6. Consider both technical requirements and tags.
7. If no perfect match exists, recommend the closest option
8. If the user asks for a specific language or framework, prioritize that.
9. Default template selection:
   - If the message is a greeting (like "hi", "hello"), or unrelated to projects, irrelevant to web development, programming, or software engineering,
   - OR if no specific framework/library is mentioned
   Then recommend the "bolt-vite-react" i.e., the "react" template as the default choice.
10. Give the project a name that accurately represents the task, but not too long(less than 25 characters).
Ultra-Important: Provide only the selection tags in your response, no additional text. 
The template name you provide should be from the above provided available list only!`;

export const parseSelectedTemplate = (llmOutput: string): { templateName: string | null, projectTitle: string | null } => {
  // Extract content between <templateName> tags
  const templateNameMatch = llmOutput.match(/<templateName>(.*?)<\/templateName>/);

  // Extract content between <projectTitle> tags
  const projectTitleMatch = llmOutput.match(/<projectTitle>(.*?)<\/projectTitle>/);

  return {
    templateName: templateNameMatch ? templateNameMatch[1].trim() : null,
    projectTitle: projectTitleMatch ? projectTitleMatch[1].trim() : null
  };
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