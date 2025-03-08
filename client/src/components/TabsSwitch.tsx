import { useFilesStore } from "@/store/filesStore";
import { useGeneralStore } from "@/store/generalStore";
import { useProjectStore } from "@/store/projectStore";
import { History, Save } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useShallow } from "zustand/react/shallow";
import { FileExplorer } from "./FileExplorer";
import { Preview } from "./Preview";
import { Terminal } from "./Terminal";
import { Button } from "./ui/button";
import { customToast } from "@/lib/utils";

export function TabsSwitch({ initializingProject }: { initializingProject: boolean }) {
    const { setTerminal, currentTab, setCurrentTab } = useGeneralStore(
        useShallow(state => ({
            setTerminal: state.setTerminal,
            currentTab: state.currentTab,
            setCurrentTab: state.setCurrentTab
        }))
    );
    const { currentProjectId } = useProjectStore(
        useShallow(state => ({
            currentProjectId: state.currentProjectId,
        }))
    );
    const { saveModifiedFile, resetFile, selectedFile, isFileModified } = useFilesStore(
        useShallow(state => ({
            saveModifiedFile: state.saveModifiedFile,
            resetFile: state.resetFile,
            selectedFile: state.selectedFile,
            isFileModified: state.isFileModified,
        }))
    );
    const showFileActions = selectedFile && isFileModified(selectedFile);

    return (
        <>
            <Toaster />
            <div className={`col-span-8 bg-gray-100 dark:bg-gray-800 rounded-lg ${initializingProject ? 'hidden' : 'block'}`}>
                <div className="flex items-center justify-between px-2 pt-2 pb-2 pr-6 rounded-t-lg">
                    <div className="flex items-center rounded-3xl space-x-1 h-8 bg-primary-foreground max-w-fit px-1 py-3">
                        <Button
                            onClick={() => setCurrentTab('code')}
                            variant={'ghost'}
                            size={'sm'}
                            className={`rounded-2xl text-xs h-7 ${currentTab === 'code' && 'bg-sky-100 dark:bg-gray-800 hover:bg-sky-100 hover:text-blue-500 text-blue-500'}`}>
                            Code
                        </Button>
                        <Button
                            onClick={() => setCurrentTab('preview')}
                            variant={'ghost'}
                            size={'sm'}
                            className={`rounded-2xl text-xs h-7 ${currentTab === 'preview' && 'bg-sky-100 dark:bg-gray-800 hover:bg-sky-100 hover:text-blue-500 text-blue-500'}`}>
                            Preview
                        </Button>
                    </div>
                    <div className={`flex items-center gap-x-2 ${currentTab === 'code' && showFileActions ? 'visible' : 'hidden'}`}>
                        <Button
                            variant={'ghost'}
                            size={'sm'}
                            className="text-xs h-8 hover:bg-gray-200 text-gray-500 dark:bg-gray-800"
                            onClick={async () => {
                                if (currentProjectId && selectedFile) {
                                    const result = await saveModifiedFile(currentProjectId, selectedFile);
                                    if (result.success) {
                                        toast.success('File saved successfully');
                                    } else {
                                        customToast(result?.error || 'Failed to save file');
                                    }
                                }
                            }}
                        >
                            <Save className="h-4 w-4" />
                            Save
                        </Button>
                        <Button
                            variant={'ghost'}
                            size={'sm'}
                            className="text-xs h-8 hover:bg-gray-200 text-gray-500 dark:bg-gray-800"
                            onClick={() => selectedFile && resetFile(selectedFile)}
                        >
                            <History className="h-4 w-4" />
                            Reset
                        </Button>
                    </div>
                </div>

                {/* Code tab content */}
                <div className={`${currentTab === 'code' ? 'block' : 'hidden'}`}>
                    <FileExplorer />
                </div>

                {/* Preview tab content */}
                <div className={`h-[calc(95vh-5rem)] ${currentTab === 'preview' ? 'block' : 'hidden'}`}>
                    <Preview />
                </div>

                {/* Terminal (only visible in code tab) */}
                <div className={`overflow-hidden h-[20vh] ${currentTab === 'code' ? 'block' : 'hidden'}`}>
                    <Terminal onTerminalReady={setTerminal} />
                </div>
            </div>
        </>
    );
}
