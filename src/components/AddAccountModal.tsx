import React, { useState, useEffect } from 'react';
import { 
  X, 
  Key, 
  Sparkles, 
  Globe, 
  Terminal, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { Account, ProviderMeta } from '../types';
import { 
  scanProviderAuth, 
  openProviderLogin, 
  launchCliLogin, 
  parseAndBindSession, 
  fetchRealAccountQuota 
} from '../services/tauriBridge';
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

  // Active onboarding tab: 'local_scan' | 'browser_session' | 'cli_pkce' | 'manual'
  const [activeTab, setActiveTab] = useState<'local_scan' | 'browser_session' | 'cli_pkce' | 'manual'>('local_scan');

  // Session input & verification state
  const [sessionInput, setSessionInput] = useState('');
  const [isVerifyingSession, setIsVerifyingSession] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; message: string; account?: any } | null>(null);

  // Manual form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [planName, setPlanName] = useState('');
  const [planExpiresAt, setPlanExpiresAt] = useState('');
  const [quotaMechanism, setQuotaMechanism] = useState<QuotaMechanism>('dual_window');
  const [balanceAmount, setBalanceAmount] = useState<number>(20.0);
  const [balanceCurrency, setBalanceCurrency] = useState<'CNY' | 'USD'>('CNY');
  const [dailyLimit, setDailyLimit] = useState<number>(1500);
  const [credential, setCredential] = useState('');

  const [isScanning, setIsScanning] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const [cliFeedback, setCliFeedback] = useState<string | null>(null);

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
    setVerifyResult(null);
    setScanFeedback(null);
    setCliFeedback(null);
  }, [selectedProviderId]);

  // Sync initial provider when modal opens
  useEffect(() => {
    if (initialProvider && initialProvider !== 'all') {
      setSelectedProviderId(initialProvider);
    }
  }, [initialProvider, isOpen]);

  if (!isOpen) return null;

  const currentPlans = getPlansForProvider(selectedProviderId);
  const isProviderLocked = Boolean(initialProvider && initialProvider !== 'all');
  const currentMeta = providersMeta[selectedProviderId] || { name: selectedProviderId };

  // 1. One-click scan local client/CLI credentials
  const handleScanProvider = async (pid: string) => {
    setIsScanning(true);
    setScanFeedback(null);
    try {
      const res = await scanProviderAuth(pid);
      if (res.success && res.found && res.account) {
        const match = res.account;
        // Query real quota immediately
        let liveSnapshot = match.latestSnapshot;
        try {
          const qRes = await fetchRealAccountQuota(match.id, match.provider);
          if (qRes.success && qRes.snapshot) {
            liveSnapshot = qRes.snapshot;
          }
        } catch {}

        onAdd({
          ...match,
          latestSnapshot: liveSnapshot,
          lastLoginAt: '本地检索实时同步',
        });
        setScanFeedback(`🎉 成功接入本地官方凭据：${match.name} (${match.source || '已同步'})`);
        setTimeout(() => onClose(), 1200);
      } else {
        setScanFeedback(`ℹ️ ${res.message || '未在本地检索到此厂商登录态。建议使用下方的【网页 Session 提取】或【官方终端授权】'}`);
      }
    } catch (e) {
      console.warn('Scan local error:', e);
      setScanFeedback('❌ 检索本地凭据发生异常');
    } finally {
      setIsScanning(false);
    }
  };

  // 2. Launch CLI PKCE terminal login
  const handleLaunchCli = async (pid: string) => {
    setCliFeedback(null);
    try {
      const res = await launchCliLogin(pid);
      if (res.success) {
        setCliFeedback(`🚀 ${res.message || '已调起官方授权终端，请在浏览器中确认授权'}`);
      } else {
        setCliFeedback(`⚠️ ${res.message || '未找到该平台的本地 CLI 登录命令'}`);
      }
    } catch (e) {
      setCliFeedback(`❌ 调起终端失败: ${e}`);
    }
  };

  // 3. Verify and bind pasted browser Session / API Key
  const handleVerifyAndBind = async () => {
    if (!sessionInput.trim()) return;
    setIsVerifyingSession(true);
    setVerifyResult(null);

    try {
      const res = await parseAndBindSession(selectedProviderId, sessionInput.trim());
      if (res.success && res.account) {
        setVerifyResult({
          success: true,
          message: `🎉 验证成功！已连接 ${res.account.name} (${res.account.email})`,
          account: res.account,
        });
        // Automatically add to list
        onAdd(res.account);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setVerifyResult({
          success: false,
          message: res.error || '凭证验证未通过，请检查是否已登录或已复制完整内容',
        });
      }
    } catch (e) {
      setVerifyResult({
        success: false,
        message: `验证失败: ${e}`,
      });
    } finally {
      setIsVerifyingSession(false);
    }
  };

  // 4. Fallback: manual form submit
  const handleManualSubmit = (e: React.FormEvent) => {
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
    } else if (quotaMechanism === 'daily_quota') {
      snapshot = {
        timestamp: new Date().toISOString(),
        isHealthy: true,
        isExhausted: false,
        isWarning: false,
        kind: 'daily_quota',
        dailyQuota: {
          used: 0,
          limit: dailyLimit || 500,
          resetsAt: '次日 00:00',
          cooldownSecondsRemaining: 3600 * 20,
        },
        quotaMechanism: 'daily_quota',
      };
    } else {
      snapshot = {
        timestamp: new Date().toISOString(),
        isHealthy: true,
        isExhausted: false,
        isWarning: false,
        kind: 'rolling_window',
        rollingWindow: {
          used: 0,
          total: selectedProviderId === 'chatgpt' ? 80 : 50,
          windowDurationHours: 5,
          resetsAt: '预计 5小时后',
          cooldownSecondsRemaining: 18000,
        },
        sevenDayQuota: {
          usedPercent: 0,
          totalPercent: 100,
          cooldownSecondsRemaining: 3600 * 24 * 7,
          resetsAt: '周日 14:30',
          label: '0% 极充沛',
        },
        quotaMechanism: 'dual_window',
      };
    }

    onAdd({
      id: `manual-${selectedProviderId}-${Date.now()}`,
      name: name.trim(),
      email: email.trim() || undefined,
      provider: selectedProviderId,
      platform: `${selectedProviderId}-custom`,
      planName: planName || '自定义订阅',
      planExpiresAt: planExpiresAt || undefined,
      quotaMechanism,
      tags: ['手动添加', planName || '自定义'],
      enabled: true,
      isActiveInCCSwitch: false,
      priority: 1,
      autoFailoverEnabled: true,
      lastLoginAt: '手动录入',
      credentials: {
        apiKey: credential.trim() || 'custom-key',
      },
      latestSnapshot: snapshot,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-800 bg-[#0c101d] p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-400 shadow-sm">
            <ProviderIcon providerId={selectedProviderId} className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>接入 {currentMeta.name} 账号凭据</span>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                真实授权体系
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              解决纯网页登录无法向桌面端回传授权的问题，提供本地穿透、官方终端授权与 Session 校验三通道
            </p>
          </div>
        </div>

        {/* Provider Switcher (if not locked) */}
        {!isProviderLocked && (
          <div className="mb-4">
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">选择目标厂商</label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {providerList.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProviderId(p.id)}
                  className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border text-xs transition-all ${
                    selectedProviderId === p.id
                      ? 'border-blue-500 bg-blue-500/15 text-white font-semibold'
                      : 'border-slate-800 bg-[#080b14] text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <ProviderIcon providerId={p.id} className="h-4 w-4" />
                  <span className="text-[11px] truncate max-w-full">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 rounded-xl bg-slate-900/90 border border-slate-800 p-1 mb-5">
          <button
            type="button"
            onClick={() => setActiveTab('local_scan')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'local_scan'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>1. 本地凭据穿透</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('browser_session')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'browser_session'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>2. 网页 Session 校验</span>
          </button>

          {(selectedProviderId === 'chatgpt' || selectedProviderId === 'claude') && (
            <button
              type="button"
              onClick={() => setActiveTab('cli_pkce')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'cli_pkce'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>3. 官方终端授权</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
              activeTab === 'manual'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="h-3.5 w-3.5" />
            <span>手动录入</span>
          </button>
        </div>

        {/* Tab 1 Content: Local Scan */}
        {activeTab === 'local_scan' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs text-slate-300">
              <div className="flex items-center gap-2 font-bold text-blue-300 mb-2">
                <ShieldCheck className="h-4 w-4 text-blue-400" />
                <span>自动穿透本机已保存的官方登录会话</span>
              </div>
              <p className="leading-relaxed text-slate-400">
                如果您的电脑上曾运行过官方 CLI、桌面客户端或 CC-Switch，登录态通常以加密令牌保存在系统目录中：
              </p>
              <ul className="mt-2.5 space-y-1.5 font-mono text-[11px] text-slate-400">
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                  <span>ChatGPT: 自动穿透 ~/.codex/auth.json 与 CC-Switch 授权</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                  <span>DeepSeek: 自动穿透 ~/.dsh/.credentials.yaml 与 proxy 日志</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                  <span>Trae: 自动穿透 ~/.trae-cn/trae-jwt-token 开发者凭证</span>
                </li>
              </ul>
            </div>

            {scanFeedback && (
              <div className="rounded-xl border border-slate-800 bg-[#080b13] p-3 text-xs font-mono text-slate-200">
                {scanFeedback}
              </div>
            )}

            <button
              type="button"
              onClick={() => handleScanProvider(selectedProviderId)}
              disabled={isScanning}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 py-3 text-xs font-bold text-white transition-all shadow-lg shadow-blue-900/30 active:scale-98 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`h-4 w-4 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? '正在扫描本机凭证与验证官方配额...' : `立即检测并接入本地 ${currentMeta.name} 凭据`}</span>
            </button>
          </div>
        )}

        {/* Tab 2 Content: Browser Session Extraction */}
        {activeTab === 'browser_session' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs text-slate-300">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-emerald-400" />
                  网页端 Session 一键提取指引
                </span>
                {selectedProviderId === 'chatgpt' && (
                  <button
                    type="button"
                    onClick={() => openProviderLogin('chatgpt')}
                    className="inline-flex items-center gap-1 text-[11px] text-emerald-300 hover:text-white underline cursor-pointer"
                  >
                    <span>打开 session 页面</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                )}
              </div>

              {selectedProviderId === 'chatgpt' ? (
                <div className="text-[11.5px] text-slate-400 space-y-1 leading-relaxed">
                  <p>1. 确保外部浏览器已登录 ChatGPT。</p>
                  <p>2. 在浏览器中打开：<code className="text-emerald-300 bg-slate-900 px-1 py-0.5 rounded">https://chatgpt.com/api/auth/session</code></p>
                  <p>3. 页面将显示一段 JSON（包含 accessToken）。全选复制并粘贴到下方输入框，点击【验证并接入】即可！</p>
                </div>
              ) : selectedProviderId === 'deepseek' ? (
                <div className="text-[11.5px] text-slate-400 space-y-1 leading-relaxed">
                  <p>在 DeepSeek 开放平台创建 API Key（格式如 <code className="text-emerald-300 bg-slate-900 px-1 py-0.5 rounded">sk-...</code>），直接粘贴到下方输入框完成校验接入。</p>
                </div>
              ) : selectedProviderId === 'claude' ? (
                <div className="text-[11.5px] text-slate-400 space-y-1 leading-relaxed">
                  <p>在已登录的 claude.ai 网页中按 F12 → Application → Cookies，复制 <code className="text-emerald-300 bg-slate-900 px-1 py-0.5 rounded">sessionKey</code> 粘贴到下方。</p>
                </div>
              ) : (
                <div className="text-[11.5px] text-slate-400 space-y-1 leading-relaxed">
                  <p>粘贴该平台的授权 Token 或 API Key，QuotaWatcher 将即刻校验连通性并拉取额度。</p>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                在此粘贴 Session JSON / Access Token / API Key
              </label>
              <textarea
                value={sessionInput}
                onChange={(e) => setSessionInput(e.target.value)}
                placeholder={
                  selectedProviderId === 'chatgpt'
                    ? '粘贴来自 https://chatgpt.com/api/auth/session 的整段 JSON 或 eyJhbGciOi... Token'
                    : '在此粘贴您的 Token 或 API Key'
                }
                rows={4}
                className="w-full rounded-xl border border-slate-700 bg-[#080b13] p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>

            {verifyResult && (
              <div className={`rounded-xl border p-3 text-xs font-mono flex items-center gap-2 ${
                verifyResult.success
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
              }`}>
                {verifyResult.success ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                )}
                <span>{verifyResult.message}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleVerifyAndBind}
              disabled={isVerifyingSession || !sessionInput.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3 text-xs font-bold text-white transition-all shadow-lg shadow-emerald-900/30 active:scale-98 cursor-pointer disabled:opacity-40"
            >
              <CheckCircle2 className={`h-4 w-4 ${isVerifyingSession ? 'animate-spin' : ''}`} />
              <span>{isVerifyingSession ? '正在连接官方端点校验凭证真伪...' : '🚀 实时校验凭证并绑定入库'}</span>
            </button>
          </div>
        )}

        {/* Tab 3 Content: Official CLI PKCE Terminal */}
        {activeTab === 'cli_pkce' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 text-xs text-slate-300">
              <div className="flex items-center gap-2 font-bold text-purple-300 mb-2">
                <Terminal className="h-4 w-4 text-purple-400" />
                <span>官方 CLI 终端回环授权流程 (PKCE)</span>
              </div>
              <p className="leading-relaxed text-slate-400">
                通过系统已安装的官方 CLI 启动本地端口监听，外部浏览器完成授权后，Token 将自动回写至系统本地凭据目录（~/.codex/auth.json 等），安全合规且无需手动复制。
              </p>
            </div>

            {cliFeedback && (
              <div className="rounded-xl border border-purple-500/30 bg-[#080b13] p-3 text-xs font-mono text-purple-200">
                {cliFeedback}
              </div>
            )}

            <button
              type="button"
              onClick={() => handleLaunchCli(selectedProviderId)}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 py-3 text-xs font-bold text-white transition-all shadow-lg shadow-purple-900/30 active:scale-98 cursor-pointer"
            >
              <Terminal className="h-4 w-4" />
              <span>启动 {currentMeta.name} 官方终端授权流程</span>
            </button>
          </div>
        )}

        {/* Tab 4 Content: Manual Configuration */}
        {activeTab === 'manual' && (
          <form onSubmit={handleManualSubmit} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">账号昵称</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如: 主力 ChatGPT Plus"
                  required
                  className="w-full rounded-xl border border-slate-700 bg-[#080b13] px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">账号邮箱 / UID</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full rounded-xl border border-slate-700 bg-[#080b13] px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">选择/输入套餐</label>
                {currentPlans.length > 0 ? (
                  <select
                    value={planName}
                    onChange={(e) => {
                      setPlanName(e.target.value);
                      const f = currentPlans.find((p) => p.name === e.target.value);
                      if (f) setQuotaMechanism(f.quotaMechanism);
                    }}
                    className="w-full rounded-xl border border-slate-700 bg-[#080b13] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                  >
                    {currentPlans.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="例如: Plus / Pro / 满血版"
                    className="w-full rounded-xl border border-slate-700 bg-[#080b13] px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none"
                  />
                )}
              </div>

              {quotaMechanism === 'balance_only' ? (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">初始余额 ({balanceCurrency})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={balanceAmount}
                    onChange={(e) => setBalanceAmount(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-700 bg-[#080b13] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">订阅到期日 (可选)</label>
                  <input
                    type="date"
                    value={planExpiresAt}
                    onChange={(e) => setPlanExpiresAt(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-[#080b13] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">API Key / 鉴权令牌 (可选)</label>
              <input
                type="password"
                value={credential}
                onChange={(e) => setCredential(e.target.value)}
                placeholder="sk-..."
                className="w-full rounded-xl border border-slate-700 bg-[#080b13] px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 py-2.5 text-xs font-bold text-white transition-all shadow-md mt-2"
            >
              保存并加入账号列表
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
