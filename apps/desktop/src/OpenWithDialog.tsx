import { useCallback, useEffect, useState } from 'react';
import { type UIState, useUIStore } from './store/uiStore';

export type BrowserProfile = {
  id: string;
  name: string;
  icon?: string;
  profileLabel?: string | null;
  profileDirectory?: string | null;
};

type Props = {
  open?: boolean;
  onClose?: () => void;
  browsers: BrowserProfile[];
  onChoose: (
    browser: BrowserProfile,
    persist: 'just-once' | 'always'
  ) => Promise<void> | void;
  disabled?: boolean;
  showIcons?: boolean;
};

export default function OpenWithDialog({
  open: openProp,
  onClose: onCloseProp,
  browsers,
  onChoose,
  disabled = false,
  showIcons = true,
}: Props) {
  const storeOpen = useUIStore((s: UIState) => s.isDialogOpen);
  const storeSelected = useUIStore((s: UIState) => s.selectedBrowserId);
  const setSelectedBrowser = useUIStore((s: UIState) => s.setSelectedBrowser);
  const closeDialog = useUIStore((s: UIState) => s.closeDialog);

  const open = openProp ?? storeOpen;

  const [localSelected, setLocalSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const defaultSelection = storeSelected ?? browsers[0]?.id ?? null;
  const selected = localSelected ?? defaultSelection;

  const handleClose = useCallback(() => {
    setLocalSelected(null);
    if (onCloseProp) onCloseProp();
    else closeDialog();
  }, [closeDialog, onCloseProp]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, handleClose]);

  if (!open) return null;

  const handleChoose = async (persist: 'just-once' | 'always') => {
    const browser = browsers.find(b => b.id === selected);
    if (browser) {
      setSubmitting(true);
      try {
        await onChoose(browser, persist);
        setSelectedBrowser(browser.id);
        setLocalSelected(null);
        setSubmitting(false);
      } catch (error) {
        setSubmitting(false);
        throw error;
      }
    }
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur p-4 sm:p-6'>
      <div
        role='dialog'
        aria-modal='true'
        className='relative flex w-full max-w-md flex-col rounded-[28px] border border-white/5 bg-zinc-950/90 shadow-soft max-h-[min(85vh,640px)]'
      >
        <button
          aria-label='Close'
          className='absolute right-4 top-4 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-sm text-zinc-400 transition hover:border-red-400/40 hover:text-red-200'
          onClick={handleClose}
        >
          Esc
        </button>

        <header className='px-6 pt-6'>
          <h2 className='text-lg font-semibold text-zinc-100'>Open with</h2>
          <p className='mt-1 text-sm text-zinc-400'>
            Choose the browser profile that should receive this launch request.
          </p>
        </header>

        <div className='mt-6 flex-1 space-y-3 overflow-y-auto px-6 pb-4 pr-4 sm:pr-6 min-h-0'>
          {browsers.map(browser => {
            const isSelected = selected === browser.id;
            const fallbackGlyph = browser.name.slice(0, 1).toUpperCase();
            return (
              <label
                key={browser.id}
                className={`flex cursor-pointer items-center gap-3 rounded-[20px] border px-4 py-3 transition ${
                  isSelected
                    ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100 shadow-soft-sm'
                    : 'border-white/5 bg-black/30 text-zinc-200 hover:border-emerald-300/30 hover:text-emerald-100'
                }`}
              >
                <input
                  type='radio'
                  name='owd-browser'
                  value={browser.id}
                  checked={isSelected}
                  onChange={() => setLocalSelected(browser.id)}
                  className='sr-only'
                />
                {showIcons ? (
                  <div className='flex h-12 w-12 items-center justify-center rounded-[16px] border border-white/10 bg-black/40 text-base font-semibold text-zinc-200'>
                    {browser.icon ? (
                      <img
                        src={browser.icon}
                        alt=''
                        className='h-8 w-8 rounded-[12px] object-contain'
                      />
                    ) : (
                      fallbackGlyph
                    )}
                  </div>
                ) : null}
                <div
                  className={`flex flex-1 flex-col ${showIcons ? '' : 'pl-1'}`}
                >
                  <span className='text-sm font-semibold'>{browser.name}</span>
                  <span className='text-xs text-zinc-500'>
                    {browser.profileLabel ?? 'Default profile'}
                  </span>
                </div>
                <span
                  className={`h-3 w-3 rounded-full border ${
                    isSelected
                      ? 'border-emerald-300 bg-emerald-400 shadow-soft-sm'
                      : 'border-white/15 bg-black/20'
                  }`}
                />
              </label>
            );
          })}
        </div>

        <div className='flex flex-col gap-3 border-t border-white/5 px-6 py-6 md:flex-row md:items-center md:justify-between'>
          <button
            onClick={() => handleChoose('just-once')}
            disabled={disabled || submitting}
            className='flex-1 rounded-[18px] border border-white/10 bg-black/30 px-4 py-2 text-sm font-semibold text-zinc-200 shadow-soft-sm transition enabled:hover:border-amber-400/40 enabled:hover:text-amber-200 disabled:opacity-40'
          >
            {submitting ? 'Applying…' : 'Just once'}
          </button>
          <button
            onClick={() => handleChoose('always')}
            disabled={disabled || submitting}
            className='flex-1 rounded-[18px] border border-emerald-400/60 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-100 shadow-soft-sm transition enabled:hover:border-emerald-300/70 disabled:opacity-40'
          >
            {submitting ? 'Saving…' : 'Always use this'}
          </button>
        </div>
      </div>
    </div>
  );
}
