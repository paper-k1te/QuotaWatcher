import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  ExternalLink,
  Layers
} from 'lucide-react';
import { Account, ProviderMeta } from '../types';
import { AccountCard } from './AccountCard';

interface Props {
  providerMeta: ProviderMeta;
  accounts: Account[];
  onRefresh: (id: string) => void;
  onSetAsActive: (id: string) => void;
  onDelete: (id: string) => void;
  onAddAccount: (providerId: string) => void;
}

export const ProviderSection: React.FC<Props> = ({
  providerMeta,
  accounts,
  onRefresh,
  onSetAsActive,
  onDelete,
  onAddAccount,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Compute stats for this provider
  const activeAccount = accounts.find((a) => a.isActiveInCCSwitch);
  const exhaustedCount = accounts.filter((a) => a.latestSnapshot?.isExhausted).length;
  const warningCount = accounts.filter(
    (a) => a.latestSnapshot?.isWarning && !a.latestSnapshot?.isExhausted
  ).length;

  return (
    <div className={`overflow-hidden rounded-2xl border transition-all duration-200 ${
      activeAccount
        ? 'border-blue-500/40 bg-gradient-to-b from-[#101422] to-[#0a0d16] shadow-lg shadow-blue-950/20 ring-1 ring-blue-500/20'
        : 'border-slate-800/80 bg-[#0c0f18]/80 hover:border-slate-700/80'
    }`}>
      {/* Provider Header Bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex cursor-pointer items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors select-none"
      >
        {/* Left: Brand Icon, Name, Models Preview */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Provider Brand Badge */}
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${providerMeta.accentBorder} ${providerMeta.brandBg} ${providerMeta.brandColor} font-bold text-xs shadow-inner`}>
            {providerMeta.enName.slice(0, 2).toUpperCase()}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                {providerMeta.name}
              </h2>

              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${providerMeta.accentBorder} ${providerMeta.brandBg} ${providerMeta.brandColor}`}>
                {providerMeta.badge}
              </span>

              {activeAccount && (
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 text-[10px] font-semibold text-blue-400 animate-pulse">
                  <Zap className="h-2.5 w-2.5 fill-blue-400" />
                  当前主力: {activeAccount.name}
                </span>
              )}
            </div>

            {/* Model Tag Pills */}
            <div className="mt-1 flex items-center gap-1.5 overflow-hidden text-[11px] text-slate-400">
              <span className="text-slate-500 shrink-0">主要模型:</span>
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {providerMeta.supportedModels.map((m) => (
                  <span
                    key={m}
                    className="shrink-0 rounded bg-slate-800/60 px-1.5 py-0.2 text-[10px] text-slate-300 font-mono border border-slate-700/40"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Metrics & Controls */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Status summary */}
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="rounded-lg bg-slate-800/60 border border-slate-700/50 px-2.5 py-1 text-[11px] text-slate-300 font-medium">
              {accounts.length} 个账号
            </span>

            {exhaustedCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-lg bg-rose-500/10 border border-rose-500/30 px-2 py-1 text-[11px] font-medium text-rose-400">
                <XCircle className="h-3 w-3" />
                {exhaustedCount} 耗尽
              </span>
            ) : warningCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 border border-amber-500/30 px-2 py-1 text-[11px] font-medium text-amber-400">
                <AlertTriangle className="h-3 w-3" />
                {warningCount} 预警
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 text-[11px] font-medium text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                额度充沛
              </span>
            )}
          </div>

          {/* Quick Add Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddAccount(providerMeta.id);
            }}
            className="flex h-7 items-center gap-1 rounded-lg border border-slate-700/60 bg-slate-800/80 px-2 text-[11px] font-medium text-slate-300 hover:bg-blue-600 hover:text-white hover:border-blue-500 transition-all"
            title={`添加 ${providerMeta.name} 账号`}
          >
            <Plus className="h-3 w-3" />
            <span className="hidden md:inline">添加</span>
          </button>

          {/* Collapse Icon */}
          <div className="text-slate-400 hover:text-slate-200 p-0.5">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </div>
      </div>

      {/* Provider Accounts Body */}
      {isExpanded && (
        <div className="p-4 bg-[#090b12]/60">
          {accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center text-slate-500">
              <Layers className="h-8 w-8 text-slate-600 stroke-1 mb-1.5" />
              <p className="text-xs">暂无配置的 {providerMeta.name} 账号</p>
              <button
                onClick={() => onAddAccount(providerMeta.id)}
                className="mt-2 text-xs font-medium text-blue-400 hover:underline"
              >
                + 点击为该供应商添加首个账号
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {accounts.map((acc) => (
                <AccountCard
                  key={acc.id}
                  account={acc}
                  onRefresh={onRefresh}
                  onSetAsActive={onSetAsActive}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
