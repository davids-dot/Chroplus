/**
 * Agent 类型定义和常量
 * 
 * 定义 Agent 框架中使用的所有类型、常量和接口
 */

// ==================== 常量定义 ====================

/**
 * Agent 循环最大次数
 */
export const MAX_LOOP_COUNT = 10;

/**
 * Agent 执行状态
 */
export const AgentState = {
    IDLE: 'idle',           // 空闲
    THINKING: 'thinking',   // 等待模型响应
    EXECUTING: 'executing', // 执行工具
    ERROR: 'error',         // 错误
    COMPLETE: 'complete'    // 完成
};

/**
 * 响应类型
 */
export const ResponseType = {
    TEXT: 'text',               // 文本响应
    FUNCTION_CALL: 'function_call' // 函数调用
};

/**
 * 消息角色
 */
export const MessageRole = {
    USER: 'user',
    MODEL: 'model'
};

// ==================== 类型定义 (JSDoc) ====================

/**
 * @typedef {Object} ToolDefinition
 * @property {string} name - 工具名称，唯一标识
 * @property {string} description - 工具功能描述
 * @property {Object} parameters - JSON Schema 格式的参数定义
 * @property {Function} execute - 异步执行函数 (args: Object) => Promise<any>
 */

/**
 * @typedef {Object} FunctionDeclaration
 * @property {string} name - 函数名称
 * @property {string} description - 函数描述
 * @property {Object} parameters - JSON Schema 参数定义
 */

/**
 * @typedef {Object} FunctionCall
 * @property {string} name - 要调用的函数名
 * @property {Object} args - 函数参数
 */

/**
 * @typedef {Object} FunctionResponse
 * @property {string} name - 函数名
 * @property {Object} response - 响应内容，包含 result 或 error
 */

/**
 * @typedef {Object} AgentMessage
 * @property {string} role - 角色 ('user' | 'model')
 * @property {Array} parts - 消息部分数组
 * @property {number} [timestamp] - 时间戳（可选）
 */

/**
 * @typedef {Object} GeminiResponse
 * @property {string} type - 响应类型 ('text' | 'function_call')
 * @property {string} [content] - 文本内容（type 为 text 时）
 * @property {FunctionCall} [functionCall] - 函数调用（type 为 function_call 时）
 */

/**
 * @typedef {Object} ToolExecutionResult
 * @property {boolean} success - 是否成功
 * @property {*} [result] - 执行结果
 * @property {string} [error] - 错误信息
 */

/**
 * @typedef {Object} AgentStatus
 * @property {string} state - 当前状态
 * @property {number} loopCount - 当前循环次数
 * @property {string} [currentTool] - 当前执行的工具
 * @property {string} [message] - 状态消息
 */

// ==================== 工具函数 ====================

/**
 * 创建用户文本消息
 * @param {string} text - 文本内容
 * @returns {AgentMessage}
 */
export function createUserTextMessage(text) {
    return {
        role: MessageRole.USER,
        parts: [{ text }],
        timestamp: Date.now()
    };
}

/**
 * 创建模型文本消息
 * @param {string} text - 文本内容
 * @returns {AgentMessage}
 */
export function createModelTextMessage(text) {
    return {
        role: MessageRole.MODEL,
        parts: [{ text }],
        timestamp: Date.now()
    };
}

/**
 * 创建函数调用消息（模型发起）
 * @param {FunctionCall} functionCall - 函数调用
 * @returns {AgentMessage}
 */
export function createFunctionCallMessage(functionCall) {
    return {
        role: MessageRole.MODEL,
        parts: [{ functionCall }],
        timestamp: Date.now()
    };
}

/**
 * 创建函数响应消息（用户返回结果）
 * @param {FunctionResponse} functionResponse - 函数响应
 * @returns {AgentMessage}
 */
export function createFunctionResponseMessage(functionResponse) {
    return {
        role: MessageRole.USER,
        parts: [{ functionResponse }],
        timestamp: Date.now()
    };
}

/**
 * 验证工具定义格式
 * @param {ToolDefinition} tool - 工具定义
 * @throws {Error} 验证失败时抛出错误
 */
export function validateToolDefinition(tool) {
    if (!tool || typeof tool !== 'object') {
        throw new Error('工具定义必须是一个对象');
    }
    
    const requiredFields = ['name', 'description', 'parameters', 'execute'];
    const missingFields = requiredFields.filter(field => !tool[field]);
    
    if (missingFields.length > 0) {
        throw new Error(`工具定义缺少必需字段: ${missingFields.join(', ')}`);
    }
    
    if (typeof tool.name !== 'string' || tool.name.trim() === '') {
        throw new Error('工具名称必须是非空字符串');
    }
    
    if (typeof tool.description !== 'string' || tool.description.trim() === '') {
        throw new Error('工具描述必须是非空字符串');
    }
    
    if (typeof tool.parameters !== 'object' || tool.parameters === null) {
        throw new Error('工具参数必须是对象');
    }
    
    if (tool.parameters.type !== 'object') {
        throw new Error('工具参数的 type 必须是 "object"');
    }
    
    if (typeof tool.execute !== 'function') {
        throw new Error('工具 execute 必须是函数');
    }
}

/**
 * 检查是否为有效的 Gemini 响应
 * @param {Object} response - API 响应
 * @returns {boolean}
 */
export function isValidGeminiResponse(response) {
    if (!response || !response.candidates || !Array.isArray(response.candidates)) {
        return false;
    }
    
    const candidate = response.candidates[0];
    if (!candidate || !candidate.content) {
        return false;
    }
    
    return true;
}

/**
 * 从 Gemini 响应中提取内容
 * @param {Object} response - API 响应
 * @returns {GeminiResponse}
 */
export function parseGeminiResponse(response) {
    if (!isValidGeminiResponse(response)) {
        throw new Error('无效的 Gemini 响应格式');
    }
    
    const candidate = response.candidates[0];
    const parts = candidate.content.parts;
    
    if (!parts || parts.length === 0) {
        return { type: ResponseType.TEXT, content: '' };
    }
    
    // 检查是否有 functionCall
    const functionCallPart = parts.find(part => part.functionCall);
    if (functionCallPart) {
        return {
            type: ResponseType.FUNCTION_CALL,
            functionCall: functionCallPart.functionCall
        };
    }
    
    // 提取文本
    const textParts = parts.filter(part => part.text);
    const content = textParts.map(part => part.text).join('');
    
    return {
        type: ResponseType.TEXT,
        content
    };
}
