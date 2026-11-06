import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

export interface CCSwitchDetectionResult {
  detected: boolean;
  path: string;
}

export const isTauriEnvironment = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
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
