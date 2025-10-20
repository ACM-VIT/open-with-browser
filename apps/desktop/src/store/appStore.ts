import { create } from 'zustand';
import type { ActiveLink, LaunchHistoryItem } from '../lib/models';
import type { BrowserProfile } from '../OpenWithDialog';
import { DEFAULT_UI_SETTINGS, type UiSettings } from '../lib/storage';
import type { RoutingStatusWire } from '../lib/routing';

type Updater<T> = T | ((previous: T) => T);

type StatusMap = Record<string, RoutingStatusWire['status']>;
type ErrorMap = Record<string, string>;
export type PageKey = 'dashboard' | 'rules' | 'settings';

type AppStore = {
  currentPage: PageKey;
  setCurrentPage: (page: PageKey) => void;
  activeLink: ActiveLink | null;
  setActiveLink: (link: ActiveLink | null) => void;
  history: LaunchHistoryItem[];
  setHistory: (updater: Updater<LaunchHistoryItem[]>) => void;
  statusById: StatusMap;
  setStatusById: (updater: Updater<StatusMap>) => void;
  errorsById: ErrorMap;
  setErrorsById: (updater: Updater<ErrorMap>) => void;
  ready: boolean;
  setReady: (ready: boolean) => void;
  initError: string | null;
  setInitError: (error: string | null) => void;
  browserCatalog: BrowserProfile[];
  setBrowserCatalog: (catalog: BrowserProfile[]) => void;
  uiSettings: UiSettings;
  setUiSettings: (updater: Updater<UiSettings>) => void;
  settingsReady: boolean;
  setSettingsReady: (ready: boolean) => void;
  hasFallback: boolean | null;
  setHasFallback: (value: boolean | null) => void;
  fallbackPromptVisible: boolean;
  setFallbackPromptVisible: (visible: boolean) => void;
  dismissedFallbackFor: string | null;
  setDismissedFallbackFor: (id: string | null) => void;
  autostartEnabled: boolean;
  setAutostartEnabled: (enabled: boolean) => void;
  autostartReady: boolean;
  setAutostartReady: (ready: boolean) => void;
  autostartStatus: string | null;
  setAutostartStatus: (status: string | null) => void;
  pendingFallbackFocus: boolean;
  setPendingFallbackFocus: (pending: boolean) => void;
};

function resolveUpdater<T>(updater: Updater<T>, previous: T): T {
  return typeof updater === 'function'
    ? (updater as (state: T) => T)(previous)
    : updater;
}

export const useAppStore = create<AppStore>(set => ({
  currentPage: 'dashboard',
  setCurrentPage: page => set({ currentPage: page }),
  activeLink: null,
  setActiveLink: link => set({ activeLink: link }),
  history: [],
  setHistory: updater =>
    set(state => ({ history: resolveUpdater(updater, state.history) })),
  statusById: {},
  setStatusById: updater =>
    set(state => ({ statusById: resolveUpdater(updater, state.statusById) })),
  errorsById: {},
  setErrorsById: updater =>
    set(state => ({ errorsById: resolveUpdater(updater, state.errorsById) })),
  ready: false,
  setReady: ready => set({ ready }),
  initError: null,
  setInitError: error => set({ initError: error }),
  browserCatalog: [],
  setBrowserCatalog: catalog => set({ browserCatalog: catalog }),
  uiSettings: DEFAULT_UI_SETTINGS,
  setUiSettings: updater =>
    set(state => ({ uiSettings: resolveUpdater(updater, state.uiSettings) })),
  settingsReady: false,
  setSettingsReady: ready => set({ settingsReady: ready }),
  hasFallback: null,
  setHasFallback: value => set({ hasFallback: value }),
  fallbackPromptVisible: false,
  setFallbackPromptVisible: visible => set({ fallbackPromptVisible: visible }),
  dismissedFallbackFor: null,
  setDismissedFallbackFor: id => set({ dismissedFallbackFor: id }),
  autostartEnabled: false,
  setAutostartEnabled: enabled => set({ autostartEnabled: enabled }),
  autostartReady: false,
  setAutostartReady: ready => set({ autostartReady: ready }),
  autostartStatus: null,
  setAutostartStatus: status => set({ autostartStatus: status }),
  pendingFallbackFocus: false,
  setPendingFallbackFocus: pending => set({ pendingFallbackFocus: pending }),
}));

export type { StatusMap, ErrorMap };
