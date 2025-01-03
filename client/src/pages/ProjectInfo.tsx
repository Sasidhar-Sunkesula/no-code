import { API_URL } from "@/lib/constants";
import type { Template } from "@repo/common/types";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useParams } from "react-router";

export default function ProjectInfo() {
    const [loading, setLoading] = useState(true);
    const [template, setTemplate] = useState<Template | null>(null);
    const { projectId } = useParams();

    useEffect(() => {
        async function fetchTemplate() {
            try {
                // const response = await fetch(`${API_URL}/api/template/${projectId}`);
                // const result = await response.json();
                // if (!response.ok) {
                //     throw new Error(result.msg);
                // }
                // setTemplate(result.template);
                const data = await fetch(`${API_URL}/api/chat`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        messages: [
                            {
                                parts: [{
                                    text: `
                            # Project Files
                            The following is a list of all project files and their complete contents that are currently visible and accessible to you.
                            "package.json": "n{n  "name": "todo-app",n  "version": "0.1.0",n  "private": true,n  "scripts": {n    "dev": "vite",n    "build": "vite build",n    "preview": "vite preview"n  },n  "dependencies": {n    "lucide-react": "^0.344.0",n    "react": "^18.3.1",n    "react-dom": "^18.3.1"n  },n  "devDependencies": {n    "@types/react": "^18.3.5",n    "@types/react-dom": "^18.3.0",n    "@vitejs/plugin-react": "^4.3.1",n    "autoprefixer": "^10.4.18",n    "postcss": "^8.4.35",n    "tailwindcss": "^3.4.1",n    "typescript": "^5.5.3",n    "vite": "^5.4.2"n  }n}n  ",
                            "tailwind.config.js": "n/** @type {import('tailwindcss').Config} */nmodule.exports = {n  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],n  theme: {n    extend: {},n  },n  plugins: [],n}n  ",
                            "postcss.config.js": "nmodule.exports = {n  plugins: {n    tailwindcss: {},n    autoprefixer: {},n  },n}n  ",
                            "tsconfig.json": "n{n  "compilerOptions": {n    "target": "ES2020",n    "module": "ESNext",n    "strict": true,n    "jsx": "react-jsx",n    "esModuleInterop": true,n    "skipLibCheck": true,n    "forceConsistentCasingInFileNames": true,n    "noImplicitAny": false,n    "moduleResolution": "node",n    "resolveJsonModule": true,n    "isolatedModules": true,n    "noEmit": truen  },n  "include": [n    "src"n  ]n}n  ",
                            "vite.config.ts": "nimport { defineConfig } from 'vite';nimport react from '@vitejs/plugin-react';nn// https://vitejs.dev/config/nexport default defineConfig({n  plugins: [react()],n  optimizeDeps: {n    exclude: ['lucide-react'],n  },n});n  ",
                            "index.html": "n<!DOCTYPE html>n<html lang="en">n  <head>n    <meta charset="UTF-8" />n    <link rel="icon" type="image/svg+xml" href="/vite.svg" />n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />n    <title>Todo App</title>n  </head>n  <body>n    <div id="root"></div>n    <script type="module" src="/src/main.tsx"></script>n  </body>n</html>n  ",
                            "src/main.tsx": "nimport React from 'react';nimport ReactDOM from 'react-dom/client';nimport App from './App';nimport './index.css';nnReactDOM.createRoot(document.getElementById('root')!).render(n  <React.StrictMode>n    <App />n  </React.StrictMode>n);n  ",
                            "src/App.tsx": "nimport React from 'react';nnfunction App() {n  return (n    <div className="p-4">n      <h1 className="text-3xl font-bold underline">Todo App</h1>n      <p>Start editing to see some magic happen!</p>n    </div>n  );n}nnexport default App;n  ",
                            "src/index.css": "n@tailwind base;n@tailwind components;n@tailwind utilities;n  "
                            
                            Here is a list of files that exist on the file system but are not being shown to you:
                              - .gitignore
                              - package-lock.json
                            `
                                }],
                                role: "user"
                            },
                            {
                                role: "user",
                                parts: [{
                                    text:
                                        `
                                        For all designs I ask you to make, have them be beautiful, not cookie cutter. 
                                        Make webpages that are fully featured and worthy for production. Use typescript only unless specified explicitly.
                                        By default, this template supports JSX syntax with Tailwind CSS classes, React hooks, and Lucide React for icons. 
                                        Do not install other packages for UI themes, icons, etc unless absolutely necessary or I request them. 
                                        Use icons from lucide-react for logos. Use stock photos from unsplash where appropriate, only valid URLs you know exist. 
                                        Do not download the images, only link to them in image tags. 
                                        VERY IMPORTANT: Only consider this if the project is a frontend based project, If the project that you 
                                        are generating is a purely backend based project, you can ignore this message.
                `
                                }]
                            },
                            {
                                role: "user",
                                parts: [{
                                    text: `
                            create a todo app
                Here is a list of all files that have been modified since the start of the conversation.
                This information serves as the true contents of these files!
                
                The contents include either the full file contents or a diff (when changes are smaller and localized).
                
                Use it to:
                 - Understand the latest file modifications
                 - Ensure your suggestions build upon the most recent version of the files
                 - Make informed decisions about changes
                 - Ensure suggestions are compatible with existing code
                ` }]
                            }]
                    })
                });
                const result = await data.json()
                console.log(result);

                // const eventSource = new EventSource(`${API_URL}/api/chat`);
                // eventSource.onmessage = (event) => {
                //     const data = JSON.parse(event.data);
                //     if (data) {
                //         console.log(event.data);
                //     }
                // }
                // eventSource.onerror = (error) => {
                //     eventSource.close();
                //     console.error(error);
                // }
            } catch (error) {
                setLoading(false);
                toast.error(error instanceof Error ? error.message : "Failed to fetch template");
            }
        }
        if (projectId) fetchTemplate();
    }, [API_URL, projectId]);

    if (loading) {
        return <div className="min-h-screen w-full flex justify-center items-center">
            <Loader2 className="w-5 h-5 animate-spin" />
        </div>
    }
    return (
        <div>
            <Toaster />
        </div>
    )
}