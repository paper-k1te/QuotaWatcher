import React, { useState, useEffect } from 'react';
import { X, Key, PlusCircle, Sparkles, Coins, Clock, Calendar, Globe } from 'lucide-react';
import { Account, ProviderMeta } from '../types';
import { scanProviderAuth, openProviderLogin } from '../services/tauriBridge';
import { getPlansForProvider, QuotaMechanism } from '../mock/providerPlans';
import { ProviderIcon } from './ProviderIcons';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (account: Partial<Account>) => void;
  initialProvider?: string;
  providersMeta: Record<string, ProviderMeta>;
}

export const AddAccountModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onAdd,
  initialProvider,
  providersMeta,
}) => {
  const providerList = Object.values(providersMeta);
  const [selectedProviderId, setSelectedProviderId] = useState<string>(
    initialProvider && initialProvider !== 'all' ? initialProvider : 'chatgpt'
  );
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [planName, setPlanName] = useState('');
  const [planExpiresAt, setPlanExpiresAt] = useState('');
  const [quotaMechanism, setQuotaMechanism] = useState<QuotaMechanism>('dual_window');
  const [balanceAmount, setBalanceAmount] = useState<number>(20.0);
  const [balanceCurrency, setBalanceCurrency] = useState<'CNY' | 'USD'>('CNY');
  const [dailyLimit, setDailyLimit] = useState<number>(1500);
  const [credential, setCredential] = useState('');
  const priority = 1;
  const [isScanning, setIsScanning] = useState(false);

  // Sync plans when provider changes
  useEffect(() => {
    const plans = getPlansForProvider(selectedProviderId);
    if (plans.length > 0) {
      setPlanName(plans[0].name);
      setQuotaMechanism(plans[0].quotaMechanism);
      if (plans[0].defaultCurrency) {
        setBalanceCurrency(plans[0].defaultCurrency);
      }
      if (plans[0].defaultDailyLimit) {
        setDailyLimit(plans[0].defaultDailyLimit);
      }
    }
  }, [selectedProviderId]);

  // Sync initial provider when modal opens
  useEffect(() => {
    if (initialProvider && initialProvider !== 'all') {
      setSelectedProviderId(initialProvider);
    }
  }, [initialProvider, isOpen]);

  if (!isOpen) return null;

  const currentPlans = getPlansForProvider(selectedProviderId);

  // Handle plan dropdown change
  const handlePlanChange = (pName: string) => {
    setPlanName(pName);
    const found = currentPlans.find((p) => p.name === pName);
    if (found) {
      setQuotaMechanism(found.quotaMechanism);
      if (found.defaultCurrency) setBalanceCurrency(found.defaultCurrency);
      if (found.defaultDailyLimit) setDailyLimit(found.defaultDailyLimit);
    }
  };

  const isProviderLocked = Boolean(initialProvider && initialProvider !== 'all');
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);

  // Auto scan specific provider
  const handleScanProvider = async (pid: string) => {
    setIsScanning(true);
    setScanFeedback(null);
    try {
      const res = await scanProviderAuth(pid);
      if (res.success && res.found && res.account) {
        const match = res.account;
        setSelectedProviderId(match.provider || pid);
        setName(match.name || '');
        setEmail(match.email || '');
        if (match.planName) setPlanName(match.planName);
        if (match.planExpiresAt) setPlanExpiresAt(match.planExpiresAt);
        if (match.quotaMechanism) setQuotaMechanism(match.quotaMechanism);
        if (match.currency) setBalanceCurrency(match.currency);
        if (match.balance) setBalanceAmount(match.balance);
        if (match.dailyLimit) setDailyLimit(match.dailyLimit);
        setScanFeedback(`✅ 已自动抓取到本地官方凭据：${match.source || '本地登录会话'}`);
      } else {
        setScanFeedback(`ℹ️ ${res.message || '未在本地检索到此厂商登录态，请使用官方登录'}`);
      }
    } catch (e) {
      console.warn('Scan local error:', e);
      setScanFeedback('❌ 检索本地凭据发生异常');
    } finally {
      setIsScanning(false);
    }
  };

  const handleOpenLogin = async (pid: string) => {
    try {
      const res = await openProviderLogin(pid);
      setScanFeedback(`🌐 ${res.message || '已唤起官方登录界面'}。完成登录后点击【检测本地登录】即可同步！`);
    } catch (e) {
      setScanFeedback('❌ 唤起官方登录界面失败');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let snapshot: any;
    if (quotaMechanism === 'balance_only') {
      snapshot = {
        timestamp: new Date().toISOString(),
        isHealthy: true,
        isExhausted: false,
        isWarning: false,
        kind: 'currency_balance',
        currencyBalance: {
          currency: balanceCurrency,
          balance: Number(balanceAmount) || 20.0,
        },
        quotaMechanism: 'balance_only',
      };
    } else if (quotaMechanism === 'weekly_only') {
      snapshot = {
        timestamp: new Date().toISOString(),
        isHealthy: true,
        isExhausted: false,
        isWarning: false,
        kind: 'periodic_tier',
        sevenDayQuota: {
          usedPercent: 20,
          totalPercent: 100,
          cooldownSecondsRemaining: 3600 * 24 * 4 + 3600 * 18,
          resetsAt: '周一 00:00',
          label: '20% 充沛',
        },
        quotaMechanism: 'weekly_only',
      };
    } else if (quotaMechanism === 'daily_quota') {
      snapshot = {
        timestamp: new Date().toISOString(),
        isHealthy: true,
        isExhausted: false,
        isWarning: false,
        kind: 'periodic_tier',
        periodicTier: {
          period: 'day',
          used: 120,
          limit: dailyLimit || 1500,
          unit: '次/天',
          resetsAt: new Date(Date.now() + 86400 * 1000).toISOString(),
        },
        rollingWindow: {
          used: 120,
          total: dailyLimit || 1500,
          windowDurationHours: 24,
          resetsAt: '次日 00:00',
          cooldownSecondsRemaining: 3600 * 22,
        },
        quotaMechanism: 'daily_quota',
      };
    } else {
      // dual_window
      snapshot = {
        timestamp: new Date().toISOString(),
        isHealthy: true,
        isExhausted: false,
        isWarning: false,
        kind: 'rolling_window',
        rollingWindow: {
          used: 12,
          total: selectedProviderId === 'chatgpt' ? 80 : selectedProviderId === 'deepseek' ? 50 : 45,
          windowDurationHours: 5,
          resetsAt: new Date(Date.now() + 3600 * 2.5 * 1000).toISOString(),
          cooldownSecondsRemaining: Math.floor(3600 * 2.5),
        },
        sevenDayQuota: {
          usedPercent: 25,
          totalPercent: 100,
          cooldownSecondsRemaining: 3600 * 24 * 4 + 3600 * 18,
          resetsAt: '周一 00:00',
          label: '25% 充沛',
        },
        quotaMechanism: 'dual_window',
      };
    }

    onAdd({
      name: name.trim(),
      email: email.trim() || undefined,
      platform: 'custom-api',
      provider: selectedProviderId,
      planName: planName || undefined,
      planExpiresAt: planExpiresAt || undefined,
      quotaMechanism,
      tags: [planName || '标准订阅', '官方授权'],
      priority,
      enabled: true,
      autoFailoverEnabled: true,
      lastLoginAt: '刚刚',
      credentials: {
        apiKey: credential.trim(),
        sessionToken: credential.trim(),
      },
      latestSnapshot: snapshot,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0e121d] p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <PlusCircle className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">添加官方授权账号</h2>
              <p className="text-[11px] text-slate-400">支持各厂家专属套餐、不同使用形式与本地自动识别</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {/* Feedback banner */}
          {scanFeedback && (
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-2.5 text-xs text-blue-200 flex items-center justify-between">
              <span>{scanFeedback}</span>
              <button
                type="button"
                onClick={() => setScanFeedback(null)}
                className="text-slate-400 hover:text-slate-200 ml-2"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Provider Selection OR Locked Provider Info */}
          {isProviderLocked ? (
            <div className="flex items-center justify-between rounded-xl border border-blue-500/30 bg-blue-950/20 p-2.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-blue-400 shrink-0">
                  <ProviderIcon providerId={selectedProviderId} className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-100">
                      {providersMeta[selectedProviderId]?.name || selectedProviderId}
                    </span>
                    <span className="rounded bg-blue-500/20 border border-blue-500/40 px-1.5 py-0.5 text-[10px] font-semibold text-blue-300">
                      当前选定厂商
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-400 mt-0.5">自动联动该厂专属套餐、配额机制与本地凭据</p>
                </div>
              </div>

              {/* Direct Actions for this provider */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleScanProvider(selectedProviderId)}
                  disabled={isScanning}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-sm"
                  title="精准抓取本地登录态与 Token"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {isScanning ? '检测中...' : '检测本地登录'}
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenLogin(selectedProviderId)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 transition-colors"
                  title="调用官方登录界面，直接抓取账户信息"
                >
                  <Globe className="h-3.5 w-3.5" />
                  官方登录
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-300">
                  所属服务 / 厂商
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleScanProvider(selectedProviderId)}
                    disabled={isScanning}
                    className="text-[11px] text-blue-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <Sparkles className="h-3 w-3" />
                    {isScanning ? '检测中...' : `检测 ${providersMeta[selectedProviderId]?.name || selectedProviderId} 本地凭证`}
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={() => handleOpenLogin(selectedProviderId)}
                    className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <Globe className="h-3 w-3" />
                    官方登录
                  </button>
                </div>
              </div>
              <select
                value={selectedProviderId}
                onChange={(e) => setSelectedProviderId(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
              >
                {providerList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Account Name */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              账号昵称 <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如：我的官方主号、团队主力号等"
              className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              账号邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="如：name@gmail.com"
              className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 font-mono focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Plan Tier & Expiry Date Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                该厂专属套餐 / 档位
              </label>
              <select
                value={planName}
                onChange={(e) => handlePlanChange(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-2.5 py-1.5 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
              >
                {currentPlans.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                订阅到期时间
              </label>
              <input
                type="date"
                value={planExpiresAt}
                onChange={(e) => setPlanExpiresAt(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Quota Mechanism Selector (核心变通：使用形式) */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              配额使用形式 (根据各厂商实际计费模型变通)
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setQuotaMechanism('dual_window')}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-left transition-all ${
                  quotaMechanism === 'dual_window'
                    ? 'border-blue-500 bg-blue-500/15 text-blue-300'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Clock className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                <div>
                  <div className="font-semibold text-slate-200">双重滚动配额</div>
                  <div className="text-[10px] text-slate-400">5h 滚动 + 7天周度</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setQuotaMechanism('weekly_only')}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-left transition-all ${
                  quotaMechanism === 'weekly_only'
                    ? 'border-purple-500 bg-purple-500/15 text-purple-300'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 shrink-0 text-purple-400" />
                <div>
                  <div className="font-semibold text-slate-200">纯周度配额</div>
                  <div className="text-[10px] text-slate-400">按 1 Week 循环重置</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setQuotaMechanism('daily_quota')}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-left transition-all ${
                  quotaMechanism === 'daily_quota'
                    ? 'border-blue-500 bg-blue-500/15 text-blue-300'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Clock className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                <div>
                  <div className="font-semibold text-slate-200">每日定额 (RPD)</div>
                  <div className="text-[10px] text-slate-400">次日 00:00 自动刷新</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setQuotaMechanism('balance_only')}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-left transition-all ${
                  quotaMechanism === 'balance_only'
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Coins className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                <div>
                  <div className="font-semibold text-slate-200">纯按量余额</div>
                  <div className="text-[10px] text-slate-400">实时扣费 · 无周期限制</div>
                </div>
              </button>
            </div>
          </div>

          {/* Conditional inputs based on Quota Mechanism */}
          {quotaMechanism === 'balance_only' && (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
              <div>
                <label className="block text-xs font-medium text-emerald-300 mb-1">
                  初始账户余额
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-emerald-300 mb-1">
                  结算币种
                </label>
                <select
                  value={balanceCurrency}
                  onChange={(e) => setBalanceCurrency(e.target.value as 'CNY' | 'USD')}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-2.5 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="CNY">人民币 (CNY ￥)</option>
                  <option value="USD">美元 (USD $)</option>
                </select>
              </div>
            </div>
          )}

          {quotaMechanism === 'daily_quota' && (
            <div className="p-3 rounded-xl border border-sky-500/30 bg-sky-500/5">
              <label className="block text-xs font-medium text-sky-300 mb-1">
                每日可用请求限额 (次/天)
              </label>
              <input
                type="number"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(Number(e.target.value))}
                placeholder="如 1500"
                className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:border-sky-500 focus:outline-none"
              />
            </div>
          )}

          {/* Credential / Token */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Session Token / API Key / 凭据 (选填，仅加密保存在本地)
            </label>
            <div className="relative">
              <input
                type="password"
                value={credential}
                onChange={(e) => setCredential(e.target.value)}
                placeholder="sk-... 或 Session Token"
                className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 font-mono focus:border-blue-500 focus:outline-none"
              />
              <Key className="absolute right-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-800 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            >
              取消
            </button>
            <button
              type="submit"
              className="rounded-lg bg-orange-500 hover:bg-orange-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-orange-500/20"
            >
              确认添加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
