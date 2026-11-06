import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Plus, 
  RotateCw, 
  Bell, 
  Search,
  LayoutGrid,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { initialAccounts, providersMeta } from './mock/mockData';
import { Account, ProviderId } from './types';
import { AccountCard } from './components/AccountCard';
import { ProviderSection } from './components/ProviderSection';
import { ProviderSidebar } from './components/ProviderSidebar';
import { ProviderIcon } from './components/ProviderIcons';
import { TitleBar } from './components/TitleBar';
import { CCSwitchSynergyBanner } from './components/CCSwitchSynergyBanner';
import { TrayMiniWidget } from './components/TrayMiniWidget';
import { AddAccountModal } from './components/AddAccountModal';
import { checkCCSwitchInstalled, setupTrayListeners } from './services/tauriBridge';

export const App: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [viewMode, setViewMode] = useState<'dashboard' | 'tray'>('dashboard');
  const [layoutMode, setLayoutMode] = useState<'grouped' | 'flat'>('grouped');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoSwitchEnabled, setAutoSwitchEnabled] = useState<boolean>(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [modalTargetProvider, setModalTargetProvider] = useState<string | undefined>();
  const [notification, setNotification] = useState<string | null>(null);
  const [ccSwitchPath, setCcSwitchPath] = useState<string>('~/.cc-switch');

  // Detect CC-Switch and listen to Tauri Tray events
  useEffect(() => {
    checkCCSwitchInstalled().then((res) => {
      if (res.detected) {
        setCcSwitchPath(res.path || '~/.cc-switch');
      }
    });

    let unlisten: (() => void) | null = null;
    setupTrayListeners(() => {
      handleRefreshAll();
    }).then((fn) => {
      if (fn) unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  // Real-time countdown ticking
  useEffect(() => {
    const timer = setInterval(() => {
      setAccounts((prev) =>
        prev.map((acc) => {
          if (
            acc.latestSnapshot?.kind === 'rolling_window' &&
            acc.latestSnapshot.rollingWindow &&
            acc.latestSnapshot.rollingWindow.cooldownSecondsRemaining > 0
          ) {
            const nextSec = acc.latestSnapshot.rollingWindow.cooldownSecondsRemaining - 1;
            return {
              ...acc,
              latestSnapshot: {
                ...acc.latestSnapshot,
                isExhausted: nextSec > 0 ? acc.latestSnapshot.isExhausted : false,
                rollingWindow: {
                  ...acc.latestSnapshot.rollingWindow,
                  cooldownSecondsRemaining: nextSec,
                },
              },
            };
          }
          return acc;
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Show toast notification
  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  // Switch active account in CC-Switch
  const handleSetActive = (id: string) => {
    setAccounts((prev) =>
      prev.map((a) => ({
        ...a,
        isActiveInCCSwitch: a.id === id,
      }))
    );
    const target = accounts.find((a) => a.id === id);
    showToast(`🔄 已将 CC-Switch 正在使用的账号切换为: [${target?.name}]`);
  };

  // Simulate Exhaustion & Auto-Failover
  const handleSimulateFailover = () => {
    const currentActive = accounts.find((a) => a.isActiveInCCSwitch);
    if (!currentActive) {
      showToast('⚠️ 当前没有已激活的 CC-Switch 账号');
      return;
    }

    const candidates = accounts.filter(
      (a) => a.id !== currentActive.id && a.enabled && !a.latestSnapshot?.isExhausted
    );

    if (candidates.length === 0) {
      showToast('❌ 告警: 所有备用账号均已耗尽，请补充新账号！');
      return;
    }

    candidates.sort((a, b) => a.priority - b.priority);
    const nextAccount = candidates[0];

    setAccounts((prev) =>
      prev.map((a) => {
        if (a.id === currentActive.id) {
          return {
            ...a,
            isActiveInCCSwitch: false,
            latestSnapshot: a.latestSnapshot
              ? {
                  ...a.latestSnapshot,
                  isExhausted: true,
                  isWarning: true,
                }
              : undefined,
          };
        }
        if (a.id === nextAccount.id) {
          return {
            ...a,
            isActiveInCCSwitch: true,
          };
        }
        return a;
      })
    );

    showToast(
      `⚡ [自动续命触发] 主力号 [${currentActive.name}] 额度已耗尽！已自动通知 cc-switch 切换至备用号 [${nextAccount.name}]`
    );
  };

  // Refresh single account
  const handleRefresh = (id: string) => {
    showToast(`正在刷新账号 ${id} 的最新额度...`);
    setTimeout(() => {
      showToast(`账号最新额度同步完成`);
    }, 600);
  };

  // Refresh all
  const handleRefreshAll = () => {
    showToast(`正在并行刷新全部 ${accounts.length} 个账号用量与余额...`);
    setTimeout(() => {
      showToast(`全部账号状态已是最新`);
    }, 800);
  };

  // Delete account
  const handleDelete = (id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    showToast('已移除该账号监控');
  };

  // Open add modal for specific provider
  const handleOpenAddModal = (providerId?: string) => {
    setModalTargetProvider(providerId);
    setIsAddModalOpen(true);
  };

  // Add account
  const handleAddAccount = (newAcc: Partial<Account>) => {
    const account: Account = {
      id: `acc-${Date.now()}`,
      name: newAcc.name || '新账号',
      platform: newAcc.platform || 'deepseek',
      provider: (newAcc.provider || 'deepseek') as ProviderId,
      models: newAcc.models || ['通用模型'],
      tags: newAcc.tags || ['新增'],
      enabled: true,
      priority: newAcc.priority || 2,
      autoFailoverEnabled: true,
      pollingIntervalMinutes: 10,
      latestSnapshot: {
        timestamp: new Date().toISOString(),
        isHealthy: true,
        isExhausted: false,
        isWarning: false,
        kind: newAcc.platform?.includes('web') ? 'rolling_window' : 'currency_balance',
        ...(newAcc.platform?.includes('web')
          ? {
              rollingWindow: {
                used: 5,
                total: 45,
                windowDurationHours: 5,
                resetsAt: new Date(Date.now() + 120 * 60 * 1000).toISOString(),
                cooldownSecondsRemaining: 120 * 60,
              },
            }
          : {
              currencyBalance: {
                currency: 'CNY',
                balance: 20.0,
                grantedAmount: 5.0,
              },
            }),
      },
    };
    setAccounts((prev) => [account, ...prev]);
    showToast(`成功添加账号 [${account.name}] 并启动定时守卫`);
  };

  // Filter accounts by search query and provider
  const filteredAccounts = accounts.filter((acc) => {
    const query = searchQuery.toLowerCase().trim();
    const matchSearch =
      !query ||
      acc.name.toLowerCase().includes(query) ||
      acc.provider.toLowerCase().includes(query) ||
      (acc.models && acc.models.some((m) => m.toLowerCase().includes(query))) ||
      acc.tags.some((t) => t.toLowerCase().includes(query));

    if (!matchSearch) return false;

    if (selectedProvider !== 'all' && acc.provider !== selectedProvider) {
      return false;
    }

    return true;
  });

  const providerKeys = Object.keys(providersMeta);
  const activeProviders = selectedProvider === 'all'
    ? providerKeys
    : providerKeys.filter((k) => k === selectedProvider);

  const activeAccount = accounts.find((a) => a.isActiveInCCSwitch);
  const warningCount = accounts.filter(
    (a) => a.latestSnapshot?.isWarning || a.latestSnapshot?.isExhausted
  ).length;

  return (
    <div className="h-screen w-screen bg-[#080a10] text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      {/* 1. Custom Frameless TitleBar (Window Controls & App Title) */}
      <TitleBar
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        activeCount={accounts.length}
        warningCount={warningCount}
      />

      {/* Floating Toast Notification */}
      {notification && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl border border-blue-500/40 bg-[#121624]/95 px-4 py-2.5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-200">
          <Bell className="h-4 w-4 text-blue-400 animate-bounce" />
          <span className="text-xs font-medium text-slate-100">{notification}</span>
        </div>
      )}

      {/* 2. Main Layout with Left Provider Sidebar & Right Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Provider Sidebar (Collapsible with Icons/Names) */}
        <ProviderSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          selectedProvider={selectedProvider}
          onSelectProvider={setSelectedProvider}
          accounts={accounts}
          providersMeta={providersMeta}
          onOpenAddModal={handleOpenAddModal}
        />

        {/* Right Content Area */}
        <main className="flex-1 flex flex-col overflow-y-auto bg-[#080a10] no-scrollbar">
          <div className="mx-auto w-full max-w-6xl p-5 space-y-5">
            {/* Banner with CC-Switch synergy */}
            <CCSwitchSynergyBanner
              activeAccount={activeAccount}
              ccSwitchPath={ccSwitchPath}
              autoSwitchEnabled={autoSwitchEnabled}
              onToggleAutoSwitch={() => {
                setAutoSwitchEnabled(!autoSwitchEnabled);
                showToast(
                  `自动切号策略已${!autoSwitchEnabled ? '开启 (检测到耗尽自动切备用号)' : '关闭'}`
                );
              }}
              onTriggerSimulateFailover={handleSimulateFailover}
            />

            {viewMode === 'tray' ? (
              /* Tray Mini Widget Mode Preview */
              <div className="flex flex-col items-center justify-center py-6 space-y-4">
                <div className="text-center">
                  <h2 className="text-sm font-semibold text-slate-300">
                    系统托盘弹出式视窗预览
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    极简、低干扰、左键点击右下角托盘图标一键呼出，实时观察剩余冷却与用量
                  </p>
                </div>
                <TrayMiniWidget
                  accounts={accounts}
                  onRefreshAll={handleRefreshAll}
                  onOpenFullApp={() => setViewMode('dashboard')}
                />
              </div>
            ) : (
              /* Full Dashboard Mode */
              <div className="space-y-4">
                {/* Header Toolbar within Main View */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-[#0d101a]/90 p-3.5 shadow-sm backdrop-blur-md">
                  {/* Left: Current Provider Focus Info */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300">
                      {selectedProvider === 'all' ? (
                        <Layers className="h-5 w-5 text-blue-400" />
                      ) : (
                        <ProviderIcon providerId={selectedProvider} className="h-5 w-5 text-blue-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h1 className="text-sm font-bold text-white tracking-tight">
                          {selectedProvider === 'all'
                            ? '全平台大模型额度总览'
                            : `${providersMeta[selectedProvider]?.name} 专区`}
                        </h1>
                        <span className="rounded-full bg-slate-800 px-2 py-0.2 text-[10px] font-mono text-slate-400 border border-slate-700/50">
                          {filteredAccounts.length} 个账号
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-md">
                        {selectedProvider === 'all'
                          ? `已聚合 ${providerKeys.length} 家顶级供应商 · 实时监控滚动窗口与余额`
                          : providersMeta[selectedProvider]?.description}
                      </p>
                    </div>
                  </div>

                  {/* Right: Search, Layout Switch & Add Account */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                    {/* Search Bar */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                      <input
                        type="text"
                        placeholder="搜模型 (如 Claude/R1) 或账号..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-44 sm:w-52 rounded-lg border border-slate-800 bg-[#121624] pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Layout Mode Toggle (Grouped vs Flat) */}
                    <div className="flex items-center rounded-lg border border-slate-800 bg-[#121624] p-0.5 text-xs">
                      <button
                        onClick={() => setLayoutMode('grouped')}
                        className={`flex items-center gap-1 rounded-md px-2 py-1 font-medium transition-all ${
                          layoutMode === 'grouped'
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="按供应商分组归类"
                      >
                        <Layers className="h-3 w-3" />
                        分组
                      </button>
                      <button
                        onClick={() => setLayoutMode('flat')}
                        className={`flex items-center gap-1 rounded-md px-2 py-1 font-medium transition-all ${
                          layoutMode === 'flat'
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="平铺全部模型账号"
                      >
                        <LayoutGrid className="h-3 w-3" />
                        平铺
                      </button>
                    </div>

                    {/* Refresh All */}
                    <button
                      onClick={handleRefreshAll}
                      className="rounded-lg border border-slate-800 bg-[#121624] p-1.5 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
                      title="刷新全部账号"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                    </button>

                    {/* Add Account Button */}
                    <button
                      onClick={() => handleOpenAddModal(selectedProvider !== 'all' ? selectedProvider : undefined)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 shadow-md shadow-blue-600/20 transition-all"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>添加账号</span>
                    </button>
                  </div>
                </div>

                {/* Content Display: Grouped by Provider OR Flat */}
                {layoutMode === 'grouped' ? (
                  /* Grouped by Provider View */
                  <div className="space-y-4">
                    {activeProviders.map((providerKey) => {
                      const pMeta = providersMeta[providerKey];
                      const pAccounts = filteredAccounts.filter((a) => a.provider === providerKey);

                      // If searching and this provider has 0 matching accounts, skip it
                      if (searchQuery.trim() && pAccounts.length === 0) {
                        return null;
                      }

                      return (
                        <ProviderSection
                          key={providerKey}
                          providerMeta={pMeta}
                          accounts={pAccounts}
                          onRefresh={handleRefresh}
                          onSetAsActive={handleSetActive}
                          onDelete={handleDelete}
                          onAddAccount={handleOpenAddModal}
                        />
                      );
                    })}
                  </div>
                ) : (
                  /* Flat Grid View */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {filteredAccounts.map((account) => (
                      <AccountCard
                        key={account.id}
                        account={account}
                        onRefresh={handleRefresh}
                        onSetAsActive={handleSetActive}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}

                {filteredAccounts.length === 0 && (
                  <div className="py-16 text-center text-slate-500 rounded-2xl border border-slate-800/60 bg-[#0d101a]/50">
                    <Sparkles className="h-10 w-10 text-slate-600 mx-auto mb-2 stroke-1" />
                    <p className="text-sm font-medium text-slate-300">未找到符合条件的模型账号</p>
                    <p className="text-xs text-slate-500 mt-1">请尝试在左侧切换供应商或清空搜索栏</p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedProvider('all');
                      }}
                      className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:underline"
                    >
                      <span>重置回全部供应商</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Add Account Modal */}
      <AddAccountModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddAccount}
        initialProvider={modalTargetProvider}
      />
    </div>
  );
};

export default App;
