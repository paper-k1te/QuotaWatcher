import { IProviderAdapter, AdapterMetadata } from './types';
import { QuotaSnapshot } from '../types';

export class SiliconFlowAdapter implements IProviderAdapter {
  metadata: AdapterMetadata = {
    id: 'siliconflow',
    name: '硅基流动 SiliconFlow',
    category: 'llm_api',
    authType: 'api_key',
    placeholder: 'sk-...',
    docUrl: 'https://cloud.siliconflow.cn/account/ak',
  };

  async validateCredentials(apiKey: string): Promise<boolean> {
    return apiKey.startsWith('sk-');
  }

  async fetchQuota(apiKey: string): Promise<QuotaSnapshot> {
    try {
      const response = await fetch('https://api.siliconflow.cn/v1/user/info', {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const res = await response.json();
      const balance = res.data?.balance ? parseFloat(res.data.balance) : 0;

      return {
        timestamp: new Date().toISOString(),
        isHealthy: balance > 0,
        isExhausted: balance <= 0,
        isWarning: balance < 3.0,
        kind: 'currency_balance',
        currencyBalance: {
          currency: 'CNY',
          balance,
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
