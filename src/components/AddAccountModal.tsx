import React, { useState, useEffect } from 'react';
import { X, Key, PlusCircle, Sparkles } from 'lucide-react';
import { Account, ProviderMeta } from '../types';
import { scanLocalAuthProviders } from '../services/tauriBridge';

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
  const [planName, setPlanName] = useState('Plus');
  const [planExpiresAt, setPlanExpiresAt] = useState('');
  const [credential, setCredential] = useState('');
  const priority = 1;
  const [isScanning, setIsScanning] = useState(false);

  // Sync initial provider when modal opens
  useEffect(() => {
    if (initialProvider && initialProvider !== 'all') {
      setSelectedProviderId(initialProvider);
    }
  }, [initialProvider, isOpen]);

  if (!isOpen) return null;

  // Auto scan local environment
  const handleScanLocal = async () => {
    setIsScanning(true);
    try {
      const res = await scanLocalAuthProviders();
      if (res.success && res.accounts && res.accounts.length > 0) {
        // Find matching provider or take first
        const match = res.accounts.find((a: any) => a.provider === selectedProviderId) || res.accounts[0];
        if (match) {
          setSelectedProviderId(match.provider);
          setName(match.name || '');
          setEmail(match.email || '');
          if (match.planName) setPlanName(match.planName);
          if (match.planExpiresAt) setPlanExpiresAt(match.planExpiresAt);
        }
      }
    } catch (e) {
      console.warn('Scan local error:', e);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Create appropriate initial snapshot based on provider quota type
    const isRolling = ['claude', 'chatgpt', 'grok'].includes(selectedProviderId);
    const isTier = selectedProviderId === 'antigravity';

    let snapshot: any;
    if (isRolling) {
      snapshot = {
        timestamp: new Date().toISOString(),
        isHealthy: true,
        isExhausted: false,
        isWarning: false,
        kind: 'rolling_window',
        rollingWindow: {
          used: 0,
          total: selectedProviderId === 'chatgpt' ? 80 : selectedProviderId === 'grok' ? 30 : 45,
          windowDurationHours: 5,
          resetsAt: new Date(Date.now() + 3600 * 5 * 1000).toISOString(),
          cooldownSecondsRemaining: 3600 * 5,
        },
        sevenDayQuota: {
          usedPercent: 10,
          totalPercent: 100,
          label: '10% 充沛',
        },
      };
    } else if (isTier) {
      snapshot = {
        timestamp: new Date().toISOString(),
        isHealthy: true,
        isExhausted: false,
        isWarning: false,
        kind: 'periodic_tier',
        periodicTier: {
          period: 'day',
          used: 0,
          limit: 1500,
          unit: '次/天',
          resetsAt: new Date(Date.now() + 86400 * 1000).toISOString(),
        },
        sevenDayQuota: {
          usedPercent: 5,
          totalPercent: 100,
          label: '5% 充沛',
        },
      };
    } else {
      snapshot = {
        timestamp: new Date().toISOString(),
        isHealthy: true,
        isExhausted: false,
        isWarning: false,
        kind: 'currency_balance',
        currencyBalance: {
          currency: selectedProviderId === 'bossclaw' || selectedProviderId === 'openrouter' ? 'USD' : 'CNY',
          balance: 20.0,
        },
        sevenDayQuota: {
          usedPercent: 20,
          totalPercent: 100,
          label: '余额正常',
        },
      };
    }

    onAdd({
      name: name.trim(),
      email: email.trim() || undefined,
      platform: 'custom-api',
      provider: selectedProviderId,
      planName: planName || undefined,
      planExpiresAt: planExpiresAt || undefined,
      tags: [planName, '官方授权'],
      priority,
      enabled: true,
      autoFailoverEnabled: true,
      lastLoginAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0e121d] p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <PlusCircle className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">添加官方授权账号</h2>
              <p className="text-[11px] text-slate-400">凭证与会话仅本地加密保存，支持自动识别挡位与到期时间</p>
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
          {/* Quick Scan Action */}
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-400 shrink-0" />
              <div className="text-xs">
                <span className="font-semibold text-blue-300">自动检测本地官方登录</span>
                <p className="text-[10.5px] text-slate-400">扫描 Codex CLI / CC-Switch 等本地会话，自动提取挡位与到期时间</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleScanLocal}
              disabled={isScanning}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors shrink-0 shadow-sm"
            >
              {isScanning ? '扫描中...' : '一键抓取'}
            </button>
          </div>

          {/* Provider Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              所属服务 / 厂商
            </label>
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
              placeholder="如：我的主号、Team 团队号、开发备用等"
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
                账号挡位 / 套餐
              </label>
              <select
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-2.5 py-1.5 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
              >
                <option value="Plus">Plus</option>
                <option value="Pro">Pro</option>
                <option value="Pro 5x">Pro (5x)</option>
                <option value="Business">Business</option>
                <option value="Team">Team</option>
                <option value="Free">Free</option>
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

          {/* Credential / Token */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Session Token / API Key / 凭据 (选填，保存在本地)
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
