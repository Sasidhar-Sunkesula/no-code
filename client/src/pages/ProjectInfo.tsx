import { FileExplorer } from "@/components/FileExplorer";
import { Input } from "@/components/Input";
import { Workbench } from "@/components/Workbench";
import { getWebContainer } from "@/config/webContainer";
import { API_URL } from "@/lib/constants";
import { StreamingMessageParser } from "@/lib/StreamingMessageParser";
import { chatHistoryMsg, projectFilesMsg, projectInstructionsMsg } from "@/lib/utils";
import type { File } from "@repo/common/types";
import { ChatMessage } from "@repo/common/zod";
import { WebContainer } from "@webcontainer/api";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
    const [loading, setLoading] = useState(true);
    const { projectId } = useParams();
    const location = useLocation();
    const { enhancedPrompt, templateFiles, templatePrompt } = location.state as {
        enhancedPrompt: string,
        templateFiles: File[],
        templatePrompt: string,
    };
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'user', parts: [{ text: projectFilesMsg(templateFiles) }] },
        { role: 'user', parts: [{ text: templatePrompt }] },
        { role: 'user', parts: [{ text: projectInstructionsMsg(enhancedPrompt) }] }
    ]);
    const rawResponse = useRef("");

  useEffect(() => {
    let source: SSE | null = null;
    let buffer = "";

        function streamCode() {
            source = new SSE(`${API_URL}/api/chat`, {
                headers: { "Content-Type": "application/json" },
                payload: JSON.stringify({ messages: messages }),
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
                    rawResponse.current += buffer;
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
    function handleSubmit(input: string) {
        const filesFromState = StreamingMessageParser.filesMap.get("1234") ?? [];
        const updatedMessages: ChatMessage[] = [
            {
                role: "user",
                parts: [{ text: projectFilesMsg(filesFromState) }]
            },
            {
                role: "user",
                parts: [{ text: chatHistoryMsg() }]
            },
            {
                role: "user",
                parts: [{
                    text: `Previous Message #1:

${templatePrompt}

(Assistant response omitted)`
                }]
            },
            {
                role: "user",
                parts: [{
                    text: `Previous Message #2:

${enhancedPrompt}

(Assistant response below)`
                }]
            },
            {
                role: "user",
                parts: [{
                    text: `Assistant Response to Message #2:
                    ${rawResponse}
                    `
                }]
            },
            {
                role: "user",
                parts: [{
                    text: `Current Message:
                    
                    ${input}`
                }]
            }
        ]
        console.log(input);
    }

  return (
    <>
      <Toaster />
            <div className="flex w-full h-full justify-between p-10">
                <div className="flex flex-col gap-y-5">
                    <Workbench />
                    <Input placeholder="How can we refine it..." handleSubmit={handleSubmit} />
                </div>
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
        </>
  );
}
