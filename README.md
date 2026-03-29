# Chroplus

一个 Chrome 浏览器扩展，集成了 AI 聊天助手和网页增强功能。

## 功能概览

| 功能 | 说明 |
|------|------|
| AI 聊天侧边栏 | 基于 Gemini API 的 AI 助手，支持流式输出 |
| Agent 框架 | 支持工具调用的 Agent 模式（开发中） |
| 百度广告屏蔽 | 去除百度搜索结果页右侧广告 |
| 简书广告屏蔽 | 去除简书页面广告 |
| 新浪博客刷量 | 自动刷新博客页面，刷阅读量 |
| HDU OJ 辅助 | 杭电 OJ 相关功能 |

## 项目结构

```
Chroplus/
├── manifest.json          # 扩展配置文件
├── background.js          # Service Worker（后台服务）
├── sidepanel.html         # 侧边栏页面
├── sidepanel.js           # 侧边栏逻辑
├── sidepanel.css          # 侧边栏样式
├── agent/                 # Agent 框架
│   ├── types.js           # 类型定义
│   ├── tool-registry.js   # 工具注册中心
│   └── executor.js        # Agent 执行器
├── lib/                   # 工具库
│   └── gemini-tools.js    # Gemini API 工具
└── content scripts/       # 内容脚本（注入网页）
    ├── chroplus.js        # HDU OJ
    ├── baidu.js           # 百度
    ├── jianshu.js         # 简书
    └── sinablog.js        # 新浪博客
```

## 加载流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Chrome 扩展加载流程                                   │
└─────────────────────────────────────────────────────────────────────────────┘

用户点击扩展图标
        │
        ▼
┌───────────────────┐
│  manifest.json    │  读取配置
│  - 权限声明        │
│  - 入口文件        │
└─────────┬─────────┘
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
┌─────────┐  ┌─────────────────┐
│ 后台    │  │ 侧边栏           │
│ Service │  │ Side Panel      │
│ Worker  │  │                 │
│         │  │ 用户交互界面    │
│ 独立运行 │  │ 消息显示/输入   │
└────┬────┘  └────────┬────────┘
     │                │
     │    Port 长连接  │
     │◀──────────────▶│
     │                │
     ▼                ▼
┌─────────────────────────────┐
│        Gemini API           │
│   (AI 对话 / Function Call) │
└─────────────────────────────┘
```

## 核心组件

### 1. manifest.json（入口配置）

```json
{
  "manifest_version": 3,           // Chrome 扩展版本（V3 是最新）
  "permissions": ["sidePanel", "storage"],  // 申请的权限
  "background": {
    "service_worker": "background.js"  // 后台服务入口
  },
  "side_panel": {
    "default_path": "sidepanel.html"  // 侧边栏入口
  },
  "content_scripts": [...]           // 注入到网页的脚本
}
```

### 2. background.js（Service Worker）

- **角色**：后台服务，独立于任何网页运行
- **生命周期**：需要时激活，空闲时休眠
- **职责**：
  - 处理 API 请求（Gemini API）
  - 管理扩展级状态
  - 监听来自 Side Panel 的消息

```
Side Panel 发送消息 → background.js 处理 → 调用 Gemini API → 返回结果
```

### 3. sidepanel.js（用户界面）

- **角色**：用户交互界面
- **生命周期**：打开侧边栏时存在，关闭即销毁
- **职责**：
  - 显示聊天消息
  - 处理用户输入
  - 管理 Agent 执行（如果启用）

### 4. Content Scripts（网页注入）

- **角色**：注入到特定网页的脚本
- **匹配规则**：通过 `matches` 字段指定 URL 模式
- **职责**：修改网页内容（如屏蔽广告）

```
用户访问 baidu.com
        │
        ▼
manifest.json 匹配到 "https://www.baidu.com/*"
        │
        ▼
自动注入 baidu.js 到页面
        │
        ▼
baidu.js 移除广告元素
```

## 通信架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           组件通信方式                                       │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐                              ┌─────────────┐
│ Side Panel  │                              │ Background  │
│             │      chrome.runtime.connect  │   Service   │
│ sidepanel.js│◀────────────────────────────▶│   Worker    │
│             │         Port 长连接           │             │
└─────────────┘                              └──────┬──────┘
                                                    │
                                                    │ fetch
                                                    ▼
                                             ┌─────────────┐
                                             │ Gemini API  │
                                             └─────────────┘

┌─────────────┐                              ┌─────────────┐
│ Content     │                              │ 网页 DOM    │
│ Script      │◀────────────────────────────▶│             │
│ baidu.js    │      直接操作 DOM            │             │
└─────────────┘                              └─────────────┘
```

### Port 长连接（用于 AI 聊天）

```javascript
// sidepanel.js - 建立连接
const port = chrome.runtime.connect({ name: 'sidepanel' });

// 发送消息
port.postMessage({ type: 'chat', message: '你好' });

// 接收消息
port.onMessage.addListener((response) => {
    if (response.type === 'chunk') {
        // 流式文本块
    }
});

// background.js - 处理连接
chrome.runtime.onConnect.addListener((port) => {
    port.onMessage.addListener((message) => {
        // 处理消息
        port.postMessage({ type: 'chunk', text: '...' });
    });
});
```

## 运行流程示例

### 场景：用户发送 AI 聊天消息

```
1. 用户在 Side Panel 输入 "你好"，点击发送

2. sidepanel.js
   ├─ 将消息添加到界面
   ├─ 通过 port.postMessage() 发送给 background.js
   └─ 请求格式: { type: 'chat', message: '你好', history: [...] }

3. background.js (Service Worker)
   ├─ 接收消息
   ├─ 从 storage 获取 API Key
   ├─ 构建 Gemini API 请求
   └─ 调用 Gemini API (流式)

4. Gemini API 返回流式响应
   │
   ▼ 每个文本块
   background.js 通过 port.postMessage({ type: 'chunk', text: '...' }) 转发

5. sidepanel.js
   ├─ 接收 chunk，追加到界面（打字机效果）
   └─ 收到 { type: 'complete' } 时结束

6. 保存对话历史到 chrome.storage.local
```

## 开发与调试

### 加载扩展

1. 打开 `chrome://extensions/`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择本项目目录

### 调试方法

| 组件 | 调试方式 |
|------|---------|
| background.js | 扩展页面 → 点击 "Service Worker" 链接 |
| sidepanel.js | 右键侧边栏 → 检查 |
| content scripts | 在目标网页按 F12 → Console |

### 查看存储数据

```
扩展页面 → 点击扩展的 "Service Worker"
→ DevTools → Application → Storage → Extensions
```

或直接在控制台：

```javascript
chrome.storage.local.get(null, console.log);
```

## 权限说明

| 权限 | 用途 |
|------|------|
| `sidePanel` | 显示侧边栏 |
| `storage` | 存储用户设置和聊天历史 |

## 依赖

- 无外部依赖，纯原生 JavaScript
- AI 能力通过 Gemini API 实现（用户自行配置 API Key）
