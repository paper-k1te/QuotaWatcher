import React, { useState } from 'react';
import { 
  Clock, 
  RotateCw, 
  Check, 
  Play, 
  Trash2, 
  Edit2, 
  Calendar, 
  X,
  Coins,
  Activity,
  ShieldCheck,
  Zap,
  Key,
  AlertCircle
} from 'lucide-react';
import { Account, ProviderMeta, isAccountLoggedIn } from '../types';
import { ProviderIcon } from './ProviderIcons';
import { QuotaMechanism } from '../mock/providerPlans';

interface Props {
  account: Account;
  providerMeta?: ProviderMeta;
  onRefresh: (id: string) => void;
  onSetAsActive: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateAccount?: (id: string, updates: Partial<Account>) => void;
  onAuthorize?: (account: Account) => void;
  onCopyEndpoint?: (text: string) => void;
}

export const AccountRow: React.FC<Props> = ({
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

  // Format 5h short countdown: e.g. "40分" or "2h15m"
  const format5hCountdown = (seconds: number) => {
    if (seconds <= 0) return '已可恢复';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}小时${m}分`;
    if (m > 0) return `${m}分`;
    return `${s}秒`;
  };

  // Format 7day / weekly countdown: e.g. "6天19h" or "18h30m"
  const formatWeeklyCountdown = (seconds: number) => {
    if (seconds <= 0) return '周度已完成重置';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}天${h}h`;
    if (h > 0) return `${h}h${m}分`;
    return `${m}分`;
  };

  // Target wall-clock time for 5h reset: e.g. "04:37"
  const get5hClockTime = (seconds: number) => {
    const target = new Date(Date.now() + seconds * 1000);
    const hh = String(target.getHours()).padStart(2, '0');
    const mm = String(target.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  // Target clock for 7day reset: e.g. "周日 14:30"
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

  // 5h Quota calculation - calculate REMAINING (not used!)
  const rollingWindow = latestSnapshot?.rollingWindow;
  const rollingUsed = rollingWindow?.used ?? 0;
  const rollingTotal = rollingWindow?.total ?? (account.provider === 'chatgpt' ? 80 : 50);
  const rollingRemaining = Math.max(0, rollingTotal - rollingUsed);
  const rollingRemainingPct = Math.max(0, Math.min(100, Math.round((rollingRemaining / rollingTotal) * 100)));
  const rollingCooldown = rollingWindow?.cooldownSecondsRemaining ?? 0;

  // 7day Quota calculation - calculate REMAINING percent (100 - usedPct)
  const sevenDayQuota = latestSnapshot?.sevenDayQuota;
  const sevenDayUsedPct = sevenDayQuota?.usedPercent ?? 0;
  const sevenDayRemainingPct = Math.max(0, 100 - sevenDayUsedPct);
  const weeklyHealthLabel = sevenDayRemainingPct >= 50 ? '极充沛' : sevenDayRemainingPct >= 20 ? '充足' : '警戒';
  const sevenDayCooldown = sevenDayQuota?.cooldownSecondsRemaining ?? (3600 * 24 * 6 + 3600 * 19);
  const sevenDayResetDesc = sevenDayQuota?.resetsAt || '周日 14:30';

  // Daily Quota calculation - calculate REMAINING
  const dailyQuota = latestSnapshot?.dailyQuota;
  const dailyUsed = dailyQuota?.used ?? 0;
  const dailyLimit = dailyQuota?.limit ?? 500;
  const dailyRemaining = Math.max(0, dailyLimit - dailyUsed);
  const dailyRemainingPct = Math.max(0, Math.min(100, Math.round((dailyRemaining / dailyLimit) * 100)));

  // Color helpers
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

  // Save edited nickname
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

  const isActuallyActive = isLoggedIn && account.isActiveInCCSwitch;

  return (
    <div
      className={`group relative flex items-center justify-between gap-4 rounded-2xl border px-5 py-4 transition-all duration-200 select-none ${
        !isLoggedIn
          ? 'border-slate-800/90 bg-[#0a0d16] hover:border-slate-700'
          : isActuallyActive
          ? 'border-blue-500/60 bg-gradient-to-r from-[#0e162d] to-[#0a1020] shadow-lg shadow-blue-950/30 ring-1 ring-blue-500/40'
          : isExhausted
          ? 'border-rose-900/40 bg-gradient-to-r from-[#170b12] to-[#10080d] hover:border-rose-800/60'
          : 'border-slate-800/80 bg-[#0a0d16]/95 hover:bg-[#0f1424] hover:border-slate-700/90 hover:shadow-md'
      }`}
    >
      {/* 1. Left Section: Icon + Editable Name + Plan Badge + Expiration + Email */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1 lg:max-w-[360px]">
        {/* Brand Vector Icon (Crisp 40x40) */}
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all shadow-sm ${
            !isLoggedIn
              ? 'border-slate-700/60 bg-slate-800/40 text-slate-400'
              : isActuallyActive
              ? 'border-blue-500/60 bg-blue-500/20 text-blue-400 ring-2 ring-blue-500/20'
              : 'border-slate-700/60 bg-slate-800/70 text-slate-300 group-hover:border-slate-600'
          }`}
        >
          <ProviderIcon providerId={account.provider} className="h-5 w-5" />
        </div>

        {/* Identity & Editable Name */}
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
                <span
                  onClick={() => setIsEditingName(true)}
                  className="font-bold text-slate-100 text-[14.5px] tracking-tight truncate cursor-pointer hover:text-blue-300 transition-colors"
                  title="点击直接修改账号昵称"
                >
                  {account.name}
                </span>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-slate-300 transition-opacity"
                  title="编辑昵称"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Plan Tier Badge */}
            {(account.planName || latestSnapshot?.planName) && (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getPlanBadgeClass(
                  account.planName || latestSnapshot?.planName || ''
                )}`}
              >
                {account.planName || latestSnapshot?.planName}
              </span>
            )}

            {/* Plan Expiration Date */}
            {account.planExpiresAt && (
              <span
                className="hidden xl:inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-700/50"
                title={`订阅到期时间: ${account.planExpiresAt}`}
              >
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>到期: {account.planExpiresAt}</span>
              </span>
            )}
          </div>

          {/* Email line & Last sync */}
          <div className="flex items-center gap-2 text-[11.5px] text-slate-400 font-mono truncate mt-1">
            <span className="truncate text-slate-400">
              {account.email || (isLoggedIn ? `${account.id.toLowerCase()}@official` : '待绑定官方凭据')}
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-[11px] truncate flex items-center gap-1">
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
        </div>
      </div>

      {/* 2. Middle Section: DYNAMICALLY SEPARATED QUOTA PANELS (Showing remaining!) */}
      {!isLoggedIn ? (
        /* Unlogged State: Clear status box instead of fake quotas */
        <div className="hidden md:flex items-center gap-3 min-w-[300px]">
          <div className="flex items-center gap-2 rounded-xl bg-slate-900/60 border border-amber-500/20 px-3.5 py-2 text-xs text-slate-400">
            <Key className="w-4 h-4 text-amber-400 shrink-0" />
            <span>未授权 · 点击右侧【去登录】获取官方实时配额</span>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex items-center gap-6 lg:gap-8 shrink-0">
          {/* Mode 1: 纯按量余额模式 */}
          {mechanism === 'balance_only' ? (
            <div className="flex items-center gap-6 min-w-[300px]">
              <div className="flex flex-col">
                <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                  <Coins className="w-3.5 h-3.5 text-emerald-400" />
                  <span>当前剩余可用余额</span>
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-lg font-bold font-mono text-emerald-400">
                    {latestSnapshot?.currencyBalance?.currency === 'USD' ? '$' : '￥'}
                    {(latestSnapshot?.currencyBalance?.balance ?? 20.0).toFixed(2)}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    {latestSnapshot?.currencyBalance?.currency ?? 'CNY'}
                  </span>
                </div>
                <div className="text-[10px] text-emerald-400/80 font-mono mt-0.5">
                  实时扣费 · 无周期限制
                </div>
              </div>

              <div className="flex flex-col border-l border-slate-800/80 pl-6">
                <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                  <Activity className="w-3.5 h-3.5 text-blue-400" />
                  <span>近期调用统计</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 font-mono text-xs text-slate-200">
                  <span>{account.provider === 'deepseek' ? '462 次 (5h)' : '实时待命中'}</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {account.provider === 'deepseek' ? '累计 2066 次 · $3.56 USD' : 'CC-Switch 代理托管'}
                </div>
              </div>
            </div>
          ) : mechanism === 'weekly_only' ? (
            /* Mode 2: 纯周度配额 - 显示剩余 */
            <div className="flex items-center gap-6 min-w-[300px]">
              <div className="flex flex-col min-w-[140px]">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-purple-300 font-medium flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-purple-400" />
                    周度专属额度
                  </span>
                  <span className="font-mono text-slate-200 font-semibold ml-1">
                    剩余 {sevenDayRemainingPct}% <span className="text-[11px] text-slate-400 font-normal">({weeklyHealthLabel})</span>
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-800/90 border border-slate-700/60">
                  <div
                    className={`h-full transition-all duration-300 ${getWeeklyBarColor(sevenDayRemainingPct)}`}
                    style={{ width: `${sevenDayRemainingPct}%` }}
                  />
                </div>
                <div className="mt-1 text-[10.5px] text-purple-400/90 font-mono">
                  按周循环限额
                </div>
              </div>

              <div className="flex flex-col min-w-[140px] border-l border-slate-800/80 pl-6">
                <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3 text-purple-400" />
                  周度重置倒计时
                </span>
                <div className="mt-1 flex items-center gap-1 font-mono text-xs">
                  <span className="text-purple-300 font-semibold">
                    ⏱ {formatWeeklyCountdown(sevenDayCooldown)}
                  </span>
                </div>
                <div className="mt-0.5 text-[10.5px] text-slate-500 font-mono">
                  预计 {getWeeklyClockTime(sevenDayCooldown, sevenDayResetDesc)} 重置
                </div>
              </div>
            </div>
          ) : mechanism === 'daily_quota' ? (
            /* Mode 3: 每日配额 RPD - 显示剩余 */
            <div className="flex items-center gap-6 min-w-[300px]">
              <div className="flex flex-col min-w-[140px]">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-sky-300 font-medium flex items-center gap-1">
                    <Zap className="w-3 h-3 text-sky-400" />
                    每日请求配额
                  </span>
                  <span className="font-mono text-slate-200 font-semibold ml-1">
                    剩余 {dailyRemaining} / {dailyLimit} 次 <span className="text-[11px] text-slate-400 font-normal">({dailyRemainingPct}%)</span>
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-800/90 border border-slate-700/60">
                  <div
                    className={`h-full transition-all duration-300 ${getDailyBarColor(dailyRemainingPct)}`}
                    style={{ width: `${dailyRemainingPct}%` }}
                  />
                </div>
                <div className="mt-1 text-[10.5px] text-sky-400/90 font-mono">
                  高级模型每日重置
                </div>
              </div>

              <div className="flex flex-col min-w-[140px] border-l border-slate-800/80 pl-6">
                <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3 text-sky-400" />
                  每日刷新倒计时
                </span>
                <div className="mt-1 flex items-center gap-1 font-mono text-xs">
                  <span className="text-sky-300 font-semibold">
                    ⏱ {format5hCountdown(rollingCooldown || 3600 * 20)}
                  </span>
                </div>
                <div className="mt-0.5 text-[10.5px] text-slate-500 font-mono">
                  次日 00:00 自动刷新
                </div>
              </div>
            </div>
          ) : (
            /* Mode 4: 双重滚动配额 (ChatGPT Plus, Claude Pro, Grok 等) -> 严格分开并显示剩余 */
            <div className="flex items-center gap-6 lg:gap-7">
              {/* Column A: 5小时滚动额度 - 显示剩余 */}
              <div className="flex flex-col min-w-[145px] lg:min-w-[160px]">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-blue-300 font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3 text-blue-400 shrink-0" />
                    5h 滚动额度
                  </span>
                  <span className="font-mono text-slate-200 font-bold ml-1">
                    剩余 {rollingRemaining}/{rollingTotal} <span className="text-[11px] text-slate-400 font-normal">({rollingRemainingPct}%)</span>
                  </span>
                </div>

                {/* 5h Progress Bar for remaining */}
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-800/90 border border-slate-700/60">
                  <div
                    className={`h-full transition-all duration-300 ${getRollingBarColor(rollingRemainingPct)}`}
                    style={{ width: `${rollingRemainingPct}%` }}
                  />
                </div>

                {/* 5h Dedicated Countdown */}
                <div className="mt-1 flex items-center gap-1 font-mono text-[11px]">
                  <span className="text-slate-400">恢复:</span>
                  <span className={isExhausted ? 'text-rose-400 font-semibold' : isWarning ? 'text-amber-300 font-medium' : 'text-blue-300 font-medium'}>
                    ⏱ {format5hCountdown(rollingCooldown)}
                  </span>
                  <span className="text-[10.5px] text-slate-500">
                    ({get5hClockTime(rollingCooldown)})
                  </span>
                </div>
              </div>

              {/* Column B: 7天周度额度 - 显示剩余 */}
              <div className="flex flex-col min-w-[150px] lg:min-w-[165px] border-l border-slate-800/80 pl-6">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-purple-300 font-medium flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-purple-400 shrink-0" />
                    7天周度额度
                  </span>
                  <span className="font-mono text-slate-200 font-bold ml-1">
                    剩余 {sevenDayRemainingPct}% <span className="text-[11px] text-slate-400 font-normal">({weeklyHealthLabel})</span>
                  </span>
                </div>

                {/* 7day Weekly Progress Bar for remaining */}
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-800/90 border border-slate-700/60">
                  <div
                    className={`h-full transition-all duration-300 ${getWeeklyBarColor(sevenDayRemainingPct)}`}
                    style={{ width: `${sevenDayRemainingPct}%` }}
                  />
                </div>

                {/* 7day Dedicated Reset Countdown */}
                <div className="mt-1 flex items-center gap-1 font-mono text-[11px]">
                  <span className="text-slate-400">周重置:</span>
                  <span className="text-purple-300 font-medium">
                    ⏱ {formatWeeklyCountdown(sevenDayCooldown)}
                  </span>
                  <span className="text-[10.5px] text-slate-500">
                    ({getWeeklyClockTime(sevenDayCooldown, sevenDayResetDesc)})
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Right Section: Status Pill & Action Buttons */}
      <div className="flex items-center gap-2.5 shrink-0 justify-end">
        {/* Status Pill - Strictly never show 主力 or 使用中 when unlogged */}
        {!isLoggedIn ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/90 border border-amber-500/40 px-3 py-1 text-xs font-semibold text-amber-300">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            未登录
          </span>
        ) : isActuallyActive ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 px-3 py-1 text-xs font-semibold text-blue-400">
            <span className="h-2 w-2 rounded-full bg-blue-400 animate-ping" />
            使用中
          </span>
        ) : isExhausted ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 px-3 py-1 text-xs font-semibold text-rose-400">
            <span className="h-2 w-2 rounded-full bg-rose-400" />
            已耗尽
          </span>
        ) : isWarning ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-400">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            即将耗尽
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            充盈
          </span>
        )}

        {/* Action: Switch to this Account OR Go to Login if Unlogged */}
        {!isLoggedIn ? (
          <button
            onClick={() => onAuthorize?.(account)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-3.5 py-1.5 text-xs font-semibold text-white transition-all shadow-md shadow-blue-900/30 active:scale-95 cursor-pointer"
            title="授权登录以激活此账号"
          >
            <Key className="h-3 w-3" />
            <span>去登录</span>
          </button>
        ) : !isActuallyActive ? (
          <button
            onClick={() => onSetAsActive(account.id)}
            disabled={isExhausted}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800/90 border border-slate-700/60 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-blue-600 hover:text-white hover:border-blue-500 transition-all shadow-sm active:scale-95 cursor-pointer"
            title="设为当前生效号源"
          >
            <Play className="h-3 w-3 fill-current" />
            <span>切号</span>
          </button>
        ) : (
          <div className="inline-flex items-center gap-1 rounded-xl bg-blue-600/20 border border-blue-500/30 px-3 py-1.5 text-xs font-semibold text-blue-300">
            <Check className="h-3.5 w-3.5 text-blue-400" />
            <span>主力</span>
          </div>
        )}

        {/* Action: Refresh Single Account */}
        <button
          onClick={() => onRefresh(account.id)}
          className="rounded-xl border border-slate-800 bg-[#121624] p-2 text-slate-400 hover:text-slate-100 hover:border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer"
          title="向官方端点实时刷新此账号额度"
        >
          <RotateCw className="h-3.5 w-3.5" />
        </button>

        {/* Action: Delete */}
        <button
          onClick={() => onDelete(account.id)}
          className="rounded-xl border border-slate-800 bg-[#121624] p-2 text-slate-500 hover:text-rose-400 hover:border-rose-900/60 hover:bg-rose-950/20 transition-colors cursor-pointer"
          title="移除此账号"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
