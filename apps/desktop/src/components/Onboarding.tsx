import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { BrowserProfile } from '../OpenWithDialog';
import {
  fetchPreferences,
  updateFallbackPreference,
  type FallbackPreference,
} from '../lib/preferences';
import { Select, type SelectOption } from './ui/Select';

type OnboardingProps = {
  open: boolean;
  browsers: BrowserProfile[];
  onClose: () => void;
  onComplete: (options?: { navigateToRules?: boolean }) => void;
  onFallbackSaved: () => void;
};

type StepId = 0 | 1 | 2;

type StepConfig = {
  id: StepId;
  title: string;
  description: string;
};

const STEPS: StepConfig[] = [
  {
    id: 0,
    title: 'Welcome to Open With Browser',
    description:
      'Route every link to the right browser profile automatically. Let’s take a minute to set things up.',
  },
  {
    id: 1,
    title: 'Choose your fallback browser',
    description:
      'This browser opens links that don’t match any rule. Pick the profile you use most often.',
  },
  {
    id: 2,
    title: 'Create smart routing rules',
    description:
      'Group links by URL patterns, workspaces, or projects. Regex and wildcard rules let you cover every edge case.',
  },
];

type StatusKind = 'idle' | 'saving' | 'success' | 'error';

const EMPTY_PROFILES: BrowserProfile[] = [];

type OnboardingOverlayProps = Omit<OnboardingProps, 'open'>;

function OnboardingOverlay({
  browsers,
  onClose,
  onComplete,
  onFallbackSaved,
}: OnboardingOverlayProps) {
  const [step, setStep] = useState<StepId>(0);
  const [selectedBrowser, setSelectedBrowser] = useState<string>('');
  const [selectedProfileId, setSelectedProfileId] =
    useState<string>('__none__');
  const [status, setStatus] = useState<{ kind: StatusKind; message: string }>({
    kind: 'idle',
    message: '',
  });
  const [fallbackSaved, setFallbackSaved] = useState(false);

  const browserNames = useMemo(() => {
    const unique = new Set<string>();
    browsers.forEach(entry => {
      unique.add(entry.name);
    });
    return Array.from(unique.values()).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );
  }, [browsers]);

  const profilesByBrowser = useMemo(() => {
    const map = new Map<string, BrowserProfile[]>();
    browsers.forEach(profile => {
      const key = profile.name;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)?.push(profile);
    });
    map.forEach(list => {
      list.sort((a, b) => {
        const labelA = a.profileLabel ?? '';
        const labelB = b.profileLabel ?? '';
        return labelA.localeCompare(labelB, undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      });
    });
    return map;
  }, [browsers]);

  const activeProfiles = useMemo(() => {
    if (!selectedBrowser) {
      return EMPTY_PROFILES;
    }
    return profilesByBrowser.get(selectedBrowser) ?? EMPTY_PROFILES;
  }, [profilesByBrowser, selectedBrowser]);

  const browserSelectOptions: SelectOption[] = useMemo(
    () =>
      browserNames.map(name => ({
        value: name,
        label: name,
      })),
    [browserNames]
  );

  const profileSelectOptions: SelectOption[] = useMemo(() => {
    if (!selectedBrowser) {
      return [
        {
          value: '__none__',
          label: 'Select a browser first',
          disabled: true,
        },
      ];
    }

    const specificProfiles = activeProfiles
      .filter(profile => profile.profileDirectory)
      .map(profile => ({
        value: profile.id,
        label:
          profile.profileLabel ?? profile.profileDirectory ?? 'Browser profile',
      }));

    return [
      {
        value: '__none__',
        label:
          specificProfiles.length > 0
            ? 'No specific profile'
            : 'Default browser profile',
      },
      ...specificProfiles,
    ];
  }, [activeProfiles, selectedBrowser]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const snapshot = await fetchPreferences();
        if (cancelled) return;
        const fallback = snapshot.fallback;
        if (fallback) {
          setSelectedBrowser(fallback.browser);
          const profiles = profilesByBrowser.get(fallback.browser) ?? [];
          if (fallback.profile?.directory) {
            const match = profiles.find(
              entry =>
                entry.profileDirectory === fallback.profile?.directory &&
                entry.name === fallback.browser
            );
            if (match) {
              setSelectedProfileId(match.id);
            } else {
              setSelectedProfileId('__none__');
            }
          } else {
            const defaultProfile = profiles.find(
              entry => !entry.profileDirectory
            );
            if (defaultProfile) {
              setSelectedProfileId(defaultProfile.id);
            } else {
              setSelectedProfileId('__none__');
            }
          }
          setFallbackSaved(true);
        } else {
          setSelectedBrowser('');
          setSelectedProfileId('__none__');
          setFallbackSaved(false);
        }
      } catch (err) {
        if (!cancelled) {
          setStatus({
            kind: 'error',
            message:
              err instanceof Error
                ? err.message
                : 'Unable to load fallback preference.',
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profilesByBrowser]);

  const handleNext = () => {
    if (step === 2) {
      onComplete();
      return;
    }
    setStep(prev => {
      const index = STEPS.findIndex(config => config.id === prev);
      return STEPS[Math.min(index + 1, STEPS.length - 1)].id;
    });
  };

  const handleBack = () => {
    if (step === 0) return;
    setStep(prev => {
      const index = STEPS.findIndex(config => config.id === prev);
      return STEPS[Math.max(index - 1, 0)].id;
    });
  };

  const handleSkip = () => {
    onClose();
  };

  const handleSaveFallback = async () => {
    if (!selectedBrowser) {
      setStatus({
        kind: 'error',
        message: 'Choose a browser to continue.',
      });
      return;
    }
    const profiles = profilesByBrowser.get(selectedBrowser) ?? [];
    const match =
      selectedProfileId && selectedProfileId !== '__none__'
        ? profiles.find(profile => profile.id === selectedProfileId)
        : (profiles.find(profile => !profile.profileDirectory) ?? null);

    setStatus({ kind: 'saving', message: 'Saving fallback…' });
    try {
      const payload: FallbackPreference = {
        browser: selectedBrowser,
        profile: match?.profileDirectory
          ? {
              directory: match.profileDirectory,
              label: match.profileLabel ?? null,
            }
          : null,
      };
      await updateFallbackPreference(payload);
      setStatus({ kind: 'success', message: 'Fallback saved.' });
      setFallbackSaved(true);
      onFallbackSaved();
    } catch (err) {
      setStatus({
        kind: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Could not save fallback browser.',
      });
    }
  };

  const canProceed =
    step === 1 ? fallbackSaved || browserNames.length === 0 : true;

  return (
    <motion.div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md px-4 py-10'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <AnimatePresence mode='wait'>
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className='w-full max-w-3xl rounded-[32px] border border-white/8 bg-zinc-950/95 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.6)]'
        >
          <div className='flex items-start justify-between gap-6'>
            <div>
              <p className='text-[11px] uppercase tracking-[0.32em] text-emerald-300'>
                Getting started
              </p>
              <h2 className='mt-2 text-3xl font-semibold text-zinc-50'>
                {STEPS.find(config => config.id === step)?.title}
              </h2>
              <p className='mt-3 max-w-xl text-sm text-zinc-300'>
                {STEPS.find(config => config.id === step)?.description}
              </p>
            </div>
            <button
              type='button'
              onClick={handleSkip}
              className='rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-zinc-300 transition hover:border-white/20 hover:text-zinc-100'
            >
              Skip
            </button>
          </div>

          <ol className='mt-6 flex flex-wrap items-center gap-3 text-[11px] text-zinc-500 sm:gap-4'>
            {STEPS.map((config, index) => {
              const isActive = config.id === step;
              const isCompleted =
                STEPS.findIndex(item => item.id === step) > index;
              return (
                <li
                  key={config.id}
                  className='flex w-full flex-col items-center gap-1 rounded-[14px] border border-white/5 bg-black/20 px-3 py-2 sm:w-auto sm:flex-row sm:items-center sm:gap-2 sm:border-transparent sm:bg-transparent'
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold ${
                      isActive
                        ? 'border-emerald-300/70 bg-emerald-500/20 text-emerald-100'
                        : isCompleted
                          ? 'border-emerald-300/40 bg-emerald-500/10 text-emerald-200'
                          : 'border-white/10 bg-black/40 text-zinc-500'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className='text-center text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-400 sm:text-left sm:text-[11px] sm:tracking-[0.28em]'>
                    {config.title}
                  </span>
                </li>
              );
            })}
          </ol>

          <div className='mt-8 rounded-[24px] border border-white/8 bg-black/30 p-6 text-sm text-zinc-200'>
            {step === 0 ? (
              <div className='space-y-4'>
                <p>
                  Open With Browser sits between your apps and every link you
                  click. It detects the right browser profile and opens it for
                  you—no copy-paste, no guessing.
                </p>
                <ul className='space-y-3 text-sm text-zinc-300'>
                  <li className='flex items-start gap-3'>
                    <span className='mt-1 h-2 w-2 rounded-full bg-emerald-400' />
                    <span>
                      Route links by host, path, query, or any regex pattern.
                    </span>
                  </li>
                  <li className='flex items-start gap-3'>
                    <span className='mt-1 h-2 w-2 rounded-full bg-emerald-400' />
                    <span>
                      Remember the browser you used last time, or always ask
                      before launching.
                    </span>
                  </li>
                  <li className='flex items-start gap-3'>
                    <span className='mt-1 h-2 w-2 rounded-full bg-emerald-400' />
                    <span>
                      Stay in flow: the fallback browser prevents dead ends when
                      no rule matches.
                    </span>
                  </li>
                </ul>
              </div>
            ) : null}

            {step === 1 ? (
              <div className='space-y-4'>
                {browserNames.length === 0 ? (
                  <div className='rounded-[18px] border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200'>
                    No browsers detected yet. You can scan for browsers later in
                    Settings → Fallback browser.
                  </div>
                ) : (
                  <>
                    <div className='grid gap-4 md:grid-cols-2'>
                      <label className='flex flex-col gap-1 text-xs text-zinc-400'>
                        Browser
                        <Select
                          options={browserSelectOptions}
                          value={selectedBrowser}
                          onChange={nextValue => {
                            setSelectedBrowser(nextValue);
                            setSelectedProfileId('__none__');
                            setFallbackSaved(false);
                            setStatus({ kind: 'idle', message: '' });
                          }}
                          placeholder='Select a browser…'
                          disabled={browserSelectOptions.length === 0}
                        />
                      </label>
                      <label className='flex flex-col gap-1 text-xs text-zinc-400'>
                        Profile
                        <Select
                          options={profileSelectOptions}
                          value={selectedProfileId}
                          onChange={nextValue => {
                            setSelectedProfileId(nextValue);
                            setFallbackSaved(false);
                            setStatus({ kind: 'idle', message: '' });
                          }}
                          placeholder={
                            selectedBrowser
                              ? 'Choose a profile…'
                              : 'Select a browser first'
                          }
                          disabled={
                            !selectedBrowser ||
                            profileSelectOptions.every(
                              option => option.disabled
                            )
                          }
                        />
                      </label>
                    </div>
                    <button
                      type='button'
                      onClick={handleSaveFallback}
                      disabled={status.kind === 'saving' || !selectedBrowser}
                      className='rounded-[18px] border border-emerald-300/60 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-100 shadow-soft-sm transition enabled:hover:border-emerald-200/70 disabled:opacity-40'
                    >
                      {status.kind === 'saving'
                        ? 'Saving…'
                        : fallbackSaved
                          ? 'Fallback saved'
                          : 'Save fallback'}
                    </button>
                  </>
                )}
                {status.kind === 'error' ? (
                  <p className='text-xs text-red-300'>{status.message}</p>
                ) : null}
                {status.kind === 'success' ? (
                  <p className='text-xs text-emerald-200'>{status.message}</p>
                ) : null}
              </div>
            ) : null}

            {step === 2 ? (
              <div className='space-y-4'>
                <p>
                  Rules decide which browser opens a link before you even see
                  it. Combine match types to cover everything from entire
                  domains to a single dashboard.
                </p>
                <div className='grid gap-3 text-sm text-zinc-300 md:grid-cols-2'>
                  <div className='rounded-[18px] border border-white/10 bg-black/40 p-4'>
                    <p className='font-semibold text-emerald-200'>
                      Wildcards &amp; regex
                    </p>
                    <p className='mt-2 text-xs text-zinc-400'>
                      Use patterns like{' '}
                      <code className='rounded bg-black/60 px-1 py-0.5 text-[11px]'>
                        *.figma.com/*
                      </code>{' '}
                      or full regular expressions to stay precise.
                    </p>
                  </div>
                  <div className='rounded-[18px] border border-white/10 bg-black/40 p-4'>
                    <p className='font-semibold text-emerald-200'>
                      Workspace aware
                    </p>
                    <p className='mt-2 text-xs text-zinc-400'>
                      Map GitHub, JIRA, or university portals to the browser
                      profile that already has the right accounts signed in.
                    </p>
                  </div>
                </div>
                <p className='text-xs text-zinc-500'>
                  Tip: import rules from CSV or paste your existing link routing
                  sheet—Open With Browser will keep them in sync.
                </p>
              </div>
            ) : null}
          </div>

          <div className='mt-8 flex flex-wrap items-center justify-between gap-3'>
            <button
              type='button'
              onClick={handleBack}
              disabled={step === 0}
              className='rounded-[18px] border border-white/10 bg-black/30 px-4 py-2 text-sm font-semibold text-zinc-300 shadow-soft-sm transition enabled:hover:border-white/20 enabled:hover:text-zinc-100 disabled:opacity-40'
            >
              Back
            </button>
            <div className='flex items-center gap-3'>
              {step === 2 ? (
                <button
                  type='button'
                  onClick={() => onComplete({ navigateToRules: true })}
                  className='rounded-[18px] border border-emerald-400/50 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-100 shadow-soft-sm transition hover:border-emerald-200/70'
                >
                  Open rules now
                </button>
              ) : null}
              <button
                type='button'
                onClick={handleNext}
                disabled={!canProceed}
                className='rounded-[18px] border border-emerald-300/60 bg-emerald-500/15 px-6 py-2 text-sm font-semibold text-emerald-100 shadow-soft-sm transition enabled:hover:border-emerald-200/70 disabled:opacity-40'
              >
                {step === 2 ? 'Finish' : 'Next'}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

export default function Onboarding({
  open,
  browsers,
  onClose,
  onComplete,
  onFallbackSaved,
}: OnboardingProps) {
  const overlayProps: OnboardingOverlayProps = {
    browsers,
    onClose,
    onComplete,
    onFallbackSaved,
  };

  return (
    <AnimatePresence>
      {open ? (
        <OnboardingOverlay key='onboarding-overlay' {...overlayProps} />
      ) : null}
    </AnimatePresence>
  );
}
