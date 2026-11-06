import React, { useState } from 'react';
import { 
  Clock, 
  Coins, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  RotateCw, 
  Check, 
  Edit2,
  Calendar,
  X,
  Play,
  Trash2
} from 'lucide-react';
import { Account } from '../types';
import { ProviderIcon } from './ProviderIcons';

interface Props {
  account: Account;
  onRefresh: (id: string) => void;
  onSetAsActive: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateAccount?: (id: string, updates: Partial<Account>) => void;
}

export const AccountCard: React.FC<Props> = ({
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

  // Format 5h short countdown
  const format5hCountdown = (seconds: number) => {
    if (seconds <= 0) return '已可刷新使用';
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

  // 5h Quota
  const rollingWindow = latestSnapshot?.rollingWindow;
  const rollingUsed = rollingWindow?.used ?? (account.provider === 'deepseek' ? 6 : 12);
  const rollingTotal = rollingWindow?.total ?? (account.provider === 'chatgpt' ? 80 : 50);
  const rollingPct = Math.min(100, Math.round((rollingUsed / rollingTotal) * 100));
  const rollingCooldown = rollingWindow?.cooldownSecondsRemaining ?? 7200;

  // 7day Quota
  const sevenDayQuota = latestSnapshot?.sevenDayQuota;
  const sevenDayPct = sevenDayQuota?.usedPercent ?? (account.provider === 'deepseek' ? 18 : 25);
  const sevenDayCooldown = sevenDayQuota?.cooldownSecondsRemaining ?? (3600 * 24 * 4 + 3600 * 18);
  const sevenDayResetDesc = sevenDayQuota?.resetsAt || '周一 00:00';

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
    if (p.includes('pro')) return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
    if (p.includes('plus')) return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    if (p.includes('business') || p.includes('bussiness')) return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
    if (p.includes('team')) return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    return 'bg-slate-800 text-slate-300 border-slate-700/60';
  };

  return (
    <div className={`relative flex flex-col justify-between rounded-2xl border p-4.5 transition-all duration-200 hover:shadow-xl ${
      account.isActiveInCCSwitch
        ? 'border-blue-500/60 bg-gradient-to-b from-[#11182c] to-[#0c101e] shadow-blue-900/15 ring-1 ring-blue-500/30'
        : isExhausted
        ? 'border-rose-900/40 bg-gradient-to-b from-[#180f14] to-[#120a0e]'
        : 'border-slate-800/80 bg-[#0d101a]/95 hover:border-slate-700 hover:bg-[#101424]'
    }`}>
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
              account.isActiveInCCSwitch
                ? 'border-blue-500/50 bg-blue-500/15 text-blue-400'
                : 'border-slate-700/60 bg-slate-800/60 text-slate-300'
            }`}>
              <ProviderIcon providerId={account.provider} className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
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
                  <div className="flex items-center gap-1 min-w-0">
                    <h3
                      onClick={() => setIsEditingName(true)}
                      className="font-bold text-slate-100 text-[14px] tracking-tight hover:text-blue-300 cursor-pointer truncate"
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
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-semibold border ${getPlanBadgeClass(
                    account.planName || latestSnapshot?.planName || ''
                  )}`}>
                    {account.planName || latestSnapshot?.planName}
                  </span>
                )}
              </div>

              {/* Expiration date */}
              {account.planExpiresAt && (
                <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 mt-0.5">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  <span>订阅到期: {account.planExpiresAt}</span>
                </div>
              )}
            </div>
          </div>

          {/* Status Pill */}
          <div className="flex items-center gap-1.5 shrink-0">
            {account.isActiveInCCSwitch ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 text-xs font-semibold text-blue-400">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-ping" />
                使用中
              </span>
            ) : isExhausted ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-xs font-semibold text-rose-400">
                <XCircle className="w-3 h-3 text-rose-400" />
                已耗尽
              </span>
            ) : isWarning ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-xs font-semibold text-amber-400">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                即将耗尽
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                充盈
              </span>
            )}
          </div>
        </div>

        {/* Email & Last Update */}
        <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span className="truncate text-slate-400">{account.email || `${account.id.toLowerCase()}@official`}</span>
          <span className="text-[11px] text-slate-500 shrink-0 ml-1">{account.lastLoginAt || '刚刚'}</span>
        </div>

        {/* Content Body with SEPARATED 5h and 7day Quota Blocks */}
        <div className="my-3 space-y-2.5">
          {/* Block 1: 5h 滚动额度 */}
          <div className="rounded-xl bg-[#080b13] p-3 border border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
              <span className="flex items-center gap-1 text-slate-400 font-medium">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                5小时滚动额度
              </span>
              <span className="font-mono font-semibold text-slate-200">
                {rollingUsed} / {rollingTotal} 次 <span className="text-[11px] text-slate-400">({rollingPct}%)</span>
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800/80 border border-slate-700/50">
              <div
                className={`h-full transition-all duration-300 ${
                  isExhausted ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-blue-500'
                }`}
                style={{ width: `${rollingPct}%` }}
              />
            </div>

            {/* 5h Reset Countdown */}
            <div className="mt-2 flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">5h 重置倒计时:</span>
              <span className={isExhausted ? 'text-rose-400 font-semibold' : 'text-blue-300 font-medium'}>
                ⏱ {format5hCountdown(rollingCooldown)} ({get5hClockTime(rollingCooldown)})
              </span>
            </div>
          </div>

          {/* Block 2: 7day 周额度 / 余额 */}
          <div className="rounded-xl bg-[#080b13] p-3 border border-slate-800/80">
            {isBalance && latestSnapshot?.currencyBalance ? (
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="flex items-center gap-1 font-medium">
                    <Coins className="w-3.5 h-3.5 text-emerald-400" />
                    可用账户余额
                  </span>
                  <span className="text-sm font-mono font-bold text-emerald-400">
                    {latestSnapshot.currencyBalance.currency === 'USD' ? '$' : '¥'}
                    {latestSnapshot.currencyBalance.balance.toFixed(2)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>计费模式:</span>
                  <span className="text-slate-300">API 实时扣费 · 无周期限制</span>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
                  <span className="flex items-center gap-1 text-slate-400 font-medium">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    7天周度额度
                  </span>
                  <span className="font-mono font-semibold text-slate-200">
                    {sevenDayPct}% <span className="text-[11px] text-slate-400 font-normal">(充沛)</span>
                  </span>
                </div>

                {/* Weekly progress bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800/80 border border-slate-700/50">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                    style={{ width: `${sevenDayPct}%` }}
                  />
                </div>

                {/* 7day Reset Countdown */}
                <div className="mt-2 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">周重置倒计时:</span>
                  <span className="text-purple-300 font-medium">
                    ⏱ {formatWeeklyCountdown(sevenDayCooldown)} ({getWeeklyClockTime(sevenDayCooldown, sevenDayResetDesc)})
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-1 flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs">
        <button
          onClick={() => onRefresh(account.id)}
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors"
          title="刷新额度"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>刷新</span>
        </button>

        <div className="flex items-center gap-2">
          {!account.isActiveInCCSwitch ? (
            <button
              onClick={() => onSetAsActive(account.id)}
              disabled={isExhausted}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600/90 hover:bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>切至此号</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-1 rounded-lg bg-blue-600/20 border border-blue-500/30 px-3 py-1.5 text-xs font-semibold text-blue-300">
              <Check className="w-3 h-3 text-blue-400" />
              <span>当前主力</span>
            </div>
          )}
          
          <button
            onClick={() => onDelete(account.id)}
            className="rounded-lg border border-slate-800 bg-[#121624] p-1.5 text-slate-500 hover:text-rose-400 hover:border-rose-900/60 transition-colors"
            title="移除此账号"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
