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
    <div className='flex h-full flex-col gap-8 border-white/5 bg-zinc-950/90 px-5 py-6 backdrop-blur-lg sm:px-6 lg:px-6 lg:py-8'>
      <header className='space-y-1'>
        <p className='text-[11px] uppercase tracking-[0.32em] text-zinc-500'>
          Open With Browser
        </p>
        <p className='text-lg font-semibold text-zinc-100'>Desktop</p>
      </header>

      <nav className='space-y-2'>
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

      {activeLink ? (
        <div className='mt-auto space-y-2 rounded-[20px] border border-white/5 bg-black/25 p-4 shadow-soft-sm'>
          <p className='text-[11px] uppercase tracking-[0.32em] text-zinc-500'>
            Active link
          </p>
          <div className='space-y-2 text-sm text-zinc-300'>
            <p className='font-semibold text-zinc-100 truncate'>
              {activeLink.url.replace(/^https?:\/\//, '')}
            </p>
            <p className='text-xs text-zinc-500'>
              {activeLink.contactName} • {activeLink.sourceApp}
            </p>
          </div>
        </div>
      ) : null}
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

          <div className='flex w-full flex-col gap-1'>
            <p className='text-[11px] uppercase tracking-[0.32em] text-zinc-500'>
              {activeNavLabel}
            </p>
            <h1 className='text-xl font-semibold text-zinc-100'>
              {activeNavLabel}
            </h1>
          </div>

          {activeLink ? (
            <div className='hidden flex-col items-end text-right lg:flex'>
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
          ) : null}
        </motion.header>

        <motion.main
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut', delay: 0.05 }}
          className='flex-1 w-full overflow-y-auto overflow-x-hidden overscroll-y-contain overscroll-x-none scrollbar-stable px-5 py-6 sm:px-6 md:px-8 lg:px-10 lg:py-8'
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
