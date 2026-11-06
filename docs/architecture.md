# QuotaWatcher Architecture & Technical Specification

> Version: 1.0.0-draft  
> Scope: Core Data Models, Provider Adapter Interface, Polling Engine, and CC-Switch Synergy

---

## 1. 核心数据模型 (Data Models)

### 1.1 账号实体 (Account)

```typescript
export type PlatformType = 
  | 'claude-web' 
  | 'chatgpt-web' 
  | 'deepseek' 
  | 'siliconflow' 
  | 'openrouter' 
  | 'gemini' 
  | 'custom-api';

export interface Account {
  id: string;               // UUID
  name: string;             // 用户自命名, e.g. "个人主号 (Pro)", "工作号"
  platform: PlatformType;   // 平台标识
  tags: string[];           // 标签, e.g. ["primary", "dev", "work"]
  enabled: boolean;         // 是否启用监控
  priority: number;         // 优先级 (用于自动故障转移顺序, 1-10)
  
  // 敏感凭证存储引用 (通过 ID 指向 Local Keyring / 加密表)
  credentialRef: string;
  
  // 监控策略配置
  pollingIntervalMinutes: number; // 默认 5-15 分钟
  alertThresholdPercent: number;  // 告警阈值 (如低于 15% 报警)
  
  // 最近一次抓取的快照
  latestSnapshot?: QuotaSnapshot;
}
```

### 1.2 额度快照 (QuotaSnapshot)

额度分为三种核心形态：

```typescript
export type QuotaKind = 
  | 'rolling_window'  // 滚动窗口限制 (Claude 5h, GPT 3h)
  | 'currency_balance'// 充值/代金券余额 (DeepSeek, 硅基流动)
  | 'periodic_tier';  // 周期免费额度 (Gemini 每日 1500 RPD)

export interface RollingWindowData {
  usedTokensOrRequests: number;
  totalTokensOrRequests: number;
  windowDurationHours: number; // e.g. 5
  resetsAt: string;            // ISO 8601 Timestamp: "2026-11-06T15:00:00Z"
  cooldownSecondsRemaining: number;
}

export interface CurrencyBalanceData {
  currency: 'CNY' | 'USD';
  balance: number;             // 可用余额
  grantedAmount?: number;      // 赠送/代金券余额
  expiresAt?: string;          // 代金券过期时间
}

export interface PeriodicTierData {
  period: 'day' | 'month';
  used: number;
  limit: number;
  resetsAt: string;
}

export interface QuotaSnapshot {
  accountId: string;
  timestamp: string;
  isHealthy: boolean;          // 是否可用
  isExhausted: boolean;        // 是否完全用尽
  errorMessage?: string;       // 如果抓取失败的错误信息
  kind: QuotaKind;
  
  // 依据 kind 填充具体数据
  rollingWindow?: RollingWindowData;
  currencyBalance?: CurrencyBalanceData;
  periodicTier?: PeriodicTierData;
}
```

---

## 2. 适配器接口规范 (Provider Adapter Trait)

每一个平台独立为一个 Rust Module。

### 2.1 Rust Trait 定义

```rust
// src-tauri/src/adapters/mod.rs
use async_trait::async_trait;
use serde_json::Value;
use crate::models::{QuotaSnapshot, AdapterMetadata};

#[async_trait]
pub trait ProviderAdapter: Send + Sync {
    /// 获取平台元数据（显示名称、Logo、支持的凭证类型等）
    fn metadata(&self) -> AdapterMetadata;

    /// 校验用户输入的凭证是否合法有效
    async fn validate_credentials(&self, credentials: &Value) -> Result<bool, String>;

    /// 执行额度抓取
    async fn fetch_quota(&self, credentials: &Value) -> Result<QuotaSnapshot, String>;
}
```

### 2.2 示例 1: DeepSeek API 余额适配器
* **API Endpoint**: `https://api.deepseek.com/user/balance`
* **Auth**: `Bearer <DEEPSEEK_API_KEY>`
* **Response 映射**:
  ```json
  {
    "is_available": true,
    "balance_infos": [
      {
        "currency": "CNY",
        "total_balance": "24.50",
        "granted_balance": "10.00",
        "topped_up_balance": "14.50"
      }
    ]
  }
  ```

### 2.3 示例 2: Claude 网页版 5h 窗口适配器
* **抓取原理**: 用户填入 `sessionKey`（存储在本地）
* **API**: `https://api.claude.ai/api/organizations/{org_id}/chat_conversations`
* **Response 映射**: 提取 `resets_at` 与当前用量比率。

---

## 3. 轮询引擎 (Polling Engine) 设计

* **防封禁与退避机制 (Smart Jitter & Backoff)**:
  * 轮询间隔加入 $\pm 15\%$ 的随机抖动，避免向官方 API 发送完全固定周期的探测请求。
  * 当捕获到 `429 Too Many Requests` 时，自动进入指数退避（Exponential Backoff）。
* **轻量并发调度**:
  * 使用 Rust 的 `tokio::spawn` 异步并发抓取，即使配置 50 个账号，也能在 2 秒内完成一轮检测，CPU/内存几乎零波动。

---

## 4. 与 `cc-switch` 联动机制 (Synergy Protocol)

### 4.1 自动发现与导入
QuotaWatcher 启动时，自动检测用户主目录下的 `cc-switch` 配置文件：
* Windows: `%APPDATA%\cc-switch\` 或 `~/.cc-switch/`
* macOS: `~/Library/Application Support/cc-switch/` 或 `~/.cc-switch/`
* **行为**：一键检测并展示：“*发现 4 个来自 CC-Switch 的 Provider 配置，是否一键导入监控？*”

### 4.2 自动故障转移 (Auto-Failover Trigger)
当检测到**当前激活中的账号**（Active Provider）额度耗尽（`isExhausted == true`）时：
1. 找出同平台优先级最高的下一个健康账号（`isHealthy == true && !isExhausted`）；
2. 发送信号给 `cc-switch`：
   * 方式 A：调用 `cc-switch` 的 CLI 命令（如 `cc-switch switch --provider <next_id>`）；
   * 方式 B：修改本地共享配置，并通过系统管道通知 `cc-switch` 重载；
3. 向用户桌面发送系统通知：
   > 📢 **QuotaWatcher 自动续命**  
   > 您的主力账号 [Claude-Main] 额度已用尽（预计 14:30 重置）。  
   > 已无缝为您切换至备用账号 [Claude-Backup]（当前额度 92%）。
