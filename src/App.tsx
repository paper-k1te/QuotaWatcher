import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Plus, 
  RotateCw, 
  Bell, 
  LayoutGrid, 
  List, 
  Layers, 
  Database,
  Sparkles
} from 'lucide-react';
import { initialAccounts, providersMeta as initialProvidersMeta } from './mock/mockData';
import { Account, ProviderMeta } from './types';
import { AccountCard } from './components/AccountCard';
import { AccountRow } from './components/AccountRow';
import { ProviderSidebar } from './components/ProviderSidebar';
import { ProviderIcon } from './components/ProviderIcons';
import { TitleBar } from './components/TitleBar';
import { SettingsView } from './components/SettingsView';
import { TrayMiniWidget } from './components/TrayMiniWidget';
import { AddAccountModal } from './components/AddAccountModal';
import { AddCustomProviderModal } from './components/AddCustomProviderModal';
import { 
  checkCCSwitchInstalled, 
  getCCSwitchData,
  setCCSwitchActiveProvider,
  setupTrayListeners, 
  setWindowMode, 
  minimizeWindow, 
  closeWindow 
} from './services/tauriBridge';

export const App: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [providers, setProviders] = useState<Record<string, ProviderMeta>>(initialProvidersMeta);
  
  // 默认侧边栏仅展示 6 大正版官方厂商
  const [visibleProviderIds, setVisibleProviderIds] = useState<string[]>([
    'chatgpt',
    'claude',
    'antigravity',
    'grok',
    'deepseek',
    'kimi',
  ]);

  const [viewMode, setViewMode] = useState<'dashboard' | 'tray'>('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [layoutMode, setLayoutMode] = useState<'list' | 'grid'>('list'); // Default to clean CCSwitch-style list
  const [selectedProvider, setSelectedProvider] = useState<string>('claude');
  const [quotaDisplayMode, setQuotaDisplayMode] = useState<'left' | 'used'>('left');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [autoSwitchEnabled, setAutoSwitchEnabled] = useState<boolean>(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isAddCustomProviderModalOpen, setIsAddCustomProviderModalOpen] = useState<boolean>(false);
  const [modalTargetProvider, setModalTargetProvider] = useState<string | undefined>();
  const [notification, setNotification] = useState<string | null>(null);
  const [ccSwitchPath, setCcSwitchPath] = useState<string>('C:\\Users\\10447\\.cc-switch');
  const [todayUsage, setTodayUsage] = useState<{ costUsd: number; totalTokens: number; latestDate?: string }>({
    costUsd: 6.08,
    totalTokens: 762069,
    latestDate: '2026-09-29',
  });
  const [isSyncingWithCCSwitch, setIsSyncingWithCCSwitch] = useState<boolean>(false);

  // Sync with local CC-Switch database
  const syncWithCCSwitch = async (showNotification = false) => {
    setIsSyncingWithCCSwitch(true);
    try {
      const res = await getCCSwitchData();
      if (res.success && res.providers) {
        if (res.dbPath) {
          setCcSwitchPath(res.dbPath);
        }
        if (res.usage) {
          setTodayUsage(res.usage);
        }

        // Merge or update existing accounts with real CC-Switch isCurrent status
        setAccounts((prev) => {
          const updated = [...prev];
          
          res.providers?.forEach((p) => {
            // Find existing matching account
            let acc = updated.find((a) => a.ccSwitchProviderId === p.id || a.name.toLowerCase().includes(p.name.toLowerCase()));
            
            if (acc) {
              acc.isActiveInCCSwitch = p.isCurrent;
              acc.ccSwitchProviderId = p.id;
              acc.appType = p.appType;
            } else {
              // Create new account entry from CC-Switch provider
              const isOfficial = p.category === 'official';
              const targetProvider = p.appType === 'claude' ? 'claude' : p.appType === 'codex' ? 'chatgpt' : p.appType === 'gemini' ? 'antigravity' : 'bossclaw';
              
              const newEntry: Account = {
                id: `cc-${p.id}`,
                name: p.name,
                email: `${p.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@workspace.com`,
                platform: isOfficial ? 'claude-web' : 'custom-api',
                provider: targetProvider,
                tags: [p.appType],
                enabled: true,
                isActiveInCCSwitch: p.isCurrent,
                priority: p.isCurrent ? 1 : 2,
                autoFailoverEnabled: true,
                appType: p.appType,
                ccSwitchProviderId: p.id,
                endpoint: p.apiUrl,
                lastLoginAt: '2026-11-06 23:20',
                latestSnapshot: isOfficial ? {
                  timestamp: new Date().toISOString(),
                  isHealthy: true,
                  isExhausted: false,
                  isWarning: false,
                  kind: 'rolling_window',
                  rollingWindow: {
                    used: 12,
                    total: 45,
                    windowDurationHours: 5,
                    resetsAt: new Date(Date.now() + 3600 * 1000).toISOString(),
                    cooldownSecondsRemaining: 3600,
                  },
                  sevenDayQuota: {
                    usedPercent: 26,
                    totalPercent: 100,
                    label: '26% 充沛',
                  },
                } : {
                  timestamp: new Date().toISOString(),
                  isHealthy: true,
                  isExhausted: false,
                  isWarning: false,
                  kind: 'currency_balance',
                  currencyBalance: {
                    currency: 'USD',
                    balance: 13.79,
                  },
                  sevenDayQuota: {
                    usedPercent: 40,
                    totalPercent: 100,
                    label: '余额 $13.79',
                  },
                },
              };
              updated.push(newEntry);
            }
          });

          return updated;
        });

        if (showNotification) {
          showToast(`⚡ 成功同步 CC-Switch 本地数据库：已连通 ${res.providers.length} 个号源，今日用量 $${res.usage?.costUsd.toFixed(2)}`);
        }
      }
    } catch (err) {
      console.warn('Sync CC-Switch failed:', err);
    } finally {
      setIsSyncingWithCCSwitch(false);
    }
  };

  // Detect CC-Switch and listen to Tauri Tray events on startup
  useEffect(() => {
    checkCCSwitchInstalled().then((res) => {
      if (res.detected && res.path) {
        setCcSwitchPath(res.path);
      }
    });

    // Run first sync with local DB
    syncWithCCSwitch(false);

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

  // Toggle visibility of a provider in the sidebar
  const handleToggleProviderVisibility = (providerId: string) => {
    setVisibleProviderIds((prev) => {
      const isVisible = prev.includes(providerId);
      const next = isVisible ? prev.filter((id) => id !== providerId) : [...prev, providerId];
      showToast(
        `${isVisible ? '已隐藏' : '已显示'}厂商「${providers[providerId]?.name || providerId}」`
      );
      return next;
    });
  };

  // Add custom relay provider
  const handleAddCustomProvider = (newProvider: ProviderMeta) => {
    setProviders((prev) => ({
      ...prev,
      [newProvider.id]: newProvider,
    }));
    setVisibleProviderIds((prev) =>
      prev.includes(newProvider.id) ? prev : [...prev, newProvider.id]
    );
    setSelectedProvider(newProvider.id);
    setIsSettingsOpen(false);
    showToast(`🎉 成功添加第三方中转厂商「${newProvider.name}」并已启用显示`);
  };

  // Delete custom relay provider
  const handleDeleteCustomProvider = (providerId: string) => {
    const targetName = providers[providerId]?.name || providerId;
    setProviders((prev) => {
      const copy = { ...prev };
      delete copy[providerId];
      return copy;
    });
    setVisibleProviderIds((prev) => prev.filter((id) => id !== providerId));
    if (selectedProvider === providerId) {
      setSelectedProvider('claude');
    }
    showToast(`🗑️ 已移除第三方中转厂商「${targetName}」`);
  };

  // Switch active account (Bi-directional CC-Switch synergy)
  const handleSetActive = async (id: string) => {
    const target = accounts.find((a) => a.id === id);
    if (!target) return;

    // 1. Update UI state
    setAccounts((prev) =>
      prev.map((acc) => ({
        ...acc,
        isActiveInCCSwitch: acc.id === id,
      }))
    );

    // 2. Sync to CC-Switch SQLite database if provider info is available
    if (target.appType && target.ccSwitchProviderId) {
      await setCCSwitchActiveProvider(target.appType, target.ccSwitchProviderId);
    }

    showToast(`⚡ 已联动 CC-Switch：当前生效号源已切换为「${target.name}」`);
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
    showToast(`🔄 账号「${acc?.name}」配额已同步至最新状态`);
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
  const handleSimulateFailover = async () => {
    const active = accounts.find((a) => a.isActiveInCCSwitch);
    if (!active) return;

    const backup = accounts.find(
      (a) => a.provider === active.provider && !a.latestSnapshot?.isExhausted && a.id !== active.id
    ) || accounts.find((a) => !a.latestSnapshot?.isExhausted && a.id !== active.id);

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

      if (backup) {
        return exhaustedList.map((a) => ({
          ...a,
          isActiveInCCSwitch: a.id === backup.id,
        }));
      }

      return exhaustedList;
    });

    if (backup) {
      if (backup.appType && backup.ccSwitchProviderId) {
        await setCCSwitchActiveProvider(backup.appType, backup.ccSwitchProviderId);
      }
      showToast(`🚨 熔断触发！「${active.name}」已耗尽，已自动切号至健康号源「${backup.name}」`);
    } else {
      showToast(`⚠️「${active.name}」额度已耗尽，且同供应商无其他可用号源！`);
    }
  };

  // Open Add Account Modal
  const handleOpenAddModal = (targetProvider?: string) => {
    setModalTargetProvider(targetProvider || selectedProvider);
    setIsAddModalOpen(true);
  };

  // Add new account
  const handleAddAccount = (newAcc: Partial<Account>) => {
    const created: Account = {
      id: `acc-${Date.now()}`,
      name: newAcc.name || '未命名账号',
      platform: newAcc.platform || 'custom-api',
      provider: newAcc.provider || selectedProvider,
      models: newAcc.models || [],
      tags: newAcc.tags || ['正版账号'],
      classification: newAcc.classification || 'official',
      enabled: true,
      priority: newAcc.priority || 1,
      autoFailoverEnabled: true,
      latestSnapshot: newAcc.latestSnapshot,
    };
    setAccounts((prev) => [created, ...prev]);
    showToast(`🎉 成功添加新账号「${created.name}」`);
  };

  // Filter accounts by selected provider
  const filteredAccounts = accounts.filter((acc) => {
    if (selectedProvider !== 'all' && acc.provider !== selectedProvider) {
      return false;
    }
    return true;
  });

  // Handle switching view mode between dashboard and floating tray window
  const handleSwitchViewMode = (mode: 'dashboard' | 'tray') => {
    setViewMode(mode);
    setWindowMode(mode);
  };

  const activeAccount = accounts.find((a) => a.isActiveInCCSwitch);
  const warningCount = accounts.filter(
    (a) => a.latestSnapshot?.isWarning || a.latestSnapshot?.isExhausted
  ).length;

  // 1. TRAY MODE: Independent Floating Window (Freely draggable across screens)
  if (viewMode === 'tray') {
    return (
      <div className="h-screen w-screen bg-[#080a10] text-slate-100 flex flex-col font-sans select-none overflow-hidden p-0">
        <TrayMiniWidget
          accounts={accounts}
          onRefreshAll={handleRefreshAll}
          onOpenFullApp={() => handleSwitchViewMode('dashboard')}
          onCloseWindow={closeWindow}
          onMinimizeWindow={minimizeWindow}
          onSetActiveAccount={handleSetActive}
        />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#080a10] text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      {/* 1. Custom Frameless TitleBar (Window Controls & App Title & Today's Usage) */}
      <TitleBar
        viewMode={viewMode}
        onToggleViewMode={handleSwitchViewMode}
        activeCount={accounts.length}
        warningCount={warningCount}
        todayUsage={todayUsage}
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
        {/* Left Provider Sidebar (Collapsible with Icons/Names, Bottom Usage & Settings) */}
        <ProviderSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          selectedProvider={selectedProvider}
          onSelectProvider={(pid) => {
            setSelectedProvider(pid);
            setIsSettingsOpen(false);
          }}
          accounts={accounts}
          providersMeta={providers}
          visibleProviderIds={visibleProviderIds}
          isSettingsOpen={isSettingsOpen}
          onOpenSettings={() => setIsSettingsOpen(true)}
          todayUsage={todayUsage}
        />

        {/* Right Content Area: Either SettingsView OR Dashboard View */}
        {isSettingsOpen ? (
          <SettingsView
            onBack={() => setIsSettingsOpen(false)}
            providersMeta={providers}
            visibleProviderIds={visibleProviderIds}
            onToggleProviderVisibility={handleToggleProviderVisibility}
            onOpenAddCustomProvider={() => setIsAddCustomProviderModalOpen(true)}
            onDeleteCustomProvider={handleDeleteCustomProvider}
            activeAccountId={activeAccount?.id}
            accounts={accounts}
            ccSwitchPath={ccSwitchPath}
            onUpdateCcSwitchPath={setCcSwitchPath}
            autoSwitchEnabled={autoSwitchEnabled}
            onToggleAutoSwitch={() => {
              setAutoSwitchEnabled(!autoSwitchEnabled);
              showToast(`自动切号策略已${!autoSwitchEnabled ? '开启' : '关闭'}`);
            }}
            onTriggerSimulateFailover={handleSimulateFailover}
            onSelectActiveAccount={handleSetActive}
            onSyncFromCCSwitch={() => syncWithCCSwitch(true)}
            todayUsage={todayUsage}
            quotaDisplayMode={quotaDisplayMode}
            onToggleQuotaDisplayMode={setQuotaDisplayMode}
          />
        ) : (
          <main className="flex-1 flex flex-col overflow-y-auto bg-[#080a10] no-scrollbar">
            <div className="mx-auto w-full max-w-6xl p-4 sm:p-5 space-y-3">
              {/* Full Dashboard Mode: DIRECT FLAT LAYOUT */}
              <div className="space-y-3">
                {/* Header Toolbar (CCSwitch style: Provider Context, Status, View Modes & Add) */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-[#0c0f18]/90 px-4 py-2.5 shadow-sm backdrop-blur-md">
                  {/* Left: Current Provider Focus Info */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300">
                      {selectedProvider === 'all' ? (
                        <Layers className="h-5 w-5 text-blue-400" />
                      ) : (
                        <ProviderIcon providerId={selectedProvider} className="h-5 w-5 text-blue-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-base font-bold text-white tracking-tight">
                          {selectedProvider === 'all'
                            ? '全平台正版大模型额度总览'
                            : providers[selectedProvider]?.name || selectedProvider}
                        </h1>
                        <span className="rounded-full bg-slate-800/80 px-2 py-0.5 text-xs font-mono text-slate-300 border border-slate-700/50">
                          {filteredAccounts.length} 个账号
                        </span>
                        {activeAccount && activeAccount.provider === selectedProvider && (
                          <span className="rounded bg-blue-500/15 border border-blue-500/30 text-blue-400 px-2 py-0.5 text-xs font-semibold animate-pulse flex items-center gap-1">
                            <Zap className="h-3 w-3 fill-current" />
                            当前主力: {activeAccount.name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 truncate max-w-md">
                        {selectedProvider === 'all'
                          ? `已在侧边栏启用 ${visibleProviderIds.length} 家核心供应商 · 实时监控正版滚动窗口与余额`
                          : providers[selectedProvider]?.description}
                      </p>
                    </div>
                  </div>

                  {/* Right: Actions (Sync CC-Switch, View Mode Toggle, Refresh & Add Button) */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-auto flex-wrap">
                    {/* One-Click Sync with CC-Switch */}
                    <button
                      onClick={() => syncWithCCSwitch(true)}
                      disabled={isSyncingWithCCSwitch}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#121624] px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition-all shadow-sm"
                      title="从本地 CC-Switch 数据库读取号源与用量"
                    >
                      <Database className={`h-3.5 w-3.5 text-blue-400 ${isSyncingWithCCSwitch ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">{isSyncingWithCCSwitch ? '同步中' : '同步号源'}</span>
                    </button>

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

                {/* Content Area: DIRECT FLAT DISPLAY (Zero Nested Box Layers!) */}
                {layoutMode === 'list' ? (
                  /* 1. Flat List View (CCSwitch Inspired) */
                  <div className="space-y-2">
                    {selectedProvider === 'all' ? (
                      /* Grouped with subtle text divider */
                      visibleProviderIds.map((providerKey) => {
                        const pMeta = providers[providerKey];
                        if (!pMeta) return null;
                        const pAccounts = filteredAccounts.filter((a) => a.provider === providerKey);
                        if (pAccounts.length === 0) return null;

                        return (
                          <div key={providerKey} className="space-y-1.5">
                            {/* Clean minimal text divider */}
                            <div className="flex items-center justify-between pt-2.5 pb-1 text-xs text-slate-400">
                              <div className="flex items-center gap-2">
                                <ProviderIcon providerId={providerKey} className="h-3.5 w-3.5 text-blue-400" />
                                <span className="font-semibold text-slate-200">{pMeta.name}</span>
                                <span className="text-[11px] font-mono text-slate-500">({pAccounts.length})</span>
                              </div>
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
                      /* Specific Provider: DIRECT FLAT ROWS */
                      filteredAccounts.map((account) => (
                        <AccountRow
                          key={account.id}
                          account={account}
                          providerMeta={providers[selectedProvider]}
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
                      visibleProviderIds.map((providerKey) => {
                        const pMeta = providers[providerKey];
                        if (!pMeta) return null;
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
                    <p className="text-sm font-medium text-slate-300">当前筛选条件下暂无账号</p>
                    <p className="text-xs text-slate-500 mt-1">
                      可切换「全部号源」或点击右上角「+ 添加账号」为此厂商添加正版账号或中转 API Key
                    </p>
                    <button
                      onClick={() => handleOpenAddModal(selectedProvider !== 'all' ? selectedProvider : undefined)}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-orange-400 hover:text-orange-300"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>立即添加账号</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </main>
        )}
      </div>

      {/* Add Account Modal */}
      <AddAccountModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddAccount}
        initialProvider={modalTargetProvider}
        providersMeta={providers}
      />

      {/* Add Custom Relay Provider Modal */}
      <AddCustomProviderModal
        isOpen={isAddCustomProviderModalOpen}
        onClose={() => setIsAddCustomProviderModalOpen(false)}
        onAddProvider={handleAddCustomProvider}
      />
    </div>
  );
};

export default App;
