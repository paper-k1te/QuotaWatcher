import React, { useState } from 'react';
import { 
  Clock, 
  RotateCw, 
  Check, 
  Play, 
  Trash2, 
  Edit2, 
  Calendar, 
  X 
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
  const isRolling = latestSnapshot?.kind === 'rolling_window' && !!latestSnapshot.rollingWindow;
  const isBalance = latestSnapshot?.kind === 'currency_balance' && !!latestSnapshot.currencyBalance;
  const isTier = latestSnapshot?.kind === 'periodic_tier' && !!latestSnapshot.periodicTier;

  // Format countdown string: e.g. "1h28m" or "41m"
  const formatCountdown = (seconds: number) => {
    if (seconds <= 0) return '可重置';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h${m}m`;
    if (m > 0) return `${m}分`;
    return `${s}秒`;
  };

  // Calculate target reset wall-clock time string: e.g. "01:23"
  const getResetClockTime = (seconds: number) => {
    const target = new Date(Date.now() + seconds * 1000);
    const hh = String(target.getHours()).padStart(2, '0');
    const mm = String(target.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  // Status computation
  const isExhausted = latestSnapshot?.isExhausted;
  const isWarning = latestSnapshot?.isWarning && !isExhausted;

  // 5h Quota calculation
  const rollingWindow = latestSnapshot?.rollingWindow;
  const rollingUsed = rollingWindow?.used ?? 0;
  const rollingTotal = rollingWindow?.total ?? 1;
  const rollingPct = Math.min(100, Math.round((rollingUsed / rollingTotal) * 100));

  // 7day Quota calculation
  const sevenDayQuota = latestSnapshot?.sevenDayQuota;
  const sevenDayPct = sevenDayQuota?.usedPercent ?? (latestSnapshot?.secondaryTiers?.[0]?.utilization);

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
    if (p.includes('pro')) return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
    if (p.includes('plus')) return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    if (p.includes('business') || p.includes('bussiness')) return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
    if (p.includes('team')) return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    return 'bg-slate-800 text-slate-300 border-slate-700/60';
  };

  return (
    <div
      className={`group relative flex items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-all duration-150 select-none ${
        account.isActiveInCCSwitch
          ? 'border-blue-500/50 bg-[#0d1324] shadow-md shadow-blue-950/20 ring-1 ring-blue-500/30'
          : isExhausted
          ? 'border-rose-900/40 bg-[#130b10]/90 hover:border-rose-800/60'
          : 'border-slate-800/80 bg-[#0a0d16]/90 hover:bg-[#0e1220] hover:border-slate-700/80'
      }`}
    >
      {/* 1. Left Section: Icon + Nickname (editable) + Plan Badge + Expiration + Email */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1 lg:max-w-[420px]">
        {/* Brand Vector Icon (Compact 30x30) */}
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors ${
            account.isActiveInCCSwitch
              ? 'border-blue-500/50 bg-blue-500/15 text-blue-400'
              : 'border-slate-700/60 bg-slate-800/60 text-slate-300 group-hover:border-slate-600'
          }`}
        >
          <ProviderIcon providerId={account.provider} className="h-4.5 w-4.5" />
        </div>

        {/* Identity & Editable Name */}
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
                  className="rounded border border-blue-500 bg-slate-900 px-1.5 py-0.5 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
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
                <span
                  onClick={() => setIsEditingName(true)}
                  className="font-semibold text-slate-100 text-[13.5px] tracking-tight truncate cursor-pointer hover:text-blue-300 transition-colors"
                  title="点击修改昵称"
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

            {/* Plan Tier Badge (Plus / Pro / Pro 5x / Business / Team) */}
            {(account.planName || latestSnapshot?.planName) && (
              <span
                className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold border ${getPlanBadgeClass(
                  account.planName || latestSnapshot?.planName || ''
                )}`}
              >
                {account.planName || latestSnapshot?.planName}
              </span>
            )}

            {/* Plan Expiration Date (顺便写上到期时间) */}
            {account.planExpiresAt && (
              <span
                className="hidden xl:inline-flex items-center gap-1 text-[10px] font-mono text-slate-400 bg-slate-800/50 px-1.5 py-0.2 rounded border border-slate-700/40"
                title={`订阅有效至: ${account.planExpiresAt}`}
              >
                <Calendar className="w-2.5 h-2.5 text-slate-500" />
                <span>到期: {account.planExpiresAt}</span>
              </span>
            )}
          </div>

          {/* Email line */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono truncate">
            <span className="truncate text-slate-400">
              {account.email || `${account.id.toLowerCase()}@official`}
            </span>
            {account.lastLoginAt && (
              <>
                <span className="text-slate-600">·</span>
                <span className="text-slate-500 text-[10px] truncate">{account.lastLoginAt}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. Middle Section: Compact Quotas & Countdown */}
      <div className="hidden md:flex items-center gap-4 lg:gap-6 shrink-0 text-xs">
        {/* 5h 额度 */}
        <div className="flex flex-col min-w-[90px]">
          <div className="flex items-baseline justify-between text-[11px] text-slate-400">
            <span>5h 额度</span>
            {isRolling && (
              <span className="font-mono text-slate-200 ml-1">
                {rollingUsed}/{rollingTotal}
              </span>
            )}
          </div>
          {isRolling && rollingWindow ? (
            <div className="mt-1 flex items-center gap-1.5">
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-800 border border-slate-700/50">
                <div
                  className={`h-full transition-all duration-300 ${
                    isExhausted ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-blue-500'
                  }`}
                  style={{ width: `${rollingPct}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-slate-400">{rollingPct}%</span>
            </div>
          ) : isTier && latestSnapshot?.periodicTier ? (
            <span className="text-[11px] font-mono text-slate-300 mt-0.5">
              {latestSnapshot.periodicTier.used}/{latestSnapshot.periodicTier.limit}
            </span>
          ) : (
            <span className="text-[11px] font-mono text-slate-500 mt-0.5">—</span>
          )}
        </div>

        {/* 7day 额度 / 余额 */}
        <div className="flex flex-col min-w-[90px]">
          <div className="flex items-baseline justify-between text-[11px] text-slate-400">
            <span>7day / 余额</span>
            {sevenDayPct !== undefined && (
              <span className="font-mono text-slate-200 ml-1">{sevenDayPct}%</span>
            )}
          </div>
          {sevenDayPct !== undefined ? (
            <div className="mt-1 flex items-center gap-1.5">
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-800 border border-slate-700/50">
                <div
                  className="h-full bg-indigo-500 transition-all duration-300"
                  style={{ width: `${sevenDayPct}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-slate-400">周度</span>
            </div>
          ) : isBalance && latestSnapshot?.currencyBalance ? (
            <span className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
              {latestSnapshot.currencyBalance.currency === 'USD' ? '$' : '¥'}
              {latestSnapshot.currencyBalance.balance.toFixed(2)}
            </span>
          ) : (
            <span className="text-[11px] font-mono text-slate-500 mt-0.5">—</span>
          )}
        </div>

        {/* 重置时间 */}
        <div className="flex flex-col min-w-[100px]">
          <span className="text-[11px] text-slate-400">重置时间</span>
          {isRolling && rollingWindow ? (
            <div className="mt-0.5 flex items-center gap-1 font-mono text-xs">
              <Clock className="w-3 h-3 text-blue-400 shrink-0" />
              <span className={isExhausted ? 'text-rose-400 font-semibold' : 'text-slate-200'}>
                {formatCountdown(rollingWindow.cooldownSecondsRemaining)}
              </span>
              <span className="text-[10px] text-slate-500">
                ({getResetClockTime(rollingWindow.cooldownSecondsRemaining)})
              </span>
            </div>
          ) : isTier ? (
            <span className="text-[11px] font-mono text-slate-300 mt-0.5">次日 00:00</span>
          ) : (
            <span className="text-[11px] font-mono text-emerald-400 mt-0.5">实时按量</span>
          )}
        </div>
      </div>

      {/* 3. Right Section: Status Pill & Action Buttons */}
      <div className="flex items-center gap-1.5 shrink-0 justify-end">
        {/* Status Pill */}
        {account.isActiveInCCSwitch ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 text-[11px] font-semibold text-blue-400">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-ping" />
            使用中
          </span>
        ) : isExhausted ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[11px] font-semibold text-rose-400">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            已耗尽
          </span>
        ) : isWarning ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[11px] font-semibold text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            即将耗尽
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            充盈
          </span>
        )}

        {/* Action: Switch to this Account */}
        {!account.isActiveInCCSwitch ? (
          <button
            onClick={() => onSetAsActive(account.id)}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-800/90 border border-slate-700/60 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-blue-600 hover:text-white hover:border-blue-500 transition-all shadow-sm"
            title="设为当前生效号源"
          >
            <Play className="h-3 w-3 fill-current" />
            <span>切号</span>
          </button>
        ) : (
          <div className="inline-flex items-center gap-1 rounded-lg bg-blue-600/20 border border-blue-500/30 px-2.5 py-1 text-xs font-medium text-blue-300">
            <Check className="h-3 w-3 text-blue-400" />
            <span>主力</span>
          </div>
        )}

        {/* Action: Refresh Single Account */}
        <button
          onClick={() => onRefresh(account.id)}
          className="rounded-lg border border-slate-800 bg-[#121624] p-1.5 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
          title="刷新此账号额度"
        >
          <RotateCw className="h-3.5 w-3.5" />
        </button>

        {/* Action: Delete */}
        <button
          onClick={() => onDelete(account.id)}
          className="rounded-lg border border-slate-800 bg-[#121624] p-1.5 text-slate-500 hover:text-rose-400 hover:border-rose-900/60 transition-colors"
          title="移除此账号"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
