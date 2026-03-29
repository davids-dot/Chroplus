# AI 聊天侧边栏功能

## Why

Chroplus 目前只是一个简单的广告屏蔽插件，缺少智能交互能力。通过添加 AI 聊天侧边栏，用户可以在浏览网页时随时与 AI 助手对话，提升插件的实用价值和用户体验。

## What Changes

- 新增 Chrome Side Panel 侧边栏，支持 AI 对话功能
- 集成 Gemini API (gemini-2.5-flash-preview) 作为 AI 能力来源
- 支持流式输出，提供类似 ChatGPT 的打字机效果
- 用户可自行配置 Gemini API Key
- 对话历史存储在本地 chrome.storage.local
- 预留 Chrome 内置 AI (Gemini Nano) 扩展接口，当前不实现

## Capabilities

### New Capabilities

- `ai-chat`: AI 聊天侧边栏核心功能，包括对话界面、消息发送与接收、流式输出显示
- `ai-provider`: AI 服务提供者抽象层，支持 Gemini API 调用，预留未来扩展
- `api-key-settings`: API Key 配置管理，包括输入、存储、验证功能

### Modified Capabilities

无

## Impact

- **manifest.json**: 添加 `sidePanel`、`storage` 权限，配置 side_panel 入口
- **background.js**: 实现流式 API 调用逻辑、Port 长连接处理、AI Provider 接口
- **新增文件**:
  - `sidepanel.html` - 侧边栏 HTML 结构
  - `sidepanel.js` - 侧边栏交互逻辑
  - `sidepanel.css` - 侧边栏样式
- **无后端依赖**: 所有 API 调用在 Background Service Worker 中完成，直接请求 Gemini API
