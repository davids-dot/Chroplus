/**
 * Agent Executor - Agent 循环执行器
 * 
 * 负责 Agent 循环执行、消息管理、工具调用协调
 */

import {
    MAX_LOOP_COUNT,
    AgentState,
    ResponseType,
    MessageRole,
    createUserTextMessage,
    createModelTextMessage,
    createFunctionCallMessage,
    createFunctionResponseMessage,
    parseGeminiResponse
} from './types.js';

import { ToolRegistry } from './tool-registry.js';
import {
    buildToolsParameter,
    parseGeminiResponse as parseResponse,
    buildFunctionResponse,
    buildRequestBody,
    DEFAULT_GENERATION_CONFIG,
    handleGeminiError
} from '../lib/gemini-tools.js';

/**
 * @typedef {import('./types.js').AgentMessage} AgentMessage
 * @typedef {import('./types.js').AgentStatus} AgentStatus
 * @typedef {import('./types.js').GeminiResponse} GeminiResponse
 * @typedef {import('./types.js').ToolExecutionResult} ToolExecutionResult
 */

/**
 * Agent 执行器类
 */
export class AgentExecutor {
    /**
     * @param {Object} options - 配置选项
     * @param {ToolRegistry} options.toolRegistry - 工具注册中心
     * @param {Function} options.sendRequest - 发送 API 请求的函数
     * @param {Function} [options.onStatusChange] - 状态变化回调
     * @param {Function} [options.onLog] - 日志输出回调
     */
    constructor(options) {
        if (!options.toolRegistry) {
            throw new Error('toolRegistry 是必需的');
        }
        if (!options.sendRequest) {
            throw new Error('sendRequest 是必需的');
        }
        
        this.toolRegistry = options.toolRegistry;
        this.sendRequest = options.sendRequest;
        this.onStatusChange = options.onStatusChange || (() => {});
        this.onLog = options.onLog || console.log;
        
        /**
         * 消息历史
         * @type {AgentMessage[]}
         */
        this.messages = [];
        
        /**
         * 当前状态
         * @type {string}
         */
        this.state = AgentState.IDLE;
        
        /**
         * 循环计数
         * @type {number}
         */
        this.loopCount = 0;
        
        /**
         * 系统提示词
         * @type {string}
         */
        this.systemPrompt = '';
    }
    
    /**
     * 设置系统提示词
     * @param {string} prompt - 系统提示词
     */
    setSystemPrompt(prompt) {
        this.systemPrompt = prompt;
    }
    
    /**
     * 更新状态
     * @param {string} newState - 新状态
     * @param {Object} [extra] - 额外信息
     */
    updateState(newState, extra = {}) {
        this.state = newState;
        const status = {
            state: newState,
            loopCount: this.loopCount,
            ...extra
        };
        this.onStatusChange(status);
    }
    
    /**
     * 执行 Agent 任务
     * @param {string} userMessage - 用户消息
     * @returns {Promise<Object>} 执行结果
     */
    async execute(userMessage) {
        this.log('[AgentExecutor] 开始执行任务');
        
        // 重置状态
        this.loopCount = 0;
        this.messages = [];
        this.updateState(AgentState.THINKING, { message: '开始处理...' });
        
        // 添加用户消息
        this.messages.push(createUserTextMessage(userMessage));
        
        try {
            // Agent 循环
            while (this.loopCount < MAX_LOOP_COUNT) {
                this.loopCount++;
                this.log(`[AgentExecutor] 循环第 ${this.loopCount} 轮`);
                
                // 调用 Gemini API
                this.updateState(AgentState.THINKING, { message: '思考中...' });
                
                const response = await this.callGemini();
                
                // 解析响应
                const parsed = parseResponse(response);
                
                this.log(`[AgentExecutor] 响应类型: ${parsed.type}`);
                
                if (parsed.type === ResponseType.TEXT) {
                    // 文本响应，结束循环
                    this.messages.push(createModelTextMessage(parsed.content));
                    this.updateState(AgentState.COMPLETE, { message: '完成' });
                    
                    return {
                        success: true,
                        content: parsed.content,
                        messages: this.messages,
                        loopCount: this.loopCount
                    };
                }
                
                if (parsed.type === ResponseType.FUNCTION_CALL) {
                    // 函数调用
                    const functionCall = parsed.functionCall;
                    
                    this.log(`[AgentExecutor] 函数调用: ${functionCall.name}`);
                    
                    // 添加函数调用消息
                    this.messages.push(createFunctionCallMessage(functionCall));
                    
                    // 执行工具
                    this.updateState(AgentState.EXECUTING, { 
                        currentTool: functionCall.name,
                        message: `执行工具: ${functionCall.name}`
                    });
                    
                    const result = await this.toolRegistry.executeTool(
                        functionCall.name,
                        functionCall.args
                    );
                    
                    this.log(`[AgentExecutor] 工具执行结果: ${result.success ? '成功' : '失败'}`);
                    
                    // 构建函数响应
                    const functionResponse = buildFunctionResponse(
                        functionCall.name,
                        result.success ? result.result : result.error,
                        result.success
                    );
                    
                    // 添加函数响应消息
                    this.messages.push(createFunctionResponseMessage(functionResponse));
                    
                    // 继续下一轮循环
                    continue;
                }
                
                // 未知响应类型
                this.log(`[AgentExecutor] 未知响应类型: ${parsed.type}`);
                break;
            }
            
            // 达到最大循环次数
            if (this.loopCount >= MAX_LOOP_COUNT) {
                this.log('[AgentExecutor] 达到最大循环次数');
                this.updateState(AgentState.ERROR, { message: '达到最大循环次数' });
                
                return {
                    success: false,
                    error: '达到最大循环次数限制',
                    messages: this.messages,
                    loopCount: this.loopCount
                };
            }
            
        } catch (error) {
            this.log(`[AgentExecutor] 执行错误: ${error.message}`);
            this.updateState(AgentState.ERROR, { message: error.message });
            
            return {
                success: false,
                error: error.message,
                messages: this.messages,
                loopCount: this.loopCount
            };
        }
    }
    
    /**
     * 调用 Gemini API
     * @returns {Promise<Object>} API 响应
     */
    async callGemini() {
        // 获取工具声明
        const tools = this.toolRegistry.getToolsParameter();
        
        // 构建请求体
        const requestBody = buildRequestBody(
            this.messages,
            tools,
            DEFAULT_GENERATION_CONFIG
        );
        
        // 发送请求
        const response = await this.sendRequest(requestBody);
        
        return response;
    }
    
    /**
     * 获取当前状态
     * @returns {AgentStatus}
     */
    getStatus() {
        return {
            state: this.state,
            loopCount: this.loopCount,
            messageCount: this.messages.length
        };
    }
    
    /**
     * 获取消息历史
     * @returns {AgentMessage[]}
     */
    getMessages() {
        return [...this.messages];
    }
    
    /**
     * 清空消息历史
     */
    clearMessages() {
        this.messages = [];
        this.loopCount = 0;
        this.state = AgentState.IDLE;
    }
    
    /**
     * 日志输出
     * @param {string} message - 日志消息
     */
    log(message) {
        this.onLog(message);
    }
    
    /**
     * 停止执行（用于外部中断）
     */
    stop() {
        this.log('[AgentExecutor] 停止执行');
        this.updateState(AgentState.ERROR, { message: '用户中断' });
    }
}

/**
 * 创建 Agent 执行器
 * @param {Object} options - 配置选项
 * @returns {AgentExecutor}
 */
export function createAgentExecutor(options) {
    return new AgentExecutor(options);
}
