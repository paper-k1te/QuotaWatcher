import React from 'react';
import { 
  Layers, 
  PanelLeftClose, 
  PanelLeftOpen, 
  Settings,
  BarChart3
} from 'lucide-react';
import { Account, ProviderMeta, isAccountLoggedIn } from '../types';
import { ProviderIcon } from './ProviderIcons';

interface Props {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  selectedProvider: string;
  onSelectProvider: (providerId: string) => void;
  accounts: Account[];
  providersMeta: Record<string, ProviderMeta>;
  visibleProviderIds: string[];
  isSettingsOpen: boolean;
  onOpenSettings: () => void;
  todayUsage?: {
    costUsd: number;
    totalTokens: number;
  };
}

export const ProviderSidebar: React.FC<Props> = ({
  isCollapsed,
  onToggleCollapse,
  selectedProvider,
  onSelectProvider,
  accounts,
  providersMeta,
  visibleProviderIds,
  isSettingsOpen,
  onOpenSettings,
  todayUsage,
}) => {
  // Only display providers that are included in visibleProviderIds
  const displayProviderKeys = Object.keys(providersMeta).filter((id) =>
    visibleProviderIds.includes(id)
  );

  return (
    <aside
      className={`relative flex flex-col border-r border-slate-800/80 bg-[#0a0c14]/95 backdrop-blur-xl select-none transition-all duration-300 ease-in-out shrink-0 z-30 ${
        isCollapsed ? 'w-[68px]' : 'w-60'
      }`}
    >
      {/* Sidebar Top: Title & Toggle Button */}
      <div className={`flex h-12 items-center border-b border-slate-800/60 px-3.5 ${
        isCollapsed ? 'justify-center' : 'justify-between'
      }`}>
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              供应商导航
            </span>
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400 font-mono">
              {displayProviderKeys.length} 家
            </span>
          </div>
        )}

        {/* Collapse / Expand Toggle Button */}
        <button
          onClick={onToggleCollapse}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          title={isCollapsed ? '展开供应商栏 (显示全名)' : '收起供应商栏 (仅保留图标)'}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Sidebar Nav Items List */}
      <div className="flex-1 overflow-y-auto py-2.5 px-2 space-y-1 no-scrollbar">
        {/* Item 0: All Providers (全部供应商) */}
        <button
          onClick={() => onSelectProvider('all')}
          className={`group relative flex w-full items-center rounded-xl transition-all duration-150 ${
            isCollapsed
              ? 'h-11 justify-center px-0'
              : 'h-11 px-3 gap-3 justify-start'
          } ${
            !isSettingsOpen && selectedProvider === 'all'
              ? 'bg-blue-600/20 text-white font-semibold border border-blue-500/40 shadow-sm shadow-blue-500/10'
              : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
          }`}
          title={isCollapsed ? '全部供应商' : undefined}
        >
          {/* Icon */}
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
            !isSettingsOpen && selectedProvider === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800/80 text-slate-400 group-hover:text-slate-200'
          }`}>
            <Layers className="h-4 w-4" />
          </div>

          {/* Label when Expanded */}
          {!isCollapsed && (
            <div className="flex flex-1 items-center justify-between min-w-0">
              <span className="text-[13.5px] truncate tracking-tight font-medium">全部供应商</span>
              <span className="rounded-full bg-slate-800/80 px-2 py-0.5 text-xs font-mono text-slate-300">
                {accounts.length}
              </span>
            </div>
          )}
        </button>

        {/* Divider */}
        <div className="my-1.5 border-t border-slate-800/50 mx-1" />

        {/* Dynamic Provider List (Only Visible Providers) */}
        {displayProviderKeys.map((providerKey) => {
          const meta = providersMeta[providerKey];
          const isSelected = !isSettingsOpen && selectedProvider === providerKey;
          const providerAccounts = accounts.filter((a) => a.provider === providerKey);
          const hasActiveInCCSwitch = providerAccounts.some((a) => a.isActiveInCCSwitch && isAccountLoggedIn(a));
          const hasWarning = providerAccounts.some(
            (a) => a.latestSnapshot?.isWarning && !a.latestSnapshot?.isExhausted
          );
          const hasExhausted = providerAccounts.some((a) => a.latestSnapshot?.isExhausted);

          return (
            <button
              key={providerKey}
              onClick={() => onSelectProvider(providerKey)}
              className={`group relative flex w-full items-center rounded-xl transition-all duration-150 ${
                isCollapsed
                  ? 'h-11 justify-center px-0'
                  : 'h-12 px-3 gap-3 justify-start'
              } ${
                isSelected
                  ? 'bg-blue-600/20 text-white font-semibold border border-blue-500/40 shadow-sm shadow-blue-500/10'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
              title={
                isCollapsed
                  ? `${meta.name} (${providerAccounts.length}个账号)`
                  : undefined
              }
            >
              {/* Provider Brand Vector Icon */}
              <div className="relative">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-all ${
                    isSelected
                      ? 'border-blue-500/50 bg-blue-500/20 text-blue-300'
                      : 'border-slate-800/80 bg-slate-800/60 text-slate-300 group-hover:border-slate-700'
                  }`}
                >
                  <ProviderIcon providerId={providerKey} className="h-4 w-4" />
                </div>

                {/* Micro Status Badges in Collapsed Mode */}
                {isCollapsed && (
                  <div className="absolute -top-1 -right-1 flex items-center">
                    {hasActiveInCCSwitch ? (
                      <span className="flex h-3 w-3 items-center justify-center rounded-full bg-blue-500 text-[8px] text-white ring-2 ring-[#0a0c14]">
                        ⚡
                      </span>
                    ) : hasExhausted ? (
                      <span className="h-2 w-2 rounded-full bg-rose-500 ring-2 ring-[#0a0c14]" />
                    ) : hasWarning ? (
                      <span className="h-2 w-2 rounded-full bg-amber-400 ring-2 ring-[#0a0c14]" />
                    ) : null}
                  </div>
                )}
              </div>

              {/* Expanded Mode: Name, Account Count & Badges (No Models) */}
              {!isCollapsed && (
                <div className="flex flex-1 items-center justify-between min-w-0">
                  <div className="min-w-0 text-left flex items-center gap-1.5">
                    <span className="text-[13.5px] truncate font-semibold text-slate-200 group-hover:text-white">
                      {meta.name}
                    </span>
                    {hasActiveInCCSwitch && (
                      <span className="inline-flex items-center text-[10px] text-blue-400 bg-blue-500/15 border border-blue-500/30 px-1.5 py-0.2 rounded font-semibold animate-pulse shrink-0">
                        主力
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-1">
                    <span className="rounded-full bg-slate-800/80 px-2 py-0.5 text-xs font-mono text-slate-300">
                      {providerAccounts.length}
                    </span>
                    {hasExhausted ? (
                      <span className="h-2 w-2 rounded-full bg-rose-500" title="有账号额度耗尽" />
                    ) : hasWarning ? (
                      <span className="h-2 w-2 rounded-full bg-amber-400" title="有账号接近耗尽" />
                    ) : null}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Sidebar Footer: Today's Usage Rollup & Settings Button (Aligned with CCSwitch) */}
      <div className="border-t border-slate-800/60 p-2 space-y-1.5">
        {/* Today's Token & Cost Rollup */}
        {!isCollapsed ? (
          <div className="rounded-xl border border-slate-800/80 bg-[#121624]/60 p-2.5 shadow-sm">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-400">
                <BarChart3 className="h-3.5 w-3.5 text-blue-400" />
                <span>用量统计 · 今日</span>
              </span>
              <span className="font-mono font-bold text-emerald-400">
                ${todayUsage?.costUsd.toFixed(2) || '0.00'}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-slate-500">
              <span>Token 吞吐</span>
              <span>{(todayUsage?.totalTokens || 0).toLocaleString()}</span>
            </div>
          </div>
        ) : (
          <div
            className="flex h-9 w-full items-center justify-center rounded-xl bg-slate-800/40 text-slate-400 hover:text-emerald-400 transition-colors"
            title={`用量统计 今日: $${todayUsage?.costUsd.toFixed(2) || '0.00'} (${(todayUsage?.totalTokens || 0).toLocaleString()} Tokens)`}
          >
            <BarChart3 className="h-4 w-4" />
          </div>
        )}

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className={`flex w-full items-center rounded-xl transition-all duration-150 ${
            isCollapsed ? 'h-9 justify-center px-0' : 'h-10 px-3 gap-2.5'
          } ${
            isSettingsOpen
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 font-semibold'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
          title="系统与厂商设置"
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span className="text-[13.5px] font-semibold">设置</span>}
        </button>
      </div>
    </aside>
  );
};
