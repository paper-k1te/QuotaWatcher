import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Layers, 
  Zap, 
  Info, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  RefreshCw, 
  ArrowRightLeft, 
  Server,
  ExternalLink,
  BarChart3,
  Sliders
} from 'lucide-react';
import { ProviderMeta, Account } from '../types';
import { ProviderIcon } from './ProviderIcons';

interface Props {
  onBack: () => void;
  // Provider settings
  providersMeta: Record<string, ProviderMeta>;
  visibleProviderIds: string[];
  onToggleProviderVisibility: (providerId: string) => void;
  onOpenAddCustomProvider: () => void;
  onDeleteCustomProvider: (providerId: string) => void;
  // CC-Switch settings
  activeAccountId?: string;
  accounts: Account[];
  ccSwitchPath: string;
  onUpdateCcSwitchPath: (path: string) => void;
  autoSwitchEnabled: boolean;
  onToggleAutoSwitch: () => void;
  onTriggerSimulateFailover: () => void;
  onSelectActiveAccount: (accountId: string) => void;
  onSyncFromCCSwitch: () => void;
  todayUsage?: {
    costUsd: number;
    totalTokens: number;
    latestDate?: string;
  };
  quotaDisplayMode?: 'left' | 'used';
  onToggleQuotaDisplayMode?: (mode: 'left' | 'used') => void;
}

export const SettingsView: React.FC<Props> = ({
  onBack,
  providersMeta,
  visibleProviderIds,
  onToggleProviderVisibility,
  onOpenAddCustomProvider,
  onDeleteCustomProvider,
  activeAccountId,
  accounts,
  ccSwitchPath,
  onUpdateCcSwitchPath,
  autoSwitchEnabled,
  onToggleAutoSwitch,
  onTriggerSimulateFailover,
  onSelectActiveAccount,
  onSyncFromCCSwitch,
  todayUsage,
  quotaDisplayMode = 'left',
  onToggleQuotaDisplayMode,
}) => {
  const [activeTab, setActiveTab] = useState<'providers' | 'ccswitch' | 'general' | 'about'>('providers');
  const [isSyncing, setIsSyncing] = useState(false);

  const providerList = Object.values(providersMeta);
  const officialProviders = providerList.filter((p) => p.category === 'official');
  const ecosystemProviders = providerList.filter((p) => p.category === 'ecosystem');
  const relayProviders = providerList.filter((p) => p.category === 'relay' || p.isCustom);

  const activeAccount = accounts.find((a) => a.id === activeAccountId);

  const handleManualSync = () => {
    setIsSyncing(true);
    onSyncFromCCSwitch();
    setTimeout(() => setIsSyncing(false), 800);
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#080a10]">
      {/* Settings Left Sub-navigation (Matching CCSwitch Settings design) */}
      <aside className="w-56 shrink-0 border-r border-slate-800/80 bg-[#0a0c14]/95 p-3 flex flex-col justify-between select-none">
        <div className="space-y-4">
          {/* Back to Dashboard Button */}
          <button
            onClick={onBack}
            className="flex w-full items-center gap-2 rounded-xl border border-slate-800 bg-[#121624] px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all shadow-sm"
          >
            <ArrowLeft className="h-4 w-4 text-blue-400" />
            <span>返回看板</span>
          </button>

          {/* Section Menu */}
          <div>
            <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              系统设置
            </div>
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('providers')}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                  activeTab === 'providers'
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <Layers className="h-4 w-4" />
                <span>厂商与侧边栏</span>
              </button>

              <button
                onClick={() => setActiveTab('ccswitch')}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                  activeTab === 'ccswitch'
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <Zap className="h-4 w-4" />
                <span>CC-Switch 协同</span>
              </button>

              <button
                onClick={() => setActiveTab('general')}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                  activeTab === 'general'
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <Sliders className="h-4 w-4" />
                <span>偏好与显示</span>
              </button>

              <button
                onClick={() => setActiveTab('about')}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                  activeTab === 'about'
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <Info className="h-4 w-4" />
                <span>关于与正版说明</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-2 py-1 text-[11px] text-slate-500 font-mono">
          QuotaWatcher v0.1.7
        </div>
      </aside>

      {/* Settings Right Content Area */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
        {/* Tab 1: Providers & Sidebar Visibility */}
        {activeTab === 'providers' && (
          <div className="max-w-4xl space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
              <div>
                <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <span>厂商与侧边栏管理</span>
                  <span className="rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.2 text-[10px] font-medium">
                    侧边栏已启用 {visibleProviderIds.length} 家
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  侧边栏默认仅展示 6 大正版官方厂商。您可根据需要自由勾选隐藏或开启，或添加自建第三方中转站。
                </p>
              </div>

              {/* Add Custom Provider CTA */}
              <button
                onClick={onOpenAddCustomProvider}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-orange-500/20 transition-all shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>添加第三方中转厂商</span>
              </button>
            </div>

            {/* Group 1: 正版官方厂商 (默认展示) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    正版官方厂商
                  </h2>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded font-medium">
                    默认显示
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  官方 Web/API 配额与并发窗口
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {officialProviders.map((provider) => {
                  const isVisible = visibleProviderIds.includes(provider.id);
                  const pAccounts = accounts.filter((a) => a.provider === provider.id);

                  return (
                    <div
                      key={provider.id}
                      className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition-all ${
                        isVisible
                          ? 'border-slate-800 bg-[#0d101a]'
                          : 'border-slate-900 bg-[#090b12] opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700/60 text-blue-400">
                          <ProviderIcon providerId={provider.id} className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-xs font-bold text-slate-200 truncate">
                              {provider.name}
                            </h3>
                            <span className="text-[10px] text-slate-500 font-mono">
                              ({pAccounts.length}号)
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                            {provider.supportedModels.slice(0, 2).join(' · ')}
                          </p>
                        </div>
                      </div>

                      {/* Toggle Switch */}
                      <button
                        onClick={() => onToggleProviderVisibility(provider.id)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isVisible ? 'bg-blue-600' : 'bg-slate-700'
                        }`}
                        title={isVisible ? '在侧边栏隐藏此厂商' : '在侧边栏显示此厂商'}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            isVisible ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Group 2: 生态与托管厂商 (默认隐藏) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    其他生态与托管厂商
                  </h2>
                  <span className="text-[10px] text-slate-400 bg-slate-800 border border-slate-700/50 px-1.5 py-0.2 rounded font-medium">
                    默认隐藏 · 可按需开启
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  IDE 集成、开源模型托管与多路由聚合
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ecosystemProviders.map((provider) => {
                  const isVisible = visibleProviderIds.includes(provider.id);
                  const pAccounts = accounts.filter((a) => a.provider === provider.id);

                  return (
                    <div
                      key={provider.id}
                      className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition-all ${
                        isVisible
                          ? 'border-slate-800 bg-[#0d101a]'
                          : 'border-slate-900 bg-[#090b12] opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700/60 text-purple-400">
                          <ProviderIcon providerId={provider.id} className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-xs font-bold text-slate-200 truncate">
                              {provider.name}
                            </h3>
                            <span className="text-[10px] text-slate-500 font-mono">
                              ({pAccounts.length}号)
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                            {provider.supportedModels.slice(0, 2).join(' · ')}
                          </p>
                        </div>
                      </div>

                      {/* Toggle Switch */}
                      <button
                        onClick={() => onToggleProviderVisibility(provider.id)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isVisible ? 'bg-blue-600' : 'bg-slate-700'
                        }`}
                        title={isVisible ? '在侧边栏隐藏此厂商' : '在侧边栏显示此厂商'}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            isVisible ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Group 3: 第三方中转厂商 (自定义添加) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    第三方中转厂商 (自定义添加)
                  </h2>
                  <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded font-medium">
                    用户自定义中转站
                  </span>
                </div>
                <button
                  onClick={onOpenAddCustomProvider}
                  className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  <span>添加中转厂商</span>
                </button>
              </div>

              {relayProviders.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {relayProviders.map((provider) => {
                    const isVisible = visibleProviderIds.includes(provider.id);
                    const pAccounts = accounts.filter((a) => a.provider === provider.id);

                    return (
                      <div
                        key={provider.id}
                        className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition-all ${
                          isVisible
                            ? 'border-amber-500/30 bg-[#120f18]/80'
                            : 'border-slate-900 bg-[#090b12] opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                            <ProviderIcon providerId={provider.id} className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h3 className="text-xs font-bold text-amber-200 truncate">
                                {provider.name}
                              </h3>
                              <span className="text-[10px] text-slate-500 font-mono">
                                ({pAccounts.length}号)
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                              {provider.endpoint || '自建中转端点'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Toggle Switch */}
                          <button
                            onClick={() => onToggleProviderVisibility(provider.id)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              isVisible ? 'bg-blue-600' : 'bg-slate-700'
                            }`}
                            title={isVisible ? '在侧边栏隐藏此厂商' : '在侧边栏显示此厂商'}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                isVisible ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>

                          {/* Delete custom provider */}
                          {provider.isCustom && (
                            <button
                              onClick={() => onDeleteCustomProvider(provider.id)}
                              className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                              title="移除此自定义厂商"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-500 rounded-xl border border-dashed border-slate-800 bg-[#0d101a]/40">
                  <Server className="h-8 w-8 text-slate-600 mx-auto mb-2 stroke-1" />
                  <p className="text-xs text-slate-400">暂无第三方中转厂商</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">如果您使用了 NewAPI、OneAPI、BossClaw 等中转站，可点击上方按钮添加</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: CC-Switch Synergy */}
        {activeTab === 'ccswitch' && (
          <div className="max-w-4xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
              <div>
                <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-400" />
                  <span>CC-Switch 客户端协同与数据直连</span>
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  直接读取本地 SQLite 数据库（cc-switch.db），实时感知 CLI 激活配置，并在配额耗尽时自动故障转移。
                </p>
              </div>

              {/* Sync Button */}
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-600/20 transition-all shrink-0 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? '正在同步...' : '从 CC-Switch 一键同步'}</span>
              </button>
            </div>

            {/* Connection Status Card */}
            <div className="rounded-xl border border-blue-500/30 bg-[#0d1222]/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">本地数据库连通状态</span>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  已连通 cc-switch.db
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  CC-Switch 本地数据库路径
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={ccSwitchPath}
                    onChange={(e) => onUpdateCcSwitchPath(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-800 bg-[#121624] px-3 py-1.5 text-xs text-slate-200 font-mono focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    onClick={handleManualSync}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
                  >
                    重新校验
                  </button>
                </div>
              </div>
            </div>

            {/* Today's Usage Rollup Card */}
            {todayUsage && (
              <div className="rounded-xl border border-slate-800 bg-[#0d101a] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-400" />
                    <h3 className="text-xs font-bold text-white">今日消耗与 Token 吞吐统计</h3>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    来源: usage_daily_rollups
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                  <div className="rounded-lg bg-[#121624] p-3 border border-slate-800/80">
                    <div className="text-[11px] text-slate-400">今日消费估算</div>
                    <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
                      ${todayUsage.costUsd.toFixed(2)} USD
                    </div>
                  </div>
                  <div className="rounded-lg bg-[#121624] p-3 border border-slate-800/80">
                    <div className="text-[11px] text-slate-400">Token 吞吐量</div>
                    <div className="text-lg font-bold font-mono text-blue-400 mt-1">
                      {todayUsage.totalTokens.toLocaleString()}
                    </div>
                  </div>
                  <div className="col-span-2 sm:col-span-1 rounded-lg bg-[#121624] p-3 border border-slate-800/80">
                    <div className="text-[11px] text-slate-400">最新记录日期</div>
                    <div className="text-sm font-semibold font-mono text-slate-300 mt-1.5">
                      {todayUsage.latestDate || '今日实时'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Active Account Selection */}
            <div className="rounded-xl border border-slate-800 bg-[#0d101a] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white">当前激活主号 (Coding 主选)</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    终端 CLI / IDE 发起请求时 CC-Switch 正在透传使用的账号
                  </p>
                </div>
                {activeAccount && (
                  <span className="text-xs font-mono text-blue-400 font-semibold">
                    {activeAccount.name}
                  </span>
                )}
              </div>

              <select
                value={activeAccountId || ''}
                onChange={(e) => onSelectActiveAccount(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-[#121624] px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    [{providersMeta[acc.provider]?.name || acc.provider}] {acc.name} (优先级 P{acc.priority})
                  </option>
                ))}
              </select>
            </div>

            {/* Auto Failover & Circuit Breaker */}
            <div className="rounded-xl border border-slate-800 bg-[#0d101a] p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white">耗尽自动故障转移 (Failover)</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 max-w-lg">
                    当监控到当前激活账号 5小时滚动用量耗尽（100%）或遭遇 429 速率限制时，系统自动无缝切换到同厂商健康备用号。
                  </p>
                </div>

                {/* Switch */}
                <button
                  onClick={onToggleAutoSwitch}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    autoSwitchEnabled ? 'bg-blue-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      autoSwitchEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  模拟当前主力号耗尽，检验无缝自动切号：
                </span>
                <button
                  onClick={onTriggerSimulateFailover}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600/20 border border-amber-500/40 text-amber-300 hover:bg-amber-600/30 px-3 py-1.5 text-xs font-semibold transition-all shadow-sm"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  <span>模拟熔断切号测试</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: General Preferences & Display (Inspired by CC-Switch quota display) */}
        {activeTab === 'general' && (
          <div className="max-w-4xl space-y-6">
            <div className="pb-4 border-b border-slate-800/80">
              <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <Sliders className="h-4 w-4 text-blue-400" />
                <span>偏好与显示设置</span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                自定义额度显示逻辑、巡检频率与预警门限（参考 CC-Switch 国际化与配置规范）。
              </p>
            </div>

            {/* Quota Display Mode (Left vs Used) */}
            <div className="rounded-xl border border-slate-800 bg-[#0d101a] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white">配额展示维度 (Quota Display)</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    选择百分比进度条与主数值侧重显示「剩余配额」还是「已消耗配额」
                  </p>
                </div>
                <div className="flex items-center rounded-lg border border-slate-800 bg-[#121624] p-0.5 text-xs">
                  <button
                    onClick={() => onToggleQuotaDisplayMode && onToggleQuotaDisplayMode('left')}
                    className={`px-3 py-1 rounded-md font-medium transition-all ${
                      quotaDisplayMode === 'left'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    显示剩余 (Left)
                  </button>
                  <button
                    onClick={() => onToggleQuotaDisplayMode && onToggleQuotaDisplayMode('used')}
                    className={`px-3 py-1 rounded-md font-medium transition-all ${
                      quotaDisplayMode === 'used'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    显示已用 (Used)
                  </button>
                </div>
              </div>
            </div>

            {/* Auto-Refresh Interval */}
            <div className="rounded-xl border border-slate-800 bg-[#0d101a] p-4 space-y-3">
              <div>
                <h3 className="text-xs font-bold text-white">自动巡检与刷新周期</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  后台定时探测各大官方 Session 与 API 接口，保持秒级倒计时与配额精确度
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                {['1 分钟 (极速)', '5 分钟 (推荐)', '15 分钟', '30 分钟 (省电)'].map((label, idx) => (
                  <button
                    key={label}
                    className={`rounded-lg p-2.5 text-xs text-center border font-medium transition-all ${
                      idx === 1
                        ? 'border-blue-500/50 bg-blue-500/15 text-blue-300'
                        : 'border-slate-800 bg-[#121624] text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Warning Threshold */}
            <div className="rounded-xl border border-slate-800 bg-[#0d101a] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white">低额度自动预警门限</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    当 5小时滚动剩余配额低于设定阈值时发出高亮预警
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                  低于 20%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: About QuotaWatcher */}
        {activeTab === 'about' && (
          <div className="max-w-2xl space-y-5">
            <div className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-[#0d101a] p-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-xl shadow-lg shadow-blue-500/20">
                QW
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-white tracking-tight">QuotaWatcher</h1>
                  <span className="rounded-full bg-blue-500/10 border border-blue-500/30 px-2 py-0.2 text-[10px] font-mono text-blue-400">
                    v0.1.7
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  全平台多账号 AI 配额哨兵 · 智能切号 · 与 CC-Switch 生态深度协同
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0d101a] p-4 space-y-3 text-xs text-slate-300">
              <h3 className="font-bold text-white">核心优势与 CC-Switch 差异化定位</h3>
              <ul className="space-y-2 list-disc list-inside text-slate-400">
                <li><strong className="text-slate-200">额度实时查看 (核心差异)：</strong> 深度解析 5小时动态滚动窗口、7天周度限额、专项模型配额与实时倒计时，不仅仅是配置切换，更是配额哨兵。</li>
                <li><strong className="text-slate-200">正版账号直观呈现：</strong> 专注正版官方账号（ChatGPT, Claude, Antigravity, Grok, DeepSeek, Kimi）的原生监控与并发限制。</li>
                <li><strong className="text-slate-200">第三方中转自主配置：</strong> NewAPI / OneAPI / 自建中转站独立分区，支持直连/路由/聚合三种模式极速切换。</li>
                <li><strong className="text-slate-200">双向无缝联动：</strong> 1-Click 读写 CC-Switch 数据库（cc-switch.db），切号即时生效，无缝故障转移。</li>
              </ul>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://github.com/paper-k1te/QuotaWatcher"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#121624] px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <span>GitHub 仓库</span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
              </a>
              <span className="text-[11px] text-slate-500">
                开源软件 · MIT License
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
