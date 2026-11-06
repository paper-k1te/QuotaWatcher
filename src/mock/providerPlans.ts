export type QuotaMechanism = 
  | 'dual_window'   // 5h 滚动窗口 + 7day 周额度 (如 ChatGPT Plus, Claude Pro, Grok SuperGrok)
  | 'weekly_only'   // 纯 1 周循环配额 (如 Kimi 会员, Google AI Premium 周限额)
  | 'daily_quota'   // 每日配额次日重置 (如 Gemini AI Studio 1500 RPD, Kimi 免费体验)
  | 'balance_only'; // 纯账户余额按量计费 (如 DeepSeek API, 硅基流动, OpenRouter, 自定义中转)

export interface PlanDefinition {
  id: string;
  name: string;
  description: string;
  quotaMechanism: QuotaMechanism;
  defaultWindowHours?: number;
  defaultRollingTotal?: number;
  defaultDailyLimit?: number;
  defaultCurrency?: 'CNY' | 'USD';
  badgeClass: string;
}

export const PROVIDER_PLANS: Record<string, PlanDefinition[]> = {
  chatgpt: [
    { 
      id: 'plus', 
      name: 'Plus ($20/月)', 
      description: '5h 滚动 80次 (GPT-4o/o1) + 周度推理额度', 
      quotaMechanism: 'dual_window', 
      defaultWindowHours: 5, 
      defaultRollingTotal: 80, 
      badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
    },
    { 
      id: 'pro', 
      name: 'Pro ($200/月)', 
      description: '无限 GPT-4o 极速响应 + o1 满血版无限制', 
      quotaMechanism: 'dual_window', 
      defaultWindowHours: 5, 
      defaultRollingTotal: 300, 
      badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold' 
    },
    { 
      id: 'team', 
      name: 'Team ($25/人/月)', 
      description: '5h 滚动 160次 + 团队协同工作区', 
      quotaMechanism: 'dual_window', 
      defaultWindowHours: 5, 
      defaultRollingTotal: 160, 
      badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30' 
    },
    { 
      id: 'business', 
      name: 'Business / Enterprise', 
      description: '企业定制高并发 + 独立资源保障', 
      quotaMechanism: 'dual_window', 
      defaultWindowHours: 5, 
      defaultRollingTotal: 500, 
      badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' 
    },
    { 
      id: 'free', 
      name: 'Free (免费版)', 
      description: '3h 滚动 10~16次 GPT-4o mini', 
      quotaMechanism: 'dual_window', 
      defaultWindowHours: 3, 
      defaultRollingTotal: 16, 
      badgeClass: 'bg-slate-800 text-slate-300 border-slate-700/60' 
    },
  ],
  claude: [
    { 
      id: 'pro', 
      name: 'Pro ($20/月)', 
      description: '5h 滚动 ~45次 (Sonnet 3.7) + 每周配额', 
      quotaMechanism: 'dual_window', 
      defaultWindowHours: 5, 
      defaultRollingTotal: 45, 
      badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30' 
    },
    { 
      id: 'team', 
      name: 'Team ($30/人/月)', 
      description: '更高并发配额 (约 Pro 的 5 倍) + 周度缓冲', 
      quotaMechanism: 'dual_window', 
      defaultWindowHours: 5, 
      defaultRollingTotal: 150, 
      badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30' 
    },
    { 
      id: 'enterprise', 
      name: 'Enterprise (企业版)', 
      description: '500k 上下文窗口 + 组织专属服务', 
      quotaMechanism: 'dual_window', 
      defaultWindowHours: 5, 
      defaultRollingTotal: 400, 
      badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' 
    },
    { 
      id: 'free', 
      name: 'Free (免费体验)', 
      description: '日常轻量对话 (~10条/5h)', 
      quotaMechanism: 'dual_window', 
      defaultWindowHours: 5, 
      defaultRollingTotal: 10, 
      badgeClass: 'bg-slate-800 text-slate-300 border-slate-700/60' 
    },
  ],
  deepseek: [
    { 
      id: 'v3_r1_full', 
      name: 'V3 / R1 官方满血版', 
      description: '官方 Harness / Web 满血并发通道 (5h 滚动充沛)', 
      quotaMechanism: 'dual_window', 
      defaultWindowHours: 5, 
      defaultRollingTotal: 50, 
      badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30 font-semibold' 
    },
    { 
      id: 'api_balance', 
      name: '开放平台 API 充值按量', 
      description: '账户可用余额 (CNY ￥) · 实时扣费 · 无周期限制', 
      quotaMechanism: 'balance_only', 
      defaultCurrency: 'CNY', 
      badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
    },
    { 
      id: 'free', 
      name: '网页端免费体验', 
      description: '高峰期动态流控', 
      quotaMechanism: 'dual_window', 
      defaultWindowHours: 5, 
      defaultRollingTotal: 30, 
      badgeClass: 'bg-slate-800 text-slate-300 border-slate-700/60' 
    },
  ],
  gemini: [
    { 
      id: 'ai_premium', 
      name: 'Google One AI Premium', 
      description: '2.5 Pro / Ultra 优先访问 + 月度订阅', 
      quotaMechanism: 'weekly_only', 
      badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30' 
    },
    { 
      id: 'ai_studio_free', 
      name: 'AI Studio 免费版 (1500 RPD)', 
      description: '每日 1500 次请求 (15 RPM)，次日 00:00 重置', 
      quotaMechanism: 'daily_quota', 
      defaultDailyLimit: 1500, 
      badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30' 
    },
    { 
      id: 'payg', 
      name: 'GCP Pay-As-You-Go 按量', 
      description: 'Google Cloud 计费账户 · 实时按 Token 扣费', 
      quotaMechanism: 'balance_only', 
      defaultCurrency: 'USD', 
      badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
    },
  ],
  grok: [
    { 
      id: 'supergrok', 
      name: 'SuperGrok (网页会员)', 
      description: '2小时 100条 Grok 3 Reasoning + 月度额度', 
      quotaMechanism: 'dual_window', 
      defaultWindowHours: 2, 
      defaultRollingTotal: 100, 
      badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30 font-semibold' 
    },
    { 
      id: 'x_premium', 
      name: 'X Premium+ 会员', 
      description: '基础 Grok 访问 + 3小时动态配额', 
      quotaMechanism: 'dual_window', 
      defaultWindowHours: 3, 
      defaultRollingTotal: 60, 
      badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30' 
    },
    { 
      id: 'api_developer', 
      name: 'xAI API 开发者', 
      description: 'API 余额按量计费 (USD $)', 
      quotaMechanism: 'balance_only', 
      defaultCurrency: 'USD', 
      badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
    },
  ],
  kimi: [
    { 
      id: 'vip', 
      name: 'Kimi 会员 (轻享/尊享)', 
      description: '专属高速通道 + K1.5 深度推理周度配额', 
      quotaMechanism: 'weekly_only', 
      badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30 font-semibold' 
    },
    { 
      id: 'api_developer', 
      name: 'Moonshot 开放平台 (API)', 
      description: '账户余额 (CNY ￥) + 充值赠金 · 实时扣费', 
      quotaMechanism: 'balance_only', 
      defaultCurrency: 'CNY', 
      badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
    },
    { 
      id: 'free', 
      name: '网页版免费体验', 
      description: '每日高频对话限额 · 次日 00:00 刷新', 
      quotaMechanism: 'daily_quota', 
      defaultDailyLimit: 100, 
      badgeClass: 'bg-slate-800 text-slate-300 border-slate-700/60' 
    },
  ],
  siliconflow: [
    { 
      id: 'developer_balance', 
      name: '硅基流动充值按量', 
      description: '账户余额 (CNY ￥) + 赠金 · 无周期限制', 
      quotaMechanism: 'balance_only', 
      defaultCurrency: 'CNY', 
      badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
    },
  ],
  openrouter: [
    { 
      id: 'credits_balance', 
      name: 'Credits Pay-As-You-Go', 
      description: 'USD 预充值余额 · 全球多模型统一扣费', 
      quotaMechanism: 'balance_only', 
      defaultCurrency: 'USD', 
      badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
    },
  ],
  bossclaw: [
    { 
      id: 'relay_balance', 
      name: '中转 API 实时按量', 
      description: 'USD 账户余额 · 无周期限制', 
      quotaMechanism: 'balance_only', 
      defaultCurrency: 'USD', 
      badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
    },
  ],
};

// Fallback for custom or unlisted providers
export const DEFAULT_PLANS: PlanDefinition[] = [
  { id: 'custom_balance', name: '按量扣费账户', description: '账户可用余额实时扣费', quotaMechanism: 'balance_only', defaultCurrency: 'CNY', badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  { id: 'custom_rolling', name: '周期滚动配额', description: '5小时或每日循环配额', quotaMechanism: 'dual_window', defaultWindowHours: 5, defaultRollingTotal: 50, badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  { id: 'custom_weekly', name: '周度循环配额', description: '按周重置的定额套餐', quotaMechanism: 'weekly_only', badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
];

export const getPlansForProvider = (providerId: string): PlanDefinition[] => {
  return PROVIDER_PLANS[providerId] || DEFAULT_PLANS;
};
