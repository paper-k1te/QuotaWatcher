import React from 'react';
import { 
  Layers, 
  PanelLeftClose, 
  PanelLeftOpen, 
  Zap, 
  AlertTriangle, 
  XCircle,
  Plus
} from 'lucide-react';
import { Account, ProviderMeta } from '../types';
import { ProviderIcon } from './ProviderIcons';

interface Props {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  selectedProvider: string;
  onSelectProvider: (providerId: string) => void;
  accounts: Account[];
  providersMeta: Record<string, ProviderMeta>;
  onOpenAddModal: (providerId?: string) => void;
}

export const ProviderSidebar: React.FC<Props> = ({
  isCollapsed,
  onToggleCollapse,
  selectedProvider,
  onSelectProvider,
  accounts,
  providersMeta,
  onOpenAddModal,
}) => {
  const providerKeys = Object.keys(providersMeta);

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
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              供应商导航
            </span>
            <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-400 font-mono">
              {providerKeys.length} 家
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
            <PanelLeftOpen className="h-4 w-4 text-blue-400" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1.5 no-scrollbar">
        {/* Item: "全部供应商" (All Providers) */}
        <button
          onClick={() => onSelectProvider('all')}
          className={`group relative flex w-full items-center rounded-xl transition-all ${
            isCollapsed ? 'h-11 justify-center px-0' : 'h-11 px-3 gap-3'
          } ${
            selectedProvider === 'all'
              ? 'bg-blue-600/15 border border-blue-500/40 text-blue-400 font-semibold ring-1 ring-blue-500/20 shadow-sm'
              : 'border border-transparent text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
          }`}
          title={isCollapsed ? `全部供应商 (${accounts.length} 个账号)` : undefined}
        >
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
            selectedProvider === 'all'
              ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/30'
              : 'bg-slate-800/80 text-slate-300 group-hover:bg-slate-700'
          }`}>
            <Layers className="h-4 w-4" />
          </div>

          {!isCollapsed && (
            <div className="flex flex-1 items-center justify-between min-w-0">
              <span className="truncate text-xs font-medium">全部供应商</span>
              <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-mono font-medium ${
                selectedProvider === 'all'
                  ? 'bg-blue-500/20 text-blue-300'
                  : 'bg-slate-800/80 text-slate-400'
              }`}>
                {accounts.length}
              </span>
            </div>
          )}
        </button>

        {/* Separator */}
        <div className="my-2 border-t border-slate-800/60 mx-1" />

        {/* Provider Items */}
        {providerKeys.map((pKey) => {
          const pMeta = providersMeta[pKey];
          const pAccounts = accounts.filter((a) => a.provider === pKey);
          const isSelected = selectedProvider === pKey;
          const hasActiveInCC = pAccounts.some((a) => a.isActiveInCCSwitch);
          const hasExhausted = pAccounts.some((a) => a.latestSnapshot?.isExhausted);
          const hasWarning = pAccounts.some((a) => a.latestSnapshot?.isWarning && !a.latestSnapshot?.isExhausted);

          return (
            <button
              key={pKey}
              onClick={() => onSelectProvider(pKey)}
              className={`group relative flex w-full items-center rounded-xl transition-all ${
                isCollapsed ? 'h-12 justify-center px-0' : 'h-13 px-3 gap-3'
              } ${
                isSelected
                  ? `bg-slate-800/90 border ${pMeta.accentBorder} ${pMeta.brandColor} font-semibold shadow-xs ring-1 ring-blue-500/20`
                  : 'border border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'
              }`}
              title={isCollapsed ? `${pMeta.name} · ${pAccounts.length}个账号${hasActiveInCC ? ' (CC-Switch 主力中)' : ''}` : undefined}
            >
              {/* Provider Brand Icon */}
              <div className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-all ${pMeta.accentBorder} ${
                isSelected ? `${pMeta.brandBg} ${pMeta.brandColor}` : 'bg-slate-900/80 text-slate-300 group-hover:text-white'
              }`}>
                <ProviderIcon providerId={pKey} className="h-4 w-4" />

                {/* Status Dot on Icon when Collapsed */}
                {isCollapsed && (
                  <>
                    {hasActiveInCC && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-blue-500 text-[8px] text-white shadow-xs">
                        <Zap className="h-2 w-2 fill-white" />
                      </span>
                    )}
                    {!hasActiveInCC && hasExhausted && (
                      <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-rose-500" />
                    )}
                    {!hasActiveInCC && !hasExhausted && hasWarning && (
                      <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-500" />
                    )}
                  </>
                )}
              </div>

              {/* Full Provider Info when Expanded */}
              {!isCollapsed && (
                <div className="flex flex-1 flex-col items-start min-w-0 text-left">
                  <div className="flex w-full items-center justify-between">
                    <span className="truncate text-xs font-semibold text-slate-100 group-hover:text-white">
                      {pMeta.name}
                    </span>

                    <span className={`rounded-md px-1.5 py-0.2 text-[10px] font-mono font-medium ${
                      isSelected ? 'bg-slate-700 text-slate-200' : 'bg-slate-800/80 text-slate-400'
                    }`}>
                      {pAccounts.length}
                    </span>
                  </div>

                  <div className="flex w-full items-center justify-between mt-0.5">
                    <span className="truncate text-[10px] text-slate-400 font-mono">
                      {pMeta.badge}
                    </span>

                    {/* Active In CC-Switch Pill */}
                    {hasActiveInCC ? (
                      <span className="inline-flex items-center gap-0.5 rounded bg-blue-500/20 px-1 py-0.2 text-[9px] font-semibold text-blue-400 border border-blue-500/30">
                        <Zap className="h-2 w-2 fill-blue-400" />
                        主力中
                      </span>
                    ) : hasExhausted ? (
                      <span className="inline-flex items-center gap-0.5 text-[9px] text-rose-400">
                        <XCircle className="h-2.5 w-2.5" />
                        耗尽
                      </span>
                    ) : hasWarning ? (
                      <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-400">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        预警
                      </span>
                    ) : null}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Sidebar Footer: Quick Add Account or Expand/Collapse Action */}
      <div className="border-t border-slate-800/60 p-2">
        <button
          onClick={() => onOpenAddModal(selectedProvider !== 'all' ? selectedProvider : undefined)}
          className={`flex w-full items-center rounded-xl bg-blue-600/15 border border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white transition-all ${
            isCollapsed ? 'h-9 justify-center px-0' : 'h-9 px-3 gap-2'
          }`}
          title="添加新账号"
        >
          <Plus className="h-4 w-4" />
          {!isCollapsed && <span className="text-xs font-medium">添加账号</span>}
        </button>
      </div>
    </aside>
  );
};
