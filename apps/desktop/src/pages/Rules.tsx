/* global HTMLInputElement, HTMLFormElement */

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { BrowserProfile } from '../OpenWithDialog';
import {
  loadRules,
  setDomainRules,
  setFileTypeRules,
  type DomainRule,
  type DomainMatchType,
  type FileTypeRule,
  type RulePolicy,
} from '../lib/storage';
import { simulateIncomingLink } from '../lib/routing';
import { Combobox, Select } from '../components/ui/Select';

type RulesProps = {
  availableBrowsers: BrowserProfile[];
};

const POLICY_OPTIONS: RulePolicy[] = ['Always', 'Just once', 'Fallback'];
const LATENCY_OPTIONS = ['< 100 ms', 'Stable', 'Auto'];
const MATCH_TYPE_CONFIG: Array<{
  value: DomainMatchType;
  label: string;
  hint: string;
}> = [
  {
    value: 'host',
    label: 'Domain (exact host)',
    hint: 'Matches the host portion of a URL. Example: github.com',
  },
  {
    value: 'wildcard',
    label: 'Wildcard (*.domain.com/*)',
    hint: 'Use * to cover multiple subdomains or paths. Example: *.figma.com/files/*',
  },
  {
    value: 'regex',
    label: 'Regex (advanced)',
    hint: 'Full JavaScript regular expression against the entire URL.',
  },
];

const MATCH_TYPE_LABELS: Record<DomainMatchType, string> = {
  host: 'Domain',
  wildcard: 'Wildcard',
  regex: 'Regex',
};

const createId = () =>
  typeof globalThis.crypto !== 'undefined' &&
  typeof globalThis.crypto.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const formatBrowserLabel = (browser: BrowserProfile) =>
  browser.profileLabel
    ? `${browser.name} · ${browser.profileLabel}`
    : browser.name;

const normalise = (value: string) => value.trim().toLowerCase();

const ensureNavigableUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

export default function Rules({ availableBrowsers }: RulesProps) {
  const [domainRules, setDomainRulesState] = useState<DomainRule[]>([]);
  const [fileTypeRules, setFileTypeRulesState] = useState<FileTypeRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingDomain, setAddingDomain] = useState(false);
  const [addingFileType, setAddingFileType] = useState(false);
  const [domainForm, setDomainForm] = useState({
    pattern: '',
    matchType: MATCH_TYPE_CONFIG[0].value,
    browser: '',
    policy: POLICY_OPTIONS[0],
    latency: LATENCY_OPTIONS[0],
    enabled: true,
  });
  const [fileForm, setFileForm] = useState({
    extension: '',
    browser: '',
    policy: POLICY_OPTIONS[0],
  });

  const csvInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const snapshot = await loadRules();
        if (cancelled) return;
        setDomainRulesState(snapshot.domainRules);
        setFileTypeRulesState(snapshot.fileTypeRules);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? `Unable to load rules: ${err.message}`
              : 'Unable to load rules.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const browserOptions = useMemo(
    () =>
      availableBrowsers.map(browser => ({
        id: browser.id,
        label: formatBrowserLabel(browser),
        browser,
      })),
    [availableBrowsers]
  );

  const comboboxOptions = useMemo(
    () =>
      browserOptions.map(option => ({
        value: option.id,
        label: option.label,
        badge: option.browser.profileDirectory ?? null,
      })),
    [browserOptions]
  );

  const policySelectOptions = useMemo(
    () =>
      POLICY_OPTIONS.map(option => ({
        value: option,
        label: option,
      })),
    []
  );

  const latencySelectOptions = useMemo(
    () =>
      LATENCY_OPTIONS.map(option => ({
        value: option,
        label: option,
      })),
    []
  );

  const matchTypeSelectOptions = useMemo(
    () =>
      MATCH_TYPE_CONFIG.map(option => ({
        value: option.value,
        label: option.label,
      })),
    []
  );

  const currentMatchHint = useMemo(() => {
    const config = MATCH_TYPE_CONFIG.find(
      option => option.value === domainForm.matchType
    );
    return config?.hint ?? '';
  }, [domainForm.matchType]);

  const resolveBrowserSelection = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return { browserId: null, browserLabel: '' };
    }

    const match = browserOptions.find(
      option => normalise(option.label) === normalise(trimmed)
    );

    if (match) {
      return {
        browserId: match.id,
        browserLabel: match.label,
      };
    }

    return {
      browserId: null,
      browserLabel: trimmed,
    };
  };

  const resolveMatchType = (value: string): DomainMatchType => {
    const normalized = normalise(value);
    if (['wildcard', 'wildcards', 'glob'].includes(normalized)) {
      return 'wildcard';
    }
    if (
      ['regex', 'regexp', 'regular expression', 'regular-expression'].includes(
        normalized
      )
    ) {
      return 'regex';
    }
    return 'host';
  };

  const resetDomainForm = () =>
    setDomainForm({
      pattern: '',
      matchType: MATCH_TYPE_CONFIG[0].value,
      browser: '',
      policy: POLICY_OPTIONS[0],
      latency: LATENCY_OPTIONS[0],
      enabled: true,
    });

  const resetFileForm = () =>
    setFileForm({
      extension: '',
      browser: '',
      policy: POLICY_OPTIONS[0],
    });

  const handleSubmitDomainRule = async (
    event: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    setError(null);

    if (!domainForm.pattern.trim() || !domainForm.browser.trim()) {
      setError('URL pattern and browser are required to save a rule.');
      return;
    }

    const selection = resolveBrowserSelection(domainForm.browser);
    const trimmedPattern = domainForm.pattern.trim();
    const nextRule: DomainRule = {
      id: createId(),
      pattern: trimmedPattern,
      matchType: domainForm.matchType,
      browserId: selection.browserId,
      browserLabel: selection.browserLabel,
      policy: domainForm.policy,
      latency: domainForm.latency,
      enabled: domainForm.enabled,
      domain: trimmedPattern,
    };

    const previous = domainRules;
    const next = [...domainRules, nextRule];

    setDomainRulesState(next);
    setAddingDomain(false);
    resetDomainForm();

    try {
      await setDomainRules(next);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Failed to save rule: ${err.message}`
          : 'Failed to save rule.'
      );
      setDomainRulesState(previous);
    }
  };

  const handleTestDomainRule = async (rule: DomainRule) => {
    setError(null);

    type SampleResult =
      | { status: 'ok'; url: string }
      | { status: 'invalid' }
      | { status: 'cancelled' }
      | { status: 'no-prompt' };

    const promptFn =
      typeof window !== 'undefined' && typeof window.prompt === 'function'
        ? window.prompt.bind(window)
        : null;

    const solicitSample = (message: string): SampleResult => {
      if (!promptFn) {
        return { status: 'no-prompt' };
      }
      const response = promptFn(message, 'https://example.com/');
      if (response === null) {
        return { status: 'cancelled' };
      }
      const normalized = ensureNavigableUrl(response);
      if (!normalized) {
        return { status: 'invalid' };
      }
      return { status: 'ok', url: normalized };
    };

    let url: string | null = null;

    if (rule.matchType === 'host') {
      url = ensureNavigableUrl(rule.pattern);
      if (!url) {
        setError('The pattern must resemble a valid host or URL to test it.');
        return;
      }
    } else if (rule.matchType === 'wildcard') {
      const candidates = [
        rule.pattern.replace(/\*/g, 'sample'),
        rule.pattern.replace(/\*/g, ''),
        rule.pattern,
      ];
      for (const candidate of candidates) {
        const normalized = ensureNavigableUrl(candidate);
        if (normalized) {
          url = normalized;
          break;
        }
      }
      if (!url) {
        const sample = solicitSample(
          'Enter a URL to test against this wildcard rule:'
        );
        if (sample.status === 'ok') {
          url = sample.url;
        } else if (sample.status === 'invalid') {
          setError('Provide a valid URL to test this rule.');
          return;
        } else if (sample.status === 'no-prompt') {
          setError(
            'Provide a sample URL to test wildcard rules when prompts are unavailable.'
          );
          return;
        } else {
          return;
        }
      }
    } else {
      const sample = solicitSample(
        'Enter a URL to test against this regex rule:'
      );
      if (sample.status === 'ok') {
        url = sample.url;
      } else if (sample.status === 'invalid') {
        setError('Provide a valid URL to test this rule.');
        return;
      } else if (sample.status === 'no-prompt') {
        setError(
          'Provide a sample URL to test regex rules when prompts are unavailable.'
        );
        return;
      } else {
        return;
      }
    }

    if (!url) {
      setError('Unable to determine a URL to test this rule.');
      return;
    }

    try {
      await simulateIncomingLink({
        url,
        sourceApp: 'Rules panel',
        sourceContext: `${rule.browserLabel} · ${MATCH_TYPE_LABELS[rule.matchType]}`,
        preview: `Testing rule for ${rule.pattern}`,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? `Failed to launch test: ${err.message}`
          : 'Failed to launch test.'
      );
    }
  };

  const handleSubmitFileRule = async (
    event: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    setError(null);

    if (!fileForm.extension.trim() || !fileForm.browser.trim()) {
      setError('File type and browser are required to save a rule.');
      return;
    }

    const extension = fileForm.extension.startsWith('.')
      ? fileForm.extension.trim().toLowerCase()
      : `.${fileForm.extension.trim().toLowerCase()}`;

    const selection = resolveBrowserSelection(fileForm.browser);

    const nextRule: FileTypeRule = {
      id: createId(),
      extension,
      browserId: selection.browserId,
      browserLabel: selection.browserLabel,
      policy: fileForm.policy,
    };

    const previous = fileTypeRules;
    const next = [...fileTypeRules, nextRule];

    setFileTypeRulesState(next);
    setAddingFileType(false);
    resetFileForm();

    try {
      await setFileTypeRules(next);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Failed to save file rule: ${err.message}`
          : 'Failed to save file rule.'
      );
      setFileTypeRulesState(previous);
    }
  };

  const handleToggleDomainRule = async (ruleId: string) => {
    setError(null);
    const previous = domainRules;
    const next = domainRules.map(rule =>
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    );

    setDomainRulesState(next);
    try {
      await setDomainRules(next);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Failed to update rule: ${err.message}`
          : 'Failed to update rule.'
      );
      setDomainRulesState(previous);
    }
  };

  const handleDeleteDomainRule = async (ruleId: string) => {
    setError(null);
    const previous = domainRules;
    const next = domainRules.filter(rule => rule.id !== ruleId);

    setDomainRulesState(next);
    try {
      await setDomainRules(next);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Failed to remove rule: ${err.message}`
          : 'Failed to remove rule.'
      );
      setDomainRulesState(previous);
    }
  };

  const handleDeleteFileRule = async (ruleId: string) => {
    setError(null);
    const previous = fileTypeRules;
    const next = fileTypeRules.filter(rule => rule.id !== ruleId);

    setFileTypeRulesState(next);
    try {
      await setFileTypeRules(next);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Failed to remove file rule: ${err.message}`
          : 'Failed to remove file rule.'
      );
      setFileTypeRulesState(previous);
    }
  };

  const optionAt = (index: number) => {
    const option = browserOptions[index];
    if (!option) {
      return {
        browserId: null,
        browserLabel: 'Default browser',
      };
    }
    return {
      browserId: option.id,
      browserLabel: option.label,
    };
  };

  const handleAutoGenerateFileRules = async () => {
    setError(null);
    const generated: FileTypeRule[] = [
      {
        id: createId(),
        extension: '.pdf',
        ...optionAt(0),
        policy: 'Always',
      },
      {
        id: createId(),
        extension: '.fig',
        ...optionAt(1),
        policy: 'Always',
      },
      {
        id: createId(),
        extension: '.md',
        browserId: null,
        browserLabel: 'Prompt me',
        policy: 'Fallback',
      },
    ];

    const previous = fileTypeRules;
    setFileTypeRulesState(generated);
    try {
      await setFileTypeRules(generated);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Failed to auto-generate rules: ${err.message}`
          : 'Failed to auto-generate rules.'
      );
      setFileTypeRulesState(previous);
    }
  };

  const handleCsvClick = () => {
    csvInputRef.current?.click();
  };

  const handleCsvChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const FileReaderCtor = globalThis.FileReader;
    if (!FileReaderCtor) {
      setError('FileReader API is unavailable in this environment.');
      return;
    }

    const reader = new FileReaderCtor();
    reader.onload = async () => {
      const previous = domainRules;
      try {
        const text = String(reader.result ?? '');
        const lines = text
          .split(/\r?\n/)
          .map(line => line.trim())
          .filter(Boolean);

        if (lines.length === 0) {
          setError('No rows found in CSV.');
          return;
        }

        const parsed: DomainRule[] = [...domainRules];

        lines.forEach(line => {
          const parts = line.split(',').map(part => part.trim());
          const pattern = parts[0];
          const browser = parts[1];
          const policy = parts[2] ?? 'Always';
          const latency = parts[3] ?? 'Auto';
          const enabled = parts[4];
          const matchTypeRaw = parts[5] ?? '';

          if (!pattern || !browser) {
            return;
          }

          const selection = resolveBrowserSelection(browser);
          const policyValue = POLICY_OPTIONS.find(
            option => normalise(option) === normalise(policy)
          );

          const latencyValue = latency || LATENCY_OPTIONS[2];
          const enabledValue =
            enabled !== undefined
              ? !['false', '0', 'no', 'disabled'].includes(
                  enabled.toLowerCase()
                )
              : true;
          const trimmedPattern = pattern.trim();
          const inferredMatchType =
            matchTypeRaw && matchTypeRaw.length > 0
              ? resolveMatchType(matchTypeRaw)
              : trimmedPattern.startsWith('^') ||
                  trimmedPattern.endsWith('$') ||
                  /\\[wds]/.test(trimmedPattern)
                ? 'regex'
                : trimmedPattern.includes('*')
                  ? 'wildcard'
                  : 'host';

          parsed.push({
            id: createId(),
            pattern: trimmedPattern,
            matchType: inferredMatchType,
            browserId: selection.browserId,
            browserLabel: selection.browserLabel,
            policy: policyValue ?? POLICY_OPTIONS[0],
            latency: latencyValue,
            enabled: enabledValue,
            domain: trimmedPattern,
          });
        });

        setDomainRulesState(parsed);
        await setDomainRules(parsed);
        setError(null);
      } catch (err) {
        setDomainRulesState(previous);
        setError(
          err instanceof Error
            ? `Failed to import CSV: ${err.message}`
            : 'Failed to import CSV.'
        );
      } finally {
        event.target.value = '';
      }
    };

    reader.onerror = () => {
      setError('Unable to read the selected file.');
      event.target.value = '';
    };

    reader.readAsText(file);
  };

  // CSV CONVERT -----------------------------------------
 const convertToCSV = (rules: DomainRule[]): string => {
  const headers = [
    'pattern',
    'browser',
    'policy',
    'latency',
    'enabled',
    'matchType',
  ];
  const csvRows = [headers.join(',')];

  rules.forEach(rule => {
    const row = [
      rule.pattern || '',
      rule.browserLabel || '',
      rule.policy || '',
      rule.latency?.toString() || 'Auto',
      rule.enabled?.toString() || 'true',
      rule.matchType || 'domain',
    ];
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
};


  // CSV download  -----------------------------------------
  const handleExportCSV = () => {
    if (!domainRules || domainRules.length === 0) {
      const emptyCSV = 'pattern,browser,policy,latency,enabled,matchType\n';
      downloadCSV(emptyCSV, 'rules-template.csv');
      return;
    }

    const csvContent = convertToCSV(domainRules);
    const timestamp = new Date().toISOString().split('T')[0];
    downloadCSV(csvContent, `rules-backup-${timestamp}.csv`);
  };

  //File download  -----------------------------------------
  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className='flex flex-col gap-8 pb-16'>
      <section className='panel'>
        <div className='flex flex-wrap items-start justify-between gap-6'>
          <div>
            <h2 className='text-2xl font-semibold text-zinc-50'>
              Routing rules
            </h2>
          </div>
          <button
            className='rounded-[18px] border border-emerald-400/50 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-100 shadow-soft-sm transition hover:border-emerald-300/70'
            onClick={() => setAddingDomain(true)}
          >
            Add URL rule
          </button>
        </div>
        {error ? <p className='mt-4 text-sm text-red-300'>{error}</p> : null}
        {loading ? (
          <p className='mt-4 text-sm text-zinc-400'>Loading rules…</p>
        ) : null}
      </section>

      <section className='panel'>
        <header className='flex flex-wrap items-center justify-between gap-4'>
          <h3 className='panel-title'>URL rules</h3>
          <div className='flex items-center gap-4'>
            <button
              className='rounded-[16px] border border-white/5 bg-black/30 px-3 py-2 text-xs font-semibold text-zinc-300 shadow-soft-sm transition hover:border-amber-400/40 hover:text-amber-200'
              onClick={handleCsvClick}
            >
              Import CSV
            </button>
            <button
              className='rounded-[16px] border border-white/5 bg-black/30 px-3 py-2 text-xs font-semibold text-zinc-300 shadow-soft-sm transition hover:border-emerald-400/40 hover:text-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed'
              onClick={handleExportCSV}
              disabled={!domainRules || domainRules.length === 0}
            >
              Export CSV
            </button>
          </div>
        </header>

        {addingDomain ? (
          <form
            onSubmit={handleSubmitDomainRule}
            className='mt-6 grid gap-4 rounded-[20px] border border-white/5 bg-black/25 p-4 md:grid-cols-3'
          >
            <label className='flex flex-col gap-2 text-xs text-zinc-400 md:col-span-3'>
              URL pattern
              <input
                type='text'
                value={domainForm.pattern}
                onChange={event =>
                  setDomainForm(form => ({
                    ...form,
                    pattern: event.target.value,
                  }))
                }
                className='rounded-[14px] border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 shadow-soft-sm focus:border-emerald-300/60 focus:outline-none'
                placeholder='https://github.com/* or ^https://.+/docs$'
              />
              {currentMatchHint ? (
                <span className='text-[11px] text-zinc-500'>
                  {currentMatchHint}
                </span>
              ) : null}
            </label>
            <div className='flex flex-col gap-1 text-xs text-zinc-400'>
              <span>Match type</span>
              <Select
                options={matchTypeSelectOptions}
                value={domainForm.matchType}
                onChange={next =>
                  setDomainForm(form => ({
                    ...form,
                    matchType: next as DomainMatchType,
                  }))
                }
              />
            </div>
            <div className='flex flex-col gap-1 text-xs text-zinc-400 md:col-span-2'>
              <span>Browser profile</span>
              <Combobox
                options={comboboxOptions}
                value={domainForm.browser}
                onChange={next =>
                  setDomainForm(form => ({
                    ...form,
                    browser: next,
                  }))
                }
                placeholder='Search browsers'
              />
            </div>
            <div className='flex flex-col gap-1 text-xs text-zinc-400'>
              <span>Policy</span>
              <Select
                options={policySelectOptions}
                value={domainForm.policy}
                onChange={next =>
                  setDomainForm(form => ({
                    ...form,
                    policy: next as RulePolicy,
                  }))
                }
              />
            </div>
            <div className='flex flex-col gap-1 text-xs text-zinc-400'>
              <span>Latency budget</span>
              <Select
                options={latencySelectOptions}
                value={domainForm.latency}
                onChange={next =>
                  setDomainForm(form => ({
                    ...form,
                    latency: next,
                  }))
                }
              />
            </div>
            <label className='flex items-center gap-2 text-xs text-zinc-400'>
              <input
                type='checkbox'
                checked={domainForm.enabled}
                onChange={event =>
                  setDomainForm(form => ({
                    ...form,
                    enabled: event.target.checked,
                  }))
                }
                className='h-4 w-4 rounded border border-white/10 bg-black/40 accent-emerald-400'
              />
              Enabled
            </label>
            <div className='flex gap-3 md:col-span-3'>
              <button
                type='submit'
                className='flex-1 rounded-[16px] border border-emerald-400/60 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-100 shadow-soft-sm transition hover:border-emerald-300/70 disabled:opacity-40'
              >
                Save rule
              </button>
              <button
                type='button'
                onClick={() => {
                  resetDomainForm();
                  setAddingDomain(false);
                }}
                className='flex-1 rounded-[16px] border border-white/10 bg-black/30 px-4 py-2 text-sm font-semibold text-zinc-300 shadow-soft-sm transition hover:border-red-400/40 hover:text-red-200'
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        <div className='mt-6 overflow-x-auto rounded-[20px] border border-white/5 shadow-soft-sm'>
          <table className='min-w-[760px] w-full divide-y divide-white/5 text-sm text-zinc-300'>
            <thead className='bg-black/20 text-xs uppercase tracking-[0.3em] text-zinc-500'>
              <tr>
                <th className='px-5 py-3 text-left'>URL pattern</th>
                <th className='px-5 py-3 text-left'>Match type</th>
                <th className='px-5 py-3 text-left'>Browser profile</th>
                <th className='px-5 py-3 text-left'>Policy</th>
                <th className='px-5 py-3 text-left'>Latency budget</th>
                <th className='px-5 py-3 text-left'>Status</th>
                <th className='px-5 py-3 text-left'>Actions</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-white/5 bg-black/25'>
              {domainRules.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className='px-5 py-6 text-center text-sm text-zinc-500'
                  >
                    No URL rules yet. Add one to preselect browsers
                    automatically.
                  </td>
                </tr>
              ) : (
                domainRules.map(rule => (
                  <tr key={rule.id} className='hover:bg-white/5'>
                    <td className='px-5 py-4 font-medium text-zinc-100'>
                      <button
                        type='button'
                        className='rounded-[12px] border border-transparent bg-transparent px-2 py-1 text-left text-sm text-emerald-200 transition hover:border-emerald-400/40 hover:bg-emerald-500/10'
                        onClick={() => void handleTestDomainRule(rule)}
                      >
                        {rule.pattern}
                      </button>
                    </td>
                    <td className='px-5 py-4'>
                      <span className='rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-xs text-zinc-400'>
                        {MATCH_TYPE_LABELS[rule.matchType] ?? 'Domain'}
                      </span>
                    </td>
                    <td className='px-5 py-4'>{rule.browserLabel}</td>
                    <td className='px-5 py-4'>
                      <span className='rounded-full border border-emerald-300/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-200'>
                        {rule.policy}
                      </span>
                    </td>
                    <td className='px-5 py-4 text-zinc-400'>{rule.latency}</td>
                    <td className='px-5 py-4'>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs ${
                          rule.enabled
                            ? 'border-white/10 bg-black/30 text-zinc-400'
                            : 'border-amber-400/40 bg-amber-500/10 text-amber-200'
                        }`}
                      >
                        {rule.enabled ? 'Active' : 'Paused'}
                      </span>
                    </td>
                    <td className='px-5 py-4'>
                      <div className='flex gap-2 text-xs'>
                        <button
                          className='rounded-[12px] border border-white/10 bg-black/30 px-3 py-1 font-semibold text-zinc-300 transition hover:border-emerald-300/40 hover:text-emerald-200'
                          onClick={() => handleToggleDomainRule(rule.id)}
                        >
                          {rule.enabled ? 'Pause' : 'Activate'}
                        </button>
                        <button
                          className='rounded-[12px] border border-white/10 bg-black/30 px-3 py-1 font-semibold text-zinc-300 transition hover:border-red-400/40 hover:text-red-200'
                          onClick={() => handleDeleteDomainRule(rule.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <input
          ref={csvInputRef}
          type='file'
          accept='.csv'
          className='hidden'
          onChange={handleCsvChange}
        />
      </section>

      <section className='panel'>
        <header className='flex flex-wrap items-center justify-between gap-4'>
          <h3 className='panel-title'>File type rules</h3>
          <div className='flex gap-2'>
            <button
              className='rounded-[16px] border border-white/5 bg-black/30 px-3 py-2 text-xs font-semibold text-zinc-300 shadow-soft-sm transition hover:border-emerald-400/40 hover:text-emerald-200'
              onClick={() => setAddingFileType(true)}
            >
              Add file rule
            </button>
            <button
              className='rounded-[16px] border border-white/5 bg-black/30 px-3 py-2 text-xs font-semibold text-zinc-300 shadow-soft-sm transition hover:border-emerald-400/40 hover:text-emerald-200'
              onClick={handleAutoGenerateFileRules}
            >
              Auto-generate
            </button>
          </div>
        </header>

        {addingFileType ? (
          <form
            onSubmit={handleSubmitFileRule}
            className='mt-6 grid gap-4 rounded-[20px] border border-white/5 bg-black/25 p-4 sm:grid-cols-2'
          >
            <label className='flex flex-col gap-1 text-xs text-zinc-400'>
              File extension
              <input
                type='text'
                value={fileForm.extension}
                onChange={event =>
                  setFileForm(form => ({
                    ...form,
                    extension: event.target.value,
                  }))
                }
                className='rounded-[14px] border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 shadow-soft-sm focus:border-emerald-300/60 focus:outline-none'
                placeholder='.pdf'
              />
            </label>
            <div className='flex flex-col gap-1 text-xs text-zinc-400'>
              <span>Browser profile</span>
              <Combobox
                options={comboboxOptions}
                value={fileForm.browser}
                onChange={next =>
                  setFileForm(form => ({
                    ...form,
                    browser: next,
                  }))
                }
                placeholder='Search browsers'
              />
            </div>
            <div className='flex flex-col gap-1 text-xs text-zinc-400 sm:col-span-2 md:col-span-1'>
              <span>Policy</span>
              <Select
                options={policySelectOptions}
                value={fileForm.policy}
                onChange={next =>
                  setFileForm(form => ({
                    ...form,
                    policy: next as RulePolicy,
                  }))
                }
              />
            </div>
            <div className='flex gap-3 sm:col-span-2'>
              <button
                type='submit'
                className='flex-1 rounded-[16px] border border-emerald-400/60 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-100 shadow-soft-sm transition hover:border-emerald-300/70 disabled:opacity-40'
              >
                Save file rule
              </button>
              <button
                type='button'
                onClick={() => {
                  resetFileForm();
                  setAddingFileType(false);
                }}
                className='flex-1 rounded-[16px] border border-white/10 bg-black/30 px-4 py-2 text-sm font-semibold text-zinc-300 shadow-soft-sm transition hover:border-red-400/40 hover:text-red-200'
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        <div className='mt-6 grid gap-4 md:grid-cols-3'>
          {fileTypeRules.length === 0 ? (
            <div className='rounded-[22px] border border-white/5 bg-black/30 p-4 text-sm text-zinc-400 shadow-soft-sm md:col-span-3'>
              No file type fallbacks configured. Add a rule or auto-generate a
              starting set.
            </div>
          ) : (
            fileTypeRules.map(rule => (
              <div
                key={rule.id}
                className='rounded-[22px] border border-white/5 bg-black/30 p-4 shadow-soft-sm'
              >
                <div className='text-xs uppercase tracking-[0.3em] text-zinc-500'>
                  {rule.extension}
                </div>
                <div className='mt-3 text-sm font-semibold text-zinc-100'>
                  {rule.browserLabel}
                </div>
                <div className='mt-2 text-xs text-zinc-400'>
                  Policy:{' '}
                  <span className='font-medium text-amber-200'>
                    {rule.policy}
                  </span>
                </div>
                <button
                  className='mt-4 inline-flex items-center gap-2 rounded-[16px] border border-white/10 bg-black/40 px-3 py-1 text-xs font-semibold text-zinc-300 transition hover:border-red-400/40 hover:text-red-200'
                  onClick={() => handleDeleteFileRule(rule.id)}
                >
                  Remove mapping
                  <span className='text-zinc-500'>×</span>
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <section className='panel'>
        <h3 className='panel-title'>Execution notes</h3>
        <div className='mt-4 grid gap-4 md:grid-cols-2'>
          <div className='rounded-[22px] border border-white/5 bg-black/25 p-4 shadow-soft-sm'>
            <p className='text-sm font-semibold text-zinc-100'>
              Async resolution
            </p>
            <p className='mt-2 text-sm text-zinc-400'>
              Rules are evaluated on a background thread before the UI prompts
              the user, so nothing blocks when a file association is resolved.
            </p>
          </div>
          <div className='rounded-[22px] border border-white/5 bg-black/25 p-4 shadow-soft-sm'>
            <p className='text-sm font-semibold text-zinc-100'>
              Explainability
            </p>
            <p className='mt-2 text-sm text-zinc-400'>
              Every rule surfaces a human-readable reason so operators
              understand why a browser was preselected.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
