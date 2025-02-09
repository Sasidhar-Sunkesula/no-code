import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileExplorer } from "./FileExplorer";
import PreviewCode from "./PreviewCode";
import { Terminal } from "./Terminal";
import { useShallow } from "zustand/react/shallow";
import { useGeneralStore } from "@/store/generalStore";

export function TabsSwitch() {
    const { setTerminal, currentTab, setCurrentTab } = useGeneralStore(
        useShallow(state => ({
            setTerminal: state.setTerminal,
            currentTab: state.currentTab,
            setCurrentTab: state.setCurrentTab
        }))
    );

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
                <FileExplorer />
                <Terminal onTerminalReady={setTerminal} />
            </TabsContent>
            <TabsContent value="preview" className="h-full">
                <PreviewCode />
            </TabsContent>
        </Tabs>
    );
}