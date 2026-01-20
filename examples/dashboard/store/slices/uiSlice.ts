import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../index";

/**
 * UI state for dashboard
 */
export interface UIState {
  // Sidebar
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;

  // Current view
  activeView: "dashboard" | "users" | "products" | "orders";

  // Modal state
  modalOpen: boolean;
  modalType: "create" | "edit" | "delete" | "view" | null;
  modalEntityType: "user" | "product" | "order" | null;
  modalEntityId: string | null;

  // Theme
  theme: "light" | "dark" | "system";

  // Notifications
  notifications: Array<{
    id: string;
    type: "success" | "error" | "warning" | "info";
    title: string;
    message?: string;
    dismissible: boolean;
  }>;

  // Loading states
  isInitializing: boolean;
  isServiceWorkerReady: boolean;
}

const initialState: UIState = {
  sidebarOpen: true,
  sidebarCollapsed: false,
  activeView: "dashboard",
  modalOpen: false,
  modalType: null,
  modalEntityType: null,
  modalEntityId: null,
  theme: "system",
  notifications: [],
  isInitializing: true,
  isServiceWorkerReady: false,
};

export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    // Sidebar actions
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    toggleSidebarCollapsed: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },

    // View actions
    setActiveView: (state, action: PayloadAction<UIState["activeView"]>) => {
      state.activeView = action.payload;
    },

    // Modal actions
    openModal: (
      state,
      action: PayloadAction<{
        type: UIState["modalType"];
        entityType: UIState["modalEntityType"];
        entityId?: string | null;
      }>,
    ) => {
      state.modalOpen = true;
      state.modalType = action.payload.type;
      state.modalEntityType = action.payload.entityType;
      state.modalEntityId = action.payload.entityId ?? null;
    },
    closeModal: (state) => {
      state.modalOpen = false;
      state.modalType = null;
      state.modalEntityType = null;
      state.modalEntityId = null;
    },

    // Theme actions
    setTheme: (state, action: PayloadAction<UIState["theme"]>) => {
      state.theme = action.payload;
    },

    // Notification actions
    addNotification: (
      state,
      action: PayloadAction<Omit<UIState["notifications"][0], "id">>,
    ) => {
      state.notifications.push({
        ...action.payload,
        id: crypto.randomUUID(),
      });
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        (n) => n.id !== action.payload,
      );
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },

    // Initialization actions
    setInitializing: (state, action: PayloadAction<boolean>) => {
      state.isInitializing = action.payload;
    },
    setServiceWorkerReady: (state, action: PayloadAction<boolean>) => {
      state.isServiceWorkerReady = action.payload;
    },
  },
});

// Actions
export const {
  toggleSidebar,
  setSidebarOpen,
  toggleSidebarCollapsed,
  setActiveView,
  openModal,
  closeModal,
  setTheme,
  addNotification,
  removeNotification,
  clearNotifications,
  setInitializing,
  setServiceWorkerReady,
} = uiSlice.actions;

// Selectors
export const selectSidebarOpen = (state: RootState) => state.ui.sidebarOpen;
export const selectSidebarCollapsed = (state: RootState) =>
  state.ui.sidebarCollapsed;
export const selectActiveView = (state: RootState) => state.ui.activeView;
export const selectModalOpen = (state: RootState) => state.ui.modalOpen;
export const selectModalType = (state: RootState) => state.ui.modalType;
export const selectModalEntityType = (state: RootState) =>
  state.ui.modalEntityType;
export const selectModalEntityId = (state: RootState) => state.ui.modalEntityId;
export const selectTheme = (state: RootState) => state.ui.theme;
export const selectNotifications = (state: RootState) => state.ui.notifications;
export const selectIsInitializing = (state: RootState) =>
  state.ui.isInitializing;
export const selectIsServiceWorkerReady = (state: RootState) =>
  state.ui.isServiceWorkerReady;

export default uiSlice.reducer;
