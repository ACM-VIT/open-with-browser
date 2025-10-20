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
  needsFallbackPrompt: boolean;
  onOpenFallbackSettings: () => void;
  onDismissFallbackPrompt: () => void;
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
  needsFallbackPrompt,
  onOpenFallbackSettings,
  onDismissFallbackPrompt,
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
        browser.name.toLowerCase() === recommendedBrowser.name.toLowerCase();
      const profileMatches =
        (browser.profileLabel ?? '').toLowerCase() ===
        (recommendedBrowser.profileLabel ?? '').toLowerCase();
      return nameMatches && profileMatches;
    });

    if (!match) return browsers;

    return [match, ...browsers.filter(browser => browser.id !== match.id)];
  }, [browsers, recommendedBrowser]);

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
        <div className='flex flex-col gap-6 lg:flex-row lg:items-start'>
          <div className='flex-1 space-y-3'>
            <div className='flex items-center justify-between'>
              <span className='text-[11px] uppercase tracking-[0.32em] text-zinc-500'>
                Incoming link
              </span>
              <span className='text-xs text-zinc-500'>
                {activeLink ? 'Live' : 'Idle'}
              </span>
            </div>
            {activeLink ? (
              <div className='space-y-2'>
                <h2 className='text-xl font-semibold text-zinc-50 truncate'>
                  {activeLink.url.replace(/^https?:\/\//, '')}
                </h2>
                <p className='text-sm text-zinc-300'>
                  {activeLink.contactName} • {activeLink.sourceApp}
                </p>
                {activeLink.sourceContext ? (
                  <p className='text-xs text-zinc-500'>
                    {activeLink.sourceContext}
                  </p>
                ) : null}
                {activeLink.preview ? (
                  <p className='text-xs text-zinc-500 truncate'>
                    “{activeLink.preview}”
                  </p>
                ) : null}
              </div>
            ) : (
              <p className='text-sm text-zinc-400'>
                Waiting for the next link hand-off.
              </p>
            )}
          </div>

          <div className='flex w-full max-w-sm flex-col gap-3'>
            <div className='rounded-[18px] border border-white/5 bg-black/30 p-3 shadow-soft-sm'>
              <p className='text-[11px] uppercase tracking-[0.28em] text-zinc-500'>
                Recommendation
              </p>
              <p className='mt-1 text-sm font-semibold text-emerald-200'>
                {recommendedBrowser
                  ? `${recommendedBrowser.name}${
                      recommendedBrowser.profileLabel
                        ? ` · ${recommendedBrowser.profileLabel}`
                        : ''
                    }`
                  : 'None'}
              </p>
            </div>
            <button
              onClick={handleRecommendedLaunch}
              disabled={
                !recommendedBrowser ||
                !activeLink ||
                isRouting ||
                dialogBrowsers.length === 0
              }
              className='rounded-[18px] border border-emerald-300/60 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-100 shadow-soft-sm transition enabled:hover:border-emerald-200/70 disabled:opacity-40'
            >
              {isRouting ? 'Launching…' : 'Open recommended'}
            </button>
            <button
              onClick={() => setDialogOpen(true)}
              disabled={!activeLink || isRouting || dialogBrowsers.length === 0}
              className='rounded-[18px] border border-white/10 bg-black/30 px-4 py-2 text-sm font-semibold text-zinc-300 shadow-soft-sm transition enabled:hover:border-emerald-300/40 enabled:hover:text-emerald-200 disabled:opacity-40'
            >
              Choose browser…
            </button>
            {actionError ? (
              <p className='text-xs text-red-300'>{actionError}</p>
            ) : dialogBrowsers.length === 0 ? (
              <p className='text-xs text-amber-300'>
                No browsers detected. Refresh in Settings to scan installations.
              </p>
            ) : null}
          </div>
          {needsFallbackPrompt ? (
            <div className='rounded-[18px] border border-amber-400/40 bg-amber-500/10 p-3 text-xs text-amber-200 shadow-soft-sm'>
              <div>
                Set a fallback browser so unmatched links open automatically.
              </div>
              <div className='mt-2 flex flex-wrap gap-2'>
                <button
                  onClick={onOpenFallbackSettings}
                  className='rounded-[14px] border border-amber-300/50 bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-200 transition hover:border-amber-200/70'
                >
                  Set fallback
                </button>
                <button
                  onClick={onDismissFallbackPrompt}
                  className='rounded-[14px] border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-400 transition hover:border-white/20 hover:text-zinc-200'
                >
                  Dismiss
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className='panel'>
        <h3 className='panel-title'>Recent hand-offs</h3>
        <ul className='mt-4 space-y-3'>
          {recentHistory.length === 0 ? (
            <li className='rounded-[22px] border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center text-sm text-zinc-400 shadow-soft-sm'>
              No launches recorded yet.
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
