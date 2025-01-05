import { ParsedXML } from "@repo/common/types";

export function parseXML(content: string) {
    const result: ParsedXML = {
        projectTitle: "",
        files: []
    }
    const title = content.match(/<boltArtifact id=".+?" title="(.+?)">/)?.[1];
    result.projectTitle = title || "";
    const files = content.match(/<boltAction type="file" filePath="(.+?)">([\s\S]+?)<\/boltAction>/g);
    if (files) {
        for (const file of files) {
            const filePath = file.match(/<boltAction type="file" filePath="(.+?)">/)?.[1];
            let fileContent = file.match(/<boltAction type="file" filePath=".+?">([\s\S]+?)<\/boltAction>/)?.[1];

            if (filePath && fileContent) {
                const needToRemove = ["```jsx", "```", "```javascript", "```typescript", "```tsx", "```ts", "```js", "```html", "```css"];
                for (const remove of needToRemove) {
                    fileContent = fileContent.replace(new RegExp(remove, "g"), "");
                }
                result.files.push({
                    path: filePath,
                    content: fileContent
                })
            }
        }
    }
    return result;
}