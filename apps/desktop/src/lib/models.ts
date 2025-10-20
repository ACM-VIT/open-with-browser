export type ActiveLink = {
  id: string;
  url: string;
  sourceApp: string;
  sourceContext: string;
  contactName: string;
  preview: string;
  recommendedBrowser?: {
    name: string;
    profile?: string | null;
  };
  arrivedAt: string;
};

export type LaunchHistoryItem = {
  id: string;
  url: string;
  decidedAt: string;
  browser: string;
  profile?: string | null;
  persist: 'just-once' | 'always';
  sourceApp: string;
  contactName: string;
};
