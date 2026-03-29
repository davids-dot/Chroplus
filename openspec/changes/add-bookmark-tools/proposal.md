# Proposal: Add Bookmark Tools

## Why

用户需要 AI Agent 能够帮助整理浏览器书签。当前 Agent 框架已完成，但缺少实际的书签操作工具。需要添加书签查询、移动、重命名、删除等工具，让 Agent 能够通过 Gemini Function Calling 智能整理书签。

## What Changes

- 新增 `tools/bookmark-tools.js` 模块，实现书签管理工具集
- 新增 Chrome Bookmarks API 权限声明
- 在 `sidepanel.js` 中集成书签工具的注册

### 功能列表

- **查询书签** (`search_bookmarks`): 按关键词或 URL 搜索书签
- **获取书签树** (`get_bookmark_tree`): 获取完整的书签文件夹结构
- **创建文件夹** (`create_bookmark_folder`): 在指定位置创建书签文件夹
- **移动书签** (`move_bookmark`): 将书签移动到指定文件夹
- **重命名书签** (`rename_bookmark`): 修改书签标题
- **删除书签** (`delete_bookmark`): 删除指定书签或文件夹

## Capabilities

### New Capabilities

- `bookmark-tools`: 书签操作工具集，提供查询、创建、移动、重命名、删除书签的能力

### Modified Capabilities

无。工具代码独立于现有框架，通过 ToolRegistry 动态注册。

## Impact

### 代码影响

- `tools/bookmark-tools.js`: 新增文件，约 300-400 行
- `manifest.json`: 添加 `bookmarks` 权限
- `sidepanel.js`: 添加工具注册代码（约 5-10 行）

### 依赖

- Chrome Bookmarks API (`chrome.bookmarks`)
- 现有 Agent 框架（ToolRegistry、Executor）

### 兼容性

- 无破坏性变更
- 工具代码与框架解耦，不影响现有功能
