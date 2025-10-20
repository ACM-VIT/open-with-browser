import { useCallback, useEffect, useMemo, useRef } from 'react';
import Layout from './Layout';
import Dashboard from './pages/Dashboard';
import Rules from './pages/Rules';
import Settings from './pages/Settings';
import type { BrowserProfile } from './OpenWithDialog';
import {
  fetchAvailableBrowsers,
  fetchRoutingSnapshot,
  listenIncomingLink,
  listenLaunchDecision,
  listenRoutingStatus,
  listenRoutingError,
  resolveIncomingLink,
  fetchProfilesFor,
} from './lib/routing';
import { fetchPreferences } from './lib/preferences';
import {
  loadUiSettings,
  persistLastSelectedBrowser,
  setUiSetting,
} from './lib/storage';
import { useUIStore } from './store/uiStore';
import {
  isTauriEnvironment,
  loadAutostartState,
  setAutostartState,
} from './lib/autostart';
import { useAppStore } from './store/appStore';

export default function App() {
  const currentPage = useAppStore(state => state.currentPage);
  const setCurrentPage = useAppStore(state => state.setCurrentPage);
  const activeLink = useAppStore(state => state.activeLink);
  const setActiveLink = useAppStore(state => state.setActiveLink);
  const history = useAppStore(state => state.history);
  const setHistory = useAppStore(state => state.setHistory);
  const statusById = useAppStore(state => state.statusById);
  const setStatusById = useAppStore(state => state.setStatusById);
  const errorsById = useAppStore(state => state.errorsById);
  const setErrorsById = useAppStore(state => state.setErrorsById);
  const ready = useAppStore(state => state.ready);
  const setReady = useAppStore(state => state.setReady);
  const initError = useAppStore(state => state.initError);
  const setInitError = useAppStore(state => state.setInitError);
  const browserCatalog = useAppStore(state => state.browserCatalog);
  const setBrowserCatalog = useAppStore(state => state.setBrowserCatalog);
  const uiSettings = useAppStore(state => state.uiSettings);
  const setUiSettings = useAppStore(state => state.setUiSettings);
  const settingsReady = useAppStore(state => state.settingsReady);
  const setSettingsReady = useAppStore(state => state.setSettingsReady);
  const hasFallback = useAppStore(state => state.hasFallback);
  const setHasFallback = useAppStore(state => state.setHasFallback);
  const fallbackPromptVisible = useAppStore(
    state => state.fallbackPromptVisible
  );
  const setFallbackPromptVisible = useAppStore(
    state => state.setFallbackPromptVisible
  );
  const dismissedFallbackFor = useAppStore(state => state.dismissedFallbackFor);
  const setDismissedFallbackFor = useAppStore(
    state => state.setDismissedFallbackFor
  );
  const autostartEnabled = useAppStore(state => state.autostartEnabled);
  const setAutostartEnabled = useAppStore(state => state.setAutostartEnabled);
  const autostartReady = useAppStore(state => state.autostartReady);
  const setAutostartReady = useAppStore(state => state.setAutostartReady);
  const autostartStatus = useAppStore(state => state.autostartStatus);
  const setAutostartStatus = useAppStore(state => state.setAutostartStatus);
  const pendingFallbackFocus = useAppStore(state => state.pendingFallbackFocus);
  const setPendingFallbackFocus = useAppStore(
    state => state.setPendingFallbackFocus
  );
  const hasFallbackRef = useRef<boolean | null>(null);

  const setDialogSelectedBrowser = useUIStore(
    state => state.setSelectedBrowser
  );
  const resetDialogSelection = useUIStore(state => state.resetSelection);

  const focusMainWindow = useCallback(async () => {
    if (!isTauriEnvironment()) return;
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const windowRef = getCurrentWindow();
      await windowRef.show();
      await windowRef.unminimize();
      await windowRef.setFocus();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Unable to focus main window', err);
    }
  }, []);

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
  }, [
    resetDialogSelection,
    setDialogSelectedBrowser,
    setSettingsReady,
    setUiSettings,
  ]);

  useEffect(() => {
    if (!isTauriEnvironment()) {
      setAutostartReady(true);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const enabled = await loadAutostartState();
        if (!cancelled) {
          setAutostartEnabled(enabled);
          setAutostartReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          setAutostartReady(true);
          setAutostartStatus(
            err instanceof Error
              ? `Unable to read autostart preference: ${err.message}`
              : 'Unable to read autostart preference.'
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setAutostartEnabled, setAutostartReady, setAutostartStatus]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const snapshot = await fetchPreferences();
        if (!cancelled) {
          const hasValue = Boolean(snapshot.fallback);
          hasFallbackRef.current = hasValue;
          setHasFallback(hasValue);
        }
      } catch (err) {
        if (!cancelled) {
          setHasFallback(null);
          hasFallbackRef.current = null;
          // eslint-disable-next-line no-console
          console.warn('Unable to read fallback preference', err);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setHasFallback]);

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
          if (hasFallbackRef.current === false) {
            setFallbackPromptVisible(true);
            void focusMainWindow();
          } else if (hasFallbackRef.current === null) {
            setPendingFallbackFocus(true);
            setFallbackPromptVisible(true);
            void focusMainWindow();
          }
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
  }, [
    focusMainWindow,
    setActiveLink,
    setErrorsById,
    setHistory,
    setInitError,
    setPendingFallbackFocus,
    setReady,
    setStatusById,
    setFallbackPromptVisible,
  ]);

  useEffect(() => {
    if (activeLink && hasFallback === false) {
      if (dismissedFallbackFor !== activeLink.id) {
        setFallbackPromptVisible(true);
      }
    }
  }, [activeLink, hasFallback, dismissedFallbackFor, setFallbackPromptVisible]);

  useEffect(() => {
    if (!activeLink) {
      setFallbackPromptVisible(false);
      setPendingFallbackFocus(false);
    }
  }, [activeLink, setFallbackPromptVisible, setPendingFallbackFocus]);

  useEffect(() => {
    hasFallbackRef.current = hasFallback;

    if (hasFallback) {
      setFallbackPromptVisible(false);
      setDismissedFallbackFor(null);
      setPendingFallbackFocus(false);
      return;
    }

    if (hasFallback === false && pendingFallbackFocus) {
      setFallbackPromptVisible(true);
      setPendingFallbackFocus(false);
      void focusMainWindow();
    }
  }, [
    hasFallback,
    pendingFallbackFocus,
    focusMainWindow,
    setDismissedFallbackFor,
    setFallbackPromptVisible,
    setPendingFallbackFocus,
  ]);

  useEffect(() => {
    if (!activeLink) return;
    if (hasFallback === false) {
      void focusMainWindow();
    }
  }, [activeLink, hasFallback, focusMainWindow]);

  useEffect(() => {
    if (!fallbackPromptVisible) return;
    void focusMainWindow();
  }, [fallbackPromptVisible, focusMainWindow]);

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
  }, [setBrowserCatalog]);

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
  }, [
    browserCatalog,
    resetDialogSelection,
    settingsReady,
    uiSettings.lastSelectedBrowserId,
    setUiSettings,
  ]);

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
    [resetDialogSelection, setUiSettings]
  );

  const handleShowIconsChange = useCallback(
    async (value: boolean) => {
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
    },
    [setUiSettings]
  );

  const handleDebugModeChange = useCallback(
    async (value: boolean) => {
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
    },
    [setUiSettings]
  );

  const handleFallbackChanged = useCallback(
    (value: boolean) => {
      setHasFallback(value);
      if (value) {
        setFallbackPromptVisible(false);
        setDismissedFallbackFor(null);
      }
    },
    [setDismissedFallbackFor, setFallbackPromptVisible, setHasFallback]
  );

  const handleOpenFallbackSettings = useCallback(() => {
    setCurrentPage('settings');
    setFallbackPromptVisible(false);
    setDismissedFallbackFor(activeLink?.id ?? null);
  }, [
    activeLink?.id,
    setCurrentPage,
    setDismissedFallbackFor,
    setFallbackPromptVisible,
  ]);

  const handleDismissFallbackPrompt = useCallback(() => {
    setFallbackPromptVisible(false);
    setDismissedFallbackFor(activeLink?.id ?? null);
  }, [activeLink?.id, setDismissedFallbackFor, setFallbackPromptVisible]);

  const handleAutostartChange = useCallback(
    async (value: boolean) => {
      if (value === autostartEnabled) return;

      if (!isTauriEnvironment()) {
        setAutostartEnabled(value);
        setAutostartStatus(null);
        return;
      }

      try {
        await setAutostartState(value);
        setAutostartEnabled(value);
        setAutostartStatus(
          value
            ? 'App will start automatically at login.'
            : 'Autostart disabled.'
        );
      } catch (err) {
        setAutostartStatus(
          err instanceof Error
            ? `Failed to update autostart: ${err.message}`
            : 'Failed to update autostart setting.'
        );
      }
    },
    [autostartEnabled, setAutostartEnabled, setAutostartStatus]
  );

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
            needsFallbackPrompt={fallbackPromptVisible}
            onOpenFallbackSettings={handleOpenFallbackSettings}
            onDismissFallbackPrompt={handleDismissFallbackPrompt}
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
            hasFallback={hasFallback}
            onFallbackChanged={handleFallbackChanged}
            autostartEnabled={autostartEnabled}
            autostartReady={autostartReady}
            autostartStatus={autostartStatus}
            onAutostartChange={handleAutostartChange}
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
            needsFallbackPrompt={fallbackPromptVisible}
            onOpenFallbackSettings={handleOpenFallbackSettings}
            onDismissFallbackPrompt={handleDismissFallbackPrompt}
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
          Initializing routing service…
        </div>
      )}
    </Layout>
  );
}
