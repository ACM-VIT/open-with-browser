const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

export async function loadAutostartState(): Promise<boolean> {
  if (!isTauri) return false;
  try {
    const { isEnabled } = await import('@tauri-apps/plugin-autostart');
    return await isEnabled();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Autostart state unavailable', error);
    return false;
  }
}

export async function setAutostartState(enable: boolean): Promise<void> {
  if (!isTauri) return;
  const { enable: enableAutostart, disable: disableAutostart } = await import(
    '@tauri-apps/plugin-autostart'
  );
  if (enable) {
    await enableAutostart();
  } else {
    await disableAutostart();
  }
}

export function isTauriEnvironment(): boolean {
  return isTauri;
}
