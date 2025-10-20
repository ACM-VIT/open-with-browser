const domainRules = [
  {
    domain: 'mail.company.com',
    browser: 'Arc · Workspace',
    policy: 'Always',
    latency: '< 100 ms',
  },
  {
    domain: 'docs.google.com',
    browser: 'Chrome · Finance',
    policy: 'Always',
    latency: 'Stable',
  },
  {
    domain: 'linear.app',
    browser: 'Safari · Personal',
    policy: 'Just once',
    latency: 'Auto',
  },
];

const fileTypeRules = [
  {
    type: '.fig',
    browser: 'Arc · Workspace',
    policy: 'Always',
  },
  {
    type: '.pdf',
    browser: 'Chrome · Finance',
    policy: 'Always',
  },
  {
    type: '.md',
    browser: 'Safari · Personal',
    policy: 'Fallback',
  },
];

export default function Rules() {
  return (
    <div className='flex flex-col gap-8 pb-16'>
      <section className='panel'>
        <div className='flex flex-wrap items-start justify-between gap-6'>
          <div>
            <h2 className='text-2xl font-semibold text-zinc-50'>
              Routing rules
            </h2>
            <p className='mt-2 max-w-2xl text-sm text-zinc-400'>
              Describe how domains and file types map to browser profiles.
              These rules power the asynchronous hand-off without blocking the
              desktop shell.
            </p>
          </div>
          <button className='rounded-[18px] border border-emerald-400/50 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-100 shadow-soft-sm transition hover:border-emerald-300/70'>
            New rule
          </button>
        </div>
      </section>

      <section className='panel'>
        <header className='flex flex-wrap items-center justify-between gap-4'>
          <div>
            <h3 className='panel-title'>Domain policies</h3>
            <p className='panel-subtitle mt-1 max-w-2xl'>
              Control which browser profile is selected when a link matches a
              domain. The asynchronous worker resolves these rules before the
              dialog renders.
            </p>
          </div>
          <button className='rounded-[16px] border border-white/5 bg-black/30 px-3 py-2 text-xs font-semibold text-zinc-300 shadow-soft-sm transition hover:border-amber-400/40 hover:text-amber-200'>
            Import CSV
          </button>
        </header>
        <div className='mt-6 overflow-x-auto rounded-[20px] border border-white/5 shadow-soft-sm'>
          <table className='min-w-[720px] w-full divide-y divide-white/5 text-sm text-zinc-300'>
            <thead className='bg-black/20 text-xs uppercase tracking-[0.3em] text-zinc-500'>
              <tr>
                <th className='px-5 py-3 text-left'>Domain</th>
                <th className='px-5 py-3 text-left'>Browser profile</th>
                <th className='px-5 py-3 text-left'>Policy</th>
                <th className='px-5 py-3 text-left'>Latency budget</th>
                <th className='px-5 py-3 text-left'>Status</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-white/5 bg-black/25'>
              {domainRules.map(rule => (
                <tr key={rule.domain} className='hover:bg-white/5'>
                  <td className='px-5 py-4 font-medium text-zinc-100'>
                    {rule.domain}
                  </td>
                  <td className='px-5 py-4'>{rule.browser}</td>
                  <td className='px-5 py-4'>
                    <span className='rounded-full border border-emerald-300/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-200'>
                      {rule.policy}
                    </span>
                  </td>
                  <td className='px-5 py-4 text-zinc-400'>{rule.latency}</td>
                  <td className='px-5 py-4'>
                    <span className='rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-xs text-zinc-400'>
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className='panel'>
        <header className='flex flex-wrap items-center justify-between gap-4'>
          <div>
            <h3 className='panel-title'>File type fallbacks</h3>
            <p className='panel-subtitle mt-1 max-w-2xl'>
              When links resolve to files, we can preselect the right browser
              profile so the asynchronous worker can open locally or hand off to
              the cloud.
            </p>
          </div>
          <button className='rounded-[16px] border border-white/5 bg-black/30 px-3 py-2 text-xs font-semibold text-zinc-300 shadow-soft-sm transition hover:border-emerald-400/40 hover:text-emerald-200'>
            Auto-generate
          </button>
        </header>
        <div className='mt-6 grid gap-4 md:grid-cols-3'>
          {fileTypeRules.map(rule => (
            <div
              key={rule.type}
              className='rounded-[22px] border border-white/5 bg-black/30 p-4 shadow-soft-sm'
            >
              <div className='text-xs uppercase tracking-[0.3em] text-zinc-500'>
                {rule.type}
              </div>
              <div className='mt-3 text-sm font-semibold text-zinc-100'>
                {rule.browser}
              </div>
              <div className='mt-2 text-xs text-zinc-400'>
                Policy:{' '}
                <span className='font-medium text-amber-200'>
                  {rule.policy}
                </span>
              </div>
              <button className='mt-4 inline-flex items-center gap-2 rounded-[16px] border border-white/10 bg-black/40 px-3 py-1 text-xs font-semibold text-zinc-300 transition hover:border-amber-400/40 hover:text-amber-200'>
                Edit mapping
                <span className='text-zinc-500'>↗</span>
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className='panel'>
        <h3 className='panel-title'>Execution notes</h3>
        <div className='mt-4 grid gap-4 md:grid-cols-2'>
          <div className='rounded-[22px] border border-white/5 bg-black/25 p-4 shadow-soft-sm'>
            <p className='text-sm font-semibold text-zinc-100'>
              Async resolution
            </p>
            <p className='mt-2 text-sm text-zinc-400'>
              Rules are evaluated on a background thread before the UI prompts
              the user, so nothing blocks when a file association is resolved.
            </p>
          </div>
          <div className='rounded-[22px] border border-white/5 bg-black/25 p-4 shadow-soft-sm'>
            <p className='text-sm font-semibold text-zinc-100'>
              Explainability
            </p>
            <p className='mt-2 text-sm text-zinc-400'>
              Every rule surfaces a human-readable reason so operators
              understand why a browser was preselected.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
