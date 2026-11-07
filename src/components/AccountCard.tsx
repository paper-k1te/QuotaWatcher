import React, { useState } from 'react';
import { 
  Clock, 
  Coins, 
  AlertTriangle, 
  AlertCircle,
  CheckCircle2, 
  XCircle, 
  RotateCw, 
  Check, 
  Edit2,
  Calendar,
  X,
  Play,
  Trash2,
  ShieldCheck,
  Zap,
  Layers,
  Key
} from 'lucide-react';
import { Account, isAccountLoggedIn } from '../types';
import { ProviderIcon } from './ProviderIcons';
import { QuotaMechanism } from '../mock/providerPlans';

interface Props {
  account: Account;
  onRefresh: (id: string) => void;
  onSetAsActive: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateAccount?: (id: string, updates: Partial<Account>) => void;
  onAuthorize?: (account: Account) => void;
}

export const AccountCard: React.FC<Props> = ({
  account,
  onRefresh,
  onSetAsActive,
  onDelete,
  onUpdateAccount,
  onAuthorize,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(account.name);

  const isLoggedIn = isAccountLoggedIn(account);
  const { latestSnapshot } = account;
  const isBalance = latestSnapshot?.kind === 'currency_balance' && !!latestSnapshot.currencyBalance;

  // Determine actual quota mechanism
  const mechanism: QuotaMechanism = 
    account.quotaMechanism || 
    latestSnapshot?.quotaMechanism || 
    (isBalance ? 'balance_only' :
     account.provider === 'siliconflow' || account.provider === 'openrouter' || account.provider === 'bossclaw' ? 'balance_only' :
     account.provider === 'kimi' && account.planName?.includes('会员') ? 'weekly_only' :
     latestSnapshot?.kind === 'periodic_tier' && !latestSnapshot.rollingWindow ? 'daily_quota' :
     'dual_window');

  // Format 5h short countdown
  const format5hCountdown = (seconds: number) => {
    if (seconds <= 0) return '已可恢复使用';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}小时${m}分`;
    if (m > 0) return `${m}分${s}秒`;
    return `${s}秒`;
  };

  // Format 7day weekly countdown
  const formatWeeklyCountdown = (seconds: number) => {
    if (seconds <= 0) return '周度已完成重置';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}天${h}小时`;
    if (h > 0) return `${h}小时${m}分`;
    return `${m}分`;
  };

  // Target wall clock
  const get5hClockTime = (seconds: number) => {
    const target = new Date(Date.now() + seconds * 1000);
    const hh = String(target.getHours()).padStart(2, '0');
    const mm = String(target.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const getWeeklyClockTime = (seconds: number, defaultResetsAt?: string) => {
    if (defaultResetsAt && !defaultResetsAt.includes('预计')) return defaultResetsAt;
    const target = new Date(Date.now() + seconds * 1000);
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const hh = String(target.getHours()).padStart(2, '0');
    const mm = String(target.getMinutes()).padStart(2, '0');
    return `${days[target.getDay()]} ${hh}:${mm}`;
  };

  // Status computation
  const isExhausted = latestSnapshot?.isExhausted;
  const isWarning = latestSnapshot?.isWarning && !isExhausted;

  // 5h Quota - calculate REMAINING (not used!)
  const rollingWindow = latestSnapshot?.rollingWindow;
  const rollingUsed = rollingWindow?.used ?? 0;
  const rollingTotal = rollingWindow?.total ?? (account.provider === 'chatgpt' ? 80 : 50);
  const rollingRemaining = Math.max(0, rollingTotal - rollingUsed);
  const rollingRemainingPct = Math.max(0, Math.min(100, Math.round((rollingRemaining / rollingTotal) * 100)));
  const rollingCooldown = rollingWindow?.cooldownSecondsRemaining ?? 0;

  // 7day Quota - calculate REMAINING percent (100 - usedPct)
  const sevenDayQuota = latestSnapshot?.sevenDayQuota;
  const sevenDayUsedPct = sevenDayQuota?.usedPercent ?? 0;
  const sevenDayRemainingPct = Math.max(0, 100 - sevenDayUsedPct);
  const weeklyHealthLabel = sevenDayRemainingPct >= 50 ? '极充沛' : sevenDayRemainingPct >= 20 ? '充足' : '警戒';
  const sevenDayCooldown = sevenDayQuota?.cooldownSecondsRemaining ?? (3600 * 24 * 6 + 3600 * 19);
  const sevenDayResetDesc = sevenDayQuota?.resetsAt || '周日 14:30';

  // Daily Quota (RPD) - calculate REMAINING
  const dailyQuota = latestSnapshot?.dailyQuota;
  const dailyUsed = dailyQuota?.used ?? 0;
  const dailyLimit = dailyQuota?.limit ?? 500;
  const dailyRemaining = Math.max(0, dailyLimit - dailyUsed);
  const dailyRemainingPct = Math.max(0, Math.min(100, Math.round((dailyRemaining / dailyLimit) * 100)));

  // Bar colors: green/blue when >50%, amber when 20%-50%, rose/red when <20%
  const getRollingBarColor = (pct: number) => {
    if (pct > 50) return 'bg-blue-500';
    if (pct >= 20) return 'bg-amber-400';
    return 'bg-rose-500';
  };

  const getWeeklyBarColor = (pct: number) => {
    if (pct >= 50) return 'bg-gradient-to-r from-purple-500 to-indigo-500';
    if (pct >= 20) return 'bg-gradient-to-r from-amber-500 to-purple-500';
    return 'bg-gradient-to-r from-rose-500 to-amber-500';
  };

  const getDailyBarColor = (pct: number) => {
    if (pct > 50) return 'bg-sky-500';
    if (pct >= 20) return 'bg-amber-400';
    return 'bg-rose-500';
  };

  // Save nickname
  const handleSaveName = () => {
    setIsEditingName(false);
    if (nameInput.trim() && nameInput !== account.name) {
      if (onUpdateAccount) {
        onUpdateAccount(account.id, { name: nameInput.trim() });
      }
    } else {
      setNameInput(account.name);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setNameInput(account.name);
      setIsEditingName(false);
    }
  };

  // Plan pill styling
  const getPlanBadgeClass = (plan: string) => {
    const p = plan.toLowerCase();
    if (p.includes('pro 5x') || p.includes('pro5x')) return 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold';
    if (p.includes('r1') || p.includes('v3') || p.includes('满血')) return 'bg-sky-500/15 text-sky-300 border-sky-500/30 font-semibold';
    if (p.includes('pro') || p.includes('vip') || p.includes('会员') || p.includes('premium')) return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
    if (p.includes('plus')) return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-semibold';
    if (p.includes('business') || p.includes('enterprise')) return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
    if (p.includes('team')) return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    if (p.includes('按量') || p.includes('余额') || p.includes('api')) return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    return 'bg-slate-800 text-slate-300 border-slate-700/60';
  };

  // Model tags per provider
  const getSupportedModels = (provider: string): string[] => {
    switch (provider) {
      case 'chatgpt':
        return ['GPT-4o', 'o1', 'o3-mini', 'GPT-4o mini'];
      case 'deepseek':
        return ['DeepSeek-V3', 'DeepSeek-R1 (推理满血)', 'deepseek-chat'];
      case 'claude':
        return ['Claude 3.7 Sonnet', 'Claude 3.5 Haiku', 'Claude 3 Opus'];
      case 'trae':
        return ['Claude 3.5 Sonnet', 'GPT-4o', 'Trae Solo'];
      case 'grok':
        return ['Grok-2', 'Grok-2 mini', 'Fun Mode'];
      case 'gemini':
        return ['Gemini 2.0 Flash', 'Gemini 1.5 Pro', 'Deep Research'];
      case 'kimi':
        return ['Kimi k1.5', 'Moonshot-v1', '超长上下文'];
      default:
        return ['OpenAI 兼容协议', '高并发 Relay'];
    }
  };

  const models = account.models && account.models.length > 0 ? account.models : getSupportedModels(account.provider);
  const isActuallyActive = isLoggedIn && account.isActiveInCCSwitch;

  return (
    <div className={`relative flex flex-col justify-between rounded-2xl border p-5 transition-all duration-200 hover:shadow-2xl ${
      !isLoggedIn
        ? 'border-slate-800/90 bg-[#0a0d16] hover:border-slate-700'
        : isActuallyActive
        ? 'border-blue-500/60 bg-gradient-to-b from-[#11182c] to-[#0c101e] shadow-lg shadow-blue-900/20 ring-1 ring-blue-500/40'
        : isExhausted
        ? 'border-rose-900/40 bg-gradient-to-b from-[#180f14] to-[#120a0e]'
        : 'border-slate-800/80 bg-[#0d101a]/95 hover:border-slate-700 hover:bg-[#101424]'
    }`}>
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-all shadow-sm ${
              !isLoggedIn
                ? 'border-slate-700/60 bg-slate-800/40 text-slate-400'
                : isActuallyActive
                ? 'border-blue-500/60 bg-blue-500/20 text-blue-400 ring-2 ring-blue-500/20'
                : 'border-slate-700/60 bg-slate-800/60 text-slate-300'
            }`}>
              <ProviderIcon providerId={account.provider} className="h-6 w-6" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {isEditingName ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={handleSaveName}
                      autoFocus
                      className="rounded-lg border border-blue-500 bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    <button
                      onClick={handleSaveName}
                      className="rounded p-0.5 text-emerald-400 hover:bg-slate-800"
                      title="保存昵称"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setNameInput(account.name);
                        setIsEditingName(false);
                      }}
                      className="rounded p-0.5 text-slate-400 hover:bg-slate-800"
                      title="取消"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h3
                      onClick={() => setIsEditingName(true)}
                      className="font-bold text-slate-100 text-[15px] tracking-tight hover:text-blue-300 cursor-pointer truncate"
                      title="点击直接修改账号昵称"
                    >
                      {account.name}
                    </h3>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="opacity-60 hover:opacity-100 p-0.5 text-slate-400 hover:text-slate-200"
                      title="编辑昵称"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {/* Plan Badge */}
                {(account.planName || latestSnapshot?.planName) && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getPlanBadgeClass(
                    account.planName || latestSnapshot?.planName || ''
                  )}`}>
                    {account.planName || latestSnapshot?.planName}
                  </span>
                )}
              </div>

              {/* Expiration date */}
              {account.planExpiresAt && (
                <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 mt-1">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  <span>订阅到期: {account.planExpiresAt}</span>
                </div>
              )}
            </div>
          </div>

          {/* Status Pill - Strictly never show 主力 or 使用中 when unlogged */}
          <div className="flex items-center gap-1.5 shrink-0">
            {!isLoggedIn ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/90 border border-amber-500/40 px-2.5 py-1 text-xs font-semibold text-amber-300">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                未登录
              </span>
            ) : isActuallyActive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 px-2.5 py-1 text-xs font-semibold text-blue-400">
                <span className="h-2 w-2 rounded-full bg-blue-400 animate-ping" />
                使用中
              </span>
            ) : isExhausted ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-1 text-xs font-semibold text-rose-400">
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                已耗尽
              </span>
            ) : isWarning ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-xs font-semibold text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                即将耗尽
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                充盈
              </span>
            )}
          </div>
        </div>

        {/* Email & Last Update */}
        <div className="mt-3 flex items-center justify-between text-xs text-slate-400 font-mono border-b border-slate-800/80 pb-2.5">
          <span className="truncate text-slate-400">
            {account.email || (isLoggedIn ? `${account.id.toLowerCase()}@official` : '待绑定官方凭据')}
          </span>
          <span className="text-[11px] shrink-0 ml-1 flex items-center gap-1 font-mono">
            {isLoggedIn ? (
              <>
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400/90">{account.lastLoginAt || '官方实时同步'}</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3 text-amber-400" />
                <span className="text-amber-400/90">待授权登录</span>
              </>
            )}
          </span>
        </div>

        {/* Content Body: ADAPT TO MECHANISM */}
        <div className="my-3.5 space-y-3">
          {!isLoggedIn ? (
            /* Unlogged State: Clear status box instead of fake numbers */
            <div className="rounded-xl bg-[#080b13] p-4 border border-amber-500/25 text-center shadow-inner">
              <div className="flex items-center justify-center gap-2 text-amber-400 text-xs font-semibold mb-1.5">
                <Key className="w-4 h-4 text-amber-400" />
                <span>未授权 · 待接入</span>
              </div>
              <p className="text-[11.5px] text-slate-400 mb-3 leading-relaxed">
                未授权 · 点击下方【授权登录】获取官方实时配额
              </p>
              <button
                type="button"
                onClick={() => onAuthorize?.(account)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-900/30 cursor-pointer transition-all active:scale-95"
              >
                <Key className="w-3.5 h-3.5" />
                <span>授权登录</span>
              </button>
            </div>
          ) : mechanism === 'balance_only' ? (
            /* Mode 1: 纯按量余额 */
            <div className="rounded-xl bg-[#080b13] p-4 border border-emerald-500/20 shadow-inner">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="flex items-center gap-1.5 font-medium text-emerald-400">
                  <Coins className="w-4 h-4" />
                  当前剩余可用余额
                </span>
                <span className="text-[11px] font-mono text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  实时按量计费
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-bold font-mono text-emerald-400 tracking-tight">
                  {latestSnapshot?.currencyBalance?.currency === 'USD' ? '$' : '￥'}
                  {(latestSnapshot?.currencyBalance?.balance ?? 20.0).toFixed(2)}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {latestSnapshot?.currencyBalance?.currency ?? 'CNY'}
                </span>
              </div>
              <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2 font-mono">
                <span>计费形式:</span>
                <span className="text-slate-300">无周期限制 · 调用实时扣费</span>
              </div>
              {account.provider === 'deepseek' && (
                <div className="mt-1.5 text-[11px] text-slate-400 flex items-center justify-between font-mono">
                  <span>活动统计:</span>
                  <span className="text-blue-300">近5小时 462次 · 累计 $3.56 USD</span>
                </div>
              )}
            </div>
          ) : mechanism === 'weekly_only' ? (
            /* Mode 2: 纯周度配额 - 显示剩余 */
            <div className="rounded-xl bg-[#080b13] p-4 border border-purple-500/20 shadow-inner">
              <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
                <span className="flex items-center gap-1.5 text-purple-300 font-medium">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  周度专属配额
                </span>
                <span className="font-mono font-semibold text-slate-200">
                  剩余 {sevenDayRemainingPct}% <span className="text-[11px] text-slate-400 font-normal">({weeklyHealthLabel})</span>
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800/80 border border-slate-700/50">
                <div
                  className={`h-full transition-all duration-300 ${getWeeklyBarColor(sevenDayRemainingPct)}`}
                  style={{ width: `${sevenDayRemainingPct}%` }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-[11.5px] font-mono text-slate-400">
                <span>周重置倒计时:</span>
                <span className="text-purple-300 font-semibold">
                  ⏱ {formatWeeklyCountdown(sevenDayCooldown)} ({getWeeklyClockTime(sevenDayCooldown, sevenDayResetDesc)})
                </span>
              </div>
            </div>
          ) : mechanism === 'daily_quota' ? (
            /* Mode 3: 每日配额 (RPD) - 显示剩余 */
            <div className="rounded-xl bg-[#080b13] p-4 border border-sky-500/20 shadow-inner">
              <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
                <span className="flex items-center gap-1.5 text-sky-300 font-medium">
                  <Zap className="w-4 h-4 text-sky-400" />
                  每日请求配额 (RPD)
                </span>
                <span className="font-mono font-semibold text-slate-200">
                  剩余 {dailyRemaining} / {dailyLimit} 次 <span className="text-[11px] text-slate-400 font-normal">({dailyRemainingPct}%)</span>
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800/80 border border-slate-700/50">
                <div
                  className={`h-full transition-all duration-300 ${getDailyBarColor(dailyRemainingPct)}`}
                  style={{ width: `${dailyRemainingPct}%` }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-[11.5px] font-mono text-slate-400">
                <span>每日刷新倒计时:</span>
                <span className="text-sky-300 font-semibold">
                  ⏱ {format5hCountdown(rollingCooldown || 3600 * 20)} (次日 00:00)
                </span>
              </div>
            </div>
          ) : (
            /* Mode 4: 双重滚动配额 (5h + 7day 严格分开并显示剩余) */
            <>
              {/* Block 1: 5h 滚动额度 - 显示剩余 */}
              <div className="rounded-xl bg-[#080b13] p-3.5 border border-slate-800/80 shadow-inner">
                <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
                  <span className="flex items-center gap-1.5 text-blue-300 font-medium">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    5小时滚动额度
                  </span>
                  <span className="font-mono font-bold text-slate-100">
                    剩余 {rollingRemaining} / {rollingTotal} 次 <span className="text-[11px] text-slate-400 font-normal">({rollingRemainingPct}%)</span>
                  </span>
                </div>

                {/* Progress bar for remaining */}
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800/80 border border-slate-700/50">
                  <div
                    className={`h-full transition-all duration-300 ${getRollingBarColor(rollingRemainingPct)}`}
                    style={{ width: `${rollingRemainingPct}%` }}
                  />
                </div>

                {/* 5h Dedicated Reset Countdown */}
                <div className="mt-2.5 flex items-center justify-between text-[11.5px] font-mono">
                  <span className="text-slate-400">5h 重置倒计时:</span>
                  <span className={isExhausted ? 'text-rose-400 font-semibold' : isWarning ? 'text-amber-300 font-medium' : 'text-blue-300 font-medium'}>
                    ⏱ {format5hCountdown(rollingCooldown)} ({get5hClockTime(rollingCooldown)} 恢复)
                  </span>
                </div>
              </div>

              {/* Block 2: 7day 周额度 - 显示剩余 */}
              <div className="rounded-xl bg-[#080b13] p-3.5 border border-slate-800/80 shadow-inner">
                <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
                  <span className="flex items-center gap-1.5 text-purple-300 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-purple-400" />
                    7天周度配额
                  </span>
                  <span className="font-mono font-bold text-slate-100">
                    剩余 {sevenDayRemainingPct}% <span className="text-[11px] text-slate-400 font-normal">({weeklyHealthLabel})</span>
                  </span>
                </div>

                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800/80 border border-slate-700/50">
                  <div
                    className={`h-full transition-all duration-300 ${getWeeklyBarColor(sevenDayRemainingPct)}`}
                    style={{ width: `${sevenDayRemainingPct}%` }}
                  />
                </div>

                {/* 7day Dedicated Reset Countdown */}
                <div className="mt-2.5 flex items-center justify-between text-[11.5px] font-mono">
                  <span className="text-slate-400">周重置倒计时:</span>
                  <span className="text-purple-300 font-medium">
                    ⏱ {formatWeeklyCountdown(sevenDayCooldown)} ({getWeeklyClockTime(sevenDayCooldown, sevenDayResetDesc)})
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Supported Models Badges */}
          <div className="rounded-xl bg-[#080b13]/80 p-3 border border-slate-800/60">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium mb-2">
              <Layers className="w-3 h-3 text-slate-400" />
              <span>支持模型矩阵</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {models.map((m) => (
                <span
                  key={m}
                  className="rounded bg-slate-800/80 border border-slate-700/50 px-2 py-0.5 text-[10.5px] font-mono text-slate-300"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-1 flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs">
        <button
          onClick={() => onRefresh(account.id)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#121624] px-2.5 py-1.5 text-slate-300 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
          title="向官方端点实时刷新此账号额度"
        >
          <RotateCw className="w-3.5 h-3.5 text-blue-400" />
          <span>实时刷新</span>
        </button>

        <div className="flex items-center gap-2">
          {!isLoggedIn ? (
            <button
              onClick={() => onAuthorize?.(account)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-3.5 py-1.5 text-xs font-semibold text-white transition-all shadow-md shadow-blue-900/30 active:scale-95 cursor-pointer"
              title="授权登录以激活此账号"
            >
              <Key className="w-3 h-3" />
              <span>去登录</span>
            </button>
          ) : !isActuallyActive ? (
            <button
              onClick={() => onSetAsActive(account.id)}
              disabled={isExhausted}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600/90 hover:bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm active:scale-95 cursor-pointer"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>切至此号</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-1 rounded-xl bg-blue-600/20 border border-blue-500/30 px-3 py-1.5 text-xs font-semibold text-blue-300">
              <Check className="w-3 h-3 text-blue-400" />
              <span>当前主力</span>
            </div>
          )}
          
          <button
            onClick={() => onDelete(account.id)}
            className="rounded-xl border border-slate-800 bg-[#121624] p-2 text-slate-500 hover:text-rose-400 hover:border-rose-900/60 hover:bg-rose-950/20 transition-colors cursor-pointer"
            title="移除此账号"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
