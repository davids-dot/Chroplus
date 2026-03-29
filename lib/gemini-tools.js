/**
 * Gemini Function Calling 工具函数
 * 
 * 提供 Gemini API Function Calling 相关的格式转换和解析工具
 */

/**
 * @typedef {import('../agent/types.js').FunctionDeclaration} FunctionDeclaration
 * @typedef {import('../agent/types.js').FunctionCall} FunctionCall
 * @typedef {import('../agent/types.js').FunctionResponse} FunctionResponse
 * @typedef {import('../agent/types.js').GeminiResponse} GeminiResponse
 */

/**
 * 构建 Gemini tools 参数
 * @param {FunctionDeclaration[]} functionDeclarations - 函数声明数组
 * @returns {Object} Gemini tools 参数
 */
export function buildToolsParameter(functionDeclarations) {
    if (!functionDeclarations || functionDeclarations.length === 0) {
        return undefined;
    }
    
    return {
        functionDeclarations: functionDeclarations.map(decl => ({
            name: decl.name,
            description: decl.description,
            parameters: decl.parameters
        }))
    };
}

/**
 * 从 ToolRegistry 导出的格式构建 tools 参数
 * @param {Object} toolsParameter - ToolRegistry.getToolsParameter() 返回值
 * @returns {Object} Gemini tools 参数
 */
export function buildToolsFromRegistry(toolsParameter) {
    if (!toolsParameter || !toolsParameter.functionDeclarations) {
        return undefined;
    }
    
    return toolsParameter;
}

/**
 * 解析 Gemini API 响应
 * @param {Object} response - Gemini API 响应对象
 * @returns {GeminiResponse} 解析后的响应
 */
export function parseGeminiResponse(response) {
    // 验证响应格式
    if (!response || !response.candidates || !Array.isArray(response.candidates)) {
        return {
            type: 'text',
            content: '',
            error: '无效的响应格式'
        };
    }
    
    const candidate = response.candidates[0];
    
    // 检查是否被过滤
    if (candidate.finishReason === 'SAFETY') {
        return {
            type: 'text',
            content: '响应被安全过滤器拦截',
            error: 'SAFETY_FILTER'
        };
    }
    
    // 检查是否有内容
    if (!candidate.content || !candidate.content.parts) {
        return {
            type: 'text',
            content: '',
            error: '响应无内容'
        };
    }
    
    const parts = candidate.content.parts;
    
    // 查找 functionCall
    for (const part of parts) {
        if (part.functionCall) {
            return {
                type: 'function_call',
                functionCall: {
                    name: part.functionCall.name,
                    args: part.functionCall.args || {}
                }
            };
        }
    }
    
    // 提取文本内容
    const textParts = parts.filter(part => typeof part.text === 'string');
    const content = textParts.map(part => part.text).join('');
    
    return {
        type: 'text',
        content
    };
}

/**
 * 构建 Function Response 消息
 * @param {string} name - 函数名
 * @param {Object} result - 执行结果
 * @param {boolean} success - 是否成功
 * @returns {FunctionResponse}
 */
export function buildFunctionResponse(name, result, success = true) {
    if (success) {
        return {
            name,
            response: {
                result: typeof result === 'string' ? result : JSON.stringify(result)
            }
        };
    } else {
        return {
            name,
            response: {
                error: typeof result === 'string' ? result : result.message || '执行失败'
            }
        };
    }
}

/**
 * 构建 functionResponse part
 * @param {FunctionResponse} functionResponse - 函数响应
 * @returns {Object} Gemini API 所需的 part 格式
 */
export function buildFunctionResponsePart(functionResponse) {
    return {
        functionResponse
    };
}

/**
 * 将消息历史转换为 Gemini contents 格式
 * @param {Array} messages - 消息历史
 * @returns {Array} Gemini contents 格式
 */
export function buildContents(messages) {
    if (!Array.isArray(messages)) {
        return [];
    }
    
    return messages.map(msg => {
        // 如果已经是 Gemini 格式（有 parts 字段），直接返回
        if (msg.parts) {
            return {
                role: msg.role,
                parts: msg.parts
            };
        }
        
        // 如果是简单格式（有 content 字段），转换为 Gemini 格式
        if (msg.content) {
            return {
                role: msg.role,
                parts: [{ text: msg.content }]
            };
        }
        
        // 未知格式，返回空
        return {
            role: msg.role || 'user',
            parts: []
        };
    });
}

/**
 * 构建 Gemini API 请求体
 * @param {Array} messages - 消息历史
 * @param {Object} tools - tools 参数
 * @param {Object} [generationConfig] - 生成配置（可选）
 * @returns {Object} 请求体
 */
export function buildRequestBody(messages, tools, generationConfig) {
    const contents = buildContents(messages);
    
    const body = {
        contents
    };
    
    // 添加 tools（如果存在）
    if (tools) {
        body.tools = [tools];
    }
    
    // 添加生成配置（如果存在）
    if (generationConfig) {
        body.generationConfig = generationConfig;
    }
    
    return body;
}

/**
 * 默认生成配置
 */
export const DEFAULT_GENERATION_CONFIG = {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 8192
};

/**
 * 错误处理：将 HTTP 错误转换为友好消息
 * @param {number} status - HTTP 状态码
 * @param {Object} errorData - 错误数据
 * @returns {Error}
 */
export function handleGeminiError(status, errorData) {
    const error = errorData.error || {};
    const errorMessage = error.message || '未知错误';
    
    switch (status) {
        case 400:
            return new Error(`请求格式错误: ${errorMessage}`);
        case 401:
        case 403:
            return new Error('API Key 无效或已过期');
        case 404:
            return new Error('模型不存在，请检查模型名称');
        case 429:
            return new Error('API 配额已用尽，请稍后再试');
        case 500:
        case 503:
            return new Error('Gemini 服务暂时不可用，请稍后再试');
        default:
            return new Error(`请求失败 (${status}): ${errorMessage}`);
    }
}
