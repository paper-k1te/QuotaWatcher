import React from 'react';
import { 
  Clock, 
  Coins, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  RotateCw, 
  Check, 
  Zap,
  Play,
  Trash2
} from 'lucide-react';
import { Account, ProviderMeta } from '../types';
import { ProviderIcon } from './ProviderIcons';

interface Props {
  account: Account;
  providerMeta?: ProviderMeta;
  onRefresh: (id: string) => void;
  onSetAsActive: (id: string) => void;
  onDelete: (id: string) => void;
}

export const AccountRow: React.FC<Props> = ({
  account,
  providerMeta,
  onRefresh,
  onSetAsActive,
  onDelete,
}) => {
  const { latestSnapshot } = account;
  const isRolling = latestSnapshot?.kind === 'rolling_window';
  const isBalance = latestSnapshot?.kind === 'currency_balance';
  const isTier = latestSnapshot?.kind === 'periodic_tier';

  // Format countdown string
  const formatCountdown = (seconds: number) => {
    if (seconds <= 0) return '已可重置';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}时${m}分`;
    if (m > 0) return `${m}分${s}秒`;
    return `${s}秒`;
  };

  // Status computation
  const isExhausted = latestSnapshot?.isExhausted;
  const isWarning = latestSnapshot?.isWarning && !isExhausted;

  return (
    <div
      className={`group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-xl border p-3.5 transition-all duration-200 select-none ${
        account.isActiveInCCSwitch
          ? 'border-blue-500/50 bg-[#0f1526] shadow-lg shadow-blue-950/20 ring-1 ring-blue-500/30'
          : isExhausted
          ? 'border-rose-900/40 bg-[#140c11]/80 hover:border-rose-800/60'
          : 'border-slate-800/80 bg-[#0c0f18]/90 hover:bg-[#101422] hover:border-slate-700/80'
      }`}
    >
      {/* Left: Provider Icon & Account Info */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Brand/Platform Icon Badge */}
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-inner ${
            account.isActiveInCCSwitch
              ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
              : 'border-slate-700/60 bg-slate-800/60 text-slate-300'
          }`}
        >
          <ProviderIcon providerId={account.provider} className="h-5 w-5" />
        </div>

        {/* Account Name & Subtitles */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-100 text-sm tracking-tight truncate">
              {account.name}
            </h3>

            {/* CC-Switch Active Badge */}
            {account.isActiveInCCSwitch && (
              <span className="inline-flex items-center gap-1 rounded bg-blue-500/15 border border-blue-500/30 px-1.5 py-0.2 text-[10px] font-semibold text-blue-400 animate-pulse">
                <Zap className="w-2.5 h-2.5 fill-blue-400" />
                使用中
              </span>
            )}

            {/* Tags */}
            {account.tags.map((tag) => (
              <span
                key={tag}
                className="hidden md:inline-block rounded bg-slate-800/70 px-1.5 py-0.2 text-[10px] text-slate-400 border border-slate-700/40"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Model / Endpoint Subtitle */}
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400 truncate">
            {account.models && account.models.length > 0 ? (
              <span className="font-mono text-slate-400 truncate">
                {account.models.join(' · ')}
              </span>
            ) : (
              <span className="text-slate-500 font-mono">
                {providerMeta?.name || account.provider}
              </span>
            )}
            <span className="text-slate-600">·</span>
            <span className="text-slate-500">P{account.priority}</span>
          </div>
        </div>
      </div>

      {/* Middle: Quota Metrics & Progress Bar */}
      <div className="flex items-center gap-4 shrink-0 sm:px-2">
        {isRolling && latestSnapshot.rollingWindow && (
          <div className="flex flex-col items-start sm:items-end min-w-[140px]">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-mono font-bold text-slate-200">
                {latestSnapshot.rollingWindow.used} / {latestSnapshot.rollingWindow.total} 次
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                ({Math.round((latestSnapshot.rollingWindow.used / latestSnapshot.rollingWindow.total) * 100)}%)
              </span>
            </div>

            {/* Mini Progress Bar */}
            <div className="mt-1 h-1.5 w-32 overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full transition-all duration-300 ${
                  isExhausted
                    ? 'bg-rose-500'
                    : isWarning
                    ? 'bg-amber-500'
                    : 'bg-blue-500'
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    (latestSnapshot.rollingWindow.used / latestSnapshot.rollingWindow.total) * 100
                  )}%`,
                }}
              />
            </div>

            <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
              <Clock className="w-2.5 h-2.5 text-blue-400" />
              <span>{formatCountdown(latestSnapshot.rollingWindow.cooldownSecondsRemaining)}后重置</span>
            </div>
          </div>
        )}

        {isBalance && latestSnapshot.currencyBalance && (
          <div className="flex flex-col items-start sm:items-end min-w-[130px]">
            <div className="flex items-baseline gap-1">
              <span className="text-xs text-slate-400">余额</span>
              <span className="text-sm font-bold font-mono text-emerald-400">
                {latestSnapshot.currencyBalance.currency === 'USD' ? '$' : '¥'}
                {latestSnapshot.currencyBalance.balance.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {latestSnapshot.currencyBalance.currency}
              </span>
            </div>
            {latestSnapshot.currencyBalance.grantedAmount !== undefined && (
              <span className="text-[10px] text-slate-400 mt-0.5">
                含赠金: {latestSnapshot.currencyBalance.currency === 'USD' ? '$' : '¥'}
                {latestSnapshot.currencyBalance.grantedAmount.toFixed(2)}
              </span>
            )}
          </div>
        )}

        {isTier && latestSnapshot.periodicTier && (
          <div className="flex flex-col items-start sm:items-end min-w-[130px]">
            <div className="text-xs font-mono font-bold text-slate-200">
              {latestSnapshot.periodicTier.used} / {latestSnapshot.periodicTier.limit} {latestSnapshot.periodicTier.unit}
            </div>
            <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-sky-500"
                style={{
                  width: `${Math.min(
                    100,
                    (latestSnapshot.periodicTier.used / latestSnapshot.periodicTier.limit) * 100
                  )}%`,
                }}
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5">次日自动刷新</span>
          </div>
        )}
      </div>

      {/* Right: Status Pill & Actions (Aligned with CCSwitch) */}
      <div className="flex items-center gap-2 shrink-0 justify-end border-t sm:border-t-0 border-slate-800/60 pt-2 sm:pt-0">
        {/* Status Pill */}
        {account.isActiveInCCSwitch ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 px-2.5 py-1 text-xs font-medium text-blue-400">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-ping" />
            使用中
          </span>
        ) : isExhausted ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-1 text-xs font-medium text-rose-400">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            已耗尽
          </span>
        ) : isWarning ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-xs font-medium text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            即将耗尽
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-xs font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            充盈待命
          </span>
        )}

        {/* Action: Switch to this Account (CC-Switch) */}
        {!account.isActiveInCCSwitch ? (
          <button
            onClick={() => onSetAsActive(account.id)}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-800/80 border border-slate-700/60 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-blue-600 hover:text-white hover:border-blue-500 transition-all shadow-sm"
            title="设为 CC-Switch 当前生效账号"
          >
            <Play className="h-3 w-3 fill-current" />
            <span>切至此号</span>
          </button>
        ) : (
          <div className="inline-flex items-center gap-1 rounded-lg bg-blue-600/20 border border-blue-500/30 px-2.5 py-1 text-xs font-medium text-blue-300">
            <Check className="h-3 w-3 text-blue-400" />
            <span>主力</span>
          </div>
        )}

        {/* Action: Refresh */}
        <button
          onClick={() => onRefresh(account.id)}
          className="rounded-lg border border-slate-800 bg-[#121624] p-1.5 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
          title="刷新额度"
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
