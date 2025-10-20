export type ActiveLink = {
  id: string;
  url: string;
  sourceApp: string;
  sourceContext: string;
  contactName: string;
  preview: string;
  recommendedBrowser?: BrowserSelection;
  arrivedAt: string;
};

export type LaunchHistoryItem = {
  id: string;
  url: string;
  decidedAt: string;
  browser: string;
  profileLabel?: string | null;
  profileDirectory?: string | null;
  persist: 'just-once' | 'always';
  sourceApp: string;
  contactName: string;
};

export type BrowserSelection = {
  name: string;
  profileLabel?: string | null;
  profileDirectory?: string | null;
};
