# AI 聊天侧边栏技术设计

## Context

### 背景
Chroplus 是一个 Manifest V3 Chrome 扩展，目前仅有针对特定网站的 content scripts（广告屏蔽等功能）。本次变更添加 AI 聊天侧边栏，是插件的第一个交互式功能。

### 约束
- **无后端服务**: 所有逻辑在客户端完成，直接调用 Gemini API
- **Manifest V3**: 使用 Service Worker 作为 background
- **单一对话**: MVP 阶段只支持单个对话，不支持多对话管理
- **Gemini API**: 使用 `gemini-2.5-flash-preview` 模型

### 利益相关者
- 插件用户：需要简单易用的 AI 聊天体验
- 开发者：需要清晰的架构，便于后续扩展

## Goals / Non-Goals

**Goals:**
- 实现基于 Side Panel API 的 AI 聊天界面
- 支持流式输出，提供流畅的对话体验
- 用户可自行配置 API Key，存储在本地
- 预留 AI Provider 扩展接口，支持未来添加 Chrome 内置 AI

**Non-Goals:**
- 不支持多对话管理
- 不支持读取当前页面内容作为上下文
- 不支持模型选择（固定使用 gemini-2.5-flash-preview）
- 不实现后端代理服务

## Decisions

### 1. 通信架构：Port 长连接

**决定**: 使用 `chrome.runtime.connect()` 建立 Port 长连接

**原因**:
- 流式输出需要持续发送多个 chunk
- `sendMessage` 是一次性请求-响应，无法支持流式
- Port 支持双向通信，连接保持打开状态

**替代方案**:
- ~~sendMessage + 多次响应~~: Chrome 扩展不支持
- ~~postMessage~~: 仅适用于同页面通信

```
┌─────────────────┐                    ┌─────────────────┐
│   Side Panel    │                    │   Background    │
│                 │                    │   Service Worker│
│  connect() ─────────────────────────▶│                 │
│                 │    Port 长连接     │                 │
│  postMessage() ─────────────────────▶│  调用 Gemini    │
│                 │                    │  流式 API       │
│  ◀── chunk 1 ───│◀───────────────────│                 │
│  ◀── chunk 2 ───│◀───────────────────│                 │
│  ◀── chunk 3 ───│◀───────────────────│                 │
└─────────────────┘                    └─────────────────┘
```

### 2. AI Provider 抽象层

**决定**: 定义 `AIProvider` 接口，Gemini API 作为首个实现

**原因**:
- 预留 Chrome 内置 AI 扩展点
- 便于未来支持其他 AI 服务
- 遵循开闭原则，对扩展开放

**接口设计**:
```typescript
interface AIProvider {
  // 发送消息并流式返回响应
  chat(messages: Message[], onChunk: (text: string) => void): Promise<void>;
  
  // 检查服务是否可用
  isAvailable(): Promise<boolean>;
}

interface Message {
  role: 'user' | 'model';
  content: string;
}
```

**实现类**:
- `GeminiProvider`: 当前实现，调用 Gemini API
- `ChromeAIProvider`: 未来扩展，使用 Chrome 内置 AI

### 3. 存储结构

**决定**: 简单数组存储，全量加载

**原因**:
- 单一对话，消息量有限
- chrome.storage.local 读取速度快（< 10ms）
- 实现简单，无需分页逻辑

**存储结构**:
```javascript
{
  apiKey: "AIzaSy...",
  messages: [
    { 
      role: "user", 
      content: "你好", 
      timestamp: 1709123456789 
    },
    { 
      role: "model", 
      content: "你好！有什么可以帮助你的？", 
      timestamp: 1709123457000 
    }
  ]
}
```

### 4. UI 架构

**决定**: 侧边栏内切换视图（聊天 / 设置）

**原因**:
- 无需打开新页面，体验流畅
- 状态管理简单，无需跨页面通信
- 类似 ChatGPT 简洁风格

**视图结构**:
```
┌─────────────────────────────────────┐
│  [⚙️ 设置]           [🗑️ 清空]     │
├─────────────────────────────────────┤
│                                     │
│  聊天视图 / 设置视图 (切换显示)     │
│                                     │
├─────────────────────────────────────┤
│  [输入框]              [发送]       │
└─────────────────────────────────────┘
```

### 5. API Key 安全

**决定**: 
- 存储在 `chrome.storage.local`（不同步到云端）
- UI 默认隐藏，点击显示

**原因**:
- `chrome.storage.sync` 会同步到用户的 Google 账号，存在安全风险
- 本地存储更安全，卸载插件时自动清除

## Risks / Trade-offs

### 风险 1: API Key 泄露
**风险**: 用户 API Key 可能被恶意扩展读取
**缓解**: 
- 使用 `chrome.storage.local` 而非 `sync`
- 提醒用户 API Key 的重要性和安全使用

### 风险 2: 流式响应中断
**风险**: 网络不稳定导致流式响应中途断开
**缓解**: 
- 显示已接收的部分内容
- 提供"重新生成"按钮
- 记录错误状态，便于用户重试

### 风险 3: 存储限制
**风险**: `chrome.storage.local` 限制 10MB，长对话可能超限
**缓解**: 
- MVP 阶段暂不处理，后续可添加历史清理功能
- 监控存储使用量，接近限制时提示用户

### 风险 4: Gemini API 配额
**风险**: 免费配额有限，用户可能用尽
**缓解**: 
- 显示友好错误提示
- 引导用户查看 Google AI Studio 配额信息

## Migration Plan

### 部署步骤
1. 用户安装/更新插件
2. 首次打开侧边栏，显示设置引导
3. 用户输入 API Key 并保存
4. 切换到聊天视图，开始对话

### 回滚策略
- 新功能独立于现有 content scripts
- 如有问题，用户可禁用侧边栏功能
- 无数据迁移，无需特殊回滚

## Open Questions

无。所有关键设计决策已确定。
