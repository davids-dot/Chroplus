## Context

当前项目已完成 Agent 框架搭建，包括：
- `agent/types.js`: 类型定义和常量
- `agent/tool-registry.js`: 工具注册中心
- `agent/executor.js`: Agent 执行器
- `sidepanel.js`: 集成 Agent 模式的 UI

框架通过 `ToolRegistry` 支持声明式注册工具，Agent 在 Side Panel 中执行。现在需要添加书签操作工具，让 AI 能够帮助用户整理书签。

Chrome Bookmarks API 提供 `chrome.bookmarks` 接口，支持查询、创建、移动、更新、删除书签等操作。

## Goals / Non-Goals

**Goals:**

- 实现 6 个核心书签工具，覆盖常见书签整理场景
- 工具代码与框架解耦，独立于 `tools/` 目录
- 工具在 Side Panel 中执行，无需 Background 中转
- 参数设计符合 Gemini Function Calling 的 JSON Schema 要求
- 错误处理友好，返回清晰的错误信息给 Agent

**Non-Goals:**

- 不实现书签导入/导出功能
- 不实现书签排序功能
- 不实现书签去重功能
- 不实现批量操作（可通过多轮对话实现）

## Decisions

### D1: 工具文件组织

**决定**: 所有书签工具放在 `tools/bookmark-tools.js` 单文件中

**备选方案**:
1. 每个工具一个文件 → 文件过多，管理复杂
2. 单文件所有工具 → 简单直观，便于维护（选择此方案）

**理由**: 6 个工具关联度高，总共约 300-400 行，单文件更清晰。

### D2: 工具注册方式

**决定**: 导出 `registerBookmarkTools(registry)` 函数，由调用方显式注册

**备选方案**:
1. 自动注册到 `defaultToolRegistry` → 隐式依赖，测试困难
2. 导出工具数组，调用方遍历注册 → 需要额外代码
3. 导出注册函数（选择此方案）→ 显式依赖，灵活可控

**理由**: 显式注册更清晰，方便测试和未来扩展。

### D3: 书签 ID 处理

**决定**: 工具参数使用 `bookmarkId` 字符串，由 Agent 从查询结果中获取

**理由**: Chrome Bookmarks API 使用字符串 ID，Agent 需要先查询获取 ID，再执行操作。

### D4: 文件夹路径表达

**决定**: `create_bookmark_folder` 支持 `parentId` 参数指定父文件夹

**备选方案**:
1. 支持路径字符串如 "书签栏/工作/技术" → 需要路径解析，复杂
2. 仅支持 `parentId` → 简单直接（选择此方案）

**理由**: Agent 可通过 `get_bookmark_tree` 获取文件夹 ID，再使用 ID 创建。

### D5: 搜索结果格式

**决定**: 返回精简的书签信息数组

```json
[
  {
    "id": "123",
    "title": "Google",
    "url": "https://google.com",
    "parentId": "1"
  }
]
```

**理由**: 包含 Agent 后续操作所需的全部信息，不返回过多无用字段。

## Risks / Trade-offs

### R1: 书签数据安全

**风险**: Agent 可能误删除重要书签

**缓解**:
- `delete_bookmark` 工具在描述中提示"谨慎使用"
- 工具返回操作结果，用户可在对话中确认
- 未来可添加"回收站"功能或操作确认机制

### R2: 书签数量过多

**风险**: 用户书签过多时，`get_bookmark_tree` 返回结果可能超出 Gemini 输入限制

**缓解**:
- 工具返回树形结构摘要（仅文件夹和数量）
- 未来可添加分页或深度限制

### R3: 工具参数错误

**风险**: Agent 可能传递无效的 `bookmarkId` 或 `parentId`

**缓解**:
- 每个工具执行前验证参数
- 返回清晰的错误信息，让 Agent 重试

## Migration Plan

无需迁移，全新功能。部署步骤：

1. 创建 `tools/bookmark-tools.js`
2. 在 `manifest.json` 添加 `bookmarks` 权限
3. 在 `sidepanel.js` 中导入并注册工具

## Open Questions

无。设计已明确。
