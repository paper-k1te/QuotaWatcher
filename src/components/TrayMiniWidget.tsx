import React from 'react';
import { 
  Zap, 
  RotateCw, 
  ExternalLink, 
  ChevronRight
} from 'lucide-react';
import { Account } from '../types';

interface Props {
  accounts: Account[];
  onRefreshAll: () => void;
  onOpenFullApp: () => void;
}

export const TrayMiniWidget: React.FC<Props> = ({
  accounts,
  onRefreshAll,
  onOpenFullApp,
}) => {
  const activeAccount = accounts.find((a) => a.isActiveInCCSwitch);

  const formatCountdown = (seconds: number) => {
    if (seconds <= 0) return '就绪';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}分${s}秒`;
  };

  return (
    <div className="mx-auto w-[360px] overflow-hidden rounded-2xl border border-slate-700/80 bg-[#0d1017]/95 shadow-2xl backdrop-blur-xl">
      {/* Top Header of Tray Popover */}
      <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3 bg-[#11141e]/80">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 text-white shadow-sm">
            <Zap className="h-3.5 w-3.5" />
          </div>
          <span className="font-semibold text-xs text-slate-100 tracking-wide">
            QuotaWatcher
          </span>
          <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-400">
            托盘模式
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-400">
          <button
            onClick={onRefreshAll}
            className="rounded p-1 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            title="全部刷新"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onOpenFullApp}
            className="rounded p-1 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            title="打开完整管理面板"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Active Coding Profile Highlight */}
      {activeAccount && (
        <div className="bg-gradient-to-r from-blue-950/60 to-indigo-950/40 px-4 py-2.5 border-b border-blue-900/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-blue-300 font-medium flex items-center gap-1">
              <Zap className="h-3 w-3 text-blue-400 animate-pulse" />
              当前活跃: {activeAccount.name}
            </span>
            {activeAccount.latestSnapshot?.rollingWindow && (
              <span className="text-[11px] font-mono text-amber-300">
                ⏳ {formatCountdown(activeAccount.latestSnapshot.rollingWindow.cooldownSecondsRemaining)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* List of Accounts */}
      <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-800/50 p-2">
        {accounts.map((acc) => {
          const snap = acc.latestSnapshot;
          return (
            <div
              key={acc.id}
              className={`flex items-center justify-between rounded-lg p-2.5 transition-colors hover:bg-slate-800/40 ${
                acc.isActiveInCCSwitch ? 'bg-blue-950/20' : ''
              }`}
            >
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-slate-200">
                    {acc.name}
                  </span>
                  {snap?.isExhausted && (
                    <span className="rounded bg-rose-500/20 px-1 py-0.2 text-[9px] text-rose-400">
                      已熔断
                    </span>
                  )}
                  {snap?.isWarning && !snap.isExhausted && (
                    <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[9px] text-amber-400">
                      低额度
                    </span>
                  )}
                </div>
                
                {/* Secondary metric */}
                <div className="text-[10px] text-slate-400 flex items-center gap-2">
                  {snap?.kind === 'rolling_window' && snap.rollingWindow && (
                    <span>
                      已用 {snap.rollingWindow.used}/{snap.rollingWindow.total} · 倒计时 {formatCountdown(snap.rollingWindow.cooldownSecondsRemaining)}
                    </span>
                  )}
                  {snap?.kind === 'currency_balance' && snap.currencyBalance && (
                    <span className="font-mono text-emerald-400 font-medium">
                      余额: ￥{snap.currencyBalance.balance.toFixed(2)}
                    </span>
                  )}
                  {snap?.kind === 'periodic_tier' && snap.periodicTier && (
                    <span>
                      今日用量: {snap.periodicTier.used}/{snap.periodicTier.limit}
                    </span>
                  )}
                </div>
              </div>

              {/* Status Indicator circle */}
              <div className="flex items-center gap-2">
                <div
                  className={`h-2.5 w-2.5 rounded-full ${
                    snap?.isExhausted
                      ? 'bg-rose-500 shadow-rose-500/50 shadow-sm'
                      : snap?.isWarning
                      ? 'bg-amber-400 shadow-amber-400/50 shadow-sm'
                      : 'bg-emerald-400 shadow-emerald-400/50 shadow-sm'
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-800/80 px-4 py-2.5 bg-[#0b0d13] text-[11px] text-slate-400">
        <span>已监控 {accounts.length} 个账号</span>
        <button
          onClick={onOpenFullApp}
          className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium transition-colors"
        >
          查看完整仪表盘
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};
