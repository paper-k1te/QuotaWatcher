import React, { useState } from 'react';
import { 
  Clock, 
  RotateCw, 
  Check, 
  Zap,
  Play,
  Trash2,
  Copy,
  CheckCheck,
  AlertTriangle,
  TrendingDown,
  Calendar,
  Sparkles
} from 'lucide-react';
import { Account, ProviderMeta } from '../types';
import { ProviderIcon } from './ProviderIcons';

interface Props {
  account: Account;
  providerMeta?: ProviderMeta;
  onRefresh: (id: string) => void;
  onSetAsActive: (id: string) => void;
  onDelete: (id: string) => void;
  onCopyEndpoint?: (text: string) => void;
}

export const AccountRow: React.FC<Props> = ({
  account,
  providerMeta,
  onRefresh,
  onSetAsActive,
  onDelete,
  onCopyEndpoint,
}) => {
  const [copied, setCopied] = useState(false);
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

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const copyText = account.endpoint || (account.models && account.models[0]) || account.name;
    navigator.clipboard.writeText(copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (onCopyEndpoint) {
      onCopyEndpoint(copyText);
    }
  };

  return (
    <div
      className={`group relative flex flex-col md:flex-row md:items-center justify-between gap-3.5 rounded-xl border p-3.5 transition-all duration-200 select-none ${
        account.isActiveInCCSwitch
          ? 'border-blue-500/60 bg-[#0f1528] shadow-lg shadow-blue-950/30 ring-1 ring-blue-500/40'
          : isExhausted
          ? 'border-rose-900/40 bg-[#140c11]/85 hover:border-rose-800/60'
          : 'border-slate-800/80 bg-[#0c0f18]/90 hover:bg-[#101422] hover:border-slate-700/80'
      }`}
    >
      {/* Left: Provider Icon & Account Info */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Brand/Platform Icon Badge */}
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-inner transition-colors ${
            account.isActiveInCCSwitch
              ? 'border-blue-500/50 bg-blue-500/15 text-blue-400'
              : 'border-slate-700/60 bg-slate-800/60 text-slate-300 group-hover:border-slate-600'
          }`}
        >
          <ProviderIcon providerId={account.provider} className="h-5 w-5" />
        </div>

        {/* Account Name & Subtitles */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-100 text-[15px] tracking-tight truncate">
              {account.name}
            </h3>

            {/* CC-Switch Active Badge */}
            {account.isActiveInCCSwitch && (
              <span className="inline-flex items-center gap-1 rounded bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 text-[11px] font-semibold text-blue-400 animate-pulse">
                <Zap className="w-3 h-3 fill-blue-400" />
                使用中
              </span>
            )}

            {/* Plan Badge (Pro / Team / Plus / API) */}
            {(account.planName || latestSnapshot?.planName) && (
              <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 text-[11px] font-medium text-amber-300">
                <Sparkles className="w-2.5 h-2.5" />
                {account.planName || latestSnapshot?.planName}
              </span>
            )}

            {/* Classification Badge (官方直连 vs 中转聚合) */}
            <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded border ${
              account.classification === 'official' || account.provider === 'claude' || account.provider === 'chatgpt' || account.provider === 'gemini'
                ? 'bg-slate-800/90 text-slate-300 border-slate-700/60'
                : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
            }`}>
              {account.classification === 'official' || account.provider === 'claude' || account.provider === 'chatgpt' || account.provider === 'gemini'
                ? '官方直连'
                : '中转聚合'}
            </span>

            {/* Tags */}
            {account.tags.map((tag) => (
              <span
                key={tag}
                className="hidden lg:inline-block rounded bg-slate-800/60 px-1.5 py-0.2 text-[10px] text-slate-400 border border-slate-700/30"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Model / Endpoint Subtitle */}
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-400 truncate">
            {account.models && account.models.length > 0 ? (
              <span className="font-mono text-slate-300 truncate">
                {account.models.join(' · ')}
              </span>
            ) : (
              <span className="text-slate-400 font-mono">
                {providerMeta?.name || account.provider}
              </span>
            )}
            <span className="text-slate-600">·</span>
            <span className="text-slate-400 font-medium">优先级 P{account.priority}</span>
            {account.endpoint && (
              <>
                <span className="text-slate-600">·</span>
                <span className="font-mono text-slate-500 truncate max-w-[180px]">{account.endpoint}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Middle: REAL-TIME QUOTA SENTINEL (Core Identity - Multi-Tier Progress & Countdown) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0 sm:px-3 border-t md:border-t-0 border-slate-800/60 pt-2.5 md:pt-0">
        {/* Tier 1: 5-Hour Dynamic Rolling Window Quota */}
        {isRolling && latestSnapshot.rollingWindow && (
          <div className="flex flex-col items-start sm:items-end min-w-[160px]">
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-xs text-slate-400 font-medium">5h 滚动</span>
              <span className="font-mono font-bold text-slate-100">
                {latestSnapshot.rollingWindow.used} / {latestSnapshot.rollingWindow.total} 次
              </span>
              <span className="text-xs text-slate-400 font-mono">
                ({Math.round((latestSnapshot.rollingWindow.used / latestSnapshot.rollingWindow.total) * 100)}%)
              </span>
            </div>

            {/* Primary Progress Bar */}
            <div className="mt-1.5 h-2 w-36 overflow-hidden rounded-full bg-slate-800 border border-slate-700/40">
              <div
                className={`h-full transition-all duration-300 ${
                  isExhausted
                    ? 'bg-rose-500 shadow-sm shadow-rose-500/50'
                    : isWarning
                    ? 'bg-amber-500 shadow-sm shadow-amber-500/50'
                    : 'bg-blue-500 shadow-sm shadow-blue-500/50'
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    (latestSnapshot.rollingWindow.used / latestSnapshot.rollingWindow.total) * 100
                  )}%`,
                }}
              />
            </div>

            {/* Live Ticking Countdown */}
            <div className="mt-1 flex items-center gap-1 text-[11px] font-mono">
              <Clock className="w-3 h-3 text-blue-400 shrink-0" />
              <span className={isExhausted ? 'text-rose-400 font-semibold' : 'text-slate-300'}>
                {formatCountdown(latestSnapshot.rollingWindow.cooldownSecondsRemaining)}后重置
              </span>
            </div>

            {/* Secondary Tier: Weekly quota if available */}
            {latestSnapshot.secondaryTiers && latestSnapshot.secondaryTiers.length > 0 && (
              <div className="mt-1 flex items-center gap-1.5 text-[10.5px] text-slate-400 font-mono">
                <Calendar className="w-2.5 h-2.5 text-slate-500" />
                <span>{latestSnapshot.secondaryTiers[0].name}: {latestSnapshot.secondaryTiers[0].utilization}%</span>
              </div>
            )}
          </div>
        )}

        {/* Currency Balance Tier (USD / CNY) */}
        {isBalance && latestSnapshot.currencyBalance && (
          <div className="flex flex-col items-start sm:items-end min-w-[130px]">
            <div className="flex items-baseline gap-1">
              <span className="text-xs text-slate-400 font-medium">可用余额</span>
              <span className="text-base font-bold font-mono text-emerald-400">
                {latestSnapshot.currencyBalance.currency === 'USD' ? '$' : '¥'}
                {latestSnapshot.currencyBalance.balance.toFixed(2)}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {latestSnapshot.currencyBalance.currency}
              </span>
            </div>
            {latestSnapshot.currencyBalance.grantedAmount !== undefined && (
              <span className="text-[11px] text-slate-400 mt-0.5 font-mono">
                含赠金: {latestSnapshot.currencyBalance.currency === 'USD' ? '$' : '¥'}
                {latestSnapshot.currencyBalance.grantedAmount.toFixed(2)}
              </span>
            )}
            <span className="text-[10px] text-emerald-500/90 font-medium mt-0.5">
              ● API 实时按量计费
            </span>
          </div>
        )}

        {/* Periodic Tier (Daily limits) */}
        {isTier && latestSnapshot.periodicTier && (
          <div className="flex flex-col items-start sm:items-end min-w-[130px]">
            <div className="text-sm font-mono font-bold text-slate-100">
              {latestSnapshot.periodicTier.used} / {latestSnapshot.periodicTier.limit} {latestSnapshot.periodicTier.unit}
            </div>
            <div className="mt-1.5 h-1.5 w-32 overflow-hidden rounded-full bg-slate-800">
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
            <span className="text-[11px] text-slate-400 mt-0.5 font-mono">次日零点自动重置</span>
          </div>
        )}
      </div>

      {/* Right: Status Pill & Action Buttons (CCSwitch Alignment) */}
      <div className="flex items-center gap-2 shrink-0 justify-end border-t md:border-t-0 border-slate-800/60 pt-2.5 md:pt-0">
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
            充盈待命
          </span>
        )}

        {/* Action 1: Switch to this Account (CC-Switch 实时切号) */}
        {!account.isActiveInCCSwitch ? (
          <button
            onClick={() => onSetAsActive(account.id)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800/90 border border-slate-700/60 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-blue-600 hover:text-white hover:border-blue-500 transition-all shadow-sm"
            title="设为当前生效号源 (协同写入 CC-Switch 数据库)"
          >
            <Play className="h-3 w-3 fill-current" />
            <span>切至此号</span>
          </button>
        ) : (
          <div className="inline-flex items-center gap-1 rounded-lg bg-blue-600/20 border border-blue-500/30 px-3 py-1.5 text-xs font-medium text-blue-300">
            <Check className="h-3.5 w-3.5 text-blue-400" />
            <span>主力</span>
          </div>
        )}

        {/* Action 2: Copy Endpoint / Model Info */}
        <button
          onClick={handleCopy}
          className="rounded-lg border border-slate-800 bg-[#121624] p-1.5 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
          title={copied ? '已复制！' : '复制接口配置信息'}
        >
          {copied ? (
            <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Action 3: Refresh Single Account */}
        <button
          onClick={() => onRefresh(account.id)}
          className="rounded-lg border border-slate-800 bg-[#121624] p-1.5 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
          title="刷新此账号额度"
        >
          <RotateCw className="h-3.5 w-3.5" />
        </button>

        {/* Action 4: Delete */}
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
