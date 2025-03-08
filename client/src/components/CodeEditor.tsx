import { codeEditorOptions } from "@/config/codeEditorOptions";
import { getLanguageExtension, SupportedLanguages } from "@/lib/getLanguageExtension";
import { useFilesStore } from "@/store/filesStore";
import { useGeneralStore } from "@/store/generalStore";
import { EditorView } from "@codemirror/view";
import { vscodeDark, vscodeLight } from "@uiw/codemirror-theme-vscode";
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { useTheme } from "./ui/theme-provider";

export function CodeEditor({ code, language = 'javascript' }: {
    code: string,
    language?: SupportedLanguages
}) {
    const { theme } = useTheme();
    const { wordWrap } = useGeneralStore(
        useShallow(state => ({
            wordWrap: state.wordWrap
        }))
    );
    const { updateFile, selectedFile } = useFilesStore(
        useShallow(state => ({
            updateFile: state.updateFile,
            selectedFile: state.selectedFile
        }))
    );
    const editorRef = useRef<ReactCodeMirrorRef>(null);

    useEffect(() => {
        if (editorRef.current) {
            const editor = editorRef.current.view;
            if (editor) {
                const scrollInfo = editor.scrollDOM.scrollHeight;
                editor.scrollDOM.scrollTo(0, scrollInfo);
            }
        }
    }, [code]);

    return (
        <CodeMirror
            ref={editorRef}
            value={code}
            height="65vh"
            style={{
                fontSize: '12px'
            }}
            theme={theme === 'dark' ? vscodeDark : vscodeLight}
            extensions={[
                getLanguageExtension(language),
                ...(wordWrap ? [EditorView.lineWrapping] : [])
            ]}
            onChange={(value) => {
                if (selectedFile) {
                    updateFile(selectedFile, value);
                }
            }}
            basicSetup={codeEditorOptions}
        />
    )
}