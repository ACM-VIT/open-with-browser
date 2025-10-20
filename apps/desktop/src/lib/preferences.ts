import { invoke } from '@tauri-apps/api/core';

export type FallbackProfilePreference = {
  label: string | null;
  directory: string | null;
};

export type FallbackPreference = {
  browser: string;
  profile?: FallbackProfilePreference | null;
};

export type PreferencesSnapshot = {
  fallback: FallbackPreference | null;
};

export async function fetchPreferences() {
  return invoke<PreferencesSnapshot>('get_preferences');
}

export async function updateFallbackPreference(input: {
  browser: string | null;
  profile?: FallbackProfilePreference | null;
}) {
  await invoke('set_fallback_browser', {
    browser: input.browser,
    profile: input.profile ?? null,
  });
}
