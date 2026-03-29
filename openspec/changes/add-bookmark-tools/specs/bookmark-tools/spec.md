# Bookmark Tools Specification

书签操作工具集，提供查询、创建、移动、重命名、删除书签的能力。

## ADDED Requirements

### Requirement: Search Bookmarks Tool

系统 SHALL 提供 `search_bookmarks` 工具用于搜索书签。

#### Scenario: Search by Keyword

- **WHEN** Agent 调用 `search_bookmarks` 并提供 `query` 参数
- **THEN** 系统 SHALL 调用 `chrome.bookmarks.search(query)`
- **AND** 系统 SHALL 返回匹配的书签列表
- **AND** 每个结果 SHALL 包含 id、title、url、parentId

#### Scenario: Search Returns Empty

- **WHEN** 搜索没有匹配结果
- **THEN** 系统 SHALL 返回空数组

#### Scenario: Search Without Query

- **WHEN** 调用时未提供 `query` 参数
- **THEN** 系统 SHALL 返回所有书签

---

### Requirement: Get Bookmark Tree Tool

系统 SHALL 提供 `get_bookmark_tree` 工具用于获取书签文件夹结构。

#### Scenario: Get Full Tree

- **WHEN** Agent 调用 `get_bookmark_tree`
- **THEN** 系统 SHALL 调用 `chrome.bookmarks.getTree()`
- **AND** 系统 SHALL 返回简化的树形结构
- **AND** 文件夹节点 SHALL 包含 id、title、children
- **AND** 书签节点 SHALL 包含 id、title、url

#### Scenario: Get Subtree

- **WHEN** Agent 调用 `get_bookmark_tree` 并提供 `folderId` 参数
- **THEN** 系统 SHALL 调用 `chrome.bookmarks.getSubTree(folderId)`
- **AND** 系统 SHALL 返回指定文件夹的子树

---

### Requirement: Create Bookmark Folder Tool

系统 SHALL 提供 `create_bookmark_folder` 工具用于创建书签文件夹。

#### Scenario: Create Folder

- **WHEN** Agent 调用 `create_bookmark_folder` 并提供 `title` 和 `parentId`
- **THEN** 系统 SHALL 调用 `chrome.bookmarks.create({ title, parentId })`
- **AND** 系统 SHALL 返回新创建文件夹的 id 和 title

#### Scenario: Create Folder Without ParentId

- **WHEN** 调用时未提供 `parentId`
- **THEN** 系统 SHALL 在"其他书签"文件夹下创建

#### Scenario: Create Folder with Invalid ParentId

- **WHEN** 提供的 `parentId` 不存在
- **THEN** 系统 SHALL 返回错误信息 "父文件夹不存在"

---

### Requirement: Move Bookmark Tool

系统 SHALL 提供 `move_bookmark` 工具用于移动书签。

#### Scenario: Move Bookmark

- **WHEN** Agent 调用 `move_bookmark` 并提供 `bookmarkId` 和 `destinationId`
- **THEN** 系统 SHALL 调用 `chrome.bookmarks.move(bookmarkId, { parentId: destinationId })`
- **AND** 系统 SHALL 返回移动后的书签信息

#### Scenario: Move to Nonexistent Destination

- **WHEN** `destinationId` 不存在
- **THEN** 系统 SHALL 返回错误信息 "目标文件夹不存在"

#### Scenario: Move Nonexistent Bookmark

- **WHEN** `bookmarkId` 不存在
- **THEN** 系统 SHALL 返回错误信息 "书签不存在"

---

### Requirement: Rename Bookmark Tool

系统 SHALL 提供 `rename_bookmark` 工具用于重命名书签。

#### Scenario: Rename Bookmark

- **WHEN** Agent 调用 `rename_bookmark` 并提供 `bookmarkId` 和 `newTitle`
- **THEN** 系统 SHALL 调用 `chrome.bookmarks.update(bookmarkId, { title: newTitle })`
- **AND** 系统 SHALL 返回更新后的书签信息

#### Scenario: Rename Nonexistent Bookmark

- **WHEN** `bookmarkId` 不存在
- **THEN** 系统 SHALL 返回错误信息 "书签不存在"

#### Scenario: Rename with Empty Title

- **WHEN** `newTitle` 为空字符串
- **THEN** 系统 SHALL 返回错误信息 "标题不能为空"

---

### Requirement: Delete Bookmark Tool

系统 SHALL 提供 `delete_bookmark` 工具用于删除书签。

#### Scenario: Delete Bookmark

- **WHEN** Agent 调用 `delete_bookmark` 并提供 `bookmarkId`
- **THEN** 系统 SHALL 调用 `chrome.bookmarks.remove(bookmarkId)`
- **AND** 系统 SHALL 返回成功信息

#### Scenario: Delete Folder

- **WHEN** 指定的 `bookmarkId` 是文件夹
- **THEN** 系统 SHALL 调用 `chrome.bookmarks.removeTree(bookmarkId)`
- **AND** 系统 SHALL 递归删除文件夹及所有子项

#### Scenario: Delete Nonexistent Bookmark

- **WHEN** `bookmarkId` 不存在
- **THEN** 系统 SHALL 返回错误信息 "书签不存在"

---

### Requirement: Tool Definition Format

系统 SHALL 为每个工具提供符合 Gemini Function Calling 格式的定义。

#### Scenario: JSON Schema Parameters

- **WHEN** 导出工具定义
- **THEN** 参数 SHALL 使用 JSON Schema 格式
- **AND** 参数 SHALL 包含 type、properties、required 字段

#### Scenario: Tool Description

- **WHEN** 导出工具定义
- **THEN** 描述 SHALL 清晰说明工具功能
- **AND** 描述 SHALL 提供使用提示（如"谨慎使用"）

---

### Requirement: Tool Registration

系统 SHALL 提供统一的工具注册入口。

#### Scenario: Register All Bookmark Tools

- **WHEN** 调用 `registerBookmarkTools(registry)`
- **THEN** 系统 SHALL 注册全部 6 个书签工具
- **AND** 系统 SHALL 返回注册成功的工具数量

#### Scenario: Registration with Invalid Registry

- **WHEN** 传入的 registry 不是 ToolRegistry 实例
- **THEN** 系统 SHALL 抛出类型错误
