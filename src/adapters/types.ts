import { QuotaSnapshot } from '../types';

export interface AdapterMetadata {
  id: string;
  name: string;
  category: 'llm_web' | 'llm_api' | 'cloud';
  authType: 'api_key' | 'cookie_session' | 'oauth';
  placeholder: string;
  docUrl: string;
}

export interface IProviderAdapter {
  metadata: AdapterMetadata;
  validateCredentials(credential: string): Promise<boolean>;
  fetchQuota(credential: string): Promise<QuotaSnapshot>;
}
