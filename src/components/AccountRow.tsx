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
  Coins
} from 'lucide-react';
import { Account, ProviderMeta } from '../types';
import { ProviderIcon } from './ProviderIcons';

interface Props {
  account: Account;
  providerMeta?: ProviderMeta;
  onRefresh: (id: string) => void;
  onSetAsActive: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateAccount?: (id: string, updates: Partial<Account>) => void;
  onCopyEndpoint?: (text: string) => void;
}

export const AccountRow: React.FC<Props> = ({
  account,
  onRefresh,
  onSetAsActive,
  onDelete,
  onUpdateAccount,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(account.name);

  const { latestSnapshot } = account;
  const isBalance = latestSnapshot?.kind === 'currency_balance' && !!latestSnapshot.currencyBalance;

  // Format 5h short countdown: e.g. "2h29m" or "41分"
  const format5hCountdown = (seconds: number) => {
    if (seconds <= 0) return '可刷新';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h${m}m`;
    if (m > 0) return `${m}分`;
    return `${s}秒`;
  };

  // Format 7day / weekly countdown: e.g. "4天18h" or "18h30m"
  const formatWeeklyCountdown = (seconds: number) => {
    if (seconds <= 0) return '周度已重置';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}天${h}h`;
    if (h > 0) return `${h}h${m}分`;
    return `${m}分`;
  };

  // Target wall-clock time for 5h reset: e.g. "02:54"
  const get5hClockTime = (seconds: number) => {
    const target = new Date(Date.now() + seconds * 1000);
    const hh = String(target.getHours()).padStart(2, '0');
    const mm = String(target.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  // Target clock for 7day reset: e.g. "周一 00:00"
  const getWeeklyClockTime = (seconds: number, defaultResetsAt?: string) => {
    if (defaultResetsAt) return defaultResetsAt;
    const target = new Date(Date.now() + seconds * 1000);
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const hh = String(target.getHours()).padStart(2, '0');
    const mm = String(target.getMinutes()).padStart(2, '0');
    return `${days[target.getDay()]} ${hh}:${mm}`;
  };

  // Status computation
  const isExhausted = latestSnapshot?.isExhausted;
  const isWarning = latestSnapshot?.isWarning && !isExhausted;

  // 5h Quota calculation
  const rollingWindow = latestSnapshot?.rollingWindow;
  const rollingUsed = rollingWindow?.used ?? (account.provider === 'deepseek' ? 6 : 12);
  const rollingTotal = rollingWindow?.total ?? (account.provider === 'chatgpt' ? 80 : 50);
  const rollingPct = Math.min(100, Math.round((rollingUsed / rollingTotal) * 100));
  const rollingCooldown = rollingWindow?.cooldownSecondsRemaining ?? 7200;

  // 7day Quota calculation
  const sevenDayQuota = latestSnapshot?.sevenDayQuota;
  const sevenDayPct = sevenDayQuota?.usedPercent ?? (account.provider === 'deepseek' ? 18 : 25);
  const sevenDayCooldown = sevenDayQuota?.cooldownSecondsRemaining ?? (3600 * 24 * 4 + 3600 * 18); // Default ~4d 18h
  const sevenDayResetDesc = sevenDayQuota?.resetsAt || '周一 00:00';

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
    if (p.includes('pro')) return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
    if (p.includes('plus')) return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    if (p.includes('business') || p.includes('bussiness')) return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
    if (p.includes('team')) return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    return 'bg-slate-800 text-slate-300 border-slate-700/60';
  };

  return (
    <div
      className={`group relative flex items-center justify-between gap-3 sm:gap-4 rounded-xl border px-3.5 py-3 transition-all duration-150 select-none ${
        account.isActiveInCCSwitch
          ? 'border-blue-500/50 bg-[#0d1326] shadow-lg shadow-blue-950/20 ring-1 ring-blue-500/30'
          : isExhausted
          ? 'border-rose-900/40 bg-[#140b10]/90 hover:border-rose-800/60'
          : 'border-slate-800/80 bg-[#0a0d16]/95 hover:bg-[#0f1424] hover:border-slate-700/80'
      }`}
    >
      {/* 1. Left Section: Icon + Nickname (editable) + Plan Badge + Expiration + Email */}
      <div className="flex items-center gap-3 min-w-0 flex-1 lg:max-w-[380px]">
        {/* Brand Vector Icon (34x34) */}
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors shadow-sm ${
            account.isActiveInCCSwitch
              ? 'border-blue-500/50 bg-blue-500/15 text-blue-400'
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
                  className="rounded border border-blue-500 bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
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
                  className="font-bold text-slate-100 text-[14px] tracking-tight truncate cursor-pointer hover:text-blue-300 transition-colors"
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

            {/* Plan Tier Badge (Plus / Pro / DeepSeek-V3 / R1 / Business / Team) */}
            {(account.planName || latestSnapshot?.planName) && (
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold border ${getPlanBadgeClass(
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
          <div className="flex items-center gap-1.5 text-[11.5px] text-slate-400 font-mono truncate mt-0.5">
            <span className="truncate text-slate-400">
              {account.email || `${account.id.toLowerCase()}@official`}
            </span>
            {account.lastLoginAt && (
              <>
                <span className="text-slate-600">·</span>
                <span className="text-slate-500 text-[11px] truncate">{account.lastLoginAt}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. Middle Section: TWO DISTINCT COLUMNS (5h Quota + 7day Quota with SEPARATE RESET TIMERS) */}
      <div className="hidden md:flex items-center gap-5 lg:gap-8 shrink-0">
        {/* Column A: 5h 滚动额度 (指标 + 进度条 + 独立重置时间) */}
        <div className="flex flex-col min-w-[130px] lg:min-w-[145px]">
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-slate-400 font-medium">5h 额度</span>
            <span className="font-mono text-slate-200 font-semibold ml-1">
              {rollingUsed}/{rollingTotal} <span className="text-[11px] text-slate-400 font-normal">({rollingPct}%)</span>
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800/90 border border-slate-700/50">
            <div
              className={`h-full transition-all duration-300 ${
                isExhausted ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-blue-500'
              }`}
              style={{ width: `${rollingPct}%` }}
            />
          </div>

          {/* 5h Dedicated Reset Countdown */}
          <div className="mt-1 flex items-center gap-1 font-mono text-[11px]">
            <Clock className="w-3 h-3 text-blue-400 shrink-0" />
            <span className={isExhausted ? 'text-rose-400 font-semibold' : 'text-slate-300'}>
              {format5hCountdown(rollingCooldown)}
            </span>
            <span className="text-[10px] text-slate-500">
              ({get5hClockTime(rollingCooldown)})
            </span>
          </div>
        </div>

        {/* Column B: 7day 周额度 / 余额 (指标 + 进度条 + 独立周重置时间) */}
        <div className="flex flex-col min-w-[135px] lg:min-w-[155px]">
          {isBalance && latestSnapshot?.currencyBalance ? (
            /* Custom API Currency Balance */
            <>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-slate-400 font-medium">可用余额</span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {latestSnapshot.currencyBalance.currency === 'USD' ? '$' : '¥'}
                  {latestSnapshot.currencyBalance.balance.toFixed(2)}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                <Coins className="w-3 h-3 text-emerald-400" />
                <span>实时扣费 · 无周期限制</span>
              </div>
              <div className="mt-1 text-[10px] text-slate-500 font-mono">
                API 实时按量计费
              </div>
            </>
          ) : (
            /* Weekly 7-Day Quota */
            <>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-slate-400 font-medium">7day 周额度</span>
                <span className="font-mono text-slate-200 font-semibold ml-1">
                  {sevenDayPct}% <span className="text-[11px] text-slate-400 font-normal">(充沛)</span>
                </span>
              </div>

              {/* Weekly Progress Bar */}
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800/90 border border-slate-700/50">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${sevenDayPct}%` }}
                />
              </div>

              {/* 7day Dedicated Reset Countdown */}
              <div className="mt-1 flex items-center gap-1 font-mono text-[11px]">
                <Clock className="w-3 h-3 text-purple-400 shrink-0" />
                <span className="text-slate-300">
                  {formatWeeklyCountdown(sevenDayCooldown)}
                </span>
                <span className="text-[10px] text-slate-500">
                  ({getWeeklyClockTime(sevenDayCooldown, sevenDayResetDesc)})
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 3. Right Section: Status Pill & Action Buttons */}
      <div className="flex items-center gap-2 shrink-0 justify-end">
        {/* Status Pill */}
        {account.isActiveInCCSwitch ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 px-2.5 py-1 text-xs font-semibold text-blue-400">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-ping" />
            使用中
          </span>
        ) : isExhausted ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-1 text-xs font-semibold text-rose-400">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            已耗尽
          </span>
        ) : isWarning ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-xs font-semibold text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            即将耗尽
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-xs font-semibold text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            充盈
          </span>
        )}

        {/* Action: Switch to this Account */}
        {!account.isActiveInCCSwitch ? (
          <button
            onClick={() => onSetAsActive(account.id)}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-800/90 border border-slate-700/60 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-blue-600 hover:text-white hover:border-blue-500 transition-all shadow-sm"
            title="设为当前生效号源"
          >
            <Play className="h-3 w-3 fill-current" />
            <span>切号</span>
          </button>
        ) : (
          <div className="inline-flex items-center gap-1 rounded-lg bg-blue-600/20 border border-blue-500/30 px-3 py-1.5 text-xs font-semibold text-blue-300">
            <Check className="h-3 w-3 text-blue-400" />
            <span>主力</span>
          </div>
        )}

        {/* Action: Refresh Single Account */}
        <button
          onClick={() => onRefresh(account.id)}
          className="rounded-lg border border-slate-800 bg-[#121624] p-2 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
          title="刷新此账号额度"
        >
          <RotateCw className="h-3.5 w-3.5" />
        </button>

        {/* Action: Delete */}
        <button
          onClick={() => onDelete(account.id)}
          className="rounded-lg border border-slate-800 bg-[#121624] p-2 text-slate-500 hover:text-rose-400 hover:border-rose-900/60 transition-colors"
          title="移除此账号"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
