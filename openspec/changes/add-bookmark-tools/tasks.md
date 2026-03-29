## 1. 权限配置

- [x] 1.1 在 `manifest.json` 添加 `bookmarks` 权限

## 2. 工具模块创建

- [x] 2.1 创建 `tools/bookmark-tools.js` 文件
- [x] 2.2 实现 `search_bookmarks` 工具 - 按关键词搜索书签
- [x] 2.3 实现 `get_bookmark_tree` 工具 - 获取书签文件夹结构
- [x] 2.4 实现 `create_bookmark_folder` 工具 - 创建书签文件夹
- [x] 2.5 实现 `move_bookmark` 工具 - 移动书签到指定文件夹
- [x] 2.6 实现 `rename_bookmark` 工具 - 重命名书签
- [x] 2.7 实现 `delete_bookmark` 工具 - 删除书签或文件夹
- [x] 2.8 实现 `registerBookmarkTools` 注册函数

## 3. 集成到 Side Panel

- [x] 3.1 在 `sidepanel.js` 中导入 `registerBookmarkTools`
- [x] 3.2 在 Agent 初始化时调用注册函数

## 4. 测试验证

- [x] 4.1 重新加载插件，验证权限生效
- [x] 4.2 测试对话式书签查询
- [x] 4.3 测试对话式书签整理（移动、重命名、删除）
