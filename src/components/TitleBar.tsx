import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Minus, 
  Square, 
  Copy, 
  X, 
  ShieldCheck, 
  AppWindow, 
  Monitor 
} from 'lucide-react';
import { minimizeWindow, toggleMaximizeWindow, closeWindow, isTauriEnvironment } from '../services/tauriBridge';

interface Props {
  viewMode: 'dashboard' | 'tray';
  onToggleViewMode: (mode: 'dashboard' | 'tray') => void;
  activeCount: number;
  warningCount: number;
}

export const TitleBar: React.FC<Props> = ({
  viewMode,
  onToggleViewMode,
  activeCount,
  warningCount,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);

  const handleDoubleClick = () => {
    toggleMaximizeWindow();
    setIsMaximized(!isMaximized);
  };

  const handleToggleMaximize = () => {
    toggleMaximizeWindow();
    setIsMaximized(!isMaximized);
  };

  return (
    <div
      data-tauri-drag-region
      onDoubleClick={handleDoubleClick}
      className="sticky top-0 z-50 flex h-10 w-full select-none items-center justify-between border-b border-slate-800/80 bg-[#0c0f17]/95 px-3 backdrop-blur-md"
    >
      {/* Left: Brand Icon, Title & Status */}
      <div className="flex items-center gap-2.5 pointer-events-none">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-sm shadow-blue-500/20">
          <Zap className="h-3.5 w-3.5" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs tracking-tight text-white">
            QuotaWatcher
          </span>
          <span className="rounded-full bg-blue-500/10 px-1.5 py-0.2 text-[9px] font-semibold text-blue-400 border border-blue-500/20">
            v0.1.0
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 ml-2 border-l border-slate-800 pl-2.5 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
            <ShieldCheck className="h-3 w-3" />
            CC-Switch 已连通
          </span>
          <span className="text-slate-600">·</span>
          <span>
            {activeCount} 活跃账号
            {warningCount > 0 && (
              <span className="text-amber-400 ml-1">({warningCount} 告警)</span>
            )}
          </span>
        </div>
      </div>

      {/* Center Drag Region (Occupies available space) */}
      <div
        data-tauri-drag-region
        className="flex-1 h-full flex items-center justify-center text-[11px] text-slate-500/60 font-medium cursor-default"
      >
        <span className="hidden md:inline pointer-events-none">
          多平台 AI 额度哨兵 · 自动巡检 · 智能切号
        </span>
      </div>

      {/* Right: View Mode Toggle & Window Controls */}
      <div className="flex items-center gap-1.5 no-drag">
        {/* View Mode Toggle Pill */}
        <div className="flex items-center rounded-md border border-slate-800 bg-[#121522] p-0.5 text-[11px]">
          <button
            onClick={() => onToggleViewMode('dashboard')}
            className={`flex items-center gap-1 rounded px-2 py-0.5 font-medium transition-all ${
              viewMode === 'dashboard'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="完整监控看板"
          >
            <AppWindow className="h-3 w-3" />
            看板
          </button>
          <button
            onClick={() => onToggleViewMode('tray')}
            className={`flex items-center gap-1 rounded px-2 py-0.5 font-medium transition-all ${
              viewMode === 'tray'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="小巧托盘视窗"
          >
            <Monitor className="h-3 w-3" />
            托盘
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
