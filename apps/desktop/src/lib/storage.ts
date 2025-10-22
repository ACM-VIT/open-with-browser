import { LazyStore } from '@tauri-apps/plugin-store';

export type UiSettings = {
  rememberChoice: boolean;
  showIcons: boolean;
  debugMode: boolean;
  lastSelectedBrowserId: string | null;
  onboardingCompleted: boolean;
};

export const DEFAULT_UI_SETTINGS: UiSettings = {
  rememberChoice: true,
  showIcons: false,
  debugMode: false,
  lastSelectedBrowserId: null,
  onboardingCompleted: false,
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

const RULE_POLICIES: RulePolicy[] = ['Always', 'Just once', 'Fallback'];

export type DomainMatchType = 'host' | 'wildcard' | 'regex';

export type DomainRule = {
  id: string;
  pattern: string;
  matchType: DomainMatchType;
  browserId: string | null;
  browserLabel: string;
  policy: RulePolicy;
  latency: string;
  enabled: boolean;
  domain?: string;
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
  const [domainRulesRaw, fileTypeRules] = await Promise.all([
    rulesStore.get<Record<string, unknown>[]>('domainRules'),
    rulesStore.get<FileTypeRule[]>('fileTypeRules'),
  ]);

  return {
    domainRules: (domainRulesRaw ?? []).map(normalizeDomainRule),
    fileTypeRules: fileTypeRules ?? [],
  };
}

export async function setDomainRules(rules: DomainRule[]): Promise<void> {
  await rulesStore.init();
  await rulesStore.set(
    'domainRules',
    rules.map(rule => ({
      ...rule,
      domain: rule.pattern,
    }))
  );
  await rulesStore.save();
}

export async function setFileTypeRules(rules: FileTypeRule[]): Promise<void> {
  await rulesStore.init();
  await rulesStore.set('fileTypeRules', rules);
  await rulesStore.save();
}

export async function saveRules(snapshot: RulesSnapshot): Promise<void> {
  await rulesStore.init();
  await rulesStore.set(
    'domainRules',
    snapshot.domainRules.map(rule => ({
      ...rule,
      domain: rule.pattern,
    }))
  );
  await rulesStore.set('fileTypeRules', snapshot.fileTypeRules);
  await rulesStore.save();
}

function normalizeDomainRule(raw: Record<string, unknown>): DomainRule {
  const id =
    typeof raw.id === 'string' && raw.id.trim().length > 0
      ? raw.id
      : (globalThis.crypto?.randomUUID?.() ??
        Math.random().toString(36).slice(2));

  const patternSource =
    typeof raw.pattern === 'string'
      ? raw.pattern
      : typeof raw.domain === 'string'
        ? raw.domain
        : '';
  const pattern = patternSource.trim();

  const matchTypeRaw =
    typeof raw.matchType === 'string' ? raw.matchType.trim().toLowerCase() : '';

  const matchType: DomainMatchType = (() => {
    switch (matchTypeRaw) {
      case 'wildcard':
      case 'wildcards':
      case 'glob':
        return 'wildcard';
      case 'regex':
      case 'regexp':
      case 'regular expression':
      case 'regular-expression':
        return 'regex';
      default:
        if (pattern.includes('*')) return 'wildcard';
        if (pattern.startsWith('^') || pattern.endsWith('$')) return 'regex';
        return 'host';
    }
  })();

  const browserId =
    typeof raw.browserId === 'string' && raw.browserId.trim().length > 0
      ? raw.browserId
      : null;

  const browserLabel =
    typeof raw.browserLabel === 'string'
      ? raw.browserLabel
      : (browserId ?? 'Prompt me');

  const policyRaw =
    typeof raw.policy === 'string' ? raw.policy.trim() : RULE_POLICIES[0];
  const policy =
    RULE_POLICIES.find(
      option => option.toLowerCase() === policyRaw.toLowerCase()
    ) ?? RULE_POLICIES[0];

  const latency =
    typeof raw.latency === 'string' && raw.latency.trim().length > 0
      ? raw.latency
      : 'Auto';

  let enabled = true;
  if (typeof raw.enabled === 'boolean') {
    enabled = raw.enabled;
  } else if (typeof raw.enabled === 'string') {
    enabled = !['false', '0', 'no', 'disabled'].includes(
      raw.enabled.toLowerCase()
    );
  }

  return {
    id,
    pattern,
    matchType,
    browserId,
    browserLabel,
    policy,
    latency,
    enabled,
    domain: pattern,
  };
}
