import { useEffect, useMemo, useState } from 'react';
import Layout from './Layout';
import Dashboard from './pages/Dashboard';
import Rules from './pages/Rules';
import Settings from './pages/Settings';
import { ActiveLink, LaunchHistoryItem } from './lib/models';
import {
  fetchRoutingSnapshot,
  listenIncomingLink,
  listenLaunchDecision,
  listenRoutingStatus,
  listenRoutingError,
  resolveIncomingLink,
  simulateIncomingLink,
  type RoutingStatusWire,
} from './lib/routing';
import type { BrowserProfile } from './OpenWithDialog';

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

  const recentHistory = useMemo(() => history.slice(0, 5), [history]);

  const handleSimulateLink = async () => {
    await simulateIncomingLink();
  };

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
          profile: browser.profile ?? null,
        },
        persist,
      });
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
            recentHistory={recentHistory}
            statusById={statusById}
            errorsById={errorsById}
            onSimulateNext={handleSimulateLink}
            onRecordLaunch={handleRecordLaunch}
          />
        );
      case 'rules':
        return <Rules />;
      case 'settings':
        return <Settings />;
      default:
        return (
          <Dashboard
            activeLink={activeLink}
            recentHistory={recentHistory}
            statusById={statusById}
            errorsById={errorsById}
            onSimulateNext={handleSimulateLink}
            onRecordLaunch={handleRecordLaunch}
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
