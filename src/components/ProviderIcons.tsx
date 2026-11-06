import React from 'react';

interface IconProps {
  className?: string;
}

// 1. OpenAI / ChatGPT Icon (Iconic Swirl Spiral Vortex)
export const OpenAIIcon: React.FC<IconProps> = ({ className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2a4 4 0 0 1 3.8 2.7l.2.8v3.5a1 1 0 0 0 .5.9l3 1.7a4 4 0 0 1 1.7 5.1l-.4.8-3.1 1.8a1 1 0 0 0-.5.9v3.5a4 4 0 0 1-5.7 3.5l-.8-.4-3-1.8a1 1 0 0 0-1 0l-3 1.8a4 4 0 0 1-5.7-3.5v-3.5a1 1 0 0 0-.5-.9L2.7 17a4 4 0 0 1 1.7-5.1l.8-.4 3.1-1.8a1 1 0 0 0 .5-.9V5.3a4 4 0 0 1 5.7-3.5l.8.4 3 1.8a1 1 0 0 0 1 0L12 2z" />
    <path d="M8.5 10.5l3.5 2 3.5-2" />
    <path d="M12 12.5v4" />
  </svg>
);

// 2. Anthropic Claude Icon (Authentic Stylized Asterisk Star Emblem)
export const AnthropicIcon: React.FC<IconProps> = ({ className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M13.8 2.5a1.2 1.2 0 0 0-2.3 0L9.9 8.2a1.2 1.2 0 0 1-.7.7L3.5 10.5a1.2 1.2 0 0 0 0 2.3l5.7 1.6a1.2 1.2 0 0 1 .7.7l1.6 5.7a1.2 1.2 0 0 0 2.3 0l1.6-5.7a1.2 1.2 0 0 1 .7-.7l5.7-1.6a1.2 1.2 0 0 0 0-2.3l-5.7-1.6a1.2 1.2 0 0 1-.7-.7L13.8 2.5z" />
  </svg>
);

// 3. Antigravity Icon (Google DeepMind Antigravity Chevron Lambda emblem, identical to CCSwitch)
export const AntigravityIcon: React.FC<IconProps> = ({ className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2L2 20h4.5l5.5-10.5L17.5 20H22L12 2z" />
    <path d="M12 12.5l2.2 4.5H9.8L12 12.5z" opacity="0.6" />
  </svg>
);

// 4. xAI Grok Icon (Minimalist Bold Slash / X emblem)
export const GrokIcon: React.FC<IconProps> = ({ className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// 5. DeepSeek Icon (Authentic Stylized Dolphin / Whale Emblem)
export const DeepSeekIcon: React.FC<IconProps> = ({ className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 14c2-4 6-6 10-5 2.5.6 4.5 2.5 5 5-2 .5-4 0-5-1-1.5-1.5-3-2-5-2-2 0-3.5 1-4 3z" />
    <path d="M19 14c.5 2 0 4-1.5 5.5-2 2-5 2.5-7.5 1.5-2-.8-3.5-2.5-4-4.5" />
    <circle cx="15.5" cy="11.5" r="1" fill="currentColor" />
  </svg>
);

// 6. Moonshot Kimi Icon (Stylized 'K!' / Moonshot emblem, identical to CCSwitch)
export const KimiIcon: React.FC<IconProps> = ({ className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="6" y1="4" x2="6" y2="20" />
    <line x1="6" y1="12" x2="16" y2="4" />
    <line x1="6" y1="12" x2="16" y2="20" />
    <circle cx="19" cy="6" r="1.5" fill="currentColor" />
  </svg>
);

// 7. ByteDance Trae Icon (Stylish Folded Origami T)
export const TraeIcon: React.FC<IconProps> = ({ className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="4" y="4" width="16" height="4" rx="1" />
    <path d="M12 8v12" />
    <path d="M8 20h8" />
  </svg>
);

// 8. 词元跳动 (TokenDance) Icon (Waveform Token Pulse)
export const TokenDanceIcon: React.FC<IconProps> = ({ className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 12h3l3-7 4 14 3-7h5" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
  </svg>
);

// 9. SiliconFlow (硅基流动) Icon (Hexagon Acceleration Core)
export const SiliconFlowIcon: React.FC<IconProps> = ({ className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

// 10. OpenRouter Icon (Routing Network Node)
export const OpenRouterIcon: React.FC<IconProps> = ({ className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="6" cy="6" r="3" />
    <circle cx="18" cy="6" r="3" />
    <circle cx="12" cy="18" r="3" />
    <path d="M8.5 7.5L10 16" />
    <path d="M15.5 7.5L14 16" />
  </svg>
);

// 11. Custom Relay / 中转站 Icon (Bridge / Proxy Hub)
export const RelayBridgeIcon: React.FC<IconProps> = ({ className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="2" width="20" height="8" rx="2" />
    <rect x="2" y="14" width="20" height="8" rx="2" />
    <line x1="6" y1="6" x2="6.01" y2="6" strokeWidth="3" />
    <line x1="6" y1="18" x2="6.01" y2="18" strokeWidth="3" />
    <path d="M12 10v4" />
    <path d="M10 12h4" />
  </svg>
);

// Provider Icon Resolver
export const ProviderIcon: React.FC<{ providerId: string; className?: string }> = ({
  providerId,
  className = 'h-5 w-5',
}) => {
  switch (providerId.toLowerCase()) {
    case 'chatgpt':
    case 'openai':
      return <OpenAIIcon className={className} />;
    case 'claude':
    case 'anthropic':
      return <AnthropicIcon className={className} />;
    case 'antigravity':
    case 'gemini':
      return <AntigravityIcon className={className} />;
    case 'grok':
    case 'xai':
      return <GrokIcon className={className} />;
    case 'deepseek':
      return <DeepSeekIcon className={className} />;
    case 'kimi':
    case 'moonshot':
      return <KimiIcon className={className} />;
    case 'trae':
      return <TraeIcon className={className} />;
    case 'tokendance':
    case 'ciyuan':
      return <TokenDanceIcon className={className} />;
    case 'siliconflow':
      return <SiliconFlowIcon className={className} />;
    case 'openrouter':
      return <OpenRouterIcon className={className} />;
    default:
      return <RelayBridgeIcon className={className} />;
  }
};
