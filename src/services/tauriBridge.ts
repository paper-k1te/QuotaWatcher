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
