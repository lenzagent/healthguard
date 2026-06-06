"use client";

import React, { createContext, useContext, useReducer, useCallback } from "react";
import type { AppState, AppAction, ScreenId, TabId, SummaryPreferences } from "@/lib/types";

const defaultSummaryPreferences: SummaryPreferences = {
  enabled: true,
  pushTime: "08:00",
  timezone: "Asia/Shanghai",
  includeSleep: true,
  includeExercise: true,
  includeTrends: true,
  includeAnomalies: true,
  language: "zh-CN",
};

const TAB_SCREENS: Record<TabId, ScreenId> = {
  home: "dashboard",
  trends: "trends",
  reports: "report-upload",
  settings: "settings",
};

const initialState: AppState = {
  currentScreen: "onboarding",
  currentTab: "home",
  screenStack: ["onboarding"],
  isAuthenticated: false,
  cameraPermissionGranted: false,
  privacyConsentGiven: false,
  summaryPreferences: defaultSummaryPreferences,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "NAVIGATE":
      return {
        ...state,
        currentScreen: action.screen,
        screenStack: [...state.screenStack, action.screen],
      };
    case "GO_BACK": {
      if (state.screenStack.length <= 1) return state;
      const newStack = state.screenStack.slice(0, -1);
      return {
        ...state,
        currentScreen: newStack[newStack.length - 1],
        screenStack: newStack,
      };
    }
    case "SWITCH_TAB": {
      const targetScreen = TAB_SCREENS[action.tab];
      return {
        ...state,
        currentTab: action.tab,
        currentScreen: targetScreen,
        screenStack: [targetScreen],
      };
    }
    case "SET_AUTHENTICATED":
      return { ...state, isAuthenticated: action.value };
    case "SET_CAMERA_PERMISSION":
      return { ...state, cameraPermissionGranted: action.value };
    case "SET_PRIVACY_CONSENT":
      return { ...state, privacyConsentGiven: action.value };
    case "SET_SUMMARY_PREFERENCES":
      return {
        ...state,
        summaryPreferences: { ...state.summaryPreferences, ...action.preferences },
      };
    case "TOGGLE_SUMMARY_ENABLED":
      return {
        ...state,
        summaryPreferences: {
          ...state.summaryPreferences,
          enabled: !state.summaryPreferences.enabled,
        },
      };
    case "SET_SUMMARY_PUSH_TIME":
      return {
        ...state,
        summaryPreferences: { ...state.summaryPreferences, pushTime: action.time },
      };
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  navigate: (screen: ScreenId) => void;
  goBack: () => void;
  switchTab: (tab: TabId) => void;
  setAuthenticated: (value: boolean) => void;
  setCameraPermission: (value: boolean) => void;
  setPrivacyConsent: (value: boolean) => void;
  setSummaryPreferences: (preferences: Partial<SummaryPreferences>) => void;
  toggleSummaryEnabled: () => void;
  setSummaryPushTime: (time: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const navigate = useCallback(
    (screen: ScreenId) => dispatch({ type: "NAVIGATE", screen }),
    []
  );
  const goBack = useCallback(() => dispatch({ type: "GO_BACK" }), []);
  const switchTab = useCallback(
    (tab: TabId) => dispatch({ type: "SWITCH_TAB", tab }),
    []
  );
  const setAuthenticated = useCallback(
    (value: boolean) => dispatch({ type: "SET_AUTHENTICATED", value }),
    []
  );
  const setCameraPermission = useCallback(
    (value: boolean) => dispatch({ type: "SET_CAMERA_PERMISSION", value }),
    []
  );
  const setPrivacyConsent = useCallback(
    (value: boolean) => dispatch({ type: "SET_PRIVACY_CONSENT", value }),
    []
  );
  const setSummaryPreferences = useCallback(
    (preferences: Partial<SummaryPreferences>) =>
      dispatch({ type: "SET_SUMMARY_PREFERENCES", preferences }),
    []
  );
  const toggleSummaryEnabled = useCallback(
    () => dispatch({ type: "TOGGLE_SUMMARY_ENABLED" }),
    []
  );
  const setSummaryPushTime = useCallback(
    (time: string) => dispatch({ type: "SET_SUMMARY_PUSH_TIME", time }),
    []
  );

  return (
    <AppContext.Provider
      value={{
        state,
        navigate,
        goBack,
        switchTab,
        setAuthenticated,
        setCameraPermission,
        setPrivacyConsent,
        setSummaryPreferences,
        toggleSummaryEnabled,
        setSummaryPushTime,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export { TAB_SCREENS };
