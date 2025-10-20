import { ReactNode, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
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
  const [navOpen, setNavOpen] = useState(false);

  const activeNavLabel =
    navItems.find(item => item.id === currentPage)?.label ?? 'Overview';

  const handleNavigate = (page: PageKey) => {
    onNavigate(page);
    setNavOpen(false);
  };

  const navPanelContent = (
    <div className='flex h-full flex-col border-white/5 bg-zinc-950/90 px-5 py-6 backdrop-blur-lg sm:px-6 lg:px-6 lg:py-8'>
      <div className='flex items-center gap-3 rounded-[26px] border border-white/5 bg-black/30 px-4 py-4 shadow-soft-sm'>
        <div className='flex h-12 w-12 items-center justify-center rounded-[20px] bg-zinc-900 text-xl font-semibold text-amber-400 shadow-soft-sm'>
          ⌘
        </div>
        <div className='space-y-1'>
          <p className='text-xs uppercase tracking-[0.35em] text-zinc-500'>
            Open With
          </p>
          <p className='text-lg font-semibold text-zinc-100'>Browser Studio</p>
        </div>
      </div>

      <nav className='mt-10 space-y-2'>
        {navItems.map(item => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id)}
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
            {activeLink.recommendedBrowser ? (
              <div className='rounded-[18px] border border-white/5 bg-black/30 px-3 py-2 text-xs text-zinc-400'>
                Recommended:{' '}
                <span className='font-semibold text-emerald-200'>
                  {activeLink.recommendedBrowser.name}
                  {activeLink.recommendedBrowser.profile
                    ? ` · ${activeLink.recommendedBrowser.profile}`
                    : ''}
                </span>
              </div>
            ) : null}
          </div>
        ) : (
          <p className='mt-4 text-sm text-zinc-500'>
            Waiting for the next link hand-off.
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className='flex min-h-screen w-full flex-col bg-zinc-950 text-zinc-100 lg:flex-row'>
      <AnimatePresence>
        {navOpen ? (
          <motion.div
            key='mobile-nav'
            className='fixed inset-0 z-40 flex lg:hidden'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.button
              aria-label='Close navigation'
              type='button'
              className='absolute inset-0 bg-black/60 backdrop-blur-sm'
              onClick={() => setNavOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            <motion.aside
              className='relative flex h-full w-[min(20rem,85vw)] flex-col border-r border-white/5 bg-zinc-950/95 shadow-soft-sm'
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            >
              {navPanelContent}
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <aside className='sticky top-0 hidden h-screen w-[clamp(14rem,22vw,19rem)] border-r border-white/5 lg:block'>
        {navPanelContent}
      </aside>

      <div className='flex flex-1 flex-col overflow-hidden'>
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className='flex flex-wrap items-center justify-between gap-4 border-b border-white/5 bg-zinc-950/80 px-5 py-4 backdrop-blur shadow-soft-sm sm:px-6 md:px-8 lg:px-10 lg:py-6'
        >
          <div className='flex w-full items-center justify-between gap-4 lg:hidden'>
            <button
              aria-label='Toggle navigation'
              onClick={() => setNavOpen(true)}
              className='flex items-center gap-2 rounded-[18px] border border-white/10 bg-black/40 px-3 py-2 text-sm font-semibold text-zinc-200 shadow-soft-sm'
            >
              <span className='text-lg leading-none'>☰</span>
              Menu
            </button>
            {activeLink ? (
              <div className='flex flex-col items-end text-right'>
                <span className='text-xs font-semibold text-zinc-200'>
                  {activeLink.contactName}
                </span>
                <span className='text-[11px] text-zinc-500'>
                  {activeLink.sourceApp} •{' '}
                  {new Date(activeLink.arrivedAt).toLocaleTimeString(
                    undefined,
                    {
                      hour: '2-digit',
                      minute: '2-digit',
                    }
                  )}
                </span>
              </div>
            ) : null}
          </div>

          <div className='w-full lg:w-auto'>
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
            <div className='hidden items-center gap-3 rounded-[22px] border border-white/5 bg-black/30 px-4 py-3 shadow-soft-sm lg:flex'>
              <div className='flex flex-col text-right'>
                <span className='text-xs font-semibold text-zinc-200'>
                  {activeLink.contactName}
                </span>
                <span className='text-[11px] text-zinc-500'>
                  {activeLink.sourceApp} •{' '}
                  {new Date(activeLink.arrivedAt).toLocaleTimeString(
                    undefined,
                    {
                      hour: '2-digit',
                      minute: '2-digit',
                    }
                  )}
                </span>
              </div>
            </div>
          ) : (
            <div className='hidden rounded-[22px] border border-white/10 bg-black/30 px-4 py-3 text-xs text-zinc-400 shadow-soft-sm lg:flex'>
              No active link
            </div>
          )}
        </motion.header>

        <motion.main
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut', delay: 0.05 }}
          className='flex-1 overflow-y-auto px-5 py-6 sm:px-6 md:px-8 lg:px-10 lg:py-8'
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
