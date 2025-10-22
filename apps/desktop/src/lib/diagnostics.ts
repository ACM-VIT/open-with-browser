import { invoke } from '@tauri-apps/api/core';

export type DiagnosticEntry = {
  id: string;
  timestamp: string;
  message: string;
};

export async function fetchDiagnostics() {
  return invoke<DiagnosticEntry[]>('get_diagnostics');
}

export async function clearDiagnostics() {
  await invoke('clear_diagnostics');
}

export async function exportDiagnostics() {
  return invoke<string>('export_diagnostics');
}
