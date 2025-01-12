import { FileExplorer } from "@/components/FileExplorer";
import { Input } from "@/components/Input";
import { Workbench } from "@/components/Workbench";
import { getWebContainer } from "@/config/webContainer";
import { useChat } from "@/hooks/useChat";
import { StreamingMessageParser } from "@/lib/StreamingMessageParser";
import { chatHistoryMsg, projectFilesMsg } from "@/lib/utils";
import type { File } from "@repo/common/types";
import { ChatMessage } from "@repo/common/zod";
import { WebContainer } from "@webcontainer/api";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Toaster } from "react-hot-toast";
import { useLocation, useParams } from "react-router-dom";

export default function ProjectInfo() {
  const params = useParams();
  const location = useLocation();
  const { enhancedPrompt, templateFiles, templatePrompt } = location.state as {
    enhancedPrompt: string;
    templateFiles: File[];
    templatePrompt: string;
  };
  const [refresh, setRefresh] = useState(false);

  const { loading, rawResponse, setMessages } = useChat({
    enhancedPrompt,
    templateFiles,
    templatePrompt,
    projectId: params.projectId,
  });

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
        content: projectFilesMsg(filesFromState),
      },
      {
        role: "user",
        content: chatHistoryMsg(),
      },
      {
        role: "user",
        content: `Previous Message #1:

${templatePrompt}

(Assistant response omitted)`,
      },
      {
        role: "user",
        content: `Previous Message #2:

${enhancedPrompt}

(Assistant response below)`,
      },
      {
        role: "user",
        content: `Assistant Response to Message #2:
${rawResponse.current}`,
      },
      {
        role: "user",
        content: `Current Message:
                    
${input}`,
      },
    ];
    setMessages(updatedMessages);
  }

  return (
    <>
      <Toaster />
      <div className="flex w-full h-full p-10">
        <div className="flex flex-col gap-y-5">
          <Workbench />
          <Input
            placeholder="How can we refine it..."
            handleSubmit={handleSubmit}
          />
        </div>
        <FileExplorer templateFiles={templateFiles} refresh={refresh} />
      </div>
    </>
  );
}
