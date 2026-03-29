# AI 聊天侧边栏实现任务

## 1. 项目配置

- [x] 1.1 修改 manifest.json：添加 `sidePanel`、`storage` 权限
- [x] 1.2 修改 manifest.json：配置 `side_panel` 入口
- [x] 1.3 修改 manifest.json：配置 `action` 点击行为
- [x] 1.4 创建 sidepanel.html 基础结构
- [x] 1.5 创建 sidepanel.css 样式文件
- [x] 1.6 创建 sidepanel.js 主逻辑文件

## 2. Background Service Worker

- [x] 2.1 实现 Port 连接监听 (`chrome.runtime.onConnect`)
- [x] 2.2 实现 AIProvider 接口定义
- [x] 2.3 实现 GeminiProvider 类：API 调用逻辑
- [x] 2.4 实现 GeminiProvider 类：流式响应解析
- [x] 2.5 实现 GeminiProvider 类：错误处理
- [x] 2.6 实现消息处理器：接收 Side Panel 消息
- [x] 2.7 实现消息处理器：流式 chunk 转发

## 3. 存储管理

- [x] 3.1 实现 API Key 读写 (`chrome.storage.local`)
- [x] 3.2 实现消息历史读写
- [x] 3.3 实现清空历史功能

## 4. Side Panel UI

- [x] 4.1 实现聊天视图 HTML 结构
- [x] 4.2 实现设置视图 HTML 结构
- [x] 4.3 实现视图切换逻辑
- [x] 4.4 实现消息列表渲染
- [x] 4.5 实现消息输入框交互
- [x] 4.6 实现发送按钮交互
- [x] 4.7 实现流式消息渲染（打字机效果）
- [x] 4.8 实现 API Key 输入框（显示/隐藏切换）
- [x] 4.9 实现设置保存/取消逻辑
- [x] 4.10 实现清空历史按钮

## 5. Port 通信

- [x] 5.1 实现 Side Panel 端 Port 连接建立
- [x] 5.2 实现消息发送 (`port.postMessage`)
- [x] 5.3 实现流式 chunk 接收处理
- [x] 5.4 实现错误消息处理

## 6. 首次使用体验

- [x] 6.1 实现首次使用检测（无 API Key）
- [x] 6.2 实现设置引导界面显示
- [x] 6.3 添加 API Key 获取帮助链接

## 7. 错误处理

- [x] 7.1 实现 API Key 无效错误处理
- [x] 7.2 实现网络错误处理与重试
- [x] 7.3 实现配额用尽错误处理
- [x] 7.4 实现内容过滤错误处理
- [x] 7.5 实现通用错误提示 UI

## 8. 样式与交互

- [x] 8.1 实现聊天界面样式（类似 ChatGPT 风格）
- [x] 8.2 实现用户/AI 消息样式区分
- [x] 8.3 实现加载状态样式
- [x] 8.4 实现错误提示样式
- [x] 8.5 实现响应式布局适配

## 9. 测试与验证

- [x] 9.1 本地加载插件测试
- [x] 9.2 API Key 配置流程测试
- [x] 9.3 发送消息与流式响应测试
- [x] 9.4 历史消息加载测试
- [x] 9.5 错误场景测试
