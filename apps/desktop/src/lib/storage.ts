import { LazyStore } from '@tauri-apps/plugin-store';

export type UiSettings = {
  rememberChoice: boolean;
  showIcons: boolean;
  debugMode: boolean;
  lastSelectedBrowserId: string | null;
};

export const DEFAULT_UI_SETTINGS: UiSettings = {
  rememberChoice: true,
  showIcons: false,
  debugMode: false,
  lastSelectedBrowserId: null,
};

const settingsStore = new LazyStore('ui-settings.json', {
  defaults: DEFAULT_UI_SETTINGS,
});

export async function loadUiSettings(): Promise<UiSettings> {
  await settingsStore.init();
  const entries = await settingsStore.entries<UiSettings[keyof UiSettings]>();
  const snapshot: Partial<UiSettings> = {};
  const writableSnapshot = snapshot as Record<
    keyof UiSettings,
    UiSettings[keyof UiSettings] | undefined
  >;

  entries.forEach(([key, rawValue]) => {
    const typedKey = key as keyof UiSettings;
    if (rawValue === undefined) {
      writableSnapshot[typedKey] = undefined;
    } else {
      writableSnapshot[typedKey] = rawValue as UiSettings[keyof UiSettings];
    }
  });

  return {
    ...DEFAULT_UI_SETTINGS,
    ...snapshot,
  } as UiSettings;
}

export async function setUiSetting<K extends keyof UiSettings>(
  key: K,
  value: UiSettings[K]
): Promise<void> {
  await settingsStore.init();
  await settingsStore.set(key, value);
  await settingsStore.save();
}

export async function persistLastSelectedBrowser(
  browserId: string | null
): Promise<void> {
  await setUiSetting('lastSelectedBrowserId', browserId);
}

export type RulePolicy = 'Always' | 'Just once' | 'Fallback';

export type DomainRule = {
  id: string;
  domain: string;
  browserId: string | null;
  browserLabel: string;
  policy: RulePolicy;
  latency: string;
  enabled: boolean;
};

export type FileTypeRule = {
  id: string;
  extension: string;
  browserId: string | null;
  browserLabel: string;
  policy: RulePolicy;
};

export type RulesSnapshot = {
  domainRules: DomainRule[];
  fileTypeRules: FileTypeRule[];
};

const DEFAULT_RULES: RulesSnapshot = {
  domainRules: [],
  fileTypeRules: [],
};

const rulesStore = new LazyStore('routing-rules.json', {
  defaults: DEFAULT_RULES,
});

export async function loadRules(): Promise<RulesSnapshot> {
  await rulesStore.init();
  const [domainRules, fileTypeRules] = await Promise.all([
    rulesStore.get<DomainRule[]>('domainRules'),
    rulesStore.get<FileTypeRule[]>('fileTypeRules'),
  ]);

  return {
    domainRules: domainRules ?? [],
    fileTypeRules: fileTypeRules ?? [],
  };
}

export async function setDomainRules(rules: DomainRule[]): Promise<void> {
  await rulesStore.init();
  await rulesStore.set('domainRules', rules);
  await rulesStore.save();
}

export async function setFileTypeRules(rules: FileTypeRule[]): Promise<void> {
  await rulesStore.init();
  await rulesStore.set('fileTypeRules', rules);
  await rulesStore.save();
}

export async function saveRules(snapshot: RulesSnapshot): Promise<void> {
  await rulesStore.init();
  await rulesStore.set('domainRules', snapshot.domainRules);
  await rulesStore.set('fileTypeRules', snapshot.fileTypeRules);
  await rulesStore.save();
}
