import { useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import {
  arch as osArch,
  family as osFamily,
  platform as osPlatform,
  type as resolveOsType,
  version as osVersion,
} from '@tauri-apps/plugin-os';
import {
  fetchAvailableBrowsers,
  fetchProfilesFor,
  type ProfileDescriptorWire,
} from '../lib/routing';
import {
  fetchPreferences,
  updateFallbackPreference,
  type FallbackPreference,
} from '../lib/preferences';
import {
  clearDiagnostics,
  exportDiagnostics,
  fetchDiagnostics,
  type DiagnosticEntry,
} from '../lib/diagnostics';
import { Select } from '../components/ui/Select';

type SettingsProps = {
  rememberChoice: boolean;
  showIcons: boolean;
  debugMode: boolean;
  onRememberChoiceChange: (value: boolean) => Promise<void> | void;
  onShowIconsChange: (value: boolean) => Promise<void> | void;
  onDebugModeChange: (value: boolean) => Promise<void> | void;
  hasFallback: boolean | null;
  onFallbackChanged: (hasFallback: boolean) => void;
  autostartEnabled: boolean;
  autostartReady: boolean;
  autostartStatus: string | null;
  onAutostartChange: (value: boolean) => Promise<void> | void;
};

export default function Settings({
  rememberChoice,
  showIcons,
  debugMode,
  onRememberChoiceChange,
  onShowIconsChange,
  onDebugModeChange,
  hasFallback,
  onFallbackChanged,
  autostartEnabled,
  autostartReady,
  autostartStatus,
  onAutostartChange,
}: SettingsProps) {
  const [availableBrowsers, setAvailableBrowsers] = useState<string[]>([]);
  const [availableProfiles, setAvailableProfiles] = useState<
    ProfileDescriptorWire[]
  >([]);
  const [fallbackBrowser, setFallbackBrowser] = useState<string>('');
  const [fallbackProfileDirectory, setFallbackProfileDirectory] =
    useState<string>('');
  const [fallbackProfileLabel, setFallbackProfileLabel] = useState<string>('');
  const [savingFallback, setSavingFallback] = useState(false);
  const [fallbackStatus, setFallbackStatus] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticEntry[]>([]);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(true);
  const [diagnosticsStatus, setDiagnosticsStatus] = useState<string | null>(
    null
  );
  const [defaultStatus, setDefaultStatus] = useState<
    'checking' | 'default' | 'not-default' | 'error'
  >('checking');
  const [defaultError, setDefaultError] = useState<string | null>(null);
  const [systemInfo, setSystemInfo] = useState<{
    platform: ReturnType<typeof osPlatform>;
    osType: ReturnType<typeof resolveOsType>;
    family: ReturnType<typeof osFamily>;
    arch: ReturnType<typeof osArch>;
    version: string;
  } | null>(null);

  const browserSelectOptions = useMemo(
    () => [
      { value: '', label: 'Ask each time' },
      ...availableBrowsers.map(browser => ({ value: browser, label: browser })),
    ],
    [availableBrowsers]
  );

  const profileSelectOptions = useMemo(
    () => [
      { value: '', label: 'No specific profile' },
      ...availableProfiles.map(profile => ({
        value: profile.directory,
        label: profile.display_name || profile.directory,
      })),
    ],
    [availableProfiles]
  );

  useEffect(() => {
    refreshDefaultStatus();
    loadBrowsers();
    try {
      setSystemInfo({
        platform: osPlatform(),
        osType: resolveOsType(),
        family: osFamily(),
        arch: osArch(),
        version: osVersion(),
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Unable to read system metadata', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unlisten: UnlistenFn | null = null;

    (async () => {
      try {
        const snapshot = await fetchDiagnostics();
        if (!cancelled) {
          setDiagnostics(snapshot);
          setDiagnosticsLoading(false);
        }
        unlisten = await listen<DiagnosticEntry>(
          'diagnostics://entry',
          event => {
            setDiagnostics(prev => {
              const filtered = prev.filter(
                entry => entry.id != event.payload.id
              );
              const next = [event.payload, ...filtered];
              return next.slice(0, 500);
            });
            setDiagnosticsLoading(false);
          }
        );
      } catch (err) {
        if (!cancelled) {
          setDiagnosticsLoading(false);
          setDiagnosticsStatus(
            err instanceof Error
              ? `Unable to load diagnostics: ${err.message}`
              : 'Unable to load diagnostics.'
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      if (unlisten) {
        void unlisten();
      }
    };
  }, []);

  const defaultStatusLabel = useMemo(() => {
    switch (defaultStatus) {
      case 'default':
        return 'Open With Browser is the default handler.';
      case 'not-default':
        return 'Open With Browser is not the default yet.';
      case 'error':
        return 'Unable to determine current default.';
      default:
        return 'Checking current default…';
    }
  }, [defaultStatus]);

  const defaultSettingsCta = useMemo(() => {
    switch (systemInfo?.osType) {
      case 'windows':
        return 'Open Windows default-app settings';
      case 'macos':
        return 'Open macOS default-app settings';
      case 'linux':
        return 'Open Linux default-app settings';
      default:
        return 'Open default-app settings';
    }
  }, [systemInfo]);

  async function refreshDefaultStatus() {
    setDefaultStatus('checking');
    setDefaultError(null);
    try {
      const result = await invoke<boolean>('is_default_browser');
      setDefaultStatus(result ? 'default' : 'not-default');
    } catch (err) {
      setDefaultStatus('error');
      setDefaultError(
        err instanceof Error
          ? err.message
          : 'Could not read the current default browser.'
      );
    }
  }

  async function loadBrowsers() {
    try {
      const list = await fetchAvailableBrowsers();
      setAvailableBrowsers(list);
      await loadPreferences(list);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Unable to load local browsers', err);
    }
  }

  async function loadPreferences(browserList?: string[]) {
    try {
      const snapshot = await fetchPreferences();
      if (snapshot.fallback) {
        applyFallback(snapshot.fallback, browserList);
        onFallbackChanged(true);
      } else {
        setFallbackBrowser('');
        setFallbackProfileDirectory('');
        setFallbackProfileLabel('');
        onFallbackChanged(false);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Unable to load preferences', err);
    }
  }

  function applyFallback(
    fallback: FallbackPreference,
    browsers: string[] = availableBrowsers
  ) {
    setFallbackBrowser(fallback.browser);
    const profileLabel = fallback.profile?.label ?? '';
    const profileDirectory = fallback.profile?.directory ?? '';
    setFallbackProfileLabel(profileLabel);
    setFallbackProfileDirectory(profileDirectory);

    if (!browsers.includes(fallback.browser)) {
      setAvailableBrowsers(prev =>
        prev.includes(fallback.browser) ? prev : [fallback.browser, ...prev]
      );
    }

    void loadProfilesForBrowser(
      fallback.browser,
      profileDirectory,
      profileLabel
    );
  }

  async function loadProfilesForBrowser(
    browser: string,
    directory?: string,
    label?: string
  ) {
    if (!browser) {
      setAvailableProfiles([]);
      setFallbackProfileDirectory('');
      setFallbackProfileLabel('');
      return;
    }

    try {
      const profiles = await fetchProfilesFor(browser);
      setAvailableProfiles(profiles);

      if (directory) {
        const match = profiles.find(p => p.directory === directory);
        if (match) {
          setFallbackProfileDirectory(match.directory);
          setFallbackProfileLabel(match.display_name);
        } else if (profiles.length === 0) {
          setFallbackProfileDirectory('');
          setFallbackProfileLabel('');
        } else {
          setFallbackProfileDirectory(directory);
          setFallbackProfileLabel(label ?? directory);
        }
      } else if (profiles.length === 0) {
        setFallbackProfileDirectory('');
        setFallbackProfileLabel('');
      } else {
        setFallbackProfileDirectory('');
        setFallbackProfileLabel('');
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`Unable to load profiles for ${browser}`, err);
      setAvailableProfiles([]);
    }
  }

  async function handleOpenDefaultSettings() {
    try {
      await invoke('register_browser_handlers');
      await invoke('open_default_browser_settings');
    } catch (err) {
      setDefaultError(
        err instanceof Error
          ? err.message
          : 'System rejected the settings request.'
      );
    }
  }

  async function handleFallbackBrowserChange(value: string) {
    setFallbackBrowser(value);
    setFallbackProfileDirectory('');
    setFallbackProfileLabel('');
    await loadProfilesForBrowser(value);
    setFallbackStatus(null);
  }

  function handleFallbackProfileChange(value: string) {
    setFallbackProfileDirectory(value);
    const match = availableProfiles.find(
      profile => profile.directory === value
    );
    setFallbackProfileLabel(match?.display_name ?? value);
    setFallbackStatus(null);
  }

  async function handleSaveFallback() {
    setSavingFallback(true);
    setFallbackStatus(null);
    try {
      await updateFallbackPreference({
        browser: fallbackBrowser || null,
        profile: fallbackBrowser
          ? fallbackProfileDirectory
            ? {
                label: fallbackProfileLabel || fallbackProfileDirectory || null,
                directory: fallbackProfileDirectory,
              }
            : null
          : null,
      });
      onFallbackChanged(Boolean(fallbackBrowser));
      setFallbackStatus(
        fallbackBrowser
          ? `Links without a rule will open in ${fallbackBrowser}${fallbackProfileLabel ? ` · ${fallbackProfileLabel}` : ''}.`
          : 'Fallback routing cleared. You will be prompted for each link.'
      );
    } catch (err) {
      setFallbackStatus(
        err instanceof Error
          ? err.message
          : 'Failed to update fallback preference.'
      );
    } finally {
      setSavingFallback(false);
    }
  }

  async function handleExportDiagnostics() {
    try {
      const payload = await exportDiagnostics();
      const nav =
        typeof globalThis.navigator !== 'undefined'
          ? globalThis.navigator
          : null;
      if (nav?.clipboard) {
        await nav.clipboard.writeText(payload ?? '');
        setDiagnosticsStatus('Diagnostics copied to clipboard.');
      } else {
        setDiagnosticsStatus(
          'Clipboard unavailable. Select and copy from the list.'
        );
      }
    } catch (err) {
      setDiagnosticsStatus(
        err instanceof Error
          ? `Failed to export diagnostics: ${err.message}`
          : 'Failed to export diagnostics.'
      );
    }
  }

  async function handleClearDiagnostics() {
    try {
      await clearDiagnostics();
      setDiagnostics([]);
      setDiagnosticsLoading(false);
      setDiagnosticsStatus('Diagnostics cleared.');
    } catch (err) {
      setDiagnosticsStatus(
        err instanceof Error
          ? `Failed to clear diagnostics: ${err.message}`
          : 'Failed to clear diagnostics.'
      );
    }
  }

  return (
    <div className='flex flex-col gap-8 pb-16'>
      <section className='panel'>
        <div className='flex flex-wrap items-start justify-between gap-6'>
          <div className='space-y-2'>
            <h2 className='text-2xl font-semibold text-zinc-50'>
              System setup
            </h2>
            <p className='text-sm text-zinc-400'>
              Make Open With Browser the default handler so links intercepted
              from chat apps land here first. The operating system will show a
              confirmation dialog before the change takes effect.
            </p>
            <p
              className={`text-xs ${
                defaultStatus === 'default'
                  ? 'text-emerald-200'
                  : defaultStatus === 'error'
                    ? 'text-red-300'
                    : 'text-zinc-400'
              }`}
            >
              {defaultStatusLabel}
            </p>
            {defaultError ? (
              <p className='text-xs text-red-300'>{defaultError}</p>
            ) : null}
          </div>
          <div className='flex flex-col gap-2'>
            <button
              onClick={handleOpenDefaultSettings}
              className='rounded-[18px] border border-emerald-400/60 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-100 shadow-soft-sm transition hover:border-emerald-300/70'
            >
              {defaultSettingsCta}
            </button>
            <button
              onClick={refreshDefaultStatus}
              className='rounded-[18px] border border-white/10 bg-black/30 px-4 py-2 text-xs font-semibold text-zinc-300 shadow-soft-sm transition hover:border-white/20'
            >
              Recheck status
            </button>
            {availableBrowsers.length > 0 ? (
              <div className='rounded-[16px] border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-400 shadow-soft-sm'>
                <p className='font-semibold text-zinc-200'>Detected browsers</p>
                <p>{availableBrowsers.join(', ')}</p>
              </div>
            ) : null}
            {systemInfo ? (
              <div className='rounded-[16px] border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-400 shadow-soft-sm'>
                <p className='font-semibold text-zinc-200'>System</p>
                <p>
                  {[
                    systemInfo.osType,
                    systemInfo.platform,
                    systemInfo.arch,
                    systemInfo.version,
                  ].join(' · ')}
                </p>
                <p>Family: {systemInfo.family}</p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className='panel'>
        <h3 className='panel-title'>General settings</h3>
        <div className='mt-4 space-y-3'>
          <label className='flex items-center justify-between gap-4 rounded-[18px] border border-white/5 bg-black/30 px-4 py-3 shadow-soft-sm transition hover:border-emerald-400/30'>
            <div>
              <p className='text-sm font-semibold text-zinc-100'>
                Remember browser choice
              </p>
              <p className='text-xs text-zinc-500'>
                Persist the last selection to cut down on repetitive prompts.
              </p>
            </div>
            <input
              type='checkbox'
              checked={rememberChoice}
              onChange={e => void onRememberChoiceChange(e.target.checked)}
              className='h-5 w-5 rounded border border-white/10 bg-black/50 accent-emerald-400'
            />
          </label>

          <label className='flex items-center justify-between gap-4 rounded-[18px] border border-white/5 bg-black/30 px-4 py-3 shadow-soft-sm transition hover:border-amber-400/30'>
            <div>
              <p className='text-sm font-semibold text-zinc-100'>
                Show browser glyphs
              </p>
              <p className='text-xs text-zinc-500'>
                Surface brand glyphs in the hand-off list for quicker
                recognition.
              </p>
            </div>
            <input
              type='checkbox'
              checked={showIcons}
              onChange={e => void onShowIconsChange(e.target.checked)}
              className='h-5 w-5 rounded border border-white/10 bg-black/50 accent-amber-400'
            />
          </label>

          <label className='flex items-center justify-between gap-4 rounded-[18px] border border-white/5 bg-black/30 px-4 py-3 shadow-soft-sm transition hover:border-emerald-400/30'>
            <div>
              <p className='text-sm font-semibold text-zinc-100'>
                Start app at login
              </p>
              <p className='text-xs text-zinc-500'>
                Launch Open With Browser automatically when you sign in.
              </p>
            </div>
            <input
              type='checkbox'
              checked={autostartEnabled}
              onChange={e => void onAutostartChange(e.target.checked)}
              disabled={!autostartReady}
              className='h-5 w-5 rounded border border-white/10 bg-black/50 accent-emerald-400 disabled:cursor-not-allowed disabled:opacity-60'
            />
          </label>
          {autostartStatus ? (
            <p className='pl-1 text-xs text-zinc-500'>{autostartStatus}</p>
          ) : null}
        </div>
      </section>

      <section className='panel'>
        <h3 className='panel-title'>Browser orchestration</h3>
        <div className='mt-4 space-y-3'>
          {hasFallback === false ? (
            <div className='rounded-[16px] border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 shadow-soft-sm'>
              Set a fallback so unmatched links open automatically.
            </div>
          ) : null}
          <div className='flex flex-col gap-2 text-sm text-zinc-300'>
            <span>Default browser for unmatched links</span>
            <Select
              options={browserSelectOptions}
              value={fallbackBrowser}
              onChange={value => void handleFallbackBrowserChange(value)}
            />
          </div>

          {fallbackBrowser ? (
            <div className='flex flex-col gap-2 text-sm text-zinc-300'>
              <span>Default profile (optional)</span>
              <Select
                options={profileSelectOptions}
                value={fallbackProfileDirectory}
                onChange={value => handleFallbackProfileChange(value)}
                disabled={availableProfiles.length === 0}
              />
            </div>
          ) : null}

          <div className='flex items-center gap-3'>
            <button
              onClick={handleSaveFallback}
              disabled={savingFallback}
              className='rounded-[18px] border border-emerald-400/60 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-100 shadow-soft-sm transition hover:border-emerald-300/70 disabled:cursor-not-allowed disabled:opacity-60'
            >
              {savingFallback ? 'Saving…' : 'Save fallback'}
            </button>
            {fallbackStatus ? (
              <span className='text-xs text-zinc-400'>{fallbackStatus}</span>
            ) : null}
          </div>
        </div>
      </section>

      <section className='panel'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <h3 className='panel-title'>Diagnostics</h3>
          <div className='flex gap-2'>
            <button
              onClick={handleExportDiagnostics}
              disabled={diagnosticsLoading}
              className='rounded-[16px] border border-white/10 bg-black/30 px-3 py-2 text-xs font-semibold text-zinc-300 shadow-soft-sm transition hover:border-emerald-400/40 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-60'
            >
              Copy log
            </button>
            <button
              onClick={handleClearDiagnostics}
              disabled={diagnosticsLoading || diagnostics.length === 0}
              className='rounded-[16px] border border-white/10 bg-black/30 px-3 py-2 text-xs font-semibold text-zinc-300 shadow-soft-sm transition hover:border-red-400/40 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-60'
            >
              Clear log
            </button>
          </div>
        </div>
        <div className='mt-4 space-y-3'>
          <label className='flex items-center justify-between gap-4 rounded-[18px] border border-white/5 bg-black/30 px-4 py-3 shadow-soft-sm transition hover:border-red-400/40'>
            <div>
              <p className='text-sm font-semibold text-red-200'>
                Enable debug timeline
              </p>
              <p className='text-xs text-zinc-500'>
                Capture extra routing steps for troubleshooting.
              </p>
            </div>
            <input
              type='checkbox'
              checked={debugMode}
              onChange={e => void onDebugModeChange(e.target.checked)}
              className='h-5 w-5 rounded border border-white/10 bg-black/50 accent-red-400'
            />
          </label>
          {diagnosticsStatus ? (
            <p className='text-xs text-zinc-400'>{diagnosticsStatus}</p>
          ) : null}
          <div className='max-h-60 space-y-2 overflow-auto rounded-[18px] border border-white/5 bg-black/25 p-3 shadow-soft-sm'>
            {diagnosticsLoading ? (
              <p className='text-xs text-zinc-500'>Loading diagnostics…</p>
            ) : diagnostics.length === 0 ? (
              <p className='text-xs text-zinc-500'>
                No diagnostic entries yet.
              </p>
            ) : (
              diagnostics.map(entry => (
                <div
                  key={entry.id}
                  className='rounded-[14px] border border-white/5 bg-black/30 px-3 py-2 text-xs text-zinc-300'
                >
                  <p className='font-medium text-zinc-200'>
                    {new Date(entry.timestamp).toLocaleString()}
                  </p>
                  <p className='mt-1 text-[11px] leading-relaxed text-zinc-400'>
                    {entry.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
