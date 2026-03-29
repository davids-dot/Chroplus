/**
 * 书签管理工具集
 * 
 * 提供 Chrome 书签操作工具，通过 ToolRegistry 注册
 * 工具在 Side Panel 中执行，无需 Background 中转
 */

// ==================== 辅助函数 ====================

/**
 * 简化书签节点，提取关键信息
 * @param {Object} node - Chrome 书签节点
 * @returns {Object} 简化后的书签信息
 */
function simplifyBookmarkNode(node) {
    const result = {
        id: node.id,
        title: node.title || ''
    };
    
    // 如果是书签（有 URL）
    if (node.url) {
        result.url = node.url;
        result.parentId = node.parentId;
    }
    
    // 如果是文件夹（有子节点）
    if (node.children) {
        result.children = node.children.map(simplifyBookmarkNode);
    }
    
    return result;
}

/**
 * 简化书签树，返回文件夹结构
 * @param {Array} nodes - Chrome 书签节点数组
 * @param {number} depth - 当前深度
 * @param {number} maxDepth - 最大深度
 * @returns {Array} 简化后的树结构
 */
function simplifyBookmarkTree(nodes, depth = 0, maxDepth = 3) {
    if (!nodes || !Array.isArray(nodes)) return [];
    if (depth > maxDepth) return [];
    
    return nodes.map(node => {
        const result = {
            id: node.id,
            title: node.title || '未命名'
        };
        
        // 如果是文件夹
        if (node.children) {
            result.type = 'folder';
            result.childCount = node.children.length;
            
            // 递归处理子节点（仅文件夹）
            const subFolders = node.children.filter(child => !child.url);
            if (subFolders.length > 0 && depth < maxDepth) {
                result.children = simplifyBookmarkTree(subFolders, depth + 1, maxDepth);
            }
        } else if (node.url) {
            result.type = 'bookmark';
            result.url = node.url;
        }
        
        return result;
    }).filter(node => node.type === 'folder'); // 只返回文件夹
}

// ==================== 工具定义 ====================

/**
 * search_bookmarks 工具
 * 按关键词搜索书签
 */
const searchBookmarksTool = {
    name: 'search_bookmarks',
    description: '按关键词或 URL 搜索书签。如果没有提供查询词，返回所有书签。',
    parameters: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: '搜索关键词，可以是书签标题或 URL 的一部分'
            }
        }
    },
    async execute(args) {
        const query = args.query || '';
        
        return new Promise((resolve, reject) => {
            chrome.bookmarks.search(query, (results) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                
                // 简化结果，只返回书签（非文件夹）
                const bookmarks = results
                    .filter(item => item.url) // 只返回书签，不返回文件夹
                    .map(item => ({
                        id: item.id,
                        title: item.title,
                        url: item.url,
                        parentId: item.parentId
                    }));
                
                resolve({
                    count: bookmarks.length,
                    bookmarks: bookmarks
                });
            });
        });
    }
};

/**
 * get_bookmark_tree 工具
 * 获取书签文件夹结构
 */
const getBookmarkTreeTool = {
    name: 'get_bookmark_tree',
    description: '获取书签文件夹结构。可以获取完整的书签树或指定文件夹的子树。返回文件夹层级结构。',
    parameters: {
        type: 'object',
        properties: {
            folderId: {
                type: 'string',
                description: '可选。指定文件夹 ID，获取该文件夹的子树。如果不提供，返回完整书签树。'
            }
        }
    },
    async execute(args) {
        const folderId = args.folderId;
        
        return new Promise((resolve, reject) => {
            const callback = (results) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                
                // 简化树结构
                let tree;
                if (folderId) {
                    // getSubTree 返回数组
                    tree = results && results[0] ? simplifyBookmarkTree([results[0]]) : [];
                } else {
                    tree = simplifyBookmarkTree(results);
                }
                
                resolve({
                    tree: tree
                });
            };
            
            if (folderId) {
                chrome.bookmarks.getSubTree(folderId, callback);
            } else {
                chrome.bookmarks.getTree(callback);
            }
        });
    }
};

/**
 * create_bookmark_folder 工具
 * 创建书签文件夹
 */
const createBookmarkFolderTool = {
    name: 'create_bookmark_folder',
    description: '在指定位置创建书签文件夹。如果不提供 parentId，将在"其他书签"文件夹下创建。',
    parameters: {
        type: 'object',
        properties: {
            title: {
                type: 'string',
                description: '文件夹名称'
            },
            parentId: {
                type: 'string',
                description: '父文件夹 ID。如果不提供，默认在"其他书签"文件夹下创建。'
            }
        },
        required: ['title']
    },
    async execute(args) {
        const title = args.title;
        
        if (!title || title.trim() === '') {
            return { error: '标题不能为空' };
        }
        
        // 如果没有提供 parentId，使用"其他书签"文件夹的 ID
        let parentId = args.parentId;
        
        if (!parentId) {
            // 获取书签树，找到"其他书签"文件夹
            const tree = await new Promise((resolve, reject) => {
                chrome.bookmarks.getTree((results) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }
                    resolve(results);
                });
            });
            
            // "其他书签"通常是根节点的第二个子节点
            // root[0] = 书签栏, root[1] = 其他书签
            const root = tree[0];
            if (root && root.children && root.children.length > 1) {
                parentId = root.children[1].id; // 其他书签
            } else if (root && root.children && root.children.length > 0) {
                parentId = root.children[0].id; // 回退到书签栏
            }
        }
        
        return new Promise((resolve, reject) => {
            chrome.bookmarks.create({
                title: title.trim(),
                parentId: parentId
            }, (result) => {
                if (chrome.runtime.lastError) {
                    const errorMsg = chrome.runtime.lastError.message;
                    if (errorMsg.includes('not found')) {
                        resolve({ error: '父文件夹不存在' });
                    } else {
                        reject(new Error(errorMsg));
                    }
                    return;
                }
                
                resolve({
                    success: true,
                    folder: {
                        id: result.id,
                        title: result.title,
                        parentId: result.parentId
                    }
                });
            });
        });
    }
};

/**
 * move_bookmark 工具
 * 移动书签到指定文件夹
 */
const moveBookmarkTool = {
    name: 'move_bookmark',
    description: '将书签或文件夹移动到指定文件夹。',
    parameters: {
        type: 'object',
        properties: {
            bookmarkId: {
                type: 'string',
                description: '要移动的书签或文件夹的 ID'
            },
            destinationId: {
                type: 'string',
                description: '目标文件夹的 ID'
            }
        },
        required: ['bookmarkId', 'destinationId']
    },
    async execute(args) {
        const bookmarkId = args.bookmarkId;
        const destinationId = args.destinationId;
        
        if (!bookmarkId || !destinationId) {
            return { error: 'bookmarkId 和 destinationId 都是必需的' };
        }
        
        // 先验证目标文件夹是否存在
        const destExists = await new Promise((resolve) => {
            chrome.bookmarks.get(destinationId, (results) => {
                if (chrome.runtime.lastError || !results || results.length === 0) {
                    resolve(false);
                } else {
                    // 确保是文件夹
                    resolve(results[0].url === undefined);
                }
            });
        });
        
        if (!destExists) {
            return { error: '目标文件夹不存在' };
        }
        
        return new Promise((resolve, reject) => {
            chrome.bookmarks.move(bookmarkId, { parentId: destinationId }, (result) => {
                if (chrome.runtime.lastError) {
                    const errorMsg = chrome.runtime.lastError.message;
                    if (errorMsg.includes('not found')) {
                        resolve({ error: '书签不存在' });
                    } else {
                        reject(new Error(errorMsg));
                    }
                    return;
                }
                
                resolve({
                    success: true,
                    bookmark: {
                        id: result.id,
                        title: result.title,
                        url: result.url,
                        parentId: result.parentId
                    }
                });
            });
        });
    }
};

/**
 * rename_bookmark 工具
 * 重命名书签或文件夹
 */
const renameBookmarkTool = {
    name: 'rename_bookmark',
    description: '重命名书签或文件夹。',
    parameters: {
        type: 'object',
        properties: {
            bookmarkId: {
                type: 'string',
                description: '要重命名的书签或文件夹的 ID'
            },
            newTitle: {
                type: 'string',
                description: '新的标题名称'
            }
        },
        required: ['bookmarkId', 'newTitle']
    },
    async execute(args) {
        const bookmarkId = args.bookmarkId;
        const newTitle = args.newTitle;
        
        if (!bookmarkId) {
            return { error: 'bookmarkId 是必需的' };
        }
        
        if (!newTitle || newTitle.trim() === '') {
            return { error: '标题不能为空' };
        }
        
        return new Promise((resolve, reject) => {
            chrome.bookmarks.update(bookmarkId, { title: newTitle.trim() }, (result) => {
                if (chrome.runtime.lastError) {
                    const errorMsg = chrome.runtime.lastError.message;
                    if (errorMsg.includes('not found')) {
                        resolve({ error: '书签不存在' });
                    } else {
                        reject(new Error(errorMsg));
                    }
                    return;
                }
                
                resolve({
                    success: true,
                    bookmark: {
                        id: result.id,
                        title: result.title,
                        url: result.url,
                        parentId: result.parentId
                    }
                });
            });
        });
    }
};

/**
 * delete_bookmark 工具
 * 删除书签或文件夹
 */
const deleteBookmarkTool = {
    name: 'delete_bookmark',
    description: '删除书签或文件夹。注意：删除文件夹会递归删除其中的所有内容，请谨慎使用。',
    parameters: {
        type: 'object',
        properties: {
            bookmarkId: {
                type: 'string',
                description: '要删除的书签或文件夹的 ID'
            }
        },
        required: ['bookmarkId']
    },
    async execute(args) {
        const bookmarkId = args.bookmarkId;
        
        if (!bookmarkId) {
            return { error: 'bookmarkId 是必需的' };
        }
        
        // 先获取书签信息，判断是书签还是文件夹
        const bookmarkInfo = await new Promise((resolve) => {
            chrome.bookmarks.get(bookmarkId, (results) => {
                if (chrome.runtime.lastError || !results || results.length === 0) {
                    resolve(null);
                } else {
                    resolve(results[0]);
                }
            });
        });
        
        if (!bookmarkInfo) {
            return { error: '书签不存在' };
        }
        
        const isFolder = !bookmarkInfo.url;
        
        return new Promise((resolve, reject) => {
            const callback = () => {
                if (chrome.runtime.lastError) {
                    const errorMsg = chrome.runtime.lastError.message;
                    if (errorMsg.includes('not found')) {
                        resolve({ error: '书签不存在' });
                    } else {
                        reject(new Error(errorMsg));
                    }
                    return;
                }
                
                resolve({
                    success: true,
                    message: isFolder 
                        ? `文件夹 "${bookmarkInfo.title}" 及其内容已删除` 
                        : `书签 "${bookmarkInfo.title}" 已删除`
                });
            };
            
            if (isFolder) {
                chrome.bookmarks.removeTree(bookmarkId, callback);
            } else {
                chrome.bookmarks.remove(bookmarkId, callback);
            }
        });
    }
};

// ==================== 注册函数 ====================

/**
 * 注册所有书签工具到 ToolRegistry
 * @param {Object} registry - ToolRegistry 实例
 * @returns {number} 成功注册的工具数量
 */
export function registerBookmarkTools(registry) {
    if (!registry || typeof registry.registerTool !== 'function') {
        throw new Error('无效的 ToolRegistry 实例');
    }
    
    const tools = [
        searchBookmarksTool,
        getBookmarkTreeTool,
        createBookmarkFolderTool,
        moveBookmarkTool,
        renameBookmarkTool,
        deleteBookmarkTool
    ];
    
    let count = 0;
    for (const tool of tools) {
        try {
            registry.registerTool(tool);
            count++;
        } catch (error) {
            console.error(`[BookmarkTools] 注册工具失败: ${tool.name}`, error);
        }
    }
    
    console.log(`[BookmarkTools] 已注册 ${count}/${tools.length} 个工具`);
    return count;
}

// 导出工具定义（供测试使用）
export const bookmarkTools = {
    searchBookmarksTool,
    getBookmarkTreeTool,
    createBookmarkFolderTool,
    moveBookmarkTool,
    renameBookmarkTool,
    deleteBookmarkTool
};
