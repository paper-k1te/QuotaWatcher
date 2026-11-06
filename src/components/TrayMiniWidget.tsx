import React, { useState } from 'react';
import { 
  Zap, 
  RotateCw, 
  Maximize2, 
  Minus, 
  X, 
  Pin, 
  PinOff,
  Play, 
  Check, 
  GripHorizontal
} from 'lucide-react';
import { Account } from '../types';
import { ProviderIcon } from './ProviderIcons';
import { setAlwaysOnTop, startDragging } from '../services/tauriBridge';

interface Props {
  accounts: Account[];
  onRefreshAll: () => void;
  onOpenFullApp: () => void;
  onCloseWindow: () => void;
  onMinimizeWindow: () => void;
  onSetActiveAccount: (id: string) => void;
}

export const TrayMiniWidget: React.FC<Props> = ({
  accounts,
  onRefreshAll,
  onOpenFullApp,
  onCloseWindow,
  onMinimizeWindow,
  onSetActiveAccount,
}) => {
  const [isPinned, setIsPinned] = useState(true);
  const activeAccount = accounts.find((a) => a.isActiveInCCSwitch);

  const handleTogglePin = () => {
    const nextPin = !isPinned;
    setIsPinned(nextPin);
    setAlwaysOnTop(nextPin);
  };

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      startDragging(e);
    }
  };

  const formatCountdown = (seconds: number) => {
    if (seconds <= 0) return '已就绪';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h${m}m`;
    if (m > 0) return `${m}分${s}秒`;
    return `${s}秒`;
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0a0d16] text-slate-100 select-none overflow-hidden border border-slate-700/60 shadow-2xl rounded-xl">
      {/* 1. Top Draggable TitleBar Header */}
      <div
        data-tauri-drag-region
        onMouseDown={handleHeaderMouseDown}
        className="flex items-center justify-between border-b border-slate-800/80 px-3.5 py-2.5 bg-[#101422]/95 cursor-move shrink-0"
      >
        {/* Left: Drag indicator & Logo */}
        <div data-tauri-drag-region className="flex items-center gap-2 pointer-events-none">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-sm">
            <Zap className="h-3.5 w-3.5" />
          </div>
          <span className="font-bold text-sm text-white tracking-tight">
            QuotaWatcher
          </span>
          <span className="rounded bg-blue-500/15 border border-blue-500/30 px-1.5 py-0.2 text-[10px] font-mono text-blue-400 font-semibold">
            MINI
          </span>
        </div>

        {/* Right: Window Controls */}
        <div className="flex items-center gap-1">
          {/* Pin Always on Top */}
          <button
            onClick={handleTogglePin}
            className={`p-1.5 rounded transition-colors ${
              isPinned
                ? 'text-blue-400 bg-blue-500/20 hover:bg-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title={isPinned ? '窗口已置顶 (点击取消)' : '窗口未置顶 (点击置顶)'}
          >
            {isPinned ? <Pin className="h-4 w-4 rotate-45 fill-current" /> : <PinOff className="h-4 w-4" />}
          </button>

          {/* Refresh All */}
          <button
            onClick={onRefreshAll}
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="刷新全部额度"
          >
            <RotateCw className="h-4 w-4" />
          </button>

          {/* Expand to Dashboard */}
          <button
            onClick={onOpenFullApp}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-blue-600 transition-colors"
            title="展开为完整管理看板"
          >
            <Maximize2 className="h-4 w-4" />
          </button>

          {/* Minimize */}
          <button
            onClick={onMinimizeWindow}
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="最小化"
          >
            <Minus className="h-4 w-4" />
          </button>

          {/* Close to Tray */}
          <button
            onClick={onCloseWindow}
            className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="关闭并隐藏至系统托盘"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 2. Drag Grip Bar for Obvious Dragging */}
      <div
        data-tauri-drag-region
        onMouseDown={handleHeaderMouseDown}
        className="flex items-center justify-center gap-1.5 py-1 bg-[#0d101a] border-b border-slate-800/60 cursor-move text-slate-500 hover:text-slate-400 transition-colors"
        title="按住此处自由拖动窗口"
      >
        <GripHorizontal className="h-3.5 w-3.5 pointer-events-none" />
        <span className="text-[11px] font-medium pointer-events-none">自由拖动视窗</span>
      </div>

      {/* 3. Active Coding Profile Highlight Strip */}
      {activeAccount && (
        <div className="bg-gradient-to-r from-blue-950/70 via-indigo-950/40 to-slate-900/80 px-3.5 py-2.5 border-b border-blue-500/30 shrink-0">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-400 animate-ping shrink-0" />
              <span className="font-semibold text-blue-200 truncate text-xs">
                {activeAccount.name}
              </span>
            </div>

            {activeAccount.latestSnapshot?.rollingWindow ? (
              <span className="text-xs font-mono text-amber-300 font-semibold shrink-0">
                ⏳ {formatCountdown(activeAccount.latestSnapshot.rollingWindow.cooldownSecondsRemaining)}
              </span>
            ) : activeAccount.latestSnapshot?.currencyBalance ? (
              <span className="text-xs font-mono text-emerald-300 font-semibold shrink-0">
                {activeAccount.latestSnapshot.currencyBalance.currency === 'USD' ? '$' : '¥'}
                {activeAccount.latestSnapshot.currencyBalance.balance.toFixed(2)}
              </span>
            ) : null}
          </div>
        </div>
      )}

      {/* 4. Scrollable Account List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2 no-scrollbar">
        {accounts.map((acc) => {
          const snap = acc.latestSnapshot;
          const isRolling = snap?.kind === 'rolling_window';
          const isBalance = snap?.kind === 'currency_balance';
          const isTier = snap?.kind === 'periodic_tier';
          const isExhausted = snap?.isExhausted;
          const isWarning = snap?.isWarning && !isExhausted;

          return (
            <div
              key={acc.id}
              className={`flex items-center justify-between gap-2.5 rounded-xl border p-2.5 transition-all ${
                acc.isActiveInCCSwitch
                  ? 'border-blue-500/50 bg-[#12182a] shadow-sm'
                  : isExhausted
                  ? 'border-rose-900/40 bg-[#160c12]/70'
                  : 'border-slate-800/80 bg-[#0e121e]/80 hover:bg-[#131828]'
              }`}
            >
              {/* Left: Icon & Account Info */}
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300">
                  <ProviderIcon providerId={acc.provider} className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-medium text-slate-200 truncate">
                      {acc.name}
                    </span>
                    {acc.isActiveInCCSwitch && (
                      <span className="text-[10px] text-blue-400 font-semibold bg-blue-500/20 px-1.5 py-0.2 rounded shrink-0">
                        使用中
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono truncate">
                    {acc.models?.[0] || acc.provider}
                  </div>
                </div>
              </div>

              {/* Middle: Quota Progress / Countdown */}
              <div className="flex flex-col items-end shrink-0 min-w-[80px]">
                {isRolling && snap?.rollingWindow && (
                  <>
                    <span className="text-[11px] font-mono font-bold text-slate-200">
                      {snap.rollingWindow.used}/{snap.rollingWindow.total} 次
                    </span>
                    <div className="mt-1 h-1.5 w-18 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full ${
                          isExhausted
                            ? 'bg-rose-500'
                            : isWarning
                            ? 'bg-amber-500'
                            : 'bg-blue-500'
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            (snap.rollingWindow.used / snap.rollingWindow.total) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </>
                )}

                {isBalance && snap?.currencyBalance && (
                  <span className="text-sm font-mono font-bold text-emerald-400">
                    {snap.currencyBalance.currency === 'USD' ? '$' : '¥'}
                    {snap.currencyBalance.balance.toFixed(2)}
                  </span>
                )}

                {isTier && snap?.periodicTier && (
                  <span className="text-xs font-mono text-sky-400 font-semibold">
                    {snap.periodicTier.used}/{snap.periodicTier.limit}
                  </span>
                )}
              </div>

              {/* Right: Switch Button */}
              <div className="shrink-0">
                {!acc.isActiveInCCSwitch ? (
                  <button
                    onClick={() => onSetActiveAccount(acc.id)}
                    className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:bg-blue-600 hover:text-white hover:border-blue-500 transition-colors"
                    title="切换为此账号"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                  </button>
                ) : (
                  <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. Draggable Bottom Strip Footer */}
      <div
        data-tauri-drag-region
        onMouseDown={handleHeaderMouseDown}
        className="flex items-center justify-between border-t border-slate-800/80 px-3.5 py-2 bg-[#0e121e]/90 text-[11px] text-slate-400 cursor-move shrink-0"
      >
        <span data-tauri-drag-region className="flex items-center gap-1.5 pointer-events-none">
          <GripHorizontal className="h-3 w-3 text-slate-400" />
          <span>按住边框或手柄自由拖动</span>
        </span>
        <button
          onClick={onOpenFullApp}
          className="text-blue-400 hover:text-blue-300 font-medium text-xs hover:underline"
        >
          展开大看板
        </button>
      </div>
    </div>
  );
};
