import { invoke } from '@tauri-apps/api/core';

export type FallbackPreference = {
  browser: string;
  profile?: string | null;
};

export type PreferencesSnapshot = {
  fallback: FallbackPreference | null;
};

export async function fetchPreferences() {
  return invoke<PreferencesSnapshot>('get_preferences');
}

export async function updateFallbackPreference(input: {
  browser: string | null;
  profile?: string | null;
}) {
  await invoke('set_fallback_browser', {
    browser: input.browser,
    profile: input.profile ?? null,
  });
}
