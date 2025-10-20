import { useMemo, useState } from 'react';
import Layout from './Layout';
import Dashboard from './pages/Dashboard';
import Rules from './pages/Rules';
import Settings from './pages/Settings';
import { ActiveLink, LaunchHistoryItem } from './lib/models';

type PageKey = 'dashboard' | 'rules' | 'settings';

const incomingLinks: ActiveLink[] = [
  {
    id: 'inc-401',
    url: 'https://calendar.app/google/invite/team-sync',
    sourceApp: 'WhatsApp Desktop',
    sourceContext: 'Marketing · Standup thread',
    contactName: 'Maya Singh',
    preview: 'Quick reminder: standup notes are here.',
    recommendedBrowser: { name: 'Arc', profile: 'Workspace' },
    arrivedAt: new Date(Date.now() - 45 * 1000).toISOString(),
  },
  {
    id: 'inc-402',
    url: 'https://miro.com/app/board/strategy-review',
    sourceApp: 'Slack',
    sourceContext: '#strategy-room',
    contactName: 'Strategy Ops',
    preview: 'Please open this before the call.',
    recommendedBrowser: { name: 'Chrome', profile: 'Finance' },
    arrivedAt: new Date(Date.now() - 15 * 1000).toISOString(),
  },
  {
    id: 'inc-403',
    url: 'https://docs.google.com/spreadsheets/d/Q4-benchmark',
    sourceApp: 'Microsoft Teams',
    sourceContext: 'Product Council',
    contactName: 'Jordan',
    preview: 'Latest benchmark numbers.',
    recommendedBrowser: { name: 'Chrome', profile: 'Workspace' },
    arrivedAt: new Date(Date.now() - 5 * 1000).toISOString(),
  },
];

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageKey>('dashboard');
  const [incomingPointer, setIncomingPointer] = useState(1);
  const [activeLink, setActiveLink] = useState<ActiveLink>(incomingLinks[0]);
  const [history, setHistory] = useState<LaunchHistoryItem[]>([]);

  const recentHistory = useMemo(() => history.slice(0, 5), [history]);

  const cycleIncomingLink = () => {
    const nextIndex = incomingPointer % incomingLinks.length;
    setActiveLink(incomingLinks[nextIndex]);
    setIncomingPointer(nextIndex + 1);
  };

  const handleRecordLaunch = (
    browser: string,
    profile: string | null | undefined,
    persist: 'just-once' | 'always'
  ) => {
    if (!activeLink) return;

    setHistory(prev => [
      {
        id: `hist-${Date.now()}`,
        url: activeLink.url,
        decidedAt: new Date().toISOString(),
        browser,
        profile,
        persist,
        sourceApp: activeLink.sourceApp,
        contactName: activeLink.contactName,
      },
      ...prev,
    ]);

    cycleIncomingLink();
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard
            activeLink={activeLink}
            recentHistory={recentHistory}
            onSimulateNext={cycleIncomingLink}
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
            onSimulateNext={cycleIncomingLink}
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
      {renderPage()}
    </Layout>
  );
}
