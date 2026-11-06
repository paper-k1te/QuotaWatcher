import { IProviderAdapter, AdapterMetadata } from './types';
import { QuotaSnapshot } from '../types';

export class DeepSeekAdapter implements IProviderAdapter {
  metadata: AdapterMetadata = {
    id: 'deepseek',
    name: 'DeepSeek 官方 API',
    category: 'llm_api',
    authType: 'api_key',
    placeholder: 'sk-...',
    docUrl: 'https://platform.deepseek.com/api_keys',
  };

  async validateCredentials(apiKey: string): Promise<boolean> {
    return apiKey.startsWith('sk-') && apiKey.length > 20;
  }

  async fetchQuota(apiKey: string): Promise<QuotaSnapshot> {
    try {
      const response = await fetch('https://api.deepseek.com/user/balance', {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      // data.balance_infos: [{ currency: "CNY", total_balance: "12.34", granted_balance: "0.00" }]
      const primary = data.balance_infos?.[0];
      const balance = primary ? parseFloat(primary.total_balance) : 0;
      const granted = primary ? parseFloat(primary.granted_balance) : 0;

      return {
        timestamp: new Date().toISOString(),
        isHealthy: balance > 0,
        isExhausted: balance <= 0,
        isWarning: balance < 5.0, // 低于 5 元预警
        kind: 'currency_balance',
        currencyBalance: {
          currency: primary?.currency === 'USD' ? 'USD' : 'CNY',
          balance,
          grantedAmount: granted,
        },
      };
    } catch (err: any) {
      return {
        timestamp: new Date().toISOString(),
        isHealthy: false,
        isExhausted: false,
        isWarning: true,
        kind: 'currency_balance',
        errorMessage: err.message || '查询失败',
      };
    }
  }
}
