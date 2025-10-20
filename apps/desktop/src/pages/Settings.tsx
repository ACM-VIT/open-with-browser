import { useState } from 'react';

export default function Settings() {
  const [rememberChoice, setRememberChoice] = useState(true);
  const [showIcons, setShowIcons] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [defaultBrowser, setDefaultBrowser] = useState('Arc · Workspace');

  return (
    <div className='flex flex-col gap-8 pb-16'>
      <section className='panel'>
        <div className='flex flex-wrap items-start justify-between gap-6'>
          <div>
            <h2 className='text-2xl font-semibold text-zinc-50'>
              Experience
            </h2>
            <p className='mt-2 max-w-2xl text-sm text-zinc-400'>
              Personalize how the desktop shell surfaces asynchronous launches
              and how link hand-offs should behave by default.
            </p>
          </div>
          <button className='rounded-[18px] border border-white/10 bg-black/30 px-4 py-2 text-sm font-semibold text-zinc-300 shadow-soft-sm transition hover:border-emerald-400/40 hover:text-emerald-200'>
            Restore defaults
          </button>
        </div>
      </section>

      <section className='panel'>
        <h3 className='panel-title'>General settings</h3>
        <div className='mt-4 space-y-3'>
          <label className='flex items-center justify-between gap-4 rounded-[18px] border border-white/5 bg-black/30 px-4 py-3 shadow-soft-sm transition hover:border-emerald-400/30'>
            <div>
              <p className='text-sm font-semibold text-zinc-100'>
                Remember browser choice
              </p>
              <p className='text-xs text-zinc-500'>
                Persist the last selection to cut down on repetitive prompts.
              </p>
            </div>
            <input
              type='checkbox'
              checked={rememberChoice}
              onChange={e => setRememberChoice(e.target.checked)}
              className='h-5 w-5 rounded border border-white/10 bg-black/50 accent-emerald-400'
            />
          </label>

          <label className='flex items-center justify-between gap-4 rounded-[18px] border border-white/5 bg-black/30 px-4 py-3 shadow-soft-sm transition hover:border-amber-400/30'>
            <div>
              <p className='text-sm font-semibold text-zinc-100'>
                Show browser glyphs
              </p>
              <p className='text-xs text-zinc-500'>
                Surface brand glyphs in the hand-off list for quicker recognition.
              </p>
            </div>
            <input
              type='checkbox'
              checked={showIcons}
              onChange={e => setShowIcons(e.target.checked)}
              className='h-5 w-5 rounded border border-white/10 bg-black/50 accent-amber-400'
            />
          </label>
        </div>
      </section>

      <section className='panel'>
        <h3 className='panel-title'>Browser orchestration</h3>
        <div className='mt-4 space-y-3'>
          <label className='flex flex-col gap-2 text-sm text-zinc-300'>
            Default browser
            <select
              value={defaultBrowser}
              onChange={e => setDefaultBrowser(e.target.value)}
              className='rounded-[16px] border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 shadow-soft-sm focus:border-emerald-300/60 focus:outline-none'
            >
              <option>Arc · Workspace</option>
              <option>Google Chrome · Finance</option>
              <option>Safari · Personal</option>
              <option>Microsoft Edge · Admin</option>
            </select>
          </label>
          <div className='rounded-[20px] border border-white/5 bg-black/30 px-4 py-3 text-xs text-zinc-400 shadow-soft-sm'>
            Requests without a matching rule will default to{' '}
            <span className='font-semibold text-emerald-200'>
              {defaultBrowser}
            </span>{' '}
            unless a manual choice overrides it.
          </div>
        </div>
      </section>

      <section className='panel'>
        <h3 className='panel-title'>Diagnostics</h3>
        <div className='mt-4 space-y-3'>
          <label className='flex items-center justify-between gap-4 rounded-[18px] border border-white/5 bg-black/30 px-4 py-3 shadow-soft-sm transition hover:border-red-400/40'>
            <div>
              <p className='text-sm font-semibold text-red-200'>
                Enable debug timeline
              </p>
              <p className='text-xs text-zinc-500'>
                Emit verbose logs for each asynchronous step. Use sparingly in
                production environments.
              </p>
            </div>
            <input
              type='checkbox'
              checked={debugMode}
              onChange={e => setDebugMode(e.target.checked)}
              className='h-5 w-5 rounded border border-white/10 bg-black/50 accent-red-400'
            />
          </label>
          <button className='w-full rounded-[18px] border border-white/10 bg-black/30 px-4 py-3 text-sm font-semibold text-zinc-300 shadow-soft-sm transition hover:border-red-400/40 hover:text-red-200'>
            Export diagnostics
          </button>
        </div>
      </section>
    </div>
  );
}
