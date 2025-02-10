import { WebContainer, WebContainerProcess } from '@webcontainer/api';
import type { Terminal as XTerm } from "@xterm/xterm";
import { create } from 'zustand';

export interface GeneralStoreState {
    webContainerInstance: WebContainer | null;
    setWebContainerInstance: (container: WebContainer | null) => void;
    terminal: XTerm | null,
    setTerminal: (terminal: XTerm) => void;
    shellProcess: WebContainerProcess | null;
    setShellProcess: (process: WebContainerProcess | null) => void;
    iframeURL: string;
    setIframeURL: (url: string) => void;
    currentTab: 'code' | 'preview';
    setCurrentTab: (tab: 'code' | 'preview') => void;
}

export const useGeneralStore = create<GeneralStoreState>((set) => ({
    webContainerInstance: null,
    setWebContainerInstance: (container) => set({ webContainerInstance: container }),
    terminal: null,
    setTerminal: (terminal) => set({ terminal }),
    shellProcess: null,
    setShellProcess: (process) => set({ shellProcess: process }),
    iframeURL: "",
    setIframeURL: (url) => set({ iframeURL: url }),
    currentTab: 'code',
    setCurrentTab: (tab) => set({ currentTab: tab })
}));