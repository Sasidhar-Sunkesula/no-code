import { getWebContainer } from "@/config/webContainer";
import { Folders } from "@repo/common/types";
import { WebContainer } from "@webcontainer/api";
import { useEffect, useState } from "react";

interface ContentFile {
  file: {
    contents: string;
  };
}

interface Directory {
  directory: Record<string, ContentFile | Directory>;
}

type Files = Record<string, ContentFile | Directory>;

const PreviewCode = ({ folders }: { folders: Folders[] }) => {
  const [url, setUrl] = useState<string>("");
  const [webContainer, setWebContainer] = useState<WebContainer | null>(null);

  function formatFilesToMountFn(folders: Folders[]): Files {
    const result: Files = {};

    function processItems(items: Folders[], parent: Files) {
      items.forEach((item) => {
        if (item.type === "file") {
          parent[item.name] = {
            file: {
              contents: item.content || "",
            },
          };
        } else if (item.type === "folder") {
          parent[item.name] = {
            directory: {},
          };
          processItems(
            item.children || [],
            (parent[item.name] as Directory).directory
          );
        }
      });
    }

    processItems(folders, result);
    return result;
  }

  async function installAndRunCont() {
    const formattedFiles = formatFilesToMountFn(folders);
    console.log(formattedFiles, "forrmm");

    if (webContainer) {
      webContainer.mount(formattedFiles);
      console.log("mount success", formattedFiles);

      const installProcess = await webContainer.spawn("npm", ["install"]);

      installProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            console.log(data);
          },
        })
      );

      await webContainer.spawn("npm", ["run", "dev"]);

      // Wait for `server-ready` event
      webContainer.on("server-ready", (port, url) => {
        // ...
        console.log(url);
        console.log(port);
        setUrl(url);
      });
    }
  }

  useEffect(() => {
    if (!webContainer) {
      getWebContainer().then((container) => {
        setWebContainer(container);
        console.log("container started");
      });
    }
  }, []);

  useEffect(() => {
    installAndRunCont();
  }, [webContainer]);
  return (
    <div className="h-full flex items-center justify-center text-gray-400">
      {!url && (
        <div className="text-center">
          <p className="mb-2">Loading...</p>
        </div>
      )}
      {url && <iframe width={"100%"} height={"100%"} src={url} />}
    </div>
  );
};

export default PreviewCode;
