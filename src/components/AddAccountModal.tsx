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
  ShieldCheck,
  Copy,
  Check
} from 'lucide-react';
import { Account, ProviderMeta } from '../types';
import { 
  scanProviderAuth, 
  openProviderLogin, 
  startOAuthLogin,
  launchCliLogin, 
  parseAndBindSession, 
  fetchRealAccountQuota,
  OPENAI_OAUTH_URL,
  PROVIDER_AUTH_URLS
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

  // Active onboarding tab: 'oauth_pkce' (Primary) | 'local_scan' | 'browser_session' | 'manual'
  const [activeTab, setActiveTab] = useState<'oauth_pkce' | 'local_scan' | 'browser_session' | 'manual'>('oauth_pkce');

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
  const [oauthFeedback, setOauthFeedback] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isLaunchingOAuth, setIsLaunchingOAuth] = useState(false);

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

  // 1. Launch Official OAuth PKCE Login
  const handleLaunchOAuth = async (pid: string) => {
    setIsLaunchingOAuth(true);
    setOauthFeedback(null);
    try {
      const res = await startOAuthLogin(pid);
      if (res.success) {
        setOauthFeedback(`🚀 ${res.message || '已打开官方授权登录页面，授权完成后即可自动接入'}`);
      } else {
        setOauthFeedback(`⚠️ 调起授权页面失败: ${res.message || '未知错误'}`);
      }
    } catch (e) {
      setOauthFeedback(`❌ 调起授权异常: ${e}`);
    } finally {
      setIsLaunchingOAuth(false);
    }
  };

  const handleCopyAuthUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // 2. One-click scan local client/CLI credentials
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
          isLoggedIn: true,
          status: 'active',
          latestSnapshot: liveSnapshot,
          lastLoginAt: '本地检索实时同步',
        });
        setScanFeedback(`🎉 成功接入本地官方凭据：${match.name} (${match.source || '已同步'})`);
        setTimeout(() => onClose(), 1200);
      } else {
        setScanFeedback(`ℹ️ ${res.message || '未在本地检索到此厂商登录态。建议使用上方的【官方网页授权】或【网页 Session 校验】'}`);
      }
    } catch (e) {
      console.warn('Scan local error:', e);
      setScanFeedback('❌ 检索本地凭据发生异常');
    } finally {
      setIsScanning(false);
    }
  };

  // 3. Launch CLI PKCE terminal login
  const handleLaunchCli = async (pid: string) => {
    setOauthFeedback(null);
    try {
      const res = await launchCliLogin(pid);
      if (res.success) {
        setOauthFeedback(`🚀 ${res.message || '已调起官方授权终端，请在浏览器中确认授权'}`);
      } else {
        setOauthFeedback(`⚠️ ${res.message || '未找到该平台的本地 CLI 登录命令'}`);
      }
    } catch (e) {
      setOauthFeedback(`❌ 调起终端失败: ${e}`);
    }
  };

  // 4. Verify and bind pasted browser Session / API Key
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
        // Automatically add to list with isLoggedIn: true
        onAdd({
          ...res.account,
          isLoggedIn: true,
          status: 'active',
        });
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

  // 5. Fallback: manual form submit
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

    const hasCred = Boolean(credential.trim());
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
      isLoggedIn: hasCred,
      status: hasCred ? 'active' : 'unauthorized',
      isActiveInCCSwitch: false,
      priority: 1,
      autoFailoverEnabled: true,
      lastLoginAt: hasCred ? '手动录入' : '待授权',
      credentials: {
        apiKey: credential.trim() || undefined,
      },
      latestSnapshot: hasCred ? snapshot : undefined,
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

        {/* Navigation Tabs - OAuth PKCE is Primary! */}
        <div className="flex items-center gap-1.5 rounded-xl bg-slate-900/90 border border-slate-800 p-1 mb-5">
          <button
            type="button"
            onClick={() => setActiveTab('oauth_pkce')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'oauth_pkce'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>1. 官方网页授权</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('local_scan')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'local_scan'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>2. 本地凭据穿透</span>
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
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>3. 网页 Session 校验</span>
          </button>

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

        {/* Tab 1 Content: Official OAuth PKCE Login (Primary) */}
        {activeTab === 'oauth_pkce' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs text-slate-300">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-bold text-blue-300 flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-blue-400" />
                  {selectedProviderId === 'chatgpt'
                    ? 'OpenAI 官方 OAuth PKCE 授权体系'
                    : `${currentMeta.name} 官方授权接入`}
                </span>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  官方正版渠道
                </span>
              </div>

              {selectedProviderId === 'chatgpt' ? (
                <div className="space-y-2 text-[11.5px] text-slate-400 leading-relaxed">
                  <p>
                    采用 OpenAI 官方 Codex CLI 标准 OAuth 2.0 PKCE 流程。点击下方按钮后，将在系统外部浏览器打开 OpenAI 授权网关，通过本地回环端口（<code className="text-blue-300 bg-slate-900 px-1 py-0.5 rounded">http://localhost:1455/auth/callback</code>）自动将 Access Token 写入本地授权库，无需手动复制凭证。
                  </p>
                  <div className="mt-2 rounded-lg bg-slate-950 p-2.5 border border-slate-800 font-mono text-[10.5px] text-slate-300 break-all select-all relative">
                    <span className="text-slate-500 block mb-1 font-sans text-[10px]">官方授权网址规范:</span>
                    <span className="text-slate-300">{OPENAI_OAUTH_URL}</span>
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => handleCopyAuthUrl(OPENAI_OAUTH_URL)}
                        className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 cursor-pointer"
                      >
                        {copiedUrl ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedUrl ? '已复制官方授权网址' : '复制官方授权链接'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : selectedProviderId === 'claude' ? (
                <div className="space-y-2 text-[11.5px] text-slate-400 leading-relaxed">
                  <p>
                    通过 Anthropic 官方控制台获取 API Key 或通过 Claude Code 终端协议登录。安全接入 Claude 3.7 Sonnet 及 5h 并发与周度配额追踪。
                  </p>
                  <div className="mt-2 rounded-lg bg-slate-950 p-2.5 border border-slate-800 font-mono text-[10.5px] text-slate-300 break-all">
                    <span className="text-slate-500 block mb-1 font-sans text-[10px]">官方控制台网址:</span>
                    <span>https://console.anthropic.com/settings/keys</span>
                  </div>
                </div>
              ) : selectedProviderId === 'deepseek' ? (
                <div className="space-y-2 text-[11.5px] text-slate-400 leading-relaxed">
                  <p>
                    直达 DeepSeek 开放平台创建官方 API Key。创建完成后直接粘贴，QuotaWatcher 将即时同步账户可用余额（CNY/USD）与近期调用统计。
                  </p>
                  <div className="mt-2 rounded-lg bg-slate-950 p-2.5 border border-slate-800 font-mono text-[10.5px] text-slate-300 break-all">
                    <span className="text-slate-500 block mb-1 font-sans text-[10px]">官方开放平台网址:</span>
                    <span>https://platform.deepseek.com/api_keys</span>
                  </div>
                </div>
              ) : selectedProviderId === 'trae' ? (
                <div className="space-y-2 text-[11.5px] text-slate-400 leading-relaxed">
                  <p>
                    字节跳动 Trae 官方开发者授权。在浏览器中登录 Trae 后，可在【本地凭据穿透】中一键读取本机凭据并同步 500 次/天的高级模型配额。
                  </p>
                  <div className="mt-2 rounded-lg bg-slate-950 p-2.5 border border-slate-800 font-mono text-[10.5px] text-slate-300 break-all">
                    <span className="text-slate-500 block mb-1 font-sans text-[10px]">官方入口:</span>
                    <span>https://www.trae.ai/</span>
                  </div>
                </div>
              ) : selectedProviderId === 'gemini' || selectedProviderId === 'antigravity' ? (
                <div className="space-y-2 text-[11.5px] text-slate-400 leading-relaxed">
                  <p>
                    Google AI Studio 官方控制台授权。直接在 Google 官方平台创建 API 凭据，获取免费的高并发 1500 RPD 额度。
                  </p>
                  <div className="mt-2 rounded-lg bg-slate-950 p-2.5 border border-slate-800 font-mono text-[10.5px] text-slate-300 break-all">
                    <span className="text-slate-500 block mb-1 font-sans text-[10px]">官方控制台:</span>
                    <span>https://aistudio.google.com/app/apikey</span>
                  </div>
                </div>
              ) : selectedProviderId === 'kimi' ? (
                <div className="space-y-2 text-[11.5px] text-slate-400 leading-relaxed">
                  <p>
                    Moonshot Kimi 开放平台官方授权。生成 API Key 并在应用内管理长上下文及周度额度。
                  </p>
                  <div className="mt-2 rounded-lg bg-slate-950 p-2.5 border border-slate-800 font-mono text-[10.5px] text-slate-300 break-all">
                    <span className="text-slate-500 block mb-1 font-sans text-[10px]">官方控制台:</span>
                    <span>https://platform.moonshot.cn/console/api-keys</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-[11.5px] text-slate-400 leading-relaxed">
                  <p>
                    点击下方按钮唤起 {currentMeta.name} 官方登录与授权控制台。
                  </p>
                  <div className="mt-2 rounded-lg bg-slate-950 p-2.5 border border-slate-800 font-mono text-[10.5px] text-slate-300 break-all">
                    <span className="text-slate-500 block mb-1 font-sans text-[10px]">官方网址:</span>
                    <span>{PROVIDER_AUTH_URLS[selectedProviderId]?.url || 'https://chatgpt.com/'}</span>
                  </div>
                </div>
              )}
            </div>

            {oauthFeedback && (
              <div className="rounded-xl border border-blue-500/30 bg-[#080b13] p-3 text-xs font-mono text-blue-200">
                {oauthFeedback}
              </div>
            )}

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleLaunchOAuth(selectedProviderId)}
                disabled={isLaunchingOAuth}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 py-3 text-xs font-bold text-white transition-all shadow-lg shadow-blue-900/30 active:scale-98 cursor-pointer disabled:opacity-50"
              >
                <Globe className={`h-4 w-4 ${isLaunchingOAuth ? 'animate-spin' : ''}`} />
                <span>
                  {selectedProviderId === 'chatgpt'
                    ? '🚀 唤起 OpenAI 官方网页授权登录 (OAuth PKCE)'
                    : `🚀 打开 ${currentMeta.name} 官方授权控制台`}
                </span>
              </button>

              {(selectedProviderId === 'chatgpt' || selectedProviderId === 'claude') && (
                <button
                  type="button"
                  onClick={() => handleLaunchCli(selectedProviderId)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 py-2.5 text-xs font-semibold text-purple-300 transition-all cursor-pointer"
                >
                  <Terminal className="h-3.5 w-3.5 text-purple-400" />
                  <span>
                    {selectedProviderId === 'chatgpt'
                      ? '💻 启动本地 Codex CLI 官方终端授权'
                      : '💻 启动 Claude Code CLI 终端登录'}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab 2 Content: Local Scan */}
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

        {/* Tab 3 Content: Browser Session Extraction */}
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
