import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildHierarchy } from "@/lib/formatterHelpers";
import { FileExplorer } from "./FileExplorer";
import PreviewCode from "./PreviewCode";
import { Terminal } from "./Terminal";
import { useShallow } from "zustand/react/shallow";
import { useGeneralStore } from "@/store/generalStore";
import { useProjectStore } from "@/store/projectStore";

export function TabsSwitch() {
    const { setTerminal, currentTab, setCurrentTab } = useGeneralStore(
        useShallow(state => ({
            setTerminal: state.setTerminal,
            currentTab: state.currentTab,
            setCurrentTab: state.setCurrentTab
        }))
    );
    const { projectFiles } = useProjectStore(
        useShallow(state => ({
            projectFiles: state.projectFiles,
        }))
    );
    const folders = buildHierarchy(projectFiles);

    return (
        <Tabs
            value={currentTab}
            onValueChange={(value) => setCurrentTab(value as 'code' | 'preview')}
            className="col-span-8"
        >
            <TabsList className="bg-secondary rounded-3xl space-x-2 px-1">
                <TabsTrigger className="rounded-2xl text-xs" value="code">Code</TabsTrigger>
                <TabsTrigger className="rounded-2xl text-xs" value="preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="code" className="space-y-3">
                <FileExplorer folders={folders} />
                {/* <Terminal onTerminalReady={setTerminal} /> */}
            </TabsContent>
            <TabsContent value="preview" className="h-full">
                <PreviewCode />
            </TabsContent>
            <div className={`${currentTab === "code" ? "block" : "hidden"} overflow-hidden`}>
                <Terminal onTerminalReady={setTerminal} />
            </div>
        </Tabs>
    );
}