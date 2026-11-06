import React from 'react';
import { RefreshCw, Zap, ArrowRightLeft } from 'lucide-react';
import { Account } from '../types';

interface Props {
  activeAccount?: Account;
  ccSwitchPath?: string;
  autoSwitchEnabled: boolean;
  onToggleAutoSwitch: () => void;
  onTriggerSimulateFailover: () => void;
}

export const CCSwitchSynergyBanner: React.FC<Props> = ({
  activeAccount,
  ccSwitchPath = '~/.cc-switch',
  autoSwitchEnabled,
  onToggleAutoSwitch,
  onTriggerSimulateFailover,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-950/30 via-slate-900/40 to-slate-900/60 px-3.5 py-2 text-xs shadow-sm backdrop-blur-md">
      {/* Left: CC-Switch Link & Active account */}
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
          <Zap className="h-3.5 w-3.5 animate-pulse" />
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-200">CC-Switch 协同</span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            已连通
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400 text-xs truncate">
            当前生效: 
            <span className="font-semibold text-blue-300 ml-1">
              {activeAccount ? activeAccount.name : '未绑定'}
            </span>
          </span>
          {activeAccount?.latestSnapshot?.rollingWindow && (
            <span className="text-amber-400 font-mono text-[11px]">
              ({activeAccount.latestSnapshot.rollingWindow.used}/{activeAccount.latestSnapshot.rollingWindow.total} 次 · 
              约 {Math.round(activeAccount.latestSnapshot.rollingWindow.cooldownSecondsRemaining / 60)} 分钟后重置)
            </span>
          )}
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onToggleAutoSwitch}
          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all border ${
            autoSwitchEnabled
              ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 hover:bg-blue-600/30'
              : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-slate-200'
          }`}
          title="检测到当前账号耗尽或触发限流时，自动无缝切换到备用号"
        >
          <RefreshCw className={`h-3 w-3 ${autoSwitchEnabled ? 'text-blue-400' : ''}`} />
          <span>自动切号: {autoSwitchEnabled ? '已开启' : '已关闭'}</span>
        </button>

        <button
          onClick={onTriggerSimulateFailover}
          className="inline-flex items-center gap-1 rounded-lg bg-slate-800/80 hover:bg-amber-600/20 text-slate-300 hover:text-amber-300 border border-slate-700/60 hover:border-amber-500/40 px-2.5 py-1 text-[11px] font-medium transition-all"
          title="测试当主力号用尽时，自动触发 cc-switch 无缝切换到健康备用号"
        >
          <ArrowRightLeft className="h-3 w-3 text-amber-400" />
          <span>模拟熔断</span>
        </button>
      </div>
    </div>
  );
};
