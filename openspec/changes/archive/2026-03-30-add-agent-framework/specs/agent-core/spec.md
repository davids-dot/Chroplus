# Agent Core Specification

Agent 核心框架，负责 Agent 循环执行、消息管理、工具调用协调。

## ADDED Requirements

### Requirement: Agent Execution Loop

系统 SHALL 提供 Agent 循环执行能力，支持多轮工具调用。

#### Scenario: User Initiates Agent Task

- **WHEN** 用户发送消息需要 Agent 执行任务
- **THEN** 系统 SHALL 启动 Agent 循环
- **AND** 系统 SHALL 构建包含工具声明的请求
- **AND** 系统 SHALL 调用 Gemini API

#### Scenario: Model Returns Function Call

- **WHEN** Gemini 返回 FunctionCall 响应
- **THEN** 系统 SHALL 解析工具名称和参数
- **AND** 系统 SHALL 执行对应工具
- **AND** 系统 SHALL 将工具结果加入消息历史
- **AND** 系统 SHALL 继续下一轮循环

#### Scenario: Model Returns Text Response

- **WHEN** Gemini 返回文本响应
- **THEN** 系统 SHALL 将响应显示给用户
- **AND** 系统 SHALL 结束 Agent 循环

#### Scenario: Maximum Loop Count Reached

- **WHEN** Agent 循环达到最大次数（10 次）
- **THEN** 系统 SHALL 终止循环
- **AND** 系统 SHALL 向用户显示当前进度和提示信息

---

### Requirement: Message Management

系统 SHALL 管理 Agent 执行过程中的消息历史。

#### Scenario: Append User Message

- **WHEN** 用户发送新消息
- **THEN** 系统 SHALL 将用户消息添加到消息历史
- **AND** 消息 SHALL 包含 role: 'user' 和 content 字段

#### Scenario: Append Model Message

- **WHEN** 模型返回文本响应
- **THEN** 系统 SHALL 将模型消息添加到消息历史
- **AND** 消息 SHALL 包含 role: 'model' 和 content 字段

#### Scenario: Append Function Call

- **WHEN** 模型返回 FunctionCall
- **THEN** 系统 SHALL 将 FunctionCall 添加到消息历史
- **AND** 消息 SHALL 包含 role: 'model' 和 functionCall 字段

#### Scenario: Append Function Response

- **WHEN** 工具执行完成
- **THEN** 系统 SHALL 将工具响应添加到消息历史
- **AND** 消息 SHALL 包含 role: 'user' 和 functionResponse 字段

---

### Requirement: Agent State Tracking

系统 SHALL 跟踪 Agent 执行状态。

#### Scenario: Track Loop Count

- **WHEN** Agent 执行每一轮循环
- **THEN** 系统 SHALL 递增循环计数器
- **AND** 系统 SHALL 在日志中记录当前循环次数

#### Scenario: Track Tool Calls

- **WHEN** 工具被调用
- **THEN** 系统 SHALL 记录工具名称、参数、执行结果
- **AND** 系统 SHALL 在日志中输出工具调用信息

---

### Requirement: Error Handling

系统 SHALL 优雅处理 Agent 执行过程中的错误。

#### Scenario: Tool Execution Error

- **WHEN** 工具执行抛出异常
- **THEN** 系统 SHALL 捕获异常
- **AND** 系统 SHALL 将错误信息作为 functionResponse 返回给模型
- **AND** 系统 SHALL 继续执行下一轮循环

#### Scenario: API Error

- **WHEN** Gemini API 返回错误
- **THEN** 系统 SHALL 终止 Agent 循环
- **AND** 系统 SHALL 向用户显示错误信息

---

### Requirement: Agent Response Streaming

系统 SHALL 支持 Agent 执行状态的实时反馈。

#### Scenario: Show Thinking Status

- **WHEN** Agent 正在等待 Gemini 响应
- **THEN** 系统 SHALL 显示"思考中..."状态

#### Scenario: Show Tool Execution Status

- **WHEN** 工具正在执行
- **THEN** 系统 SHALL 显示工具名称和执行状态
- **AND** 系统 SHALL 显示工具执行结果
