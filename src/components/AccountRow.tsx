import React from 'react';
import { 
  Clock, 
  RotateCw, 
  Check, 
  Zap,
  Play,
  Trash2,
  Sparkles,
  Mail,
  History
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
  onRefresh,
  onSetAsActive,
  onDelete,
}) => {
  const { latestSnapshot } = account;
  const isRolling = latestSnapshot?.kind === 'rolling_window' && !!latestSnapshot.rollingWindow;
  const isBalance = latestSnapshot?.kind === 'currency_balance' && !!latestSnapshot.currencyBalance;
  const isTier = latestSnapshot?.kind === 'periodic_tier' && !!latestSnapshot.periodicTier;

  // Format countdown string: e.g. "1小时27分" or "41分"
  const formatCountdown = (seconds: number) => {
    if (seconds <= 0) return '已可重置';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}时${m}分`;
    if (m > 0) return `${m}分`;
    return `${s}秒`;
  };

  // Calculate target reset wall-clock time string: e.g. "23:45"
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

  // Formatted last login / update time
  const lastLoginDisplay = account.lastLoginAt || (latestSnapshot?.timestamp ? new Date(latestSnapshot.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '刚刚');

  return (
    <div
      className={`group relative flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 rounded-xl border p-3.5 transition-all duration-200 select-none ${
        account.isActiveInCCSwitch
          ? 'border-blue-500/60 bg-[#0f1528] shadow-lg shadow-blue-950/30 ring-1 ring-blue-500/40'
          : isExhausted
          ? 'border-rose-900/40 bg-[#140c11]/85 hover:border-rose-800/60'
          : 'border-slate-800/80 bg-[#0c0f18]/90 hover:bg-[#101422] hover:border-slate-700/80'
      }`}
    >
      {/* 1 & 2: 账号昵称与账号邮箱 (Account Nickname & Email) */}
      <div className="flex items-center gap-3.5 min-w-[240px] flex-1">
        {/* Brand Official Vector Icon */}
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-inner transition-colors ${
            account.isActiveInCCSwitch
              ? 'border-blue-500/50 bg-blue-500/15 text-blue-400'
              : 'border-slate-700/60 bg-slate-800/60 text-slate-300 group-hover:border-slate-600'
          }`}
        >
          <ProviderIcon providerId={account.provider} className="h-5 w-5" />
        </div>

        {/* Text Container: Nickname & Email */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-100 text-[15px] tracking-tight truncate">
              {account.name}
            </h3>

            {/* Active Pill */}
            {account.isActiveInCCSwitch && (
              <span className="inline-flex items-center gap-1 rounded bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 text-[11px] font-semibold text-blue-400 animate-pulse">
                <Zap className="w-3 h-3 fill-blue-400" />
                使用中
              </span>
            )}

            {/* Plan Badge (Optional: Pro / Team / Plus) */}
            {(account.planName || latestSnapshot?.planName) && (
              <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 text-[11px] font-medium text-amber-300">
                <Sparkles className="w-2.5 h-2.5" />
                {account.planName || latestSnapshot?.planName}
              </span>
            )}
          </div>

          {/* Standardized Account Email Line */}
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400 font-mono truncate">
            <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate text-slate-300">
              {account.email || `${account.id.toLowerCase()}@platform.official`}
            </span>
          </div>
        </div>
      </div>

      {/* Middle Grid: 3. 5h额度 | 4. 7day额度 | 5. 重置时间 | 6. 最后登录时间 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 xl:gap-6 shrink-0 py-2 xl:py-0 border-t xl:border-t-0 border-slate-800/60">
        {/* Field 3: 5h 额度 (如有) */}
        <div className="flex flex-col justify-center min-w-[110px]">
          <span className="text-[11px] font-medium text-slate-400">5h 额度</span>
          {isRolling && rollingWindow ? (
            <div className="mt-0.5">
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-mono font-bold text-slate-100">
                  {rollingUsed} / {rollingTotal}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  ({rollingPct}%)
                </span>
              </div>
              <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-slate-800 border border-slate-700/50">
                <div
                  className={`h-full transition-all duration-300 ${
                    isExhausted ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-blue-500'
                  }`}
                  style={{ width: `${rollingPct}%` }}
                />
              </div>
            </div>
          ) : isTier && latestSnapshot?.periodicTier ? (
            <div className="mt-0.5">
              <span className="text-xs font-mono font-bold text-slate-100">
                {latestSnapshot.periodicTier.used} / {latestSnapshot.periodicTier.limit}
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">日周期配额</span>
            </div>
          ) : (
            <span className="text-xs font-mono text-slate-500 mt-0.5">—</span>
          )}
        </div>

        {/* Field 4: 7day 额度 */}
        <div className="flex flex-col justify-center min-w-[110px]">
          <span className="text-[11px] font-medium text-slate-400">7day 额度</span>
          {sevenDayPct !== undefined ? (
            <div className="mt-0.5">
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-mono font-bold text-slate-100">
                  {sevenDayPct}%
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {sevenDayQuota?.label || '周度健康'}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-slate-800 border border-slate-700/50">
                <div
                  className="h-full bg-indigo-500 transition-all duration-300"
                  style={{ width: `${sevenDayPct}%` }}
                />
              </div>
            </div>
          ) : isBalance && latestSnapshot?.currencyBalance ? (
            <div className="mt-0.5">
              <span className="text-xs font-mono font-bold text-emerald-400">
                {latestSnapshot.currencyBalance.currency === 'USD' ? '$' : '¥'}
                {latestSnapshot.currencyBalance.balance.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">可用余额</span>
            </div>
          ) : (
            <span className="text-xs font-mono text-slate-500 mt-0.5">—</span>
          )}
        </div>

        {/* Field 5: 重置时间 (计算可得) */}
        <div className="flex flex-col justify-center min-w-[120px]">
          <span className="text-[11px] font-medium text-slate-400">重置时间</span>
          {isRolling && rollingWindow ? (
            <div className="mt-0.5">
              <div className="flex items-center gap-1 text-xs font-mono font-semibold">
                <Clock className="w-3 h-3 text-blue-400 shrink-0" />
                <span className={isExhausted ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-slate-200'}>
                  {formatCountdown(rollingWindow.cooldownSecondsRemaining)}后
                </span>
              </div>
              <span className="text-[10.5px] font-mono text-slate-500 mt-0.5 block">
                预计 {getResetClockTime(rollingWindow.cooldownSecondsRemaining)}
              </span>
            </div>
          ) : isTier ? (
            <div className="mt-0.5">
              <div className="flex items-center gap-1 text-xs font-mono text-slate-200">
                <Clock className="w-3 h-3 text-sky-400 shrink-0" />
                <span>次日 00:00</span>
              </div>
              <span className="text-[10.5px] font-mono text-slate-500 block">每日自动刷新</span>
            </div>
          ) : (
            <div className="mt-0.5">
              <span className="text-xs font-mono text-emerald-400">实时按量</span>
              <span className="text-[10.5px] font-mono text-slate-500 block">无周期重置</span>
            </div>
          )}
        </div>

        {/* Field 6: 最后一次登录时间 (信息更新时间) */}
        <div className="flex flex-col justify-center min-w-[110px]">
          <span className="text-[11px] font-medium text-slate-400">最后更新</span>
          <div className="mt-0.5 flex items-center gap-1 text-xs font-mono text-slate-300">
            <History className="w-3 h-3 text-slate-500 shrink-0" />
            <span>{lastLoginDisplay}</span>
          </div>
          <span className="text-[10px] text-emerald-400/90 font-mono block">状态已同步</span>
        </div>
      </div>

      {/* Right Side: Status Pill & Action Buttons */}
      <div className="flex items-center gap-2 shrink-0 justify-end border-t xl:border-t-0 border-slate-800/60 pt-2.5 xl:pt-0">
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

        {/* Action 1: Switch Account */}
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

        {/* Action 2: Refresh Single Account */}
        <button
          onClick={() => onRefresh(account.id)}
          className="rounded-lg border border-slate-800 bg-[#121624] p-1.5 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
          title="刷新此账号额度"
        >
          <RotateCw className="h-3.5 w-3.5" />
        </button>

        {/* Action 3: Delete */}
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
