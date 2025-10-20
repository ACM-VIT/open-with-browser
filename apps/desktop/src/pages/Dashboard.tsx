import { useMemo, useState } from 'react';
import OpenWithDialog, { BrowserProfile } from '../OpenWithDialog';
import type { ActiveLink, LaunchHistoryItem } from '../lib/models';

type DashboardProps = {
  activeLink: ActiveLink | null;
  browsers: BrowserProfile[];
  recentHistory: LaunchHistoryItem[];
  statusById: Record<string, 'launching' | 'launched' | 'failed'>;
  errorsById: Record<string, string>;
  onRecordLaunch: (
    browser: BrowserProfile,
    persist: 'just-once' | 'always'
  ) => Promise<void>;
  showIcons: boolean;
};

const STATUS_CLASS: Record<'launching' | 'failed' | 'launched', string> = {
  launching: 'border-amber-300/40 bg-amber-500/10 text-amber-200',
  failed: 'border-red-400/40 bg-red-500/10 text-red-200',
  launched: 'border-emerald-300/40 bg-emerald-500/10 text-emerald-200',
};

const STATUS_LABEL: Record<'launching' | 'failed' | 'launched', string> = {
  launching: 'Launching',
  failed: 'Failed',
  launched: 'Launched',
};

export default function Dashboard({
  activeLink,
  browsers,
  recentHistory,
  statusById,
  errorsById,
  onRecordLaunch,
  showIcons,
}: DashboardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const recommendedBrowser = useMemo(
    () => activeLink?.recommendedBrowser,
    [activeLink]
  );

  const dialogBrowsers = useMemo(() => {
    if (browsers.length === 0) return [];
    if (!recommendedBrowser) return browsers;

    const match = browsers.find(browser => {
      const nameMatches =
        browser.name.toLowerCase() ===
        recommendedBrowser.name.toLowerCase();
      const profileMatches =
        (browser.profileLabel ?? '').toLowerCase() ===
        (recommendedBrowser.profileLabel ?? '').toLowerCase();
      return nameMatches && profileMatches;
    });

    if (!match) return browsers;

    return [match, ...browsers.filter(browser => browser.id !== match.id)];
  }, [browsers, recommendedBrowser]);

  const routingStats = useMemo(() => {
    const launching = Object.values(statusById).filter(
      status => status === 'launching'
    ).length;
    const launched = Object.values(statusById).filter(
      status => status === 'launched'
    ).length;
    const failed = Object.values(statusById).filter(
      status => status === 'failed'
    ).length;
    return {
      active: activeLink ? 1 : 0,
      launching,
      launched,
      failed,
      total: recentHistory.length,
    };
  }, [activeLink, recentHistory.length, statusById]);

  const handleRecommendedLaunch = async () => {
    if (!recommendedBrowser || dialogBrowsers.length === 0) return;
    const matchingBrowser = dialogBrowsers[0];

    setIsRouting(true);
    setActionError(null);
    try {
      await onRecordLaunch(matchingBrowser, 'always');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to open the recommended browser.';
      setActionError(message);
    } finally {
      setIsRouting(false);
    }
  };

  const handleManualLaunch = async (
    browser: BrowserProfile,
    persist: 'just-once' | 'always'
  ) => {
    setIsRouting(true);
    setActionError(null);
    try {
      await onRecordLaunch(browser, persist);
      setDialogOpen(false);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Something went wrong while launching the link.';
      setActionError(message);
    } finally {
      setIsRouting(false);
    }
  };

  return (
    <div className='flex flex-col gap-8 pb-16'>
      <section className='panel'>
        <div className='flex flex-wrap items-start justify-between gap-6'>
          <div className='max-w-xl space-y-3'>
            <div className='inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] uppercase tracking-[0.32em] text-zinc-500'>
              Incoming link
              <span className='text-zinc-400'>
                {activeLink ? 'Live' : 'Idle'}
              </span>
            </div>
            <h2 className='text-2xl font-semibold text-zinc-50'>
              {activeLink
                ? activeLink.url.replace(/^https?:\/\//, '')
                : 'Waiting for the next hand-off'}
            </h2>
            {activeLink ? (
              <p className='text-sm text-zinc-400'>
                Shared by{' '}
                <span className='font-semibold text-zinc-100'>
                  {activeLink.contactName}
                </span>{' '}
                via {activeLink.sourceApp}. Keep the chat window focused while
                the browser spins up in the background.
              </p>
            ) : (
              <p className='text-sm text-zinc-400'>
                As soon as a messaging app shares a link, it will appear here
                with the suggested browser profile.
              </p>
            )}
          </div>
          <div className='flex flex-col gap-3'>
            <button
              onClick={() => setDialogOpen(true)}
              disabled={!activeLink || dialogBrowsers.length === 0}
              className='rounded-[18px] border border-emerald-400/50 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-100 shadow-soft-sm transition enabled:hover:border-emerald-300/70 disabled:opacity-40'
            >
              Choose different browser
            </button>
            {actionError ? (
              <p className='text-xs text-red-300'>{actionError}</p>
            ) : dialogBrowsers.length === 0 ? (
              <p className='text-xs text-amber-300'>
                No browsers detected yet. Refresh from Settings to register installed
                browsers.
              </p>
            ) : null}
          </div>
        </div>

        {activeLink ? (
          <div className='mt-6 grid gap-4 md:grid-cols-2'>
            <div className='rounded-[22px] border border-white/5 bg-black/25 p-4 shadow-soft-sm'>
              <p className='text-xs uppercase tracking-[0.32em] text-zinc-500'>
                Contact
              </p>
              <p className='mt-2 text-sm font-semibold text-zinc-100'>
                {activeLink.contactName}
              </p>
              <p className='text-xs text-zinc-500'>
                {activeLink.sourceContext}
              </p>
              <p className='mt-3 text-xs text-zinc-400'>
                Message preview: “{activeLink.preview}”
              </p>
            </div>
            <div className='rounded-[22px] border border-white/5 bg-black/25 p-4 shadow-soft-sm'>
              <p className='text-xs uppercase tracking-[0.32em] text-zinc-500'>
                Recommended browser
              </p>
              <p className='mt-2 text-sm font-semibold text-emerald-200'>
                {recommendedBrowser?.name}
                {recommendedBrowser?.profileLabel
                  ? ` · ${recommendedBrowser.profileLabel}`
                  : ''}
              </p>
              <p className='mt-3 text-xs text-zinc-400'>
                Based on your rule set for links shared from{' '}
                {activeLink.sourceApp}.
              </p>
              <div className='mt-4 flex gap-3'>
                <button
                  onClick={handleRecommendedLaunch}
                  disabled={
                    !recommendedBrowser || isRouting || dialogBrowsers.length === 0
                  }
                  className='flex-1 rounded-[18px] border border-emerald-300/60 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-100 shadow-soft-sm transition enabled:hover:border-emerald-200/70 disabled:opacity-40'
                >
                  {isRouting ? 'Launching…' : 'Open with recommendation'}
                </button>
                <button
                  onClick={() => setDialogOpen(true)}
                  disabled={isRouting || dialogBrowsers.length === 0}
                  className='rounded-[18px] border border-white/10 bg-black/30 px-4 py-2 text-sm font-semibold text-zinc-300 shadow-soft-sm transition enabled:hover:border-amber-300/40 enabled:hover:text-amber-200 disabled:opacity-40'
                >
                  Override
                </button>
              </div>
              {dialogBrowsers.length === 0 ? (
                <p className='mt-3 text-xs text-amber-300'>
                  No browsers detected yet. Check Settings → System setup to load
                  installed browsers.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      <section className='panel'>
        <h3 className='panel-title'>Routing stats</h3>
        <p className='panel-subtitle mt-1 max-w-2xl'>
          Live indicators show how the hand-off service is behaving while the
          desktop shell stays in the background.
        </p>
        <div className='mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          <StatCard label='Active link' value={routingStats.active} />
          <StatCard label='Launching' value={routingStats.launching} />
          <StatCard label='Launched' value={routingStats.launched} />
          <StatCard
            label='Failed'
            value={routingStats.failed}
            accent='text-red-300'
          />
          <StatCard label='Recent captures' value={routingStats.total} />
        </div>
      </section>

      <section className='panel'>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <div>
            <h3 className='panel-title'>Recent hand-offs</h3>
            <p className='panel-subtitle mt-1 max-w-2xl'>
              Track how messaging links were opened so you can adjust rules or
              resolve issues quickly.
            </p>
          </div>
          <span className='rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-zinc-400'>
            {recentHistory.length} captured
          </span>
        </div>
        <ul className='mt-6 space-y-3'>
          {recentHistory.length === 0 ? (
            <li className='rounded-[22px] border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center text-sm text-zinc-400 shadow-soft-sm'>
              No launches recorded yet. Confirm a browser to see it appear here.
            </li>
          ) : (
            recentHistory.map(item => {
              const status = statusById[item.id];
              const error = errorsById[item.id];
              const statusClass = status ? STATUS_CLASS[status] : '';
              const statusLabel = status ? STATUS_LABEL[status] : '';
              return (
                <li
                  key={item.id}
                  className='rounded-[22px] border border-white/5 bg-black/30 p-4 shadow-soft-sm'
                >
                  <div className='flex flex-wrap items-start justify-between gap-4'>
                    <div className='space-y-1'>
                      <p className='text-sm font-semibold text-zinc-100'>
                        {item.browser}{' '}
                        <span className='text-xs font-normal text-zinc-500'>
                          {item.profileLabel ?? 'Default profile'}
                        </span>
                      </p>
                      <p className='max-w-xl truncate text-xs text-zinc-400'>
                        {item.url.replace(/^https?:\/\//, '')}
                      </p>
                      <p className='text-[11px] uppercase tracking-[0.28em] text-zinc-500'>
                        {item.sourceApp} •{' '}
                        {new Date(item.decidedAt).toLocaleTimeString(
                          undefined,
                          {
                            hour: '2-digit',
                            minute: '2-digit',
                          }
                        )}
                      </p>
                    </div>
                    <div className='flex flex-col items-end gap-2 text-xs font-semibold'>
                      <span className='rounded-full border border-white/10 bg-black/25 px-3 py-1 text-zinc-300'>
                        {item.persist === 'always' ? 'Persisted' : 'Just once'}
                      </span>
                      <span className='rounded-full border border-white/10 bg-black/25 px-3 py-1 text-zinc-400'>
                        {item.contactName}
                      </span>
                      {status ? (
                        <span
                          className={`rounded-full border px-3 py-1 text-[11px] font-medium ${statusClass}`}
                        >
                          {statusLabel}
                        </span>
                      ) : null}
                      {error ? (
                        <span className='max-w-xs text-right text-[11px] font-medium text-red-300'>
                          {error}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </section>

      <section className='panel'>
        <h3 className='panel-title'>Why this flow</h3>
        <div className='mt-4 grid gap-4 md:grid-cols-3'>
          <div className='rounded-[22px] border border-white/5 bg-black/30 p-4 shadow-soft-sm'>
            <p className='text-sm font-semibold text-zinc-100'>
              Stay in WhatsApp
            </p>
            <p className='mt-2 text-sm text-zinc-400'>
              Link launches are orchestrated without stealing focus, so you keep
              typing while the browser adopts the task.
            </p>
          </div>
          <div className='rounded-[22px] border border-white/5 bg-black/30 p-4 shadow-soft-sm'>
            <p className='text-sm font-semibold text-zinc-100'>
              Tuned per context
            </p>
            <p className='mt-2 text-sm text-zinc-400'>
              Recommendations depend on which conversation the link came from
              and which profile you trust with it.
            </p>
          </div>
          <div className='rounded-[22px] border border-white/5 bg-black/30 p-4 shadow-soft-sm'>
            <p className='text-sm font-semibold text-zinc-100'>
              Override anytime
            </p>
            <p className='mt-2 text-sm text-zinc-400'>
              One click to pick another browser or make it a one-off. The system
              adapts based on your choices.
            </p>
          </div>
        </div>
      </section>

      <OpenWithDialog
        open={dialogOpen && !!activeLink && dialogBrowsers.length > 0}
        onClose={() => setDialogOpen(false)}
        browsers={dialogBrowsers}
        onChoose={handleManualLaunch}
        disabled={isRouting}
        showIcons={showIcons}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  accent = 'text-zinc-100',
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className='rounded-[22px] border border-white/5 bg-black/30 p-4 shadow-soft-sm'>
      <p className='text-xs uppercase tracking-[0.32em] text-zinc-500'>
        {label}
      </p>
      <p className={`mt-2 text-3xl font-semibold ${accent}`}>{value}</p>
    </div>
  );
}
