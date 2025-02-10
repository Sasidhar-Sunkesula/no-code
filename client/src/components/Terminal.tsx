import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Terminal as XTerm } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { memo, useEffect, useRef } from "react";

export interface TerminalProps {
    className?: string;
    // theme: Theme;
    readonly?: boolean;
    onTerminalReady?: (terminal: XTerm) => void;
    onTerminalResize?: (cols: number, rows: number) => void;
}
export const Terminal = memo(({ className, onTerminalReady, onTerminalResize, readonly }: TerminalProps) => {
    const terminalElementRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<XTerm>(null);

    useEffect(() => {
        const element = terminalElementRef.current!;
        const fitAddon = new FitAddon();
        const webLinksAddon = new WebLinksAddon();

        const terminal = new XTerm({
            cursorBlink: true,
            convertEol: true,
            disableStdin: readonly,
            // theme: getTerminalTheme(readonly ? { cursor: '#00000000' } : {}),
            fontSize: 12,
            fontFamily: 'Menlo, courier-new, courier, monospace',
            
        });
        terminalRef.current = terminal;
        terminal.loadAddon(fitAddon);
        terminal.loadAddon(webLinksAddon);
        terminal.open(element);

        const resizeObserver = new ResizeObserver(() => {
            fitAddon.fit();
            onTerminalResize?.(terminal.cols, terminal.rows);
        });

        resizeObserver.observe(element);
        onTerminalReady?.(terminal);

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    // useEffect(() => {
    //     const terminal = terminalRef.current!;

    //     // we render a transparent cursor in case the terminal is readonly
    //     terminal.options.theme = getTerminalTheme(readonly ? { cursor: '#00000000' } : {});

    //     terminal.options.disableStdin = readonly;
    // }, [theme, readonly]);

    return (
        <div className={className} ref={terminalElementRef} />
    );
});
Terminal.displayName = 'Terminal';