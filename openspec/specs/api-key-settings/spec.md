# API Key Settings Specification

API Key 配置管理规格。

## ADDED Requirements

### Requirement: Settings Interface

系统 SHALL 提供 API Key 设置界面。

#### Scenario: Settings View Display
- **WHEN** 用户点击设置图标
- **THEN** 系统 SHALL 显示设置视图
- **AND** 设置视图 SHALL 包含 API Key 输入框
- **AND** 设置视图 SHALL 包含保存和取消按钮

#### Scenario: First Time Setup Prompt
- **WHEN** 用户首次使用且未配置 API Key
- **THEN** 系统 SHALL 自动显示设置视图
- **AND** 系统 SHALL 显示引导文案 "请配置 Gemini API Key 以开始使用"

---

### Requirement: API Key Input

系统 SHALL 支持用户输入和管理 API Key。

#### Scenario: API Key Input Field
- **WHEN** 用户查看设置
- **THEN** 系统 SHALL 显示 API Key 输入框
- **AND** 输入框 SHALL 默认隐藏已输入内容（密码模式）

#### Scenario: Toggle API Key Visibility
- **WHEN** 用户点击显示/隐藏图标
- **THEN** 系统 SHALL 切换 API Key 的可见性
- **AND** 图标 SHALL 反映当前状态

#### Scenario: Existing API Key Display
- **WHEN** 用户打开设置且已保存 API Key
- **THEN** 系统 SHALL 显示已保存的 API Key（隐藏状态）
- **AND** 用户 SHALL 可以修改 API Key

---

### Requirement: API Key Storage

系统 SHALL 安全存储 API Key。

#### Scenario: Save API Key
- **WHEN** 用户点击保存按钮
- **THEN** 系统 SHALL 将 API Key 存储到 `chrome.storage.local`
- **AND** 系统 SHALL 不使用 `chrome.storage.sync`（避免同步到云端）

#### Scenario: API Key Persistence
- **WHEN** 用户重新打开侧边栏
- **THEN** 系统 SHALL 从 `chrome.storage.local` 读取已保存的 API Key

---

### Requirement: API Key Validation

系统 SHOULD 在保存时验证 API Key 格式。

#### Scenario: API Key Format Check
- **WHEN** 用户保存 API Key
- **THEN** 系统 SHALL 验证 API Key 以 "AIza" 开头
- **AND** 系统 SHALL 显示格式错误提示（如果无效）

#### Scenario: API Key Connection Test
- **WHEN** 用户保存 API Key
- **THEN** 系统 SHOULD 可选地测试 API Key 有效性
- **AND** 系统 SHALL 显示测试结果

---

### Requirement: Help Link

系统 SHALL 提供 API Key 获取帮助。

#### Scenario: Show Help Link
- **WHEN** 用户查看设置
- **THEN** 系统 SHALL 显示 "如何获取 API Key?" 链接
- **AND** 点击链接 SHALL 在新标签页打开 Google AI Studio

---

### Requirement: Settings Actions

系统 SHALL 提供设置操作按钮。

#### Scenario: Save Settings
- **WHEN** 用户点击保存按钮
- **THEN** 系统 SHALL 保存 API Key
- **AND** 系统 SHALL 切换回聊天视图
- **AND** 系统 SHALL 显示保存成功提示

#### Scenario: Cancel Settings
- **WHEN** 用户点击取消按钮
- **THEN** 系统 SHALL 放弃更改
- **AND** 系统 SHALL 切换回聊天视图
