import React from 'react';
import { 
  Clock, 
  Coins, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  RotateCw, 
  Check, 
  Zap
} from 'lucide-react';
import { Account } from '../types';

interface Props {
  account: Account;
  onRefresh: (id: string) => void;
  onSetAsActive: (id: string) => void;
  onDelete: (id: string) => void;
}

export const AccountCard: React.FC<Props> = ({
  account,
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
    if (seconds <= 0) return '已可重新使用';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}小时${m}分`;
    if (m > 0) return `${m}分${s}秒`;
    return `${s}秒`;
  };

  // Get status color & label
  const getStatusInfo = () => {
    if (!latestSnapshot) return { color: 'text-slate-400 bg-slate-800 border-slate-700', label: '未检测' };
    if (latestSnapshot.isExhausted) {
      return { 
        color: 'text-rose-400 bg-rose-500/10 border-rose-500/30', 
        label: '额度已耗尽',
        icon: <XCircle className="w-3.5 h-3.5 text-rose-400" />
      };
    }
    if (latestSnapshot.isWarning) {
      return { 
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', 
        label: '即将耗尽',
        icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
      };
    }
    return { 
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', 
      label: '额度充盈',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
    };
  };

  const status = getStatusInfo();

  return (
    <div className={`relative flex flex-col justify-between rounded-xl border p-4.5 transition-all duration-200 hover:shadow-xl ${
      account.isActiveInCCSwitch
        ? 'border-blue-500/60 bg-gradient-to-b from-[#131b2e] to-[#0f1422] shadow-blue-900/10 ring-1 ring-blue-500/30'
        : latestSnapshot?.isExhausted
        ? 'border-rose-900/40 bg-gradient-to-b from-[#180f14] to-[#120a0e]'
        : 'border-slate-800/80 bg-[#121520]/80 hover:border-slate-700'
    }`}>
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-100 text-sm tracking-tight hover:text-blue-300 cursor-pointer">
              {account.name}
            </h3>
            {account.isActiveInCCSwitch && (
              <span className="inline-flex items-center gap-1 rounded bg-blue-600/20 px-1.5 py-0.5 text-[10px] font-semibold text-blue-400 border border-blue-500/30">
                <Zap className="w-2.5 h-2.5" />
                CC-Switch 正在使用
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border ${status.color}`}>
              {status.icon}
              {status.label}
            </span>
          </div>
        </div>

        {/* Tags */}
        <div className="mt-2 flex flex-wrap gap-1">
          {account.tags.map((tag) => (
            <span
              key={tag}
              className="rounded bg-slate-800/80 px-1.5 py-0.5 text-[10px] text-slate-400 border border-slate-700/50"
            >
              {tag}
            </span>
          ))}
          <span className="rounded bg-slate-800/40 px-1.5 py-0.5 text-[10px] text-slate-400">
            优先级: P{account.priority}
          </span>
        </div>

        {/* Content Body based on Quota Type */}
        <div className="my-4 rounded-lg bg-[#0c0e17] p-3 border border-slate-800/60">
          {isRolling && latestSnapshot.rollingWindow && (
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  {latestSnapshot.rollingWindow.windowDurationHours}小时滚动用量
                </span>
                <span className="font-mono font-medium text-slate-200">
                  {latestSnapshot.rollingWindow.used} / {latestSnapshot.rollingWindow.total} 次
                </span>
              </div>
              
              {/* Progress bar */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full transition-all duration-500 ${
                    latestSnapshot.isExhausted
                      ? 'bg-rose-500'
                      : latestSnapshot.isWarning
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

              {/* Reset Countdown */}
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">重置倒计时：</span>
                <span className={`font-mono font-semibold ${
                  latestSnapshot.isExhausted ? 'text-rose-400' : 'text-blue-300'
                }`}>
                  ⏳ {formatCountdown(latestSnapshot.rollingWindow.cooldownSecondsRemaining)}
                </span>
              </div>
            </div>
          )}

          {isBalance && latestSnapshot.currencyBalance && (
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-emerald-400" />
                  可用账户余额
                </span>
                {latestSnapshot.currencyBalance.grantedAmount !== undefined && (
                  <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1 rounded border border-amber-500/20">
                    含赠金 ￥{latestSnapshot.currencyBalance.grantedAmount.toFixed(2)}
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold font-mono tracking-tight text-slate-100">
                  {latestSnapshot.currencyBalance.currency === 'CNY' ? '￥' : '$'}
                  {latestSnapshot.currencyBalance.balance.toFixed(2)}
                </span>
                <span className="text-xs text-slate-400">
                  {latestSnapshot.currencyBalance.currency}
                </span>
              </div>
            </div>
          )}

          {isTier && latestSnapshot.periodicTier && (
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  免费周期配额 (每日)
                </span>
                <span className="font-mono text-slate-200">
                  {latestSnapshot.periodicTier.used} / {latestSnapshot.periodicTier.limit}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-purple-500 transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      (latestSnapshot.periodicTier.used / latestSnapshot.periodicTier.limit) * 100
                    )}%`,
                  }}
                />
              </div>
              <div className="mt-2 text-[10px] text-slate-400 text-right">
                明天 00:00 自动刷新
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-2 flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs">
        <button
          onClick={() => onRefresh(account.id)}
          className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
          title="立即重新获取用量"
        >
          <RotateCw className="w-3 h-3" />
          刷新
        </button>

        <div className="flex items-center gap-2">
          {!account.isActiveInCCSwitch && (
            <button
              onClick={() => onSetAsActive(account.id)}
              disabled={latestSnapshot?.isExhausted}
              className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Check className="w-3 h-3" />
              切至此号
            </button>
          )}
          
          <button
            onClick={() => onDelete(account.id)}
            className="text-slate-400 hover:text-rose-400 transition-colors text-[11px]"
          >
            移除
          </button>
        </div>
      </div>
    </div>
  );
};
