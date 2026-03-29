// sidepanel.js - Side Panel 主逻辑

// DOM Elements
const chatView = document.getElementById('chat-view');
const settingsView = document.getElementById('settings-view');
const messagesContainer = document.getElementById('messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const settingsBtn = document.getElementById('settings-btn');
const clearBtn = document.getElementById('clear-btn');
const backBtn = document.getElementById('back-btn');
const apiKeyInput = document.getElementById('api-key-input');
const toggleKeyBtn = document.getElementById('toggle-key-btn');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const cancelSettingsBtn = document.getElementById('cancel-settings-btn');
const errorToast = document.getElementById('error-toast');
const errorMessage = document.getElementById('error-message');

// State
let port = null;
let messages = [];
let apiKey = '';
let isGenerating = false;

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
    // Load data from storage
    await loadFromStorage();

    // Setup Port connection
    setupPort();

    // Render messages
    renderMessages();

    // Check if API Key exists
    if (!apiKey) {
        showSettings();
    }

    // Setup event listeners
    setupEventListeners();
}

// Storage functions
async function loadFromStorage() {
    const data = await chrome.storage.local.get(['apiKey', 'messages']);
    apiKey = data.apiKey || '';
    messages = data.messages || [];
}

async function saveToStorage() {
    await chrome.storage.local.set({ apiKey, messages });
}

async function clearHistory() {
    messages = [];
    await chrome.storage.local.set({ messages });
    renderMessages();
}

// Port communication
function setupPort() {
    port = chrome.runtime.connect({ name: 'sidepanel' });

    port.onMessage.addListener((response) => {
        handlePortMessage(response);
    });

    port.onDisconnect.addListener(() => {
        console.log('Port disconnected');
        port = null;
    });
}

function handlePortMessage(response) {
    switch (response.type) {
        case 'chunk':
            // Streaming chunk received
            if (response.text) {
                appendToLastMessage(response.text);
            }
            break;

        case 'complete':
            // Generation complete
            isGenerating = false;
            setInputEnabled(true);
            saveToStorage();
            break;

        case 'error':
            // Error occurred
            isGenerating = false;
            setInputEnabled(true);
            showError(response.message);
            // Remove the last model message if it's empty
            if (messages.length > 0 && messages[messages.length - 1].role === 'model') {
                messages.pop();
                renderMessages();
            }
            break;
    }
}

function sendMessage(text) {
    if (!port) {
        setupPort();
    }

    port.postMessage({
        type: 'chat',
        message: text,
        history: messages
    });
}

// Message rendering
function renderMessages() {
    messagesContainer.innerHTML = '';

    if (messages.length === 0) {
        messagesContainer.innerHTML = `
            <div class="welcome">
                <svg class="welcome-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <h2>开始对话</h2>
                <p>输入消息开始与 AI 助手对话</p>
            </div>
        `;
        return;
    }

    messages.forEach(msg => {
        appendMessageElement(msg);
    });

    scrollToBottom();
}

function appendMessageElement(msg) {
    const div = document.createElement('div');
    div.className = `message ${msg.role}`;
    div.textContent = msg.content;
    messagesContainer.appendChild(div);
    scrollToBottom();
}

function appendToLastMessage(text) {
    const lastMessage = messagesContainer.lastElementChild;
    if (lastMessage && lastMessage.classList.contains('model')) {
        // Remove cursor if exists
        const cursor = lastMessage.querySelector('.cursor');
        if (cursor) {
            cursor.remove();
        }
        // Append text
        lastMessage.textContent += text;
        // Add cursor back
        const cursorSpan = document.createElement('span');
        cursorSpan.className = 'cursor';
        lastMessage.appendChild(cursorSpan);
        // Update messages array
        if (messages.length > 0 && messages[messages.length - 1].role === 'model') {
            messages[messages.length - 1].content += text;
        }
    }
    scrollToBottom();
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Input handling
function setInputEnabled(enabled) {
    userInput.disabled = !enabled;
    sendBtn.disabled = !enabled;
}

function handleSend() {
    const text = userInput.value.trim();
    if (!text || isGenerating) return;

    if (!apiKey) {
        showError('请先配置 API Key');
        showSettings();
        return;
    }

    // Add user message
    const userMsg = { role: 'user', content: text, timestamp: Date.now() };
    messages.push(userMsg);
    appendMessageElement(userMsg);

    // Clear input
    userInput.value = '';
    userInput.style.height = 'auto';

    // Add placeholder for model response
    const modelMsg = { role: 'model', content: '', timestamp: Date.now() };
    messages.push(modelMsg);
    appendMessageElement({ role: 'model', content: '' });

    // Add cursor
    const lastMessage = messagesContainer.lastElementChild;
    const cursorSpan = document.createElement('span');
    cursorSpan.className = 'cursor';
    lastMessage.appendChild(cursorSpan);

    // Disable input
    isGenerating = true;
    setInputEnabled(false);

    // Send message
    sendMessage(text);
}

// View switching
function showSettings() {
    chatView.classList.add('hidden');
    settingsView.classList.remove('hidden');
    apiKeyInput.value = apiKey;
}

function hideSettings() {
    settingsView.classList.add('hidden');
    chatView.classList.remove('hidden');
}

// Error handling
function showError(message) {
    errorMessage.textContent = message;
    errorToast.classList.remove('hidden');
    setTimeout(() => {
        errorToast.classList.add('hidden');
    }, 3000);
}

// Event listeners
function setupEventListeners() {
    // Send button
    sendBtn.addEventListener('click', handleSend);

    // Enter to send (Shift+Enter for new line)
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

    // Auto-resize textarea
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
    });

    // Settings button
    settingsBtn.addEventListener('click', showSettings);

    // Clear button
    clearBtn.addEventListener('click', async () => {
        if (confirm('确定要清空所有对话历史吗？')) {
            await clearHistory();
        }
    });

    // Back button
    backBtn.addEventListener('click', () => {
        hideSettings();
    });

    // Toggle API key visibility
    toggleKeyBtn.addEventListener('click', () => {
        const isPassword = apiKeyInput.type === 'password';
        apiKeyInput.type = isPassword ? 'text' : 'password';
    });

    // Save settings
    saveSettingsBtn.addEventListener('click', async () => {
        const newKey = apiKeyInput.value.trim();

        if (!newKey) {
            showError('请输入 API Key');
            return;
        }

        if (!newKey.startsWith('AIza')) {
            showError('API Key 格式无效，应以 AIza 开头');
            return;
        }

        apiKey = newKey;
        await chrome.storage.local.set({ apiKey });
        hideSettings();
    });

    // Cancel settings
    cancelSettingsBtn.addEventListener('click', () => {
        apiKeyInput.value = apiKey;
        hideSettings();
    });
}
