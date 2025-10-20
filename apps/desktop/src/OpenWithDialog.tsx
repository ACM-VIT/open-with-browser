import { useEffect, useState } from 'react';

export type BrowserProfile = {
  id: string;
  name: string;
  icon?: string;
  profile?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  browsers: BrowserProfile[];
  onChoose: (browser: BrowserProfile, persist: 'just-once' | 'always') => void;
};

export default function OpenWithDialog({
  open,
  onClose,
  browsers,
  onChoose,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelected(browsers[0]?.id ?? null);
    }
  }, [open, browsers]);

  if (!open) return null;

  const handleChoose = (persist: 'just-once' | 'always') => {
    const browser = browsers.find(b => b.id === selected);
    if (browser) onChoose(browser, persist);
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur'>
      <div
        role='dialog'
        aria-modal='true'
        className='relative w-[min(92vw,560px)] max-w-[560px] rounded-[28px] border border-white/5 bg-zinc-950/90 p-6 shadow-soft'
      >
        <button
          aria-label='Close'
          className='absolute right-3 top-3 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-sm text-zinc-400 transition hover:border-red-400/40 hover:text-red-200'
          onClick={onClose}
        >
          Esc
        </button>

        <header>
          <h2 className='text-lg font-semibold text-zinc-100'>Open with</h2>
          <p className='mt-1 text-sm text-zinc-400'>
            Choose the browser profile that should receive this launch request.
          </p>
        </header>

        <div className='mt-6 space-y-3'>
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
                  onChange={() => setSelected(browser.id)}
                  className='sr-only'
                />
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
                <div className='flex flex-1 flex-col'>
                  <span className='text-sm font-semibold'>{browser.name}</span>
                  <span className='text-xs text-zinc-500'>
                    {browser.profile ?? 'Default profile'}
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

        <div className='mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
          <button
            onClick={() => handleChoose('just-once')}
            className='flex-1 rounded-[18px] border border-white/10 bg-black/30 px-4 py-2 text-sm font-semibold text-zinc-200 shadow-soft-sm transition hover:border-amber-400/40 hover:text-amber-200'
          >
            Just once
          </button>
          <button
            onClick={() => handleChoose('always')}
            className='flex-1 rounded-[18px] border border-emerald-400/60 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-100 shadow-soft-sm transition hover:border-emerald-300/70'
          >
            Always use this
          </button>
        </div>
      </div>
    </div>
  );
}
