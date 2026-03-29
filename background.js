// background.js - Background Service Worker

// ==================== AI Provider Interface ====================

/**
 * AI Provider 抽象基类
 */
class AIProvider {
    /**
     * 普通对话（流式）
     * @param {Array} messages - 消息历史
     * @param {Function} onChunk - 流式响应回调
     * @param {string} apiKey - API Key
     */
    async chat(messages, onChunk, apiKey) {
        throw new Error('chat() must be implemented');
    }

    /**
     * 带工具的对话（非流式）
     * @param {Array} messages - 消息历史
     * @param {Object} tools - 工具声明
     * @param {string} apiKey - API Key
     * @returns {Promise<Object>} 完整响应
     */
    async chatWithTools(messages, tools, apiKey) {
        throw new Error('chatWithTools() must be implemented');
    }

    /**
     * 检查服务是否可用
     * @param {string} apiKey - API Key
     */
    async isAvailable(apiKey) {
        throw new Error('isAvailable() must be implemented');
    }
}

// ==================== Gemini Provider Implementation ====================

/**
 * Gemini Provider 实现
 */
class GeminiProvider extends AIProvider {
    constructor() {
        super();
        // 使用 Gemini 3 Flash Preview
        this.model = 'gemini-3-flash-preview';
        this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    }

    /**
     * 普通对话（流式输出）
     * 保持原有实现，向后兼容
     */
    async chat(messages, onChunk, apiKey) {
        if (!apiKey) {
            throw new Error('API Key 未配置');
        }

        // Convert messages to Gemini format
        // 过滤掉空消息
        const validMessages = messages.filter(m => m.content && m.content.trim());
        
        const contents = validMessages.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));

        console.log('[Gemini] Sending request with', contents.length, 'messages');
        console.log('[Gemini] Model:', this.model);

        // 使用流式 API
        const url = `${this.apiUrl}/${this.model}:streamGenerateContent?key=${apiKey}&alt=sse`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: contents,
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 8192,
                    }
                })
            });

            console.log('[Gemini] Response status:', response.status);

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                    console.error('[Gemini] Error response:', errorData);
                } catch (e) {
                    errorData = {};
                }
                throw this.handleError(response.status, errorData);
            }

            // Parse SSE stream
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let totalText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    console.log('[Gemini] Stream complete, total length:', totalText.length);
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine) continue;
                    
                    if (trimmedLine.startsWith('data: ')) {
                        const data = trimmedLine.slice(6).trim();
                        if (data === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(data);
                            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                            if (text) {
                                totalText += text;
                                onChunk(text);
                            }
                        } catch (e) {
                            console.warn('[Gemini] Failed to parse SSE data:', data);
                        }
                    } else if (trimmedLine.startsWith('{')) {
                        // 有时候 Gemini 直接返回 JSON 而不是 SSE 格式
                        try {
                            const parsed = JSON.parse(trimmedLine);
                            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                            if (text) {
                                totalText += text;
                                onChunk(text);
                            }
                        } catch (e) {
                            // 忽略解析错误
                        }
                    } else {
                        console.warn('[Gemini] Unrecognized SSE line:', trimmedLine);
                    }
                }
            }

            // 如果没有收到任何文本，可能是模型问题
            if (!totalText) {
                console.warn('[Gemini] No text received from API');
            }

        } catch (error) {
            console.error('[Gemini] Request failed:', error);
            throw error;
        }
    }

    /**
     * 带工具的对话（支持 Function Calling）
     * 新增方法，用于 Agent 框架
     * 
     * @param {Array} messages - Gemini 格式的消息历史
     * @param {Object} tools - 工具声明（Gemini tools 格式）
     * @param {string} apiKey - API Key
     * @returns {Promise<Object>} 完整的 Gemini 响应
     */
    async chatWithTools(messages, tools, apiKey) {
        if (!apiKey) {
            throw new Error('API Key 未配置');
        }

        console.log('[Gemini] chatWithTools - messages:', messages.length);
        console.log('[Gemini] chatWithTools - has tools:', !!tools);

        // 使用非流式 API
        const url = `${this.apiUrl}/${this.model}:generateContent?key=${apiKey}`;

        // 构建请求体
        const requestBody = {
            contents: messages,
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192,
            }
        };

        // 添加工具（如果存在）
        if (tools && tools.functionDeclarations && tools.functionDeclarations.length > 0) {
            requestBody.tools = [tools];
            console.log('[Gemini] Tools count:', tools.functionDeclarations.length);
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            console.log('[Gemini] chatWithTools response status:', response.status);

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                    console.error('[Gemini] Error response:', errorData);
                } catch (e) {
                    errorData = {};
                }
                throw this.handleError(response.status, errorData);
            }

            const data = await response.json();
            
            console.log('[Gemini] chatWithTools success');
            
            return data;

        } catch (error) {
            console.error('[Gemini] chatWithTools failed:', error);
            throw error;
        }
    }

    /**
     * 统一错误处理
     * @param {number} status - HTTP 状态码
     * @param {Object} errorData - 错误数据
     * @returns {Error}
     */
    handleError(status, errorData) {
        const error = errorData.error || {};
        const errorMessage = error.message || '未知错误';

        console.error('[Gemini] Error:', status, errorMessage);

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

    /**
     * 检查服务是否可用
     */
    async isAvailable(apiKey) {
        return !!apiKey;
    }
}

// ==================== Provider Instance ====================

const geminiProvider = new GeminiProvider();

// ==================== Port Connection Handling ====================

const ports = new Map();

chrome.runtime.onConnect.addListener((port) => {
    if (port.name === 'sidepanel') {
        const portId = Date.now();
        ports.set(portId, port);
        console.log('[Background] Port connected:', portId);

        port.onMessage.addListener(async (message) => {
            console.log('[Background] Received message:', message.type);
            await handlePortMessage(port, message);
        });

        port.onDisconnect.addListener(() => {
            console.log('[Background] Port disconnected:', portId);
            ports.delete(portId);
        });
    }
});

// ==================== Message Handlers ====================

/**
 * 处理来自 Side Panel 的消息
 */
async function handlePortMessage(port, message) {
    switch (message.type) {
        case 'chat':
            await handleChat(port, message);
            break;
        case 'chatWithTools':
            await handleChatWithTools(port, message);
            break;
        case 'test':
            // 测试连接
            port.postMessage({ type: 'test', success: true });
            break;
        default:
            console.warn('[Background] Unknown message type:', message.type);
    }
}

/**
 * 处理普通聊天（流式）
 */
async function handleChat(port, message) {
    const { message: userMessage, history } = message;

    console.log('[Background] Handle chat, message:', userMessage?.substring(0, 50));

    // Get API Key
    const data = await chrome.storage.local.get('apiKey');
    const apiKey = data.apiKey;

    if (!apiKey) {
        port.postMessage({
            type: 'error',
            message: '请先配置 API Key'
        });
        return;
    }

    try {
        // Build messages array with history
        const messages = [
            ...(history || []).filter(m => m.content && m.content.trim()),
            { role: 'user', content: userMessage, timestamp: Date.now() }
        ];

        console.log('[Background] Sending to Gemini, message count:', messages.length);

        await geminiProvider.chat(messages, (text) => {
            port.postMessage({
                type: 'chunk',
                text: text
            });
        }, apiKey);

        // Signal completion
        port.postMessage({ type: 'complete' });
        console.log('[Background] Chat complete');

    } catch (error) {
        console.error('[Background] Chat error:', error);
        port.postMessage({
            type: 'error',
            message: error.message || '发生未知错误'
        });
    }
}

/**
 * 处理带工具的对话（Agent 模式）
 * 新增：支持 Agent 框架调用
 */
async function handleChatWithTools(port, message) {
    const { messages, tools } = message;

    console.log('[Background] Handle chatWithTools, messages:', messages?.length);

    // Get API Key
    const data = await chrome.storage.local.get('apiKey');
    const apiKey = data.apiKey;

    if (!apiKey) {
        port.postMessage({
            type: 'error',
            message: '请先配置 API Key'
        });
        return;
    }

    try {
        const response = await geminiProvider.chatWithTools(messages, tools, apiKey);

        // 返回完整响应
        port.postMessage({
            type: 'response',
            data: response
        });

        console.log('[Background] chatWithTools complete');

    } catch (error) {
        console.error('[Background] chatWithTools error:', error);
        port.postMessage({
            type: 'error',
            message: error.message || '发生未知错误'
        });
    }
}

// ==================== Side Panel Setup ====================

// Open side panel when action button is clicked
chrome.action.onClicked.addListener((tab) => {
    chrome.sidePanel.open({ windowId: tab.windowId });
});

// Set side panel behavior
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
