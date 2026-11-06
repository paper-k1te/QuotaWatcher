import React, { useState } from 'react';
import { X, Key, Shield, PlusCircle } from 'lucide-react';
import { Account, PlatformId } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (account: Partial<Account>) => void;
}

export const AddAccountModal: React.FC<Props> = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState<PlatformId>('deepseek');
  const [credential, setCredential] = useState('');
  const [tags, setTags] = useState('个人号, 开发测试');
  const [priority, setPriority] = useState(2);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAdd({
      name,
      platform,
      tags: tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean),
      priority,
      enabled: true,
      autoFailoverEnabled: true,
      pollingIntervalMinutes: 10,
    });

    // Reset form
    setName('');
    setCredential('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-[#10141f] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-blue-400" />
            <h3 className="font-semibold text-slate-100 text-base">添加新账号监控</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Platform selection */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              目标平台 / 账号类型
            </label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as PlatformId)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
            >
              <option value="claude-web">Claude.ai 网页版 (5h 滚动窗口)</option>
              <option value="chatgpt-web">ChatGPT 网页版 (3h 限制)</option>
              <option value="deepseek">DeepSeek 官方 API (按量余额)</option>
              <option value="siliconflow">硅基流动 SiliconFlow (按量余额)</option>
              <option value="gemini">Google AI Studio (免费层 RPD)</option>
              <option value="openrouter">OpenRouter (API Credit)</option>
            </select>
          </div>

          {/* Account Name */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              账号标识备注
            </label>
            <input
              type="text"
              placeholder="例如: 个人主力号 (Claude Pro) 或 备用API"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          {/* Credential */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-300">
                {platform.includes('web') ? 'SessionKey / Cookie' : 'API Key'}
              </label>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <Shield className="w-2.5 h-2.5" />
                仅本地 Keyring 加密存储
              </span>
            </div>
            <div className="relative">
              <input
                type="password"
                placeholder={
                  platform.includes('web')
                    ? 'sk-ant-sid01-...'
                    : 'sk-...'
                }
                value={credential}
                onChange={(e) => setCredential(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
              />
              <Key className="absolute right-3 top-2.5 h-4 w-4 text-slate-500" />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              {platform === 'claude-web' && '从网页端 Cookie 中提取 sessionKey 即可，无需密码'}
              {platform === 'deepseek' && 'DeepSeek 开放平台控制台生成的 API Key'}
            </p>
          </div>

          {/* Priority and Tags */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                故障转移优先级 (P1最高)
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
              >
                <option value={1}>P1 (主力号，优先使用)</option>
                <option value={2}>P2 (第一备用)</option>
                <option value={3}>P3 (第二备用)</option>
                <option value={4}>P4 (紧急垫底)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                自定义标签
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            >
              取消
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-500 shadow-md transition-colors"
            >
              立即保存并校验
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
