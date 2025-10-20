import { ReactNode } from 'react';
import type { ActiveLink } from './lib/models';

type PageKey = 'dashboard' | 'rules' | 'settings';

type LayoutProps = {
  children: ReactNode;
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
  activeLink: ActiveLink | null;
};

const navItems: Array<{ id: PageKey; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'rules', label: 'Rules' },
  { id: 'settings', label: 'Settings' },
];

export default function Layout({
  children,
  currentPage,
  onNavigate,
  activeLink,
}: LayoutProps) {
  const activeNavLabel =
    navItems.find(item => item.id === currentPage)?.label ?? 'Overview';

  return (
    <div className='flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100'>
      <aside className='flex w-[clamp(13.5rem,20vw,18rem)] shrink-0 flex-col border-r border-white/5 bg-zinc-950/85 px-5 py-6 backdrop-blur-lg lg:px-6 lg:py-8'>
        <div className='flex items-center gap-3 rounded-[26px] border border-white/5 bg-black/30 px-4 py-4 shadow-soft-sm'>
          <div className='flex h-12 w-12 items-center justify-center rounded-[20px] bg-zinc-900 text-xl font-semibold text-amber-400 shadow-soft-sm'>
            ⌘
          </div>
          <div className='space-y-1'>
            <p className='text-xs uppercase tracking-[0.35em] text-zinc-500'>
              Open With
            </p>
            <p className='text-lg font-semibold text-zinc-100'>
              Browser Studio
            </p>
          </div>
        </div>

        <nav className='mt-10 space-y-2'>
          {navItems.map(item => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full rounded-[20px] border border-transparent px-4 py-3 text-left text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'border-white/10 bg-zinc-900/80 text-zinc-100 shadow-soft-sm'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
                }`}
              >
                <span className='flex items-center justify-between'>
                  <span>{item.label}</span>
                  <span className='text-xs text-zinc-500'>↘</span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className='mt-auto rounded-[24px] border border-white/5 bg-black/25 p-5 shadow-soft-sm'>
          <p className='text-xs uppercase tracking-[0.32em] text-zinc-500'>
            Current hand-off
          </p>
          {activeLink ? (
            <div className='mt-4 space-y-3 text-sm text-zinc-300'>
              <div>
                <p className='text-xs text-zinc-500'>Source app</p>
                <p className='mt-1 font-semibold text-zinc-100'>
                  {activeLink.sourceApp}
                </p>
                <p className='text-xs text-zinc-500'>
                  {activeLink.sourceContext}
                </p>
              </div>
              <div>
                <p className='text-xs text-zinc-500'>Contact</p>
                <p className='mt-1 text-sm font-medium text-zinc-100'>
                  {activeLink.contactName}
                </p>
              </div>
              <div className='rounded-[18px] border border-white/5 bg-black/30 px-3 py-2 text-xs text-zinc-400'>
                Recommended:{' '}
                <span className='font-semibold text-emerald-200'>
                  {activeLink.recommendedBrowser.name}
                  {activeLink.recommendedBrowser.profile
                    ? ` · ${activeLink.recommendedBrowser.profile}`
                    : ''}
                </span>
              </div>
            </div>
          ) : (
            <p className='mt-4 text-sm text-zinc-500'>
              Waiting for the next link hand-off.
            </p>
          )}
        </div>
      </aside>

      <div className='flex flex-1 flex-col overflow-hidden'>
        <header className='flex flex-wrap items-center justify-between gap-4 border-b border-white/5 bg-zinc-950/70 px-6 py-4 backdrop-blur shadow-soft-sm md:px-8 md:py-5 lg:px-10 lg:py-6'>
          <div>
            <p className='text-xs uppercase tracking-[0.35em] text-zinc-500'>
              {activeNavLabel}
            </p>
            <h1 className='mt-2 text-2xl font-semibold text-zinc-100'>
              Open chat links without leaving your flow
            </h1>
            <p className='mt-1 text-sm text-zinc-400'>
              Preview the incoming context, confirm the browser, and hand off in
              the background.
            </p>
          </div>
          {activeLink ? (
            <div className='flex items-center gap-3 rounded-[22px] border border-white/5 bg-black/30 px-4 py-3 shadow-soft-sm'>
              <div className='flex flex-col text-right'>
                <span className='text-xs font-semibold text-zinc-200'>
                  {activeLink.contactName}
                </span>
                <span className='text-[11px] text-zinc-500'>
                  {activeLink.sourceApp} •{' '}
                  {new Date(activeLink.arrivedAt).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          ) : (
            <div className='rounded-[22px] border border-white/10 bg-black/30 px-4 py-3 text-xs text-zinc-400 shadow-soft-sm'>
              No active link
            </div>
          )}
        </header>
        <main className='flex-1 overflow-y-auto px-6 py-6 md:px-8 md:py-7 lg:px-10 lg:py-8'>
          {children}
        </main>
      </div>
    </div>
  );
}
