import { FileExplorer } from "@/components/FileExplorer";
import { getWebContainer } from "@/config/webContainer";
import { API_URL } from "@/lib/constants";
import { StreamingMessageParser } from "@/lib/StreamingMessageParser";
import { projectFilesMsg, projectInstructionsMsg } from "@/lib/utils";
import type { TemplateFiles } from "@repo/common/types";
import { ChatMessages } from "@repo/common/zod";
import { WebContainer } from "@webcontainer/api";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useLocation, useParams } from "react-router-dom";
import { SSE } from "sse.js";

const messageParser = new StreamingMessageParser({
  callbacks: {
    onArtifactOpen: (data) => {
      // console.log("onArtifactOpen", data)
    },
    onArtifactClose: (data) => {
      // console.log("onArtifactClose", data)
    },
    onActionOpen: (data) => {
      // console.log(data);
    },
    onActionClose: (data) => {
      // console.log("onActionClose", data)
    },
  },
});

export default function ProjectInfo() {
  const files = {
    src: {
      directory: {
        "App.jsx": {
          file: {
            contents: `
  import React, { useState } from 'react';
  
  function App() {
    const [count, setCount] = useState(0);
  
    return (
      <div className="app">
        <h1>Welcome to React</h1>
        <div className="card">
          <button onClick={() => setCount(count + 1)}>
            Count is {count}
          </button>
        </div>
      </div>
    );
  }
  
  export default App;
            `,
          },
        },
        "main.jsx": {
          file: {
            contents: `
  import React from 'react';
  import ReactDOM from 'react-dom/client';
  import App from './App';
  import './index.css';
  
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
            `,
          },
        },
        "index.css": {
          file: {
            contents: `
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  }
  
  .app {
    max-width: 1280px;
    margin: 0 auto;
    padding: 2rem;
    text-align: center;
  }
  
  .card {
    padding: 2em;
  }
  
  button {
    padding: 0.6em 1.2em;
    font-size: 1em;
    font-weight: 500;
    cursor: pointer;
    background-color: #1a1a1a;
    color: white;
    border-radius: 8px;
    border: 1px solid transparent;
  }
  
  button:hover {
    border-color: #646cff;
  }
            `,
          },
        },
      },
    },
    "index.html": {
      file: {
        contents: `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>React + Vite</title>
    </head>
    <body>
      <div id="root"></div>
      <script type="module" src="/src/main.jsx"></script>
    </body>
  </html>
        `,
      },
    },
    "package.json": {
      file: {
        contents: `
  {
    "name": "react-vite-app",
    "private": true,
    "version": "0.0.0",
    "type": "module",
    "scripts": {
      "dev": "vite",
      "build": "vite build",
      "preview": "vite preview"
    },
    "dependencies": {
      "react": "^18.2.0",
      "react-dom": "^18.2.0"
    },
    "devDependencies": {
      "@vitejs/plugin-react": "^4.0.3",
      "vite": "^4.4.5"
    }
  }
        `,
      },
    },
    "vite.config.js": {
      file: {
        contents: `
  import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react';
  
  export default defineConfig({
    plugins: [react()],
    server: {
      port: 3000,
      strictPort: true,
    },
  });
        `,
      },
    },
  };

  const { projectId } = useParams();
  const location = useLocation();
  const { enhancedPrompt, templateFiles, templatePrompt } = location.state as {
    enhancedPrompt: string;
    templateFiles: TemplateFiles;
    templatePrompt: string;
  };
  const [loading, setLoading] = useState(true);
  const [webContainer, setWebContainer] = useState<WebContainer | null>(null);

  const [iframeUrl, setIframeUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!webContainer) {
      getWebContainer().then((container) => {
        setWebContainer(container);
        console.log("container started");
      });
    }
  }, []);

  useEffect(() => {
    let source: SSE | null = null;
    let buffer = "";

    function streamCode() {
      const reqBody: ChatMessages = [
        { role: "user", parts: [{ text: projectFilesMsg(templateFiles) }] },
        { role: "user", parts: [{ text: templatePrompt }] },
        {
          role: "user",
          parts: [{ text: projectInstructionsMsg(enhancedPrompt) }],
        },
      ];

      source = new SSE(`${API_URL}/api/chat`, {
        headers: { "Content-Type": "application/json" },
        payload: JSON.stringify({ messages: reqBody }),
      });

      if (!source) {
        toast.error("Failed to establish connection with the server.");
        setLoading(false);
        return;
      }

      source.onmessage = (event) => {
        const data = event.data;
        if (data.trim() !== "") {
          const { chunk } = JSON.parse(data);
          buffer += chunk;

          if (loading) {
            setLoading(false);
          }
          messageParser.parse("1234", buffer);
        }
      };

      source.onerror = () => {
        toast.error("An error occurred while streaming code.");
        setLoading(false);
        source?.close();
      };
    }

    if (projectId) streamCode();

    return () => {
      if (source) source.close();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex justify-center items-center">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <Toaster />
      <FileExplorer templateFiles={templateFiles} />
      <button
        onClick={async () => {
          if (webContainer) {
            await webContainer.mount(files);

            const installProcess = await webContainer.spawn("npm", ["install"]);

            installProcess.output.pipeTo(
              new WritableStream({
                write(chunk) {
                  console.log(chunk);
                },
              })
            );

            let tempRunProcess = await webContainer.spawn("npm", [
              "run",
              "dev",
            ]);

            tempRunProcess.output.pipeTo(
              new WritableStream({
                write(chunk) {
                  console.log(chunk);
                },
              })
            );

            webContainer.on("server-ready", (port, url) => {
              console.log(port, url);
              setIframeUrl(url);
            });
          }
        }}
        className="p-2 px-4 bg-slate-300 text-white"
      >
        run
      </button>
      {iframeUrl && webContainer && (
        <div className="flex w-full flex-col h-full">
          {/* <div className="address-bar">
            <input
              type="text"
              onChange={(e) => setIframeUrl(e.target.value)}
              value={iframeUrl}
              className="w-full p-2 px-4 bg-slate-200"
            />
          </div> */}
          <iframe src={iframeUrl} className="w-full h-full" />
        </div>
      )}
    </div>
  );
}
