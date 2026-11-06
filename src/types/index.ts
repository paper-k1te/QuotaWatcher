export type PlatformId = 
  | 'claude-web'
  | 'chatgpt-web'
  | 'deepseek'
  | 'siliconflow'
  | 'gemini'
  | 'openrouter'
  | 'custom-api'
  | string;

export type ProviderId = 
  | 'chatgpt'
  | 'claude'
  | 'antigravity'
  | 'grok'
  | 'deepseek'
  | 'kimi'
  | 'trae'
  | 'tokendance'
  | 'siliconflow'
  | 'openrouter'
  | string;

export interface ProviderMeta {
  id: string;
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
  category: 'official' | 'ecosystem' | 'relay';
  isDefaultVisible: boolean; // 是否默认显示在侧边栏
  isCustom?: boolean; // 是否是用户添加的第三方中转厂商
  endpoint?: string;
  protocol?: 'openai' | 'newapi' | 'oneapi' | 'custom';
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
  provider: string; // 供应商归属 (chatgpt / claude / antigravity / grok / deepseek / kimi / 自定义中转等)
  models: string[]; // 常用/对应支持的模型名称
  tags: string[];
  enabled: boolean;
  isActiveInCCSwitch?: boolean; // 是否当前正被 cc-switch 激活使用
  priority: number; // 优先级 (1-10)
  autoFailoverEnabled: boolean;
  endpoint?: string; // 自定义中转接口
  credentials?: {
    apiKey?: string;
    sessionToken?: string;
    cookie?: string;
  };
  latestSnapshot?: QuotaSnapshot;
}
