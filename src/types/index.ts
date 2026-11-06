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

export interface SecondaryTierData {
  name: string;
  utilization: number; // 0 - 100
  label?: string;
  resetsAt?: string;
}

export interface SevenDayQuotaData {
  usedPercent: number; // 0 - 100
  totalPercent?: number; // 100
  resetsAt?: string; // 7天重置时间
  label?: string; // 额度描述 (如 "24% 充沛")
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
  sevenDayQuota?: SevenDayQuotaData; // 7天周度额度
  secondaryTiers?: SecondaryTierData[]; // 多阶配额
  planName?: string; // 套餐级别：Claude Pro, Team, Plus, Google AI Pro 等
  errorMessage?: string;
}

export type AccountClassification = 'official' | 'relay' | 'routing';

export interface Account {
  id: string;
  name: string; // 账号昵称
  email?: string; // 账号邮箱
  platform: PlatformId;
  provider: string; // 供应商归属 (chatgpt / claude / antigravity / grok / deepseek / kimi / 自定义中转等)
  models?: string[]; // 常用/对应支持的模型名称
  tags: string[];
  classification?: AccountClassification; // 渠道类别
  planName?: string; // 订阅档位：Pro / Team / Plus / API
  enabled: boolean;
  isActiveInCCSwitch?: boolean; // 是否当前正被 cc-switch 激活使用
  appType?: string; // 对应的 CLI 类型 (claude / codex / gemini / agy)
  ccSwitchProviderId?: string; // 对应 CC-Switch 数据库中的 provider id
  priority: number; // 优先级 (1-10)
  autoFailoverEnabled: boolean;
  lastLoginAt?: string; // 最后一次登录/同步时间
  endpoint?: string; // 自定义中转接口
  credentials?: {
    apiKey?: string;
    sessionToken?: string;
    cookie?: string;
  };
  latestSnapshot?: QuotaSnapshot;
}
