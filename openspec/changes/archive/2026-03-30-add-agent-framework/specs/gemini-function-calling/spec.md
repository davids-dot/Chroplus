# Gemini Function Calling Specification

Gemini Function Calling API 集成，支持工具声明和响应解析。

## ADDED Requirements

### Requirement: Function Calling Request Format

系统 SHALL 构建符合 Gemini API 规范的 Function Calling 请求。

#### Scenario: Build Request With Tools

- **WHEN** 调用 chatWithTools(messages, tools, apiKey)
- **THEN** 系统 SHALL 构建 tools 字段
- **AND** tools SHALL 包含 functionDeclarations 数组
- **AND** 每个 functionDeclaration SHALL 包含 name, description, parameters

#### Scenario: Convert Tool To Function Declaration

- **WHEN** 将注册的工具转换为 Gemini 格式
- **THEN** 系统 SHALL 提取工具的 name, description, parameters
- **AND** 系统 SHALL 保持 parameters 的 JSON Schema 结构

---

### Requirement: Function Call Response Parsing

系统 SHALL 解析 Gemini 返回的 FunctionCall 响应。

#### Scenario: Parse Function Call Response

- **WHEN** Gemini 返回包含 functionCall 的响应
- **THEN** 系统 SHALL 提取 functionCall 对象
- **AND** 系统 SHALL 返回 { type: 'function_call', name, args }

#### Scenario: Parse Text Response

- **WHEN** Gemini 返回文本响应
- **THEN** 系统 SHALL 提取文本内容
- **AND** 系统 SHALL 返回 { type: 'text', content }

#### Scenario: Parse Multiple Function Calls

- **WHEN** Gemini 返回多个 FunctionCall
- **THEN** 系统 SHALL 按顺序解析所有 FunctionCall
- **AND** 系统 SHALL 返回 FunctionCall 数组
- **NOTE**: MVP 阶段 Gemini 通常返回单个 FunctionCall

---

### Requirement: Function Response Format

系统 SHALL 构建符合 Gemini API 规范的 Function Response。

#### Scenario: Build Function Response

- **WHEN** 工具执行完成
- **THEN** 系统 SHALL 构建 functionResponse 对象
- **AND** functionResponse SHALL 包含 name 和 response 字段
- **AND** response SHALL 包含执行结果

#### Scenario: Build Error Function Response

- **WHEN** 工具执行失败
- **THEN** 系统 SHALL 构建 functionResponse
- **AND** response SHALL 包含 error 字段
- **AND** error SHALL 包含错误信息

---

### Requirement: API Request Structure

系统 SHALL 发送正确格式的 API 请求。

#### Scenario: Request Body Structure

- **WHEN** 发送 chatWithTools 请求
- **THEN** 请求体 SHALL 包含：
  - contents: 消息历史数组
  - tools: 工具声明对象
  - generationConfig: 生成配置（可选）

#### Scenario: Contents Format

- **WHEN** 构建消息历史
- **THEN** 每条消息 SHALL 包含 role 和 parts
- **AND** parts SHALL 是数组，包含文本或 functionCall 或 functionResponse

---

### Requirement: Backward Compatibility

系统 SHALL 保持与现有 chat API 的兼容性。

#### Scenario: Existing Chat API Unchanged

- **WHEN** 调用 chat(messages, onChunk, apiKey)
- **THEN** 系统 SHALL 执行原有的聊天逻辑
- **AND** 系统 SHALL 不包含 tools 参数
- **AND** 系统 SHALL 支持流式输出

#### Scenario: New ChatWithTools API

- **WHEN** 调用 chatWithTools(messages, tools, apiKey)
- **THEN** 系统 SHALL 执行带工具的对话
- **AND** 系统 SHALL 返回完整响应（非流式）
- **AND** 系统 SHALL 支持 Function Calling
