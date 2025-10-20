import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { ActiveLink, LaunchHistoryItem, BrowserSelection } from './models';

type BrowserDescriptorWire = {
  name: string;
  profile_label?: string | null;
  profile_directory?: string | null;
};

export type ProfileDescriptorWire = {
  display_name: string;
  directory: string;
};

export type IncomingLinkWire = {
  id: string;
  url: string;
  source_app: string;
  source_context?: string | null;
  contact_name?: string | null;
  preview?: string | null;
  recommended_browser?: BrowserDescriptorWire | null;
  arrived_at?: string | null;
};

export type LaunchDecisionWire = {
  id: string;
  url: string;
  browser: string;
  profile_label?: string | null;
  profile_directory?: string | null;
  persist: 'just-once' | 'always';
  decided_at?: string | null;
  source_app: string;
  contact_name?: string | null;
};

export type RoutingSnapshotWire = {
  active: IncomingLinkWire | null;
  history: LaunchDecisionWire[];
};

export type RoutingStatusWire = {
  id: string;
  browser: string;
  status: 'launching' | 'launched' | 'failed';
};

export type RoutingErrorWire = {
  id: string;
  browser: string;
  message: string;
};

export function mapIncomingLink(
  wire: IncomingLinkWire | null
): ActiveLink | null {
  if (!wire) return null;
  const recommendedBrowser: BrowserSelection | undefined =
    wire.recommended_browser
      ? {
          name: wire.recommended_browser.name,
          profileLabel: wire.recommended_browser.profile_label ?? null,
          profileDirectory: wire.recommended_browser.profile_directory ?? null,
        }
      : undefined;
  return {
    id: wire.id,
    url: wire.url,
    sourceApp: wire.source_app,
    sourceContext: wire.source_context ?? '',
    contactName: wire.contact_name ?? '',
    preview: wire.preview ?? '',
    recommendedBrowser,
    arrivedAt: wire.arrived_at ?? new Date().toISOString(),
  };
}

export function mapLaunchDecision(wire: LaunchDecisionWire): LaunchHistoryItem {
  return {
    id: wire.id,
    url: wire.url,
    decidedAt: wire.decided_at ?? new Date().toISOString(),
    browser: wire.browser,
    profileLabel: wire.profile_label ?? null,
    profileDirectory: wire.profile_directory ?? null,
    persist: wire.persist,
    sourceApp: wire.source_app,
    contactName: wire.contact_name ?? '',
  };
}

export async function fetchRoutingSnapshot() {
  const snapshot = await invoke<RoutingSnapshotWire>('routing_snapshot');
  return {
    active: mapIncomingLink(snapshot.active),
    history: snapshot.history.map(mapLaunchDecision),
  };
}

export async function resolveIncomingLink(input: {
  link: ActiveLink;
  browser: BrowserSelection;
  persist: 'just-once' | 'always';
}) {
  await invoke<LaunchDecisionWire>('resolve_incoming_link', {
    decision: {
      id: input.link.id,
      url: input.link.url,
      browser: input.browser.name,
      profile_label: input.browser.profileLabel ?? null,
      profile_directory: input.browser.profileDirectory ?? null,
      persist: input.persist,
      source_app: input.link.sourceApp,
      contact_name: input.link.contactName ?? '',
    },
  });
}

export async function registerIncomingLink(link: IncomingLinkWire) {
  await invoke<IncomingLinkWire>('register_incoming_link', { link });
}

export async function simulateIncomingLink(payload?: {
  url?: string;
  sourceApp?: string;
  contactName?: string;
  sourceContext?: string;
  preview?: string;
}) {
  await invoke<IncomingLinkWire>('simulate_incoming_link', {
    payload: {
      url: payload?.url,
      source_app: payload?.sourceApp,
      contact_name: payload?.contactName,
      source_context: payload?.sourceContext,
      preview: payload?.preview,
    },
  });
}

export async function listenIncomingLink(
  callback: (link: ActiveLink) => void
): Promise<UnlistenFn> {
  const unlisten = await listen<IncomingLinkWire>(
    'routing://incoming',
    event => {
      const mapped = mapIncomingLink(event.payload);
      if (mapped) callback(mapped);
    }
  );
  return unlisten;
}

export async function listenLaunchDecision(
  callback: (decision: LaunchHistoryItem) => void
): Promise<UnlistenFn> {
  const unlisten = await listen<LaunchDecisionWire>(
    'routing://decision',
    event => {
      callback(mapLaunchDecision(event.payload));
    }
  );
  return unlisten;
}

export async function listenRoutingStatus(
  callback: (status: RoutingStatusWire) => void
): Promise<UnlistenFn> {
  const unlisten = await listen<RoutingStatusWire>('routing://status', event =>
    callback(event.payload)
  );
  return unlisten;
}

export async function listenRoutingError(
  callback: (error: RoutingErrorWire) => void
): Promise<UnlistenFn> {
  const unlisten = await listen<RoutingErrorWire>('routing://error', event =>
    callback(event.payload)
  );
  return unlisten;
}

export async function fetchAvailableBrowsers() {
  return invoke<string[]>('get_available_browsers');
}

export async function fetchProfilesFor(browser: string) {
  return invoke<ProfileDescriptorWire[]>('get_profiles', {
    browserKind: browser,
  });
}
