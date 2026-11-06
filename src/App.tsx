import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Plus, 
  RotateCw, 
  Bell, 
  Search,
  LayoutGrid,
  List,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { initialAccounts, providersMeta } from './mock/mockData';
import { Account, ProviderId } from './types';
import { AccountCard } from './components/AccountCard';
import { AccountRow } from './components/AccountRow';
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
  const [layoutMode, setLayoutMode] = useState<'list' | 'grid'>('list'); // Default to clean CCSwitch-style list
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
            acc.latestSnapshot.rollingWindow
          ) {
            const currentSec = acc.latestSnapshot.rollingWindow.cooldownSecondsRemaining;
            if (currentSec > 0) {
              return {
                ...acc,
                latestSnapshot: {
                  ...acc.latestSnapshot,
                  rollingWindow: {
                    ...acc.latestSnapshot.rollingWindow,
                    cooldownSecondsRemaining: currentSec - 1,
                  },
                },
              };
            }
          }
          return acc;
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Show floating toast alert
  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification((curr) => (curr === msg ? null : curr));
    }, 3200);
  };

  // Switch active account (CC-Switch synergy)
  const handleSetActive = (id: string) => {
    setAccounts((prev) =>
      prev.map((acc) => ({
        ...acc,
        isActiveInCCSwitch: acc.id === id,
      }))
    );
    const target = accounts.find((a) => a.id === id);
    if (target) {
      showToast(`⚡ 已协同 CC-Switch：当前生效账号已切换为「${target.name}」`);
    }
  };

  // Refresh single account quota
  const handleRefresh = (id: string) => {
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === id && acc.latestSnapshot) {
          if (acc.latestSnapshot.kind === 'rolling_window' && acc.latestSnapshot.rollingWindow) {
            const rw = acc.latestSnapshot.rollingWindow;
            const newUsed = Math.max(0, rw.used - Math.floor(Math.random() * 3));
            return {
              ...acc,
              latestSnapshot: {
                ...acc.latestSnapshot,
                timestamp: new Date().toISOString(),
                isExhausted: newUsed >= rw.total,
                isWarning: newUsed >= rw.total * 0.8,
                rollingWindow: {
                  ...rw,
                  used: newUsed,
                  cooldownSecondsRemaining: Math.floor(Math.random() * 7200) + 600,
                },
              },
            };
          } else if (acc.latestSnapshot.kind === 'currency_balance' && acc.latestSnapshot.currencyBalance) {
            const cb = acc.latestSnapshot.currencyBalance;
            return {
              ...acc,
              latestSnapshot: {
                ...acc.latestSnapshot,
                timestamp: new Date().toISOString(),
                currencyBalance: {
                  ...cb,
                  balance: Number((cb.balance - (Math.random() * 0.5)).toFixed(2)),
                },
              },
            };
          }
        }
        return acc;
      })
    );
    const acc = accounts.find((a) => a.id === id);
    showToast(`🔄 账号「${acc?.name}」额度已同步至最新状态`);
  };

  // Refresh all accounts
  const handleRefreshAll = () => {
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.latestSnapshot?.kind === 'rolling_window' && acc.latestSnapshot.rollingWindow) {
          const rw = acc.latestSnapshot.rollingWindow;
          return {
            ...acc,
            latestSnapshot: {
              ...acc.latestSnapshot,
              timestamp: new Date().toISOString(),
              rollingWindow: {
                ...rw,
                used: Math.max(0, rw.used - 1),
              },
            },
          };
        }
        return acc;
      })
    );
    showToast('🔄 已全量刷新各大供应商模型配额数据');
  };

  // Delete an account
  const handleDelete = (id: string) => {
    const acc = accounts.find((a) => a.id === id);
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    showToast(`🗑️ 账号「${acc?.name}」已从本地配额监控中移除`);
  };

  // Simulate failover
  const handleSimulateFailover = () => {
    const active = accounts.find((a) => a.isActiveInCCSwitch);
    if (!active) return;

    setAccounts((prev) => {
      const exhaustedList = prev.map((a) => {
        if (a.id === active.id && a.latestSnapshot?.rollingWindow) {
          return {
            ...a,
            isActiveInCCSwitch: false,
            latestSnapshot: {
              ...a.latestSnapshot,
              isExhausted: true,
              isWarning: false,
              rollingWindow: {
                ...a.latestSnapshot.rollingWindow,
                used: a.latestSnapshot.rollingWindow.total,
                cooldownSecondsRemaining: 3600 * 2,
              },
            },
          };
        }
        return a;
      });

      const backup = exhaustedList.find(
        (a) => a.provider === active.provider && !a.latestSnapshot?.isExhausted && a.id !== active.id
      ) || exhaustedList.find((a) => !a.latestSnapshot?.isExhausted && a.id !== active.id);

      if (backup) {
        showToast(
          `🚨 熔断触发！「${active.name}」已耗尽，已自动切号至健康号源「${backup.name}」`
        );
        return exhaustedList.map((a) => ({
          ...a,
          isActiveInCCSwitch: a.id === backup.id,
        }));
      }

      showToast(`⚠️「${active.name}」额度已耗尽，且同供应商无其他可用号源！`);
      return exhaustedList;
    });
  };

  // Open Add Modal
  const handleOpenAddModal = (targetProvider?: string) => {
    setModalTargetProvider(targetProvider);
    setIsAddModalOpen(true);
  };

  // Add new account
  const handleAddAccount = (newAcc: Omit<Account, 'id'>) => {
    const created: Account = {
      ...newAcc,
      id: `acc-custom-${Date.now()}`,
    };
    setAccounts((prev) => [created, ...prev]);
    showToast(`🎉 成功添加新账号「${created.name}」`);
  };

  // Filter accounts
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
          <div className="mx-auto w-full max-w-6xl p-4 sm:p-5 space-y-3.5">
            {/* Slim Compact CC-Switch Synergy Ribbon */}
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
              <div className="space-y-3.5">
                {/* Header Toolbar (CCSwitch style: Provider Context, Search, View Modes & Add) */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-[#0c0f18]/90 px-4 py-2.5 shadow-sm backdrop-blur-md">
                  {/* Left: Current Provider Focus Info */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300">
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
                            : providersMeta[selectedProvider]?.name}
                        </h1>
                        <span className="rounded-full bg-slate-800/80 px-2 py-0.2 text-[10px] font-mono text-slate-300 border border-slate-700/50">
                          {filteredAccounts.length} 个账号
                        </span>
                        {selectedProvider !== 'all' && (
                          <span className="hidden sm:inline-block rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.2 text-[10px] font-medium">
                            {providersMeta[selectedProvider]?.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-md">
                        {selectedProvider === 'all'
                          ? `已聚合 ${providerKeys.length} 家顶级供应商 · 实时监控滚动窗口与余额`
                          : providersMeta[selectedProvider]?.description}
                      </p>
                    </div>
                  </div>

                  {/* Right: Search, View Mode Toggle & Add Button */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                    {/* Search Bar */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                      <input
                        type="text"
                        placeholder="搜索模型或账号..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-36 sm:w-48 rounded-lg border border-slate-800 bg-[#121624] pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none transition-colors"
                      />
                    </div>

                    {/* View Switcher: List (CCSwitch-style) vs Grid Cards */}
                    <div className="flex items-center rounded-lg border border-slate-800 bg-[#121624] p-0.5 text-xs">
                      <button
                        onClick={() => setLayoutMode('list')}
                        className={`flex items-center gap-1 rounded-md px-2 py-1 font-medium transition-all ${
                          layoutMode === 'list'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="列表视图 (平铺精简 · CCSwitch 风格)"
                      >
                        <List className="h-3.5 w-3.5" />
                        <span>列表</span>
                      </button>
                      <button
                        onClick={() => setLayoutMode('grid')}
                        className={`flex items-center gap-1 rounded-md px-2 py-1 font-medium transition-all ${
                          layoutMode === 'grid'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="卡片网格视图"
                      >
                        <LayoutGrid className="h-3.5 w-3.5" />
                        <span>卡片</span>
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

                    {/* Add Account Button (Vibrant Orange like CCSwitch) */}
                    <button
                      onClick={() => handleOpenAddModal(selectedProvider !== 'all' ? selectedProvider : undefined)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-orange-500/20 transition-all"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>添加账号</span>
                    </button>
                  </div>
                </div>

                {/* Content Area: DIRECT FLAT DISPLAY (Zero Nested Card Container!) */}
                {layoutMode === 'list' ? (
                  /* 1. Flat List View (CCSwitch Inspired) */
                  <div className="space-y-2">
                    {selectedProvider === 'all' ? (
                      /* Grouped by Provider with Clean Minimal Text Separators */
                      activeProviders.map((providerKey) => {
                        const pMeta = providersMeta[providerKey];
                        const pAccounts = filteredAccounts.filter((a) => a.provider === providerKey);
                        if (pAccounts.length === 0) return null;

                        return (
                          <div key={providerKey} className="space-y-1.5">
                            {/* Clean text divider, NO heavy box */}
                            <div className="flex items-center justify-between pt-2.5 pb-1 text-xs text-slate-400">
                              <div className="flex items-center gap-2">
                                <ProviderIcon providerId={providerKey} className="h-3.5 w-3.5 text-blue-400" />
                                <span className="font-semibold text-slate-200">{pMeta.name}</span>
                                <span className="text-[11px] font-mono text-slate-500">({pAccounts.length})</span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {pMeta.supportedModels.slice(0, 2).join(' · ')}
                              </span>
                            </div>

                            {/* Direct account rows */}
                            {pAccounts.map((account) => (
                              <AccountRow
                                key={account.id}
                                account={account}
                                providerMeta={pMeta}
                                onRefresh={handleRefresh}
                                onSetAsActive={handleSetActive}
                                onDelete={handleDelete}
                              />
                            ))}
                          </div>
                        );
                      })
                    ) : (
                      /* Specific Provider: DIRECT FLAT ROWS, ZERO REDUNDANCY */
                      filteredAccounts.map((account) => (
                        <AccountRow
                          key={account.id}
                          account={account}
                          providerMeta={providersMeta[selectedProvider]}
                          onRefresh={handleRefresh}
                          onSetAsActive={handleSetActive}
                          onDelete={handleDelete}
                        />
                      ))
                    )}
                  </div>
                ) : (
                  /* 2. Flat Grid Card View */
                  <div>
                    {selectedProvider === 'all' ? (
                      activeProviders.map((providerKey) => {
                        const pMeta = providersMeta[providerKey];
                        const pAccounts = filteredAccounts.filter((a) => a.provider === providerKey);
                        if (pAccounts.length === 0) return null;

                        return (
                          <div key={providerKey} className="space-y-2 mb-4">
                            <div className="flex items-center gap-2 pt-2 pb-1 text-xs text-slate-400">
                              <ProviderIcon providerId={providerKey} className="h-3.5 w-3.5 text-blue-400" />
                              <span className="font-semibold text-slate-200">{pMeta.name}</span>
                              <span className="text-[11px] font-mono text-slate-500">({pAccounts.length})</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {pAccounts.map((account) => (
                                <AccountCard
                                  key={account.id}
                                  account={account}
                                  onRefresh={handleRefresh}
                                  onSetAsActive={handleSetActive}
                                  onDelete={handleDelete}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
                  </div>
                )}

                {/* Empty State */}
                {filteredAccounts.length === 0 && (
                  <div className="py-16 text-center text-slate-500 rounded-xl border border-slate-800/60 bg-[#0c0f18]/50">
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
