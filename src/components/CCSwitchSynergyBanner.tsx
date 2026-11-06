import React from 'react';
import { RefreshCw, Zap, ArrowRightLeft, ShieldCheck } from 'lucide-react';
import { Account } from '../types';

interface Props {
  activeAccount?: Account;
  autoSwitchEnabled: boolean;
  onToggleAutoSwitch: () => void;
  onTriggerSimulateFailover: () => void;
}

export const CCSwitchSynergyBanner: React.FC<Props> = ({
  activeAccount,
  autoSwitchEnabled,
  onToggleAutoSwitch,
  onTriggerSimulateFailover,
}) => {
  return (
    <div className="relative overflow-hidden rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/40 p-4 shadow-lg backdrop-blur-md">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Status info */}
        <div className="flex items-start md:items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <Zap className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-sm tracking-wide">
                CC-Switch 生态协同引擎
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="h-3 w-3" />
                已连通 ~/.cc-switch
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              当前 Coding 激活账号：
              <span className="font-semibold text-blue-300 mx-1">
                {activeAccount ? activeAccount.name : '未绑定'}
              </span>
              {activeAccount?.latestSnapshot?.rollingWindow && (
                <span className="text-amber-300">
                  (已用 {activeAccount.latestSnapshot.rollingWindow.used}/{activeAccount.latestSnapshot.rollingWindow.total}，
                  约 {Math.round(activeAccount.latestSnapshot.rollingWindow.cooldownSecondsRemaining / 60)} 分钟后重置)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onToggleAutoSwitch}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all border ${
              autoSwitchEnabled
                ? 'bg-blue-600/30 text-blue-200 border-blue-500/40 hover:bg-blue-600/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${autoSwitchEnabled ? 'text-blue-400' : ''}`} />
            耗尽自动故障转移: {autoSwitchEnabled ? '已开启' : '已关闭'}
          </button>

          <button
            onClick={onTriggerSimulateFailover}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-600/30 to-orange-600/30 px-3 py-1.5 text-xs font-medium text-amber-200 border border-amber-500/40 hover:from-amber-600/50 hover:to-orange-600/50 transition-all shadow-sm"
            title="测试当主力号用尽时，自动触发 cc-switch 无缝切换到健康备用号"
          >
            <ArrowRightLeft className="h-3.5 w-3.5 text-amber-300" />
            模拟熔断切号
          </button>
        </div>
      </div>
    </div>
  );
};
