import {
  ActionState,
  MessageHistory,
  Project,
  SubscriptionUsage,
} from "@repo/common/types";
import { create } from "zustand";

interface ProjectState {
  projects: Project[];
  currentProjectId: string | null;
  // inprogress are the projects that are currently being generated/new ones
  currentProjectState: "existing" | "blankTemplate" | "inProgress";
  // messageId, message with json string (actions inside the json may be duplicated)
  // But they are needed for existing projects, since we are storing only json in the db
  messageHistory: MessageHistory[];
  // messageId, actions
  actions: Map<string, ActionState[]>;
  currentMessageId: string | null;
  subscriptionData: SubscriptionUsage | null;
  refreshTokens: boolean;
  refreshProjects: boolean;

  // Actions
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  setSubscriptionData: (usage: SubscriptionUsage) => void;
  setCurrentProjectId: (projectId: string) => void;
  setCurrentProjectState: (
    state: "existing" | "blankTemplate" | "inProgress"
  ) => void;
  setRefreshTokens: (refreshTokens: boolean) => void;
  setRefreshProjects: (refreshProjects: boolean) => void;
  upsertMessage: (message: MessageHistory) => void;
  setCurrentMessageId: (messageId: string) => void;
  addAction: (messageId: string, action: ActionState) => void;
  getActionStatus: (actionId: number) => ActionState["state"] | null;
  updateActionStatus: (
    messageId: string,
    actionId: number,
    status: ActionState["state"]
  ) => void;
}

export const useProjectStore = create<ProjectState>()((set, get) => ({
  currentMessageId: null,
  actions: new Map(),
  messageHistory: [],
  projects: [],
  currentProjectId: null,
  currentProjectState: "inProgress",
  subscriptionData: null,
  refreshTokens: false,
  refreshProjects: false,

  setProjects: (projects) => set({ projects }),

  addProject: (project) =>
    set((state) => ({
      projects: [...state.projects, project],
    })),

  setSubscriptionData: (usage) => set({ subscriptionData: usage }),

  setCurrentProjectId: (projectId) => set({ currentProjectId: projectId }),

  setRefreshTokens: (refreshTokens) => set({ refreshTokens }),

  setRefreshProjects: (refreshProjects) => set({ refreshProjects }),

  setCurrentProjectState: (state) => set({ currentProjectState: state }),

  upsertMessage: (message) =>
    set((state) => {
      const messages = [...state.messageHistory];
      const index = messages.findIndex((m) => m.id === message.id);
      if (index !== -1) {
        messages[index] = message;
      } else {
        messages.push(message);
      }
      return { messageHistory: messages };
    }),

  setCurrentMessageId: (messageId) => set({ currentMessageId: messageId }),

  addAction: (messageId, action) =>
    set((state) => {
      const actions = new Map(state.actions);
      const currentMessage = actions.get(messageId);
      const newActions = currentMessage
        ? [...currentMessage, action]
        : [action];
      actions.set(messageId, newActions);
      return {
        actions: actions,
      };
    }),

  getActionStatus: (actionId: number) => {
    const currentMessageId = get().currentMessageId;
    if (!currentMessageId) return null;

    return (
      get()
        .actions.get(currentMessageId)
        ?.find((action) => action.id === actionId)?.state ?? null
    );
  },

  updateActionStatus: (messageId, actionId, status) =>
    set((state) => {
      const actions = new Map(state.actions);
      const currentMessage = actions.get(messageId);
      if (!currentMessage) {
        return {
          actions: state.actions,
        };
      }
      const newActions = currentMessage.map((action) =>
        action.id === actionId ? { ...action, state: status } : action
      ) as ActionState[];
      actions.set(messageId, newActions);
      return { actions };
    }),
}));
