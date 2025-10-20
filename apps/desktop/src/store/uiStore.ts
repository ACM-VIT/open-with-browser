import { create } from 'zustand';

export type BrowserEntry = {
  id: string;
  name: string;
  path?: string;
};

export type ProfileEntry = {
  id: string;
  name: string;
  browserId?: string;
};

export type UIState = {
  isDialogOpen: boolean;
  selectedBrowserId: string | null;
  selectedProfileId: string | null;

  openDialog: () => void;
  closeDialog: () => void;
  toggleDialog: () => void;
  setSelectedBrowser: (id: string | null) => void;
  setSelectedProfile: (id: string | null) => void;
  resetSelection: () => void;
};

export const useUIStore = create<UIState>(
  (
    set: (
      partial: Partial<UIState> | ((state: UIState) => Partial<UIState>)
    ) => void
  ) => ({
    isDialogOpen: false,
    selectedBrowserId: null,
    selectedProfileId: null,

    openDialog: () => set({ isDialogOpen: true }),
    closeDialog: () => set({ isDialogOpen: false }),
    toggleDialog: () =>
      set((state: UIState) => ({ isDialogOpen: !state.isDialogOpen })),

    setSelectedBrowser: (id: string | null) => set({ selectedBrowserId: id }),
    setSelectedProfile: (id: string | null) => set({ selectedProfileId: id }),

    resetSelection: () =>
      set({ selectedBrowserId: null, selectedProfileId: null }),
  })
);
