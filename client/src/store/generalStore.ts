import { WebContainerProcess } from '@webcontainer/api';
import type { Terminal as XTerm } from "@xterm/xterm";
import { create } from 'zustand';

export interface GeneralStoreState {
    terminal: XTerm | null,
    shellProcess: WebContainerProcess | null;
    currentTab: 'code' | 'preview';
    wordWrap: boolean;
    reasoning: boolean;

    // Actions
    setTerminal: (terminal: XTerm) => void;
    setShellProcess: (process: WebContainerProcess | null) => void;
    setCurrentTab: (tab: 'code' | 'preview') => void;
    setWordWrap: (wordWrap: boolean) => void;
    setReasoning: (reasoning: boolean) => void;
}

export const useGeneralStore = create<GeneralStoreState>((set) => ({
    terminal: null,
    shellProcess: null,
    currentTab: 'code',
    wordWrap: true,
    reasoning: false,
    setTerminal: (terminal) => set({ terminal }),
    setShellProcess: (process) => set({ shellProcess: process }),
    setCurrentTab: (tab) => set({ currentTab: tab }),
    setWordWrap: (wordWrap) => set({ wordWrap: wordWrap }),
    setReasoning: (reasoning) => set({ reasoning: reasoning })
}));