# AI Provider Specification

AI 服务提供者抽象层规格。

## ADDED Requirements

### Requirement: AI Provider Interface

系统 SHALL 定义统一的 AI Provider 接口，支持多种 AI 服务实现。

#### Scenario: Provider Interface Definition
- **WHEN** 系统初始化 AI 服务
- **THEN** 系统 SHALL 使用统一的 Provider 接口
- **AND** 接口 SHALL 包含 `chat(messages, onChunk)` 方法
- **AND** 接口 SHALL 包含 `isAvailable()` 方法

---

### Requirement: Gemini Provider Implementation

系统 SHALL 实现 Gemini API 调用能力。

#### Scenario: Gemini API Call
- **WHEN** 用户发送消息
- **THEN** 系统 SHALL 调用 Gemini API (`gemini-2.5-flash-preview` 模型)
- **AND** 系统 SHALL 使用流式响应模式

#### Scenario: Gemini API Request Format
- **WHEN** 调用 Gemini API
- **THEN** 请求 SHALL 包含完整对话历史
- **AND** 消息格式 SHALL 符合 Gemini API 规范：
  ```json
  {
    "contents": [
      { "role": "user", "parts": [{ "text": "..." }] },
      { "role": "model", "parts": [{ "text": "..." }] }
    ]
  }
  ```

#### Scenario: Gemini Streaming Response Parse
- **WHEN** 收到 Gemini 流式响应
- **THEN** 系统 SHALL 正确解析每个 chunk
- **AND** 系统 SHALL 提取 `candidates[0].content.parts[0].text` 作为响应文本

#### Scenario: Gemini API Authentication
- **WHEN** 调用 Gemini API
- **THEN** 系统 SHALL 使用用户配置的 API Key 进行身份验证
- **AND** API Key SHALL 通过 URL 参数 `key=API_KEY` 传递

---

### Requirement: Streaming Communication

系统 SHALL 通过 Port 长连接实现流式通信。

#### Scenario: Port Connection Establishment
- **WHEN** Side Panel 初始化
- **THEN** 系统 SHALL 通过 `chrome.runtime.connect()` 建立与 Background 的 Port 连接

#### Scenario: Send Message via Port
- **WHEN** 用户发送消息
- **THEN** Side Panel SHALL 通过 `port.postMessage()` 发送消息到 Background

#### Scenario: Receive Streaming Chunks
- **WHEN** Background 收到 Gemini API 的流式响应
- **THEN** Background SHALL 通过 `port.postMessage()` 将每个 chunk 发送给 Side Panel
- **AND** Side Panel SHALL 实时渲染接收到的文本

#### Scenario: Port Connection Close
- **WHEN** 对话完成或发生错误
- **THEN** 系统 SHALL 保持 Port 连接以支持后续对话
- **AND** 系统 SHALL 仅在 Side Panel 关闭时断开连接

---

### Requirement: Provider Availability Check

系统 SHALL 检查 AI Provider 是否可用。

#### Scenario: Gemini Provider Availability
- **WHEN** 检查 Gemini Provider 可用性
- **THEN** 系统 SHALL 检查 API Key 是否已配置
- **AND** 系统 SHALL 返回可用状态

---

### Requirement: Future Extension Support

系统 SHALL 预留 Chrome 内置 AI 扩展接口。

#### Scenario: Chrome AI Provider Stub
- **WHEN** 系统加载 AI Provider
- **THEN** 系统 SHALL 检测 Chrome 内置 AI 是否可用
- **AND** 当前版本 SHALL 不启用 Chrome 内置 AI
- **AND** 系统 SHALL 在检测失败时优雅降级

#### Scenario: Provider Selection (Future)
- **WHEN** 未来支持多个 Provider
- **THEN** 系统 SHALL 允许用户选择首选 Provider
- **AND** 系统 SHALL 在首选 Provider 不可用时自动降级
