import React, { useState } from 'react';
import { X, Server, Globe, Key, ShieldCheck, Sparkles } from 'lucide-react';
import { ProviderMeta } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAddProvider: (provider: ProviderMeta) => void;
}

export const AddCustomProviderModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onAddProvider,
}) => {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [endpoint, setEndpoint] = useState('https://api.example.com/v1');
  const [protocol, setProtocol] = useState<'openai' | 'newapi' | 'oneapi' | 'custom'>('openai');
  const [modelsInput, setModelsInput] = useState('GPT-4o, Claude 3.7 Sonnet, DeepSeek-R1');
  const [description, setDescription] = useState('第三方自建或商业中转代理服务 (兼容 OpenAI 协议)');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalId = id.trim()
      ? id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
      : `relay-${Date.now().toString().slice(-4)}`;

    const newProvider: ProviderMeta = {
      id: finalId,
      name: name.trim(),
      enName: name.trim(),
      badge: '第三方中转',
      brandColor: 'text-amber-400',
      brandBg: 'bg-amber-500/10',
      accentBorder: 'border-amber-500/30',
      accentGradient: 'from-amber-500/20 via-orange-500/5 to-transparent',
      supportedModels: modelsInput
        .split(/[,，]/)
        .map((m) => m.trim())
        .filter(Boolean),
      description: description.trim() || '用户自定义第三方中转代理',
      quotaTypeLabel: '中转账户余额 (USD/CNY) / 实时配额',
      category: 'relay',
      isDefaultVisible: true,
      isCustom: true,
      endpoint: endpoint.trim(),
      protocol,
    };

    onAddProvider(newProvider);
    onClose();

    // Reset
    setId('');
    setName('');
    setEndpoint('https://api.example.com/v1');
    setModelsInput('GPT-4o, Claude 3.7 Sonnet, DeepSeek-R1');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-[#0d101a] p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Server className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                添加第三方中转厂商
              </h2>
              <p className="text-[11px] text-slate-400">
                配置自建或第三方聚合中转站（NewAPI / OneAPI / OpenAI 代理）
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              厂商名称 <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="例如：BossClaw 中转、我的 NewAPI 站"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-[#121624] px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                厂商唯一标识 (ID)
              </label>
              <input
                type="text"
                placeholder="例如：bossclaw"
                value={id}
                onChange={(e) => setId(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-[#121624] px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                接口协议
              </label>
              <select
                value={protocol}
                onChange={(e) => setProtocol(e.target.value as any)}
                className="w-full rounded-lg border border-slate-800 bg-[#121624] px-3 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
              >
                <option value="openai">OpenAI 兼容协议</option>
                <option value="newapi">NewAPI / OneAPI 规范</option>
                <option value="custom">通用自定义接口</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              基础 API 域名 / 端点
            </label>
            <div className="relative">
              <Globe className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="https://api.example.com/v1"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-[#121624] pl-8 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              默认支持模型 (逗号分隔)
            </label>
            <input
              type="text"
              placeholder="GPT-4o, Claude 3.7 Sonnet, DeepSeek-R1"
              value={modelsInput}
              onChange={(e) => setModelsInput(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-[#121624] px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              备注说明
            </label>
            <input
              type="text"
              placeholder="第三方聚合中转，按 Token 计量扣费"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-[#121624] px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Submit Buttons */}
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
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-orange-500/20 hover:from-amber-600 hover:to-orange-600 transition-all"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>确认添加并启用</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
