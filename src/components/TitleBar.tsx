import React, { useState } from 'react';
import { 
  Minus, 
  Square, 
  Copy, 
  X, 
  ShieldCheck, 
  AppWindow, 
  Monitor 
} from 'lucide-react';
import { toggleMaximizeWindow, closeWindow, minimizeWindow, startDragging } from '../services/tauriBridge';
import { QuotaWatcherLogo } from './ProviderIcons';

interface Props {
  viewMode: 'dashboard' | 'tray';
  onToggleViewMode: (mode: 'dashboard' | 'tray') => void;
  activeCount: number;
  warningCount: number;
  todayUsage?: {
    costUsd: number;
    totalTokens: number;
  };
}

export const TitleBar: React.FC<Props> = ({
  viewMode,
  onToggleViewMode,
  activeCount,
  warningCount,
  todayUsage,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);

  const handleToggleMaximize = () => {
    toggleMaximizeWindow();
    setIsMaximized(!isMaximized);
  };

  const handleDoubleClick = handleToggleMaximize;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      startDragging(e);
    }
  };

  return (
    <div
      data-tauri-drag-region
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      className="sticky top-0 z-50 flex h-11 w-full select-none items-center justify-between border-b border-slate-800/80 bg-[#0c0f17]/95 px-3.5 backdrop-blur-md cursor-default"
    >
      {/* Left: Brand Icon, Title & Status */}
      <div className="flex items-center gap-2.5 pointer-events-none">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg overflow-hidden border border-blue-500/30 shadow-xs shadow-blue-500/20">
          <QuotaWatcherLogo className="h-6 w-6 object-cover" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm tracking-tight text-white">
            QuotaWatcher
          </span>
          <span className="rounded-full bg-blue-500/10 px-2 py-0.2 text-[10px] font-semibold text-blue-400 border border-blue-500/20 font-mono">
            v0.1.8
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 ml-2 border-l border-slate-800 pl-2.5 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
            <ShieldCheck className="h-3.5 w-3.5" />
            CC-Switch 协同
          </span>
          <span className="text-slate-600">·</span>
          <span>
            {activeCount} 活跃账号
            {warningCount > 0 && (
              <span className="text-amber-400 ml-1 font-medium">({warningCount} 告警)</span>
            )}
          </span>
          {todayUsage && todayUsage.costUsd > 0 && (
            <>
              <span className="text-slate-600">·</span>
              <span className="rounded bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.2 font-mono text-[11px] text-emerald-400">
                今日 ${todayUsage.costUsd.toFixed(2)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Center Drag Region (Occupies available space, free of clutter) */}
      <div
        data-tauri-drag-region
        className="flex-1 h-full cursor-move"
      />

      {/* Right: View Mode Toggle & Window Controls */}
      <div className="flex items-center gap-2 no-drag">
        {/* View Mode Toggle Pill */}
        <div className="flex items-center rounded-lg border border-slate-800 bg-[#121522] p-0.5 text-xs">
          <button
            onClick={() => onToggleViewMode('dashboard')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all ${
              viewMode === 'dashboard'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="完整监控看板"
          >
            <AppWindow className="h-3.5 w-3.5" />
            <span>看板</span>
          </button>
          <button
            onClick={() => onToggleViewMode('tray')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all ${
              viewMode === 'tray'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="小巧独立托盘悬浮窗"
          >
            <Monitor className="h-3.5 w-3.5" />
            <span>托盘</span>
          </button>
        </div>

        <div className="h-4 w-px bg-slate-800/80 mx-1" />

        {/* Windows-style Frame Controls */}
        <div className="flex items-center">
          {/* Minimize */}
          <button
            onClick={minimizeWindow}
            className="flex h-7 w-8 items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            title="最小化"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>

          {/* Maximize / Restore */}
          <button
            onClick={handleToggleMaximize}
            className="flex h-7 w-8 items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            title={isMaximized ? "向下还原" : "最大化"}
          >
            {isMaximized ? (
              <Copy className="h-3 w-3 rotate-180" />
            ) : (
              <Square className="h-3 w-3" />
            )}
          </button>

          {/* Close to Tray */}
          <button
            onClick={closeWindow}
            className="flex h-7 w-8 items-center justify-center rounded text-slate-400 hover:bg-rose-600 hover:text-white transition-colors"
            title="关闭窗口 (最小化至系统托盘，后台持续守护)"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
