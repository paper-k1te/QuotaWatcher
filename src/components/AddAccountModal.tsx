import React, { useState, useEffect } from 'react';
import { X, Key, Shield, PlusCircle, Check } from 'lucide-react';
import { Account, ProviderMeta } from '../types';

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
    initialProvider && initialProvider !== 'all' ? initialProvider : 'claude'
  );
  const [name, setName] = useState('');
  const [credential, setCredential] = useState('');
  const [tags, setTags] = useState('个人号, 开发主力');
  const [priority, setPriority] = useState(1);

  // Sync initial provider when modal opens
  useEffect(() => {
    if (initialProvider && initialProvider !== 'all') {
      setSelectedProviderId(initialProvider);
    }
  }, [initialProvider, isOpen]);

  if (!isOpen) return null;

  const currentProviderMeta = providersMeta[selectedProviderId] || providerList[0];

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
          used: 2,
          total: selectedProviderId === 'chatgpt' ? 80 : selectedProviderId === 'grok' ? 30 : 45,
          windowDurationHours: selectedProviderId === 'chatgpt' ? 3 : selectedProviderId === 'grok' ? 2 : 5,
          resetsAt: new Date(Date.now() + 3600 * 3 * 1000).toISOString(),
          cooldownSecondsRemaining: 3600 * 3,
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
          used: 15,
          limit: 1500,
          unit: '次/天',
          resetsAt: new Date(Date.now() + 86400 * 1000).toISOString(),
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
          balance: 50.0,
          grantedAmount: 10.0,
        },
      };
    }

    onAdd({
      name: name.trim(),
      platform: 'custom-api',
      provider: selectedProviderId,
      models: currentProviderMeta.supportedModels,
      tags: tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean),
      priority,
      enabled: true,
      autoFailoverEnabled: true,
      latestSnapshot: snapshot,
    });

    // Reset
    setName('');
    setCredential('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-[#0d101a] p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <PlusCircle className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                添加模型账号
              </h2>
              <p className="text-[11px] text-slate-400">
                向指定 AI 厂商添加正版账号或中转 Key 进行监控
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {/* Target Provider Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              所属 AI 厂商
            </label>
            <div className="relative">
              <select
                value={selectedProviderId}
                onChange={(e) => setSelectedProviderId(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-[#121624] px-3 py-2 text-xs text-slate-200 focus:border-orange-500 focus:outline-none"
              >
                {providerList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.badge})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Account Name */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              账号名称 / 备注 <span className="text-orange-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="例如：个人主号 (Pro) / 团队备用号"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-[#121624] px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
            />
          </div>

          {/* Credential */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-300">
                鉴权凭证 (API Key / SessionKey / Token)
              </label>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                <Shield className="w-2.5 h-2.5" />
                本地加密存储
              </span>
            </div>
            <div className="relative">
              <input
                type="password"
                placeholder="sk-..."
                value={credential}
                onChange={(e) => setCredential(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-[#121624] px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none font-mono"
              />
              <Key className="absolute right-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            </div>
          </div>

          {/* Priority & Tags */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                切号优先级 (P1最高)
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-800 bg-[#121624] px-3 py-2 text-xs text-slate-200 focus:border-orange-500 focus:outline-none"
              >
                <option value={1}>P1 (主力，优先激活)</option>
                <option value={2}>P2 (第一梯队备用)</option>
                <option value={3}>P3 (第二梯队备用)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                分类标签
              </label>
              <input
                type="text"
                placeholder="主力, Claude Code"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-[#121624] px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-orange-500/20 transition-all"
            >
              <Check className="h-3.5 w-3.5" />
              <span>保存并加入监控</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
