/**
 * Tool Registry - 工具注册中心
 * 
 * 支持声明式注册工具、执行工具、导出 Gemini Function Calling 格式
 */

import { 
    validateToolDefinition,
    FunctionDeclaration
} from './types.js';

/**
 * @typedef {import('./types.js').ToolDefinition} ToolDefinition
 * @typedef {import('./types.js').ToolExecutionResult} ToolExecutionResult
 */

/**
 * 工具注册中心类
 */
export class ToolRegistry {
    constructor() {
        /**
         * 已注册的工具映射
         * @type {Map<string, ToolDefinition>}
         */
        this.tools = new Map();
        
        /**
         * 日志输出函数
         * @type {Function}
         */
        this.logger = console.log;
    }
    
    /**
     * 设置日志输出函数
     * @param {Function} logger - 日志函数
     */
    setLogger(logger) {
        this.logger = logger;
    }
    
    /**
     * 注册单个工具
     * @param {ToolDefinition} toolDefinition - 工具定义
     * @returns {boolean} 注册成功返回 true
     * @throws {Error} 验证失败或工具已存在时抛出错误
     */
    registerTool(toolDefinition) {
        // 验证工具定义
        validateToolDefinition(toolDefinition);
        
        // 检查是否已存在
        if (this.tools.has(toolDefinition.name)) {
            throw new Error(`工具 "${toolDefinition.name}" 已存在，无法重复注册`);
        }
        
        // 注册工具
        this.tools.set(toolDefinition.name, toolDefinition);
        
        this.logger(`[ToolRegistry] 已注册工具: ${toolDefinition.name}`);
        
        return true;
    }
    
    /**
     * 批量注册工具
     * @param {ToolDefinition[]} toolDefinitions - 工具定义数组
     * @returns {number} 成功注册的数量
     */
    registerTools(toolDefinitions) {
        if (!Array.isArray(toolDefinitions)) {
            throw new Error('toolDefinitions 必须是数组');
        }
        
        let count = 0;
        for (const tool of toolDefinitions) {
            try {
                this.registerTool(tool);
                count++;
            } catch (error) {
                this.logger(`[ToolRegistry] 注册工具失败: ${error.message}`);
            }
        }
        
        return count;
    }
    
    /**
     * 获取已注册的工具
     * @param {string} name - 工具名称
     * @returns {ToolDefinition|undefined}
     */
    getTool(name) {
        return this.tools.get(name);
    }
    
    /**
     * 检查工具是否存在
     * @param {string} name - 工具名称
     * @returns {boolean}
     */
    hasTool(name) {
        return this.tools.has(name);
    }
    
    /**
     * 获取所有已注册的工具名称
     * @returns {string[]}
     */
    getToolNames() {
        return Array.from(this.tools.keys());
    }
    
    /**
     * 执行工具
     * @param {string} toolName - 工具名称
     * @param {Object} args - 工具参数
     * @returns {Promise<ToolExecutionResult>}
     */
    async executeTool(toolName, args = {}) {
        // 查找工具
        const tool = this.tools.get(toolName);
        
        if (!tool) {
            const error = `工具 "${toolName}" 未找到`;
            this.logger(`[ToolRegistry] ${error}`);
            return {
                success: false,
                error
            };
        }
        
        this.logger(`[ToolRegistry] 执行工具: ${toolName}`, args);
        
        try {
            // 执行工具
            const result = await tool.execute(args);
            
            this.logger(`[ToolRegistry] 工具执行成功: ${toolName}`);
            
            return {
                success: true,
                result
            };
        } catch (error) {
            const errorMessage = error.message || '未知错误';
            
            this.logger(`[ToolRegistry] 工具执行失败: ${toolName} - ${errorMessage}`);
            
            return {
                success: false,
                error: errorMessage
            };
        }
    }
    
    /**
     * 导出 Gemini Function Calling 格式的函数声明
     * @returns {FunctionDeclaration[]}
     */
    getFunctionDeclarations() {
        const declarations = [];
        
        for (const tool of this.tools.values()) {
            declarations.push({
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters
            });
        }
        
        return declarations;
    }
    
    /**
     * 导出 Gemini tools 参数格式
     * @returns {Object}
     */
    getToolsParameter() {
        const declarations = this.getFunctionDeclarations();
        
        if (declarations.length === 0) {
            return undefined;
        }
        
        return {
            functionDeclarations: declarations
        };
    }
    
    /**
     * 清空所有已注册的工具
     */
    clear() {
        this.tools.clear();
        this.logger('[ToolRegistry] 已清空所有工具');
    }
    
    /**
     * 注销指定工具
     * @param {string} name - 工具名称
     * @returns {boolean} 成功返回 true，工具不存在返回 false
     */
    unregisterTool(name) {
        if (this.tools.has(name)) {
            this.tools.delete(name);
            this.logger(`[ToolRegistry] 已注销工具: ${name}`);
            return true;
        }
        return false;
    }
    
    /**
     * 获取工具数量
     * @returns {number}
     */
    get size() {
        return this.tools.size;
    }
}

// 创建默认实例
export const defaultToolRegistry = new ToolRegistry();

/**
 * 创建一个简单的工具定义
 * @param {string} name - 工具名称
 * @param {string} description - 工具描述
 * @param {Object} parameters - 参数定义
 * @param {Function} execute - 执行函数
 * @returns {ToolDefinition}
 */
export function createTool(name, description, parameters, execute) {
    return {
        name,
        description,
        parameters,
        execute
    };
}
