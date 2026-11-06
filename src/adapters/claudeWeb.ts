import { IProviderAdapter, AdapterMetadata } from './types';
import { QuotaSnapshot } from '../types';

export class ClaudeWebAdapter implements IProviderAdapter {
  metadata: AdapterMetadata = {
    id: 'claude-web',
    name: 'Claude.ai 网页版',
    category: 'llm_web',
    authType: 'cookie_session',
    placeholder: 'sk-ant-sid01-...',
    docUrl: 'https://claude.ai',
  };

  async validateCredentials(sessionKey: string): Promise<boolean> {
    return sessionKey.startsWith('sk-ant-sid01-');
  }

  async fetchQuota(sessionKey: string): Promise<QuotaSnapshot> {
    try {
      // In web/desktop client, requests are sent with Cookie: sessionKey=...
      const response = await fetch('https://api.claude.ai/api/organizations', {
        headers: {
          Cookie: `sessionKey=${sessionKey}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`认证失效或网络受限 (HTTP ${response.status})`);
      }

      // Mock/simulated extraction of rate limit from headers or org stats
      // Headers often return: anthropic-ratelimit-unified-5h-reset, etc.
      const used = 38;
      const total = 45;
      const cooldownSec = 2400; // 40 mins

      return {
        timestamp: new Date().toISOString(),
        isHealthy: used < total,
        isExhausted: used >= total,
        isWarning: used >= total * 0.8,
        kind: 'rolling_window',
        rollingWindow: {
          used,
          total,
          windowDurationHours: 5,
          resetsAt: new Date(Date.now() + cooldownSec * 1000).toISOString(),
          cooldownSecondsRemaining: cooldownSec,
        },
      };
    } catch (err: any) {
      return {
        timestamp: new Date().toISOString(),
        isHealthy: false,
        isExhausted: false,
        isWarning: true,
        kind: 'rolling_window',
        errorMessage: err.message || '查询失败',
      };
    }
  }
}
