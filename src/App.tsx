import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Plus, 
  RotateCw, 
  Bell, 
  ShieldCheck, 
  Monitor,
  AppWindow,
  Search,
} from 'lucide-react';
import { initialAccounts } from './mock/mockData';
import { Account } from './types';
import { AccountCard } from './components/AccountCard';
import { CCSwitchSynergyBanner } from './components/CCSwitchSynergyBanner';
import { TrayMiniWidget } from './components/TrayMiniWidget';
import { AddAccountModal } from './components/AddAccountModal';
import { checkCCSwitchInstalled, setupTrayListeners } from './services/tauriBridge';

export const App: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [viewMode, setViewMode] = useState<'dashboard' | 'tray'>('dashboard');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoSwitchEnabled, setAutoSwitchEnabled] = useState<boolean>(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
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

  // Real-time ticking: decrement cooldownSecondsRemaining every second
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
                // If countdown reaches 0, clear exhausted flag
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

  // Simulate Exhaustion & Auto-Failover to next backup account
  const handleSimulateFailover = () => {
    const currentActive = accounts.find((a) => a.isActiveInCCSwitch);
    if (!currentActive) {
      showToast('⚠️ 当前没有已激活的 CC-Switch 账号');
      return;
    }

    // 1. Mark current as exhausted
    // 2. Find next healthy account with same platform or highest priority
    const candidates = accounts.filter(
      (a) => a.id !== currentActive.id && a.enabled && !a.latestSnapshot?.isExhausted
    );

    if (candidates.length === 0) {
      showToast('❌ 告警: 所有备用账号均已耗尽，请补充新账号！');
      return;
    }

    // Sort by priority (P1 > P2 > P3)
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
    // Simulated refresh jitter
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

  // Add account
  const handleAddAccount = (newAcc: Partial<Account>) => {
    const account: Account = {
      id: `acc-${Date.now()}`,
      name: newAcc.name || '新账号',
      platform: newAcc.platform || 'deepseek',
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

  // Filtered accounts
  const filteredAccounts = accounts.filter((acc) => {
    const matchSearch =
      acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchSearch) return false;

    if (filterPlatform === 'all') return true;
    if (filterPlatform === 'rolling') return acc.latestSnapshot?.kind === 'rolling_window';
    if (filterPlatform === 'balance') return acc.latestSnapshot?.kind === 'currency_balance';
    if (filterPlatform === 'tier') return acc.latestSnapshot?.kind === 'periodic_tier';
    return true;
  });

  const activeAccount = accounts.find((a) => a.isActiveInCCSwitch);
  const warningCount = accounts.filter(
    (a) => a.latestSnapshot?.isWarning || a.latestSnapshot?.isExhausted
  ).length;

  return (
    <div className="min-h-screen bg-[#090b11] text-slate-100 flex flex-col">
      {/* Toast Alert Notification */}
      {notification && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl border border-blue-500/40 bg-[#121624]/95 px-4 py-2.5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-200">
          <Bell className="h-4 w-4 text-blue-400 animate-bounce" />
          <span className="text-xs font-medium text-slate-100">{notification}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#0c0f17]/90 backdrop-blur-md px-6 py-3.5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          {/* Logo & Slogan */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-md shadow-blue-500/20">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base tracking-tight text-white">
                  QuotaWatcher
                </h1>
                <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400 border border-blue-500/20">
                  v0.1.0-alpha
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                多平台 AI 额度哨兵 · 实时监控 · 协同切号
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="hidden lg:flex items-center gap-6 rounded-xl border border-slate-800/80 bg-[#111420]/60 px-4 py-1.5 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">监控总账号:</span>
              <span className="font-mono font-semibold text-slate-100">{accounts.length}</span>
            </div>
            <div className="h-3 w-px bg-slate-800" />
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">告警/耗尽:</span>
              <span className={`font-mono font-semibold ${warningCount > 0 ? 'text-amber-400' : 'text-slate-100'}`}>
                {warningCount}
              </span>
            </div>
            <div className="h-3 w-px bg-slate-800" />
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">CC-Switch:</span>
              <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                <ShieldCheck className="h-3.5 w-3.5" />
                已连通
              </span>
            </div>
          </div>

          {/* View Mode Toggle & Action Buttons */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center rounded-lg border border-slate-800 bg-[#121522] p-0.5 text-xs">
              <button
                onClick={() => setViewMode('dashboard')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all ${
                  viewMode === 'dashboard'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <AppWindow className="h-3.5 w-3.5" />
                完整看板
              </button>
              <button
                onClick={() => setViewMode('tray')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all ${
                  viewMode === 'tray'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Monitor className="h-3.5 w-3.5" />
                托盘小部件
              </button>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 shadow-md shadow-blue-600/20 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              添加账号
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto flex-1 w-full max-w-7xl px-6 py-6 space-y-6">
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
                Windows 任务栏 / macOS 状态栏弹窗预览
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                极简、低干扰、点击托盘图标一键呼出，实时观察剩余冷却与用量
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
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-1 overflow-x-auto text-xs">
                {[
                  { id: 'all', label: '全部形态' },
                  { id: 'rolling', label: '滚动窗口 (Claude/GPT)' },
                  { id: 'balance', label: '账户余额 (DeepSeek/硅基)' },
                  { id: 'tier', label: '免费周期配额 (Gemini)' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterPlatform(tab.id)}
                    className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
                      filterPlatform === tab.id
                        ? 'bg-slate-800 text-blue-400 border border-slate-700'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="按名称或标签搜索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-48 sm:w-60 rounded-lg border border-slate-800 bg-[#10131f] pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <button
                  onClick={handleRefreshAll}
                  className="rounded-lg border border-slate-800 bg-[#121522] p-1.5 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
                  title="刷新所有账号"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Account Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

            {filteredAccounts.length === 0 && (
              <div className="py-12 text-center text-slate-400">
                <p className="text-sm">没有匹配的账号</p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="mt-2 text-xs text-blue-400 hover:underline"
                >
                  点击添加新账号
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Add Account Modal */}
      <AddAccountModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddAccount}
      />
    </div>
  );
};
export default App;
