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

interface File {
  file: {
    contents: string;
  };
}

interface Directory {
  directory: Record<string, File | Directory>;
}

type Files = Record<string, File | Directory>;

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
  const [mountFiles, setMountFiles] = useState<Files | null>(null);

  function convertToFilesFormat(input: TemplateFiles): Files {
    const files: Files = {};

    input.forEach(({ path, content }) => {
      const parts = path.split("/");
      let current = files;

      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          // Last part is the file
          current[part] = {
            file: {
              contents: content,
            },
          };
        } else {
          // Intermediate directories
          if (!current[part]) {
            current[part] = {
              directory: {},
            };
          }
          current = (current[part] as Directory).directory;
        }
      });
    });

    return files;
  }

  useEffect(() => {
    if (!webContainer) {
      getWebContainer().then((container) => {
        setWebContainer(container);
        console.log("container started");
      });
    }
    console.log("files are", templateFiles);
    const formattedTemplateFiles = convertToFilesFormat(templateFiles);
    setMountFiles(formattedTemplateFiles);
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
          if (webContainer && mountFiles) {
            console.log("mounting files are:", mountFiles);

            await webContainer.mount(mountFiles);

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
