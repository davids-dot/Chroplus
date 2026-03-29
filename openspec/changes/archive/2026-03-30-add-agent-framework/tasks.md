# Agent 框架实现任务

## 1. 项目结构搭建

- [x] 1.1 创建 `agent/` 目录
- [x] 1.2 创建 `agent/types.js` - 定义类型常量（ToolDefinition, AgentState, AgentMessage 等）
- [x] 1.3 创建 `lib/` 目录

## 2. Tool Registry 实现

- [x] 2.1 创建 `agent/tool-registry.js` - 实现 ToolRegistry 类
- [x] 2.2 实现 `registerTool(toolDefinition)` 方法
- [x] 2.3 实现 `executeTool(name, args)` 方法
- [x] 2.4 实现 `getFunctionDeclarations()` 方法
- [x] 2.5 添加工具定义验证逻辑
- [x] 2.6 添加错误处理和异常捕获

## 3. Gemini Function Calling 集成

- [x] 3.1 创建 `lib/gemini-tools.js` - 实现 Gemini 格式转换工具
- [x] 3.2 实现 `buildToolsParameter(tools)` - 构建 Gemini tools 参数
- [x] 3.3 实现 `parseFunctionCall(response)` - 解析 FunctionCall 响应
- [x] 3.4 实现 `buildFunctionResponse(name, result)` - 构建 FunctionResponse

## 4. GeminiProvider 扩展

- [x] 4.1 在 `background.js` 中为 GeminiProvider 添加 `chatWithTools()` 方法
- [x] 4.2 实现带 tools 参数的 API 请求构建
- [x] 4.3 实现 FunctionCall 响应解析
- [x] 4.4 添加错误处理
- [x] 4.5 保持 `chat()` 方法不变（向后兼容）

## 5. Agent Executor 实现

- [x] 5.1 创建 `agent/executor.js` - 实现 AgentExecutor 类
- [x] 5.2 实现 `execute(userMessage)` 入口方法
- [x] 5.3 实现 Agent 循环逻辑（最大 10 轮）
- [x] 5.4 实现消息历史管理
- [x] 5.5 实现工具调用和结果处理
- [x] 5.6 实现状态跟踪（循环计数、工具调用记录）
- [x] 5.7 实现错误处理和恢复

## 6. Side Panel 集成

- [x] 6.1 重构 `sidepanel.js` - 提取消息渲染逻辑到独立函数
- [x] 6.2 在 sidepanel.js 中导入 AgentExecutor 和 ToolRegistry
- [x] 6.3 初始化 ToolRegistry 并注册测试工具（如 get_current_time）
- [x] 6.4 修改消息发送逻辑，支持 Agent 模式
- [x] 6.5 实现 Agent 状态显示（思考中、工具执行中等）
- [x] 6.6 确保 sidepanel.js 文件不超过 600 行

## 7. 通信协议扩展

- [x] 7.1 扩展 Port 通信协议，添加 `chatWithTools` 消息类型
- [x] 7.2 在 background.js 中处理 `chatWithTools` 消息
- [x] 7.3 实现 Agent 响应流式反馈（状态更新）

## 8. 测试与验证

- [ ] 8.1 测试 ToolRegistry 工具注册和执行
- [ ] 8.2 测试 Gemini Function Calling API 调用
- [ ] 8.3 测试 Agent 循环执行（单工具调用）
- [ ] 8.4 测试 Agent 多轮工具调用
- [ ] 8.5 测试错误场景（工具异常、API 错误）
- [ ] 8.6 测试最大循环次数限制
- [ ] 8.7 验证现有聊天功能不受影响
