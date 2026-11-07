import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

export interface CCSwitchDetectionResult {
  detected: boolean;
  path: string;
}

export interface CCSwitchProvider {
  id: string;
  appType: string;
  name: string;
  category: string;
  isCurrent: boolean;
  apiUrl?: string;
  model?: string;
}

export interface CCSwitchUsage {
  costUsd: number;
  totalTokens: number;
  requestCount?: number;
  latestDate?: string;
}

export interface CCSwitchDataResult {
  success: boolean;
  dbPath?: string;
  providers?: CCSwitchProvider[];
  usage?: CCSwitchUsage;
  error?: string;
}

export const isTauriEnvironment = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

export const getCCSwitchData = async (): Promise<CCSwitchDataResult> => {
  if (!isTauriEnvironment()) {
    return {
      success: true,
      dbPath: 'C:\\Users\\10447\\.cc-switch\\cc-switch.db (Mock)',
      providers: [
        { id: 'claude-official', appType: 'claude', name: 'Claude Official', category: 'official', isCurrent: false },
        { id: 'bossclaw-1784983947130', appType: 'claude', name: 'BossClaw', category: 'relay', isCurrent: true },
        { id: 'codex-official', appType: 'codex', name: 'OpenAI Official', category: 'official', isCurrent: false },
        { id: 'bossclaw-1789039948461', appType: 'codex', name: 'BossClaw', category: 'relay', isCurrent: true },
        { id: 'gemini-official', appType: 'gemini', name: 'Google Official', category: 'official', isCurrent: true },
      ],
      usage: {
        costUsd: 6.08,
        totalTokens: 762069,
      },
    };
  }
  try {
    return await invoke<CCSwitchDataResult>('get_cc_switch_data');
  } catch (err) {
    console.warn('Failed to get_cc_switch_data:', err);
    return { success: false, error: String(err) };
  }
};

export const setCCSwitchActiveProvider = async (
  appType: string,
  providerId: string
): Promise<boolean> => {
  if (!isTauriEnvironment()) {
    console.log('[Mock] setCCSwitchActiveProvider:', appType, providerId);
    return true;
  }
  try {
    const res = await invoke<{ success: boolean }>('set_cc_switch_active_provider', {
      appType,
      providerId,
    });
    return res.success;
  } catch (err) {
    console.warn('Failed to set_cc_switch_active_provider:', err);
    return false;
  }
};

export const scanLocalAuthProviders = async (): Promise<{ success: boolean; accounts: any[] }> => {
  if (!isTauriEnvironment()) {
    return { success: true, accounts: [] };
  }
  try {
    return await invoke<{ success: boolean; accounts: any[] }>('scan_local_auth_providers');
  } catch (err) {
    console.warn('Failed to scan_local_auth_providers:', err);
    return { success: false, accounts: [] };
  }
};

export const scanProviderAuth = async (
  providerId: string
): Promise<{ success: boolean; found: boolean; account?: any; message?: string }> => {
  if (!isTauriEnvironment()) {
    return { success: true, found: false, message: '非桌面环境' };
  }
  try {
    return await invoke<{ success: boolean; found: boolean; account?: any; message?: string }>(
      'scan_provider_auth',
      { providerId }
    );
  } catch (err) {
    console.warn('Failed to scan_provider_auth:', err);
    return { success: false, found: false, message: String(err) };
  }
};

export const fetchRealAccountQuota = async (
  accountId: string,
  provider: string
): Promise<{ success: boolean; snapshot?: any; error?: string }> => {
  if (!isTauriEnvironment()) {
    return { success: false, error: '非桌面环境' };
  }
  try {
    return await invoke<{ success: boolean; snapshot?: any; error?: string }>(
      'fetch_real_account_quota',
      { accountId, provider }
    );
  } catch (err) {
    console.warn('Failed to fetch_real_account_quota:', err);
    return { success: false, error: String(err) };
  }
};

export const openProviderLogin = async (
  providerId: string
): Promise<{ success: boolean; url?: string; message?: string }> => {
  if (!isTauriEnvironment()) {
    return { success: false, message: '非桌面环境' };
  }
  try {
    return await invoke<{ success: boolean; url?: string; message?: string }>(
      'open_provider_login',
      { providerId }
    );
  } catch (err) {
    console.warn('Failed to open_provider_login:', err);
    return { success: false, message: String(err) };
  }
};

export const launchCliLogin = async (
  providerId: string
): Promise<{ success: boolean; message?: string }> => {
  if (!isTauriEnvironment()) {
    return { success: false, message: '非桌面环境' };
  }
  try {
    return await invoke<{ success: boolean; message?: string }>(
      'launch_cli_login',
      { providerId }
    );
  } catch (err) {
    console.warn('Failed to launch_cli_login:', err);
    return { success: false, message: String(err) };
  }
};

export const parseAndBindSession = async (
  providerId: string,
  sessionInput: string
): Promise<{ success: boolean; account?: any; error?: string }> => {
  if (!isTauriEnvironment()) {
    return { success: false, error: '非桌面环境' };
  }
  try {
    return await invoke<{ success: boolean; account?: any; error?: string }>(
      'parse_and_bind_session',
      { providerId, sessionInput }
    );
  } catch (err) {
    console.warn('Failed to parse_and_bind_session:', err);
    return { success: false, error: String(err) };
  }
};

export const checkCCSwitchInstalled = async (): Promise<CCSwitchDetectionResult> => {
  if (!isTauriEnvironment()) {
    // In web browser mock mode: simulate successful connection
    return {
      detected: true,
      path: '~/.cc-switch/config.json (模拟)',
    };
  }

  try {
    return await invoke<CCSwitchDetectionResult>('check_cc_switch');
  } catch (err) {
    console.warn('Failed to invoke check_cc_switch:', err);
    return { detected: false, path: '' };
  }
};

export const setupTrayListeners = async (onRefreshAll: () => void): Promise<UnlistenFn | null> => {
  if (!isTauriEnvironment()) {
    return null;
  }

  try {
    return await listen('tray-refresh-all', () => {
      onRefreshAll();
    });
  } catch (err) {
    console.warn('Failed to setup tray listener:', err);
    return null;
  }
};

export const minimizeWindow = async (): Promise<void> => {
  if (!isTauriEnvironment()) {
    console.log('[Mock] Window minimize');
    return;
  }
  try {
    await invoke('window_minimize');
  } catch (err) {
    console.warn('Failed to minimize window:', err);
  }
};

export const toggleMaximizeWindow = async (): Promise<void> => {
  if (!isTauriEnvironment()) {
    console.log('[Mock] Window toggle maximize');
    return;
  }
  try {
    await invoke('window_toggle_maximize');
  } catch (err) {
    console.warn('Failed to toggle maximize window:', err);
  }
};

export const closeWindow = async (): Promise<void> => {
  if (!isTauriEnvironment()) {
    console.log('[Mock] Window close to tray');
    return;
  }
  try {
    await invoke('window_close');
  } catch (err) {
    console.warn('Failed to close window:', err);
  }
};

export const setWindowMode = async (mode: 'dashboard' | 'tray'): Promise<void> => {
  if (!isTauriEnvironment()) {
    console.log('[Mock] setWindowMode:', mode);
    return;
  }
  try {
    await invoke('set_window_mode', { mode });
  } catch (err) {
    console.warn('Failed to set window mode:', err);
  }
};

export const setAlwaysOnTop = async (alwaysOnTop: boolean): Promise<void> => {
  if (!isTauriEnvironment()) {
    console.log('[Mock] setAlwaysOnTop:', alwaysOnTop);
    return;
  }
  try {
    await invoke('toggle_always_on_top', { alwaysOnTop });
  } catch (err) {
    console.warn('Failed to toggle always on top:', err);
  }
};

export const startDragging = async (e?: React.MouseEvent): Promise<void> => {
  if (e) {
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, a, textarea')) {
      return;
    }
  }
  if (!isTauriEnvironment()) {
    return;
  }
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().startDragging();
  } catch {
    try {
      await invoke('start_dragging');
    } catch (err) {
      console.warn('start_dragging failed:', err);
    }
  }
};
