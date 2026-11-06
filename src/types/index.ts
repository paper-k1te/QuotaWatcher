export type PlatformId = 
  | 'claude-web'
  | 'chatgpt-web'
  | 'deepseek'
  | 'siliconflow'
  | 'gemini'
  | 'openrouter'
  | 'custom-api';

export type ProviderId = 
  | 'anthropic' 
  | 'deepseek' 
  | 'openai' 
  | 'siliconflow' 
  | 'gemini' 
  | 'openrouter' 
  | 'custom';

export interface ProviderMeta {
  id: ProviderId;
  name: string;
  enName: string;
  badge: string;
  brandColor: string;
  brandBg: string;
  accentBorder: string;
  accentGradient: string;
  supportedModels: string[];
  description: string;
  quotaTypeLabel: string;
}

export type QuotaKind = 'rolling_window' | 'currency_balance' | 'periodic_tier';

export interface RollingWindowData {
  used: number;
  total: number;
  windowDurationHours: number;
  resetsAt: string; // ISO String
  cooldownSecondsRemaining: number;
}

export interface CurrencyBalanceData {
  currency: 'CNY' | 'USD';
  balance: number;
  grantedAmount?: number;
  expiresAt?: string;
}

export interface PeriodicTierData {
  period: 'day' | 'month';
  used: number;
  limit: number;
  unit: string;
  resetsAt: string;
}

export interface QuotaSnapshot {
  timestamp: string;
  isHealthy: boolean;
  isExhausted: boolean;
  isWarning: boolean;
  kind: QuotaKind;
  rollingWindow?: RollingWindowData;
  currencyBalance?: CurrencyBalanceData;
  periodicTier?: PeriodicTierData;
  errorMessage?: string;
}

export interface Account {
  id: string;
  name: string;
  platform: PlatformId;
  provider: ProviderId; // 供应商归属
  models: string[]; // 常用/对应支持的模型名称
  tags: string[];
  enabled: boolean;
  isActiveInCCSwitch?: boolean; // 是否当前正被 cc-switch 激活使用
  priority: number; // 优先级 (1-10)
  autoFailoverEnabled: boolean;
  pollingIntervalMinutes: number;
  latestSnapshot?: QuotaSnapshot;
}

export interface CCSwitchStatus {
  isInstalled: boolean;
  configPath?: string;
  activeProfileId?: string;
  autoSwitchOnExhaustion: boolean;
}
