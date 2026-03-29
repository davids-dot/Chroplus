# Agent 框架搭建

## Why

Chrome 扩展已有 AI 聊天功能，现在需要支持智能整理书签等复杂任务。这需要 Agent 能够自主决策、调用工具、多轮执行。Gemini API 原生支持 Function Calling，是搭建轻量级 Agent 框架的最佳选择。

## What Changes

- 新增 Agent 核心框架，支持 Function Calling 和多轮工具调用循环
- 新增工具注册机制，支持声明式定义工具及其参数 schema
- 新增 Agent 循环执行器，在 Side Panel 中运行
- 重构现有 GeminiProvider，支持 Function Calling API
- 保持代码模块化，单个文件不超过 600 行

## Capabilities

### New Capabilities

- `agent-core`: Agent 核心框架，包含 Agent 循环执行、工具调用处理、消息管理
- `tool-registry`: 工具注册机制，支持声明式定义工具、参数校验、执行调度
- `gemini-function-calling`: Gemini Function Calling API 集成，支持工具声明和响应解析

### Modified Capabilities

无。Agent 框架是新增功能，不修改现有 AI 聊天行为。

## Impact

- **sidepanel.js**: 新增 Agent 执行模块，当前文件较长，需要拆分
- **background.js**: GeminiProvider 需要支持 Function Calling，保持向后兼容
- **manifest.json**: 无需新增权限（已有 storage、sidePanel）
- **新增文件**:
  - `agent/executor.js` - Agent 循环执行器
  - `agent/tool-registry.js` - 工具注册中心
  - `agent/types.js` - 类型定义和常量
  - `lib/gemini-tools.js` - Gemini Function Calling 工具格式转换
