import React from 'react';

interface IconProps {
  className?: string;
}

// Anthropic Claude Icon (Authentic Stylized Asterisk Emblem)
export const AnthropicIcon: React.FC<IconProps> = ({ className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M13.8 2.5a1.2 1.2 0 0 0-2.3 0L9.9 8.2a1.2 1.2 0 0 1-.7.7L3.5 10.5a1.2 1.2 0 0 0 0 2.3l5.7 1.6a1.2 1.2 0 0 1 .7.7l1.6 5.7a1.2 1.2 0 0 0 2.3 0l1.6-5.7a1.2 1.2 0 0 1 .7-.7l5.7-1.6a1.2 1.2 0 0 0 0-2.3l-5.7-1.6a1.2 1.2 0 0 1-.7-.7L13.8 2.5z" />
  </svg>
);

// DeepSeek Icon (Authentic Stylized Dolphin / Whale Emblem)
export const DeepSeekIcon: React.FC<IconProps> = ({ className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 14c2-4 6-6 10-5 2.5.6 4.5 2.5 5 5-2 .5-4 0-5-1-1.5-1.5-3-2-5-2-2 0-3.5 1-4 3z" />
    <path d="M19 14c.5 2 0 4-1.5 5.5-2 2-5 2.5-7.5 1.5-2-.8-3.5-2.5-4-4.5" />
    <circle cx="15.5" cy="11.5" r="1" fill="currentColor" />
  </svg>
);

// OpenAI Icon (Iconic Swirl Spiral Emblem)
export const OpenAIIcon: React.FC<IconProps> = ({ className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2a4 4 0 0 1 3.8 2.7l.2.8v3.5a1 1 0 0 0 .5.9l3 1.7a4 4 0 0 1 1.7 5.1l-.4.8-3.1 1.8a1 1 0 0 0-.5.9v3.5a4 4 0 0 1-5.7 3.5l-.8-.4-3-1.8a1 1 0 0 0-1 0l-3 1.8a4 4 0 0 1-5.7-3.5v-3.5a1 1 0 0 0-.5-.9L2.7 17a4 4 0 0 1 1.7-5.1l.8-.4 3.1-1.8a1 1 0 0 0 .5-.9V5.3a4 4 0 0 1 5.7-3.5l.8.4 3 1.8a1 1 0 0 0 1 0L12 2z" />
    <path d="M8.5 10.5l3.5 2 3.5-2" />
    <path d="M12 12.5v4" />
  </svg>
);

// SiliconFlow (硅基流动) Icon (Hexagon Acceleration Core)
export const SiliconFlowIcon: React.FC<IconProps> = ({ className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

// Google Gemini Icon (Curved 4-Point Multi-Dimensional Sparkle)
export const GeminiIcon: React.FC<IconProps> = ({ className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 0C12 6.627 6.627 12 0 12c6.627 0 12 5.627 12 12 0-6.627 5.627-12 12-12-6.627 0-12-5.627-12-12z" />
  </svg>
);

// OpenRouter Icon (Routing Network Node)
export const OpenRouterIcon: React.FC<IconProps> = ({ className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="6" cy="6" r="3" />
    <circle cx="18" cy="6" r="3" />
    <circle cx="12" cy="18" r="3" />
    <path d="M8.5 7.5L10 16" />
    <path d="M15.5 7.5L14 16" />
  </svg>
);

// Provider Icon Resolver
export const ProviderIcon: React.FC<{ providerId: string; className?: string }> = ({
  providerId,
  className = 'h-5 w-5',
}) => {
  switch (providerId) {
    case 'anthropic':
      return <AnthropicIcon className={className} />;
    case 'deepseek':
      return <DeepSeekIcon className={className} />;
    case 'openai':
      return <OpenAIIcon className={className} />;
    case 'siliconflow':
      return <SiliconFlowIcon className={className} />;
    case 'gemini':
      return <GeminiIcon className={className} />;
    case 'openrouter':
      return <OpenRouterIcon className={className} />;
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 3v18" />
        </svg>
      );
  }
};
