import CodeMirror from "@uiw/react-codemirror";
import { javascript } from '@codemirror/lang-javascript';
import { vscodeLight, vscodeDark } from "@uiw/codemirror-theme-vscode";
import { useTheme } from "./ui/theme-provider";
import { codeEditorOptions } from "@/config/codeEditorOptions";

export function CodeEditor({ code }: {
    code: string,
    // setCode: React.Dispatch<React.SetStateAction<string>>
}) {
    const { theme } = useTheme();
    return (
        <CodeMirror
            value={code}
            height="75vh"
            width="50vw"
            style={{
                fontSize: '12px',
            }}
            theme={theme === 'dark' ? vscodeDark : vscodeLight}
            extensions={[javascript({ jsx: true, typescript: true })]}
            onChange={(val, viewUpdate) => {
                // setCode(val);
            }}
            basicSetup={codeEditorOptions}
        />
    )
}