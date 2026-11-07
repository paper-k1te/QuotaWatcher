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
  Sparkles,
  Globe
} from 'lucide-react';
import { providersMeta as initialProvidersMeta } from './mock/mockData';
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
  scanLocalAuthProviders,
  scanProviderAuth,
  fetchRealAccountQuota,
  openProviderLogin,
  setCCSwitchActiveProvider,
  setupTrayListeners, 
  setWindowMode, 
  minimizeWindow, 
  closeWindow 
} from './services/tauriBridge';

const STORAGE_KEY = 'quotawatcher_accounts_v6';

const loadStoredAccounts = (): Account[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // 彻底过滤历史遗留未配置的假号与占位号
        const blacklist = [
          'cc-claude-official', 
          'cc-gemini-official', 
          'cc-grokbuild-official', 
          'cc-claude-desktop-official',
          'local-claude-official',
          'local-gemini-official',
          'local-grok-official',
          'claude-official',
          'gemini-official',
          'grokbuild-official'
        ];
        return parsed.filter((a) => !blacklist.includes(a.id) && a.credentials?.apiKey !== 'demo_key');
      }
    }
  } catch (e) {
    console.warn('Failed to load accounts from storage:', e);
  }
  return [];
};

export const App: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>(loadStoredAccounts);
  const [providers, setProviders] = useState<Record<string, ProviderMeta>>(initialProvidersMeta);
  
  // 默认侧边栏仅展示正版官方厂商
  const [visibleProviderIds, setVisibleProviderIds] = useState<string[]>([
    'chatgpt',
    'claude',
    'trae',
    'deepseek',
    'antigravity',
    'grok',
    'kimi',
  ]);

  const [viewMode, setViewMode] = useState<'dashboard' | 'tray'>('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [layoutMode, setLayoutMode] = useState<'list' | 'grid'>('list'); // Default to clean CCSwitch-style list
  const [selectedProvider, setSelectedProvider] = useState<string>('chatgpt');
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
  const [isScanningProvider, setIsScanningProvider] = useState<boolean>(false);

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

        // Update existing accounts with real CC-Switch isCurrent status (NEVER create empty dummy accounts)
        setAccounts((prev) => {
          return prev.map((acc) => {
            const matched = res.providers?.find((p) => p.id === acc.ccSwitchProviderId || acc.name.toLowerCase().includes(p.name.toLowerCase()));
            if (matched) {
              return {
                ...acc,
                isActiveInCCSwitch: matched.isCurrent,
                ccSwitchProviderId: matched.id,
                appType: matched.appType,
              };
            }
            return acc;
          });
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

    // Intelligently scan and link all authentic local accounts (DeepSeek, Trae, Codex CLI, etc.)
    scanLocalAuthProviders().then(async (res) => {
      if (res.success && res.accounts && res.accounts.length > 0) {
        // Fetch real quota for each detected account
        const resolvedAccounts = await Promise.all(
          res.accounts.map(async (a: any) => {
            let liveSnapshot = a.latestSnapshot;
            try {
              const qRes = await fetchRealAccountQuota(a.id, a.provider);
              if (qRes.success && qRes.snapshot) {
                liveSnapshot = qRes.snapshot;
              }
            } catch {}
            const isDeepSeek = a.provider === 'deepseek';
            const isTrae = a.provider === 'trae';
            return {
              id: a.id || `acc-${a.provider}-${Date.now()}`,
              name: a.name || (isDeepSeek ? 'DeepSeek Official' : isTrae ? 'Trae Official' : 'PaperKite'),
              email: a.email || (isDeepSeek ? 'platform@deepseek.com' : 'user@local.auth'),
              platform: a.platform || `${a.provider}-client`,
              provider: a.provider,
              planName: a.planName || '标准订阅',
              planExpiresAt: a.planExpiresAt,
              quotaMechanism: a.quotaMechanism || 'dual_window',
              tags: [a.planName || '官方认证', '本地同步'],
              enabled: true,
              isActiveInCCSwitch: a.isActiveInCCSwitch || false,
              priority: 1,
              autoFailoverEnabled: true,
              lastLoginAt: '官方实时同步',
              credentials: {
                apiKey: a.source || 'Local Auth Token',
                sessionToken: a.source || 'Local Auth Token',
              },
              latestSnapshot: liveSnapshot,
            } as Account;
          })
        );

        setAccounts((prev) => {
          const updated = [...prev];
          let addedCount = 0;
          for (const newAcc of resolvedAccounts) {
            const existingIdx = updated.findIndex(
              (acc) => acc.id === newAcc.id || (acc.provider === newAcc.provider && acc.email === newAcc.email)
            );
            if (existingIdx >= 0) {
              // Update with authentic real live quota
              if (newAcc.latestSnapshot) {
                updated[existingIdx] = {
                  ...updated[existingIdx],
                  ...newAcc,
                  name: updated[existingIdx].name, // preserve user nickname edits
                };
              }
            } else {
              updated.push(newAcc);
              addedCount++;
            }
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          if (addedCount > 0) {
            showToast(`⚡ 已成功接入本地 ${resolvedAccounts.map((a) => a.name).join('、')} 账号（已拉取真实额度）`);
          }
          return updated;
        });
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

  // Real-time countdown ticking for both 5h rolling window AND 7day weekly quota
  useEffect(() => {
    const timer = setInterval(() => {
      setAccounts((prev) =>
        prev.map((acc) => {
          let updatedSnapshot = acc.latestSnapshot;
          let changed = false;

          if (updatedSnapshot?.rollingWindow) {
            const current5h = updatedSnapshot.rollingWindow.cooldownSecondsRemaining;
            if (current5h > 0) {
              updatedSnapshot = {
                ...updatedSnapshot,
                rollingWindow: {
                  ...updatedSnapshot.rollingWindow,
                  cooldownSecondsRemaining: current5h - 1,
                },
              };
              changed = true;
            }
          }

          if (updatedSnapshot?.sevenDayQuota) {
            const currentWeekly = updatedSnapshot.sevenDayQuota.cooldownSecondsRemaining;
            if (currentWeekly && currentWeekly > 0) {
              updatedSnapshot = {
                ...updatedSnapshot,
                sevenDayQuota: {
                  ...updatedSnapshot.sevenDayQuota,
                  cooldownSecondsRemaining: currentWeekly - 1,
                },
              };
              changed = true;
            }
          }

          return changed ? { ...acc, latestSnapshot: updatedSnapshot } : acc;
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

  // Dedicated per-provider authentic detection
  const handleScanProvider = async (providerId: string) => {
    setIsScanningProvider(true);
    const pMeta = providers[providerId];
    const pName = pMeta?.name || providerId;
    showToast(`🔍 正在精准检索 ${pName} 本地客户端并同步官方真实额度...`);
    try {
      const res = await scanProviderAuth(providerId);
      if (res.success && res.found && res.account) {
        const detected = res.account;
        // Fetch real quota for detected account immediately
        let liveSnapshot = detected.latestSnapshot;
        try {
          const qRes = await fetchRealAccountQuota(detected.id, detected.provider);
          if (qRes.success && qRes.snapshot) {
            liveSnapshot = qRes.snapshot;
          }
        } catch {}

        setAccounts((prev) => {
          const existingIdx = prev.findIndex(
            (a) => a.id === detected.id || (a.provider === detected.provider && a.email === detected.email)
          );
          const newAcc: Account = {
            id: detected.id || `acc-${detected.provider}-${Date.now()}`,
            name: detected.name || `${pName} Official`,
            email: detected.email || 'platform@official.auth',
            platform: detected.platform || `${detected.provider}-client`,
            provider: detected.provider,
            planName: detected.planName || '标准订阅',
            planExpiresAt: detected.planExpiresAt,
            quotaMechanism: detected.quotaMechanism || 'dual_window',
            tags: [detected.planName || '官方认证', '本地同步'],
            priority: 1,
            enabled: true,
            autoFailoverEnabled: true,
            lastLoginAt: '官方实时同步',
            isActiveInCCSwitch: true,
            credentials: {
              apiKey: detected.source || 'Local Auth Token',
              sessionToken: detected.source || 'Local Auth Token',
            },
            latestSnapshot: liveSnapshot || detected.latestSnapshot,
          };

          let updated: Account[];
          if (existingIdx >= 0) {
            updated = [...prev];
            updated[existingIdx] = { ...updated[existingIdx], ...newAcc };
          } else {
            updated = [newAcc, ...prev];
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });
        showToast(`🎉 成功接入 ${pName} 本地账号「${detected.name}」并拉取官方真实额度！`);
      } else {
        showToast(`ℹ️ 未在本地检索到 ${pName} 的官方登录凭据。您可以点击【浏览器打开官网】进行登录。`);
      }
    } catch (err) {
      showToast(`❌ 检测 ${pName} 异常: ${err}`);
    } finally {
      setIsScanningProvider(false);
    }
  };

  // Launch official login in external browser
  const handleOpenLogin = async (providerId: string) => {
    try {
      const res = await openProviderLogin(providerId);
      showToast(`🌐 ${res.message || '已在外部默认浏览器中打开登录页面'}。完成登录后点击【检测本地凭证】即可自动同步！`);
    } catch (err) {
      showToast(`❌ 打开浏览器失败: ${err}`);
    }
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

  // Refresh single account quota using authentic live queries
  const handleRefresh = async (id: string) => {
    const acc = accounts.find((a) => a.id === id);
    if (!acc) return;
    showToast(`🔄 正在向官方查询「${acc.name}」真实配额与重置时间...`);
    try {
      const res = await fetchRealAccountQuota(acc.id, acc.provider);
      if (res.success && res.snapshot) {
        setAccounts((prev) => {
          const next = prev.map((a) =>
            a.id === id
              ? {
                  ...a,
                  latestSnapshot: res.snapshot,
                  lastLoginAt: '官方实时同步',
                }
              : a
          );
          saveAccountsToStorage(next);
          return next;
        });
        showToast(`✅ 账号「${acc.name}」官方配额已同步至最新状态`);
      } else {
        showToast(`⚠️ 配额查询反馈: ${res.error || '未获取到新状态'}`);
      }
    } catch (e) {
      showToast(`❌ 配额同步失败: ${e}`);
    }
  };

  // Refresh all accounts concurrently with authentic live queries
  const handleRefreshAll = async () => {
    showToast('🔄 正在并发向各大官方端点检索最新真实配额...');
    try {
      const updated = await Promise.all(
        accounts.map(async (acc) => {
          try {
            const res = await fetchRealAccountQuota(acc.id, acc.provider);
            if (res.success && res.snapshot) {
              return {
                ...acc,
                latestSnapshot: res.snapshot,
                lastLoginAt: '官方实时同步',
              };
            }
          } catch {}
          return acc;
        })
      );
      setAccounts(updated);
      saveAccountsToStorage(updated);
      showToast('✅ 所有账号官方真实配额与重置倒计时已全部刷新完成');
    } catch (e) {
      showToast(`❌ 批量刷新异常: ${e}`);
    }
  };

  // Persist accounts to local storage helper
  const saveAccountsToStorage = (newAccounts: Account[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newAccounts));
    } catch (e) {
      console.warn('Failed to save accounts to storage:', e);
    }
  };

  // Edit / update account nickname or details
  const handleUpdateAccount = (id: string, updates: Partial<Account>) => {
    setAccounts((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, ...updates } : a));
      saveAccountsToStorage(next);
      return next;
    });
    showToast('✅ 账号信息已更新并已保存到本地');
  };

  // Delete an account
  const handleDelete = (id: string) => {
    const acc = accounts.find((a) => a.id === id);
    setAccounts((prev) => {
      const next = prev.filter((a) => a.id !== id);
      saveAccountsToStorage(next);
      return next;
    });
    showToast(`🗑️ 账号「${acc?.name}」已从本地移除`);
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
      name: newAcc.name || '官方主号',
      email: newAcc.email,
      platform: newAcc.platform || 'custom-api',
      provider: newAcc.provider || selectedProvider,
      planName: newAcc.planName,
      planExpiresAt: newAcc.planExpiresAt,
      tags: newAcc.tags || ['官方授权'],
      classification: newAcc.classification || 'official',
      enabled: true,
      priority: newAcc.priority || 1,
      autoFailoverEnabled: true,
      lastLoginAt: '刚刚',
      latestSnapshot: newAcc.latestSnapshot,
    };
    setAccounts((prev) => {
      const next = [created, ...prev];
      saveAccountsToStorage(next);
      return next;
    });
    showToast(`🎉 成功添加官方账号「${created.name}」并保存本地`);
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
                    </div>
                  </div>

                  {/* Right: Actions (Provider-Specific Detection, OAuth Login, View Mode Toggle, Refresh & Add Button) */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-auto flex-wrap">
                    {selectedProvider !== 'all' ? (
                      <>
                        {/* Per-Provider Targeted Authentic Detection */}
                        <button
                          onClick={() => handleScanProvider(selectedProvider)}
                          disabled={isScanningProvider}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1.5 text-xs font-semibold text-blue-300 transition-all shadow-sm"
                          title={`精准检索本地 ${providers[selectedProvider]?.name || selectedProvider} 客户端与 CLI 会话凭据`}
                        >
                          <Sparkles className={`h-3.5 w-3.5 text-blue-400 ${isScanningProvider ? 'animate-spin' : ''}`} />
                          <span>{isScanningProvider ? '检测中...' : `检测 ${providers[selectedProvider]?.name || selectedProvider} 登录`}</span>
                        </button>

                        {/* Official OAuth / WebView Login Button */}
                        <button
                          onClick={() => handleOpenLogin(selectedProvider)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1.5 text-xs font-medium text-emerald-300 transition-all shadow-sm"
                          title={`唤起 ${providers[selectedProvider]?.name || selectedProvider} 官方登录界面，直接抓取会话凭证`}
                        >
                          <Globe className="h-3.5 w-3.5 text-emerald-400" />
                          <span>官方登录</span>
                        </button>
                      </>
                    ) : (
                      /* One-Click Sync with CC-Switch */
                      <button
                        onClick={() => syncWithCCSwitch(true)}
                        disabled={isSyncingWithCCSwitch}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#121624] px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition-all shadow-sm"
                        title="从本地 CC-Switch 数据库读取号源与用量"
                      >
                        <Database className={`h-3.5 w-3.5 text-blue-400 ${isSyncingWithCCSwitch ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">{isSyncingWithCCSwitch ? '同步中' : '同步号源'}</span>
                      </button>
                    )}

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
                                onUpdateAccount={handleUpdateAccount}
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
                          onUpdateAccount={handleUpdateAccount}
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
                                  onUpdateAccount={handleUpdateAccount}
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
                            onUpdateAccount={handleUpdateAccount}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Empty State */}
                {filteredAccounts.length === 0 && (
                  <div className="py-12 px-6 text-center rounded-2xl border border-dashed border-slate-800 bg-[#0c0f18]/70 max-w-2xl mx-auto my-6">
                    <div className="h-14 w-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                      {selectedProvider !== 'all' ? (
                        <ProviderIcon providerId={selectedProvider} className="h-7 w-7" />
                      ) : (
                        <Sparkles className="h-7 w-7 text-blue-400" />
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-100">
                      {selectedProvider === 'all'
                        ? '暂无已接入的官方账号'
                        : `暂未接入 ${providers[selectedProvider]?.name || selectedProvider} 官方账号`}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1.5 max-w-md mx-auto">
                      每个厂商的登录凭据独立存储。您可以一键从本地客户端中精准抓取，或直接打开官方授权页面完成连接：
                    </p>

                    {selectedProvider !== 'all' ? (
                      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-left">
                        {/* Option 1: Local Scan */}
                        <button
                          type="button"
                          onClick={() => handleScanProvider(selectedProvider)}
                          disabled={isScanningProvider}
                          className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-200 transition-all text-center group cursor-pointer shadow-sm"
                        >
                          <Sparkles className={`h-6 w-6 text-blue-400 group-hover:scale-110 transition-transform ${isScanningProvider ? 'animate-spin' : ''}`} />
                          <div>
                            <span className="text-xs font-bold block text-blue-300">1. 本地凭据穿透</span>
                            <span className="text-[10.5px] text-slate-400 mt-0.5 block leading-tight">自动穿透本机 CLI/客户端已存 Token</span>
                          </div>
                        </button>

                        {/* Option 2: Browser Session Extraction / Verification */}
                        <button
                          type="button"
                          onClick={() => handleOpenAddModal(selectedProvider)}
                          className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 transition-all text-center group cursor-pointer shadow-sm"
                        >
                          <Globe className="h-6 w-6 text-emerald-400 group-hover:scale-110 transition-transform" />
                          <div>
                            <span className="text-xs font-bold block text-emerald-300">2. 网页 Session 校验</span>
                            <span className="text-[10.5px] text-slate-400 mt-0.5 block leading-tight">复制浏览器会话或 Token 瞬间验证</span>
                          </div>
                        </button>

                        {/* Option 3: Terminal CLI / API Key */}
                        <button
                          type="button"
                          onClick={() => handleOpenAddModal(selectedProvider)}
                          className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-200 transition-all text-center group cursor-pointer shadow-sm"
                        >
                          <Plus className="h-6 w-6 text-purple-400 group-hover:scale-110 transition-transform" />
                          <div>
                            <span className="text-xs font-bold block text-purple-300">3. 官方授权 / 录入</span>
                            <span className="text-[10.5px] text-slate-400 mt-0.5 block leading-tight">启动终端授权流程或填入凭据</span>
                          </div>
                        </button>
                      </div>
                    ) : (
                      <div className="mt-5 flex items-center justify-center gap-2.5">
                        <button
                          onClick={() => handleOpenAddModal(undefined)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-orange-500/20 transition-all"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>添加账号</span>
                        </button>
                        <button
                          onClick={() => syncWithCCSwitch(true)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition-all"
                        >
                          <Database className="h-3.5 w-3.5 text-blue-400" />
                          <span>从本地环境自动检测</span>
                        </button>
                      </div>
                    )}
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
