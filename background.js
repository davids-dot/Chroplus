// background.js - Background Service Worker

// AI Provider Interface (abstract)
class AIProvider {
    async chat(messages, onChunk) {
        throw new Error('chat() must be implemented');
    }

    async isAvailable() {
        throw new Error('isAvailable() must be implemented');
    }
}

// Gemini Provider Implementation
class GeminiProvider extends AIProvider {
    constructor() {
        super();
        // 使用 Gemini 3 Flash Preview
        this.model = 'gemini-3-flash-preview';
        this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    }

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

    async isAvailable(apiKey) {
        return !!apiKey;
    }
}

// Create provider instance
const geminiProvider = new GeminiProvider();

// Port connection handling
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

// Handle messages from Side Panel
async function handlePortMessage(port, message) {
    switch (message.type) {
        case 'chat':
            await handleChat(port, message);
            break;
        case 'test':
            // 测试连接
            port.postMessage({ type: 'test', success: true });
            break;
    }
}

// Chat handler
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

// Open side panel when action button is clicked
chrome.action.onClicked.addListener((tab) => {
    chrome.sidePanel.open({ windowId: tab.windowId });
});

// Set side panel behavior
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
