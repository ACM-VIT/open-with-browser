import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from './Layout';
import Dashboard from './pages/Dashboard';
import Rules from './pages/Rules';
import Settings from './pages/Settings';
import { ActiveLink, LaunchHistoryItem } from './lib/models';
import {
  fetchAvailableBrowsers,
  fetchRoutingSnapshot,
  listenIncomingLink,
  listenLaunchDecision,
  listenRoutingStatus,
  listenRoutingError,
  resolveIncomingLink,
  fetchProfilesFor,
  type RoutingStatusWire,
} from './lib/routing';
import type { BrowserProfile } from './OpenWithDialog';
import {
  DEFAULT_UI_SETTINGS,
  loadUiSettings,
  persistLastSelectedBrowser,
  setUiSetting,
  type UiSettings,
} from './lib/storage';
import { useUIStore } from './store/uiStore';

type PageKey = 'dashboard' | 'rules' | 'settings';
type StatusMap = Record<string, RoutingStatusWire['status']>;
type ErrorMap = Record<string, string>;

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageKey>('dashboard');
  const [activeLink, setActiveLink] = useState<ActiveLink | null>(null);
  const [history, setHistory] = useState<LaunchHistoryItem[]>([]);
  const [statusById, setStatusById] = useState<StatusMap>({});
  const [errorsById, setErrorsById] = useState<ErrorMap>({});
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [browserCatalog, setBrowserCatalog] = useState<BrowserProfile[]>([]);
  const [uiSettings, setUiSettings] = useState<UiSettings>(DEFAULT_UI_SETTINGS);
  const [settingsReady, setSettingsReady] = useState(false);

  const setDialogSelectedBrowser = useUIStore(
    state => state.setSelectedBrowser
  );
  const resetDialogSelection = useUIStore(state => state.resetSelection);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const settings = await loadUiSettings();
        if (cancelled) return;
        setUiSettings(settings);
        setSettingsReady(true);
        if (settings.lastSelectedBrowserId) {
          setDialogSelectedBrowser(settings.lastSelectedBrowserId);
        } else {
          resetDialogSelection();
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('Unable to load UI settings', err);
        if (!cancelled) {
          setSettingsReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [resetDialogSelection, setDialogSelectedBrowser]);

  useEffect(() => {
    let unlisten: Array<() => void> = [];

    const setup = async () => {
      try {
        const snapshot = await fetchRoutingSnapshot();
        setActiveLink(snapshot.active);
        setHistory(snapshot.history);
        setReady(true);

        const removeIncoming = await listenIncomingLink(link => {
          setActiveLink(link);
        });
        const removeDecision = await listenLaunchDecision(decision => {
          setHistory(prev => [
            decision,
            ...prev.filter(item => item.id !== decision.id),
          ]);
        });
        const removeStatus = await listenRoutingStatus(status => {
          setStatusById(prev => ({
            ...prev,
            [status.id]: status.status,
          }));
          if (status.status !== 'failed') {
            setErrorsById(prev => {
              const next = { ...prev };
              delete next[status.id];
              return next;
            });
          }
        });

        const removeError = await listenRoutingError(error => {
          setErrorsById(prev => ({
            ...prev,
            [error.id]: error.message,
          }));
          setStatusById(prev => ({
            ...prev,
            [error.id]: 'failed',
          }));
        });

        unlisten = [removeIncoming, removeDecision, removeStatus, removeError];
      } catch (err) {
        const message =
          err instanceof Error
            ? `Failed to connect to routing service: ${err.message}`
            : 'Failed to connect to routing service.';
        setInitError(message);
        setReady(true);
      }
    };

    setup();
    return () => {
      unlisten.forEach(fn => fn());
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const normalize = (value: string | null | undefined) =>
      (value ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    const browserId = (name: string, directory: string | null | undefined) => {
      const base = normalize(name);
      const suffix = directory ? normalize(directory) : 'default';
      return `${base}__${suffix}`;
    };

    (async () => {
      try {
        const names = await fetchAvailableBrowsers();
        const catalog = new Map<string, BrowserProfile>();

        for (const name of names) {
          try {
            const profiles = await fetchProfilesFor(name);
            if (profiles && profiles.length > 0) {
              profiles.forEach(profile => {
                const id = browserId(name, profile.directory);
                catalog.set(id, {
                  id,
                  name,
                  profileLabel: profile.display_name,
                  profileDirectory: profile.directory,
                });
              });
            }

            const defaultId = browserId(name, null);
            if (!catalog.has(defaultId)) {
              catalog.set(defaultId, {
                id: defaultId,
                name,
                profileLabel: null,
                profileDirectory: null,
              });
            }
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn(`Unable to load profiles for ${name}`, err);
            const defaultId = browserId(name, null);
            if (!catalog.has(defaultId)) {
              catalog.set(defaultId, {
                id: defaultId,
                name,
                profileLabel: null,
                profileDirectory: null,
              });
            }
          }
        }

        if (!cancelled) {
          setBrowserCatalog(Array.from(catalog.values()));
        }
      } catch (err) {
        if (!cancelled) {
          // eslint-disable-next-line no-console
          console.warn('Unable to load available browsers', err);
          setBrowserCatalog([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!settingsReady) return;

    if (uiSettings.lastSelectedBrowserId) {
      const exists = browserCatalog.some(
        browser => browser.id === uiSettings.lastSelectedBrowserId
      );

      if (!exists) {
        (async () => {
          await persistLastSelectedBrowser(null);
          setUiSettings(prev => ({
            ...prev,
            lastSelectedBrowserId: null,
          }));
          resetDialogSelection();
        })().catch(err => {
          // eslint-disable-next-line no-console
          console.warn('Unable to reset last browser selection', err);
        });
      }
    }
  }, [browserCatalog, resetDialogSelection, settingsReady, uiSettings.lastSelectedBrowserId]);

  const recentHistory = useMemo(() => history.slice(0, 5), [history]);

  const handleRememberChoiceChange = useCallback(
    async (value: boolean) => {
      try {
        await setUiSetting('rememberChoice', value);
        setUiSettings(prev => ({
          ...prev,
          rememberChoice: value,
        }));
        if (!value) {
          await persistLastSelectedBrowser(null);
          setUiSettings(prev => ({
            ...prev,
            lastSelectedBrowserId: null,
          }));
          resetDialogSelection();
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('Unable to update remember choice setting', err);
      }
    },
    [resetDialogSelection]
  );

  const handleShowIconsChange = useCallback(async (value: boolean) => {
    try {
      await setUiSetting('showIcons', value);
      setUiSettings(prev => ({
        ...prev,
        showIcons: value,
      }));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Unable to update show icons setting', err);
    }
  }, []);

  const handleDebugModeChange = useCallback(async (value: boolean) => {
    try {
      await setUiSetting('debugMode', value);
      setUiSettings(prev => ({
        ...prev,
        debugMode: value,
      }));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Unable to update debug mode setting', err);
    }
  }, []);

  const handleRecordLaunch = async (
    browser: BrowserProfile,
    persist: 'just-once' | 'always'
  ) => {
    if (!activeLink) return;
    setStatusById(prev => ({
      ...prev,
      [activeLink.id]: 'launching',
    }));
    try {
      await resolveIncomingLink({
        link: activeLink,
        browser: {
          name: browser.name,
          profileLabel: browser.profileLabel ?? null,
          profileDirectory: browser.profileDirectory ?? null,
        },
        persist,
      });
      if (uiSettings.rememberChoice) {
        try {
          await persistLastSelectedBrowser(browser.id);
          setUiSettings(prev => ({
            ...prev,
            lastSelectedBrowserId: browser.id,
          }));
          setDialogSelectedBrowser(browser.id);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('Unable to persist last browser selection', err);
        }
      }
      setErrorsById(prev => {
        const next = { ...prev };
        delete next[activeLink.id];
        return next;
      });
    } catch (err) {
      setStatusById(prev => ({
        ...prev,
        [activeLink.id]: 'failed',
      }));
      throw err;
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard
            activeLink={activeLink}
            browsers={browserCatalog}
            recentHistory={recentHistory}
            statusById={statusById}
            errorsById={errorsById}
            onRecordLaunch={handleRecordLaunch}
            showIcons={uiSettings.showIcons}
          />
        );
      case 'rules':
        return <Rules availableBrowsers={browserCatalog} />;
      case 'settings':
        return (
          <Settings
            rememberChoice={uiSettings.rememberChoice}
            showIcons={uiSettings.showIcons}
            debugMode={uiSettings.debugMode}
            onRememberChoiceChange={handleRememberChoiceChange}
            onShowIconsChange={handleShowIconsChange}
            onDebugModeChange={handleDebugModeChange}
          />
        );
      default:
        return (
          <Dashboard
            activeLink={activeLink}
            browsers={browserCatalog}
            recentHistory={recentHistory}
            statusById={statusById}
            errorsById={errorsById}
            onRecordLaunch={handleRecordLaunch}
            showIcons={uiSettings.showIcons}
          />
        );
    }
  };

  return (
    <Layout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      activeLink={activeLink}
    >
      {ready ? (
        initError ? (
          <div className='flex h-full items-center justify-center text-sm text-red-300'>
            {initError}
          </div>
        ) : (
          renderPage()
        )
      ) : (
        <div className='flex h-full items-center justify-center text-sm text-zinc-500'>
          Initialising routing service…
        </div>
      )}
    </Layout>
  );
}
