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
        this.model = 'gemini-2.5-flash-preview';
        this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    }

    async chat(messages, onChunk, apiKey) {
        if (!apiKey) {
            throw new Error('API Key 未配置');
        }

        // Convert messages to Gemini format
        const contents = messages.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));

        const url = `${this.apiUrl}/${this.model}:streamGenerateContent?key=${apiKey}&alt=sse`;

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

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw this.handleError(response.status, errorData);
        }

        // Parse SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6).trim();
                    if (data === '[DONE]') continue;

                    try {
                        const parsed = JSON.parse(data);
                        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (text) {
                            onChunk(text);
                        }
                    } catch (e) {
                        // Skip invalid JSON
                        console.warn('Failed to parse SSE data:', data);
                    }
                }
            }
        }
    }

    handleError(status, errorData) {
        const errorMessage = errorData.error?.message || '未知错误';

        switch (status) {
            case 400:
                return new Error(`请求格式错误: ${errorMessage}`);
            case 401:
            case 403:
                return new Error('API Key 无效或已过期');
            case 429:
                return new Error('API 配额已用尽，请稍后再试');
            case 500:
            case 503:
                return new Error('Gemini 服务暂时不可用，请稍后再试');
            default:
                return new Error(`请求失败: ${errorMessage}`);
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

        port.onMessage.addListener(async (message) => {
            await handlePortMessage(port, message);
        });

        port.onDisconnect.addListener(() => {
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
    }
}

// Chat handler
async function handleChat(port, message) {
    const { message: userMessage, history } = message;

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
            ...history.filter(m => m.content), // Include previous messages
            { role: 'user', content: userMessage, timestamp: Date.now() }
        ];

        await geminiProvider.chat(messages, (text) => {
            port.postMessage({
                type: 'chunk',
                text: text
            });
        }, apiKey);

        // Signal completion
        port.postMessage({ type: 'complete' });

    } catch (error) {
        console.error('Chat error:', error);
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
