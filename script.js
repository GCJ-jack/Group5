const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');

function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
}

function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;

    addMessage(message, 'user');
    messageInput.value = '';
    messageInput.style.height = 'auto';

    showTypingIndicator();

    try {
        const res = await fetch("http://localhost:3000/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message })
        });

        const data = await res.json();

        removeTypingIndicator();
        addMessage(data.reply, 'assistant');

    } catch (err) {
        removeTypingIndicator();
        addMessage("Error connecting to server", 'assistant');
    }
}

function analyzeInvestment() {
    // Add analyze message
    addMessage('请帮我分析最近的投资组合表现', 'user');

    setTimeout(() => {
        showTypingIndicator();
        setTimeout(() => {
            removeTypingIndicator();
            const analysisResponse = `
                <p><strong>投资组合表现分析（截至 2026年3月31日）</strong></p>
                
                <p><strong>总体表现：</strong></p>
                <ul>
                    <li>总资产：$1,482,904.52</li>
                    <li>总收益：+$342,190.12 (+30.02%)</li>
                    <li>今日收益：+$12,402.00 (+0.84%)</li>
                </ul>

                <p><strong>持仓分析：</strong></p>
                <ul>
                    <li><strong>Apple (AAPL)</strong>：1,240股，市值 $228,432.80，占比 15.4%</li>
                    <li><strong>NVIDIA (NVDA)</strong>：450股，市值 $393,876.00，占比 26.6%</li>
                    <li><strong>Microsoft (MSFT)</strong>：800股，市值 $330,040.00，占比 22.3%</li>
                    <li><strong>Tesla (TSLA)</strong>：600股，市值 $105,240.00，占比 7.1%</li>
                </ul>

                <p><strong>风险提示：</strong></p>
                <ul>
                    <li>科技股占比过高（NVDA + AAPL + MSFT = 64.3%）</li>
                    <li>建议增加行业分散度，考虑配置医疗、消费等防御性板块</li>
                    <li>NVIDIA 单一持仓占比超过 25%，建议降至 15% 以下</li>
                </ul>

                <p><strong>优化建议：</strong>考虑减持部分 NVIDIA 仓位，增加债券或 REITs 配置以降低波动性。</p>
            `;
            addMessage(analysisResponse, 'assistant', true);
        }, 2000);
    }, 500);
}

// 将 Markdown 表格转换成 HTML
// 将 Markdown 表格转换成 HTML
// 将 Markdown 表格转换成 HTML
function parseMarkdownTable(text) {
    const lines = text.split('\n');
    let inTable = false;
    let tableLines = [];
    let result = text;

    // 查找表格
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // 检测是否是表格行（以 | 开头和结尾）
        if (line.startsWith('|') && line.endsWith('|')) {
            if (!inTable) {
                inTable = true;
                tableLines = [];
            }
            tableLines.push(line);
        } else {
            // 表格结束
            if (inTable && tableLines.length >= 3) {
                // 转换表格为 HTML
                const htmlTable = convertTableToHTML(tableLines);
                // 替换原文中的表格
                const markdownTable = tableLines.join('\n');
                result = result.replace(markdownTable, htmlTable);
            }
            inTable = false;
            tableLines = [];
        }
    }

    // 处理最后的表格
    if (inTable && tableLines.length >= 3) {
        const htmlTable = convertTableToHTML(tableLines);
        const markdownTable = tableLines.join('\n');
        result = result.replace(markdownTable, htmlTable);
    }

    return result;
}

function convertTableToHTML(rows) {
    let html = '<table class="data-table"><thead><tr>';

    // 表头
    const headers = rows[0].split('|').filter(cell => cell.trim());
    headers.forEach(header => {
        const headerText = header.trim().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html += `<th>${headerText}</th>`;
    });
    html += '</tr></thead><tbody>';

    // 数据行（跳过第2行分隔线）
    for (let i = 2; i < rows.length; i++) {
        const cells = rows[i].split('|').filter(cell => cell.trim());
        if (cells.length > 0) {
            html += '<tr>';
            cells.forEach(cell => {
                const cellContent = cell.trim().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                html += `<td>${cellContent}</td>`;
            });
            html += '</tr>';
        }
    }

    html += '</tbody></table>';
    return html;
}

// 修改 addMessage 函数
function addMessage(content, sender, isHTML = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    const avatarText = sender === 'user' ? '我' : 'AI';
    const headerText = sender === 'user' ? '您' : 'The Atelier AI';

    // 如果不是 HTML，先解析 Markdown 表格
    let formattedContent;
    if (isHTML) {
        formattedContent = content;
    } else {
        const parsedContent = parseMarkdownTable(content);
        formattedContent = parsedContent.includes('<table') ? parsedContent : `<p>${parsedContent}</p>`;
    }

    messageDiv.innerHTML = `
         <div class="message-avatar">${avatarText}</div>
         <div class="message-content">
             <div class="message-header">${headerText}</div>
             <div class="message-text">${formattedContent}</div>
         </div>
    `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// function addMessage(content, sender, isHTML = false) {
//     const messageDiv = document.createElement('div');
//     messageDiv.className = `message ${sender}`;
//
//     const avatarText = sender === 'user' ? '我' : 'AI';
//     const headerText = sender === 'user' ? '您' : 'The Atelier AI';
//
//     messageDiv.innerHTML = `
//         <div class="message-avatar">${avatarText}</div>
//         <div class="message-content">
//             <div class="message-header">${headerText}</div>
//             <div class="message-text">${isHTML ? content : `<p>${content}</p>`}</div>
//         </div>
//     `;
//
//     messagesContainer.appendChild(messageDiv);
//     messagesContainer.scrollTop = messagesContainer.scrollHeight;
// }

function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message assistant';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = `
        <div class="message-avatar">AI</div>
        <div class="message-content">
            <div class="message-header">The Atelier AI</div>
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

function startNewChat() {
    messagesContainer.innerHTML = `
        <div class="message assistant">
            <div class="message-avatar">AI</div>
            <div class="message-content">
                <div class="message-header">The Atelier AI</div>
                <div class="message-text">
                    <p>新对话已开始！有什么我可以帮助您的吗？</p>
                </div>
            </div>
        </div>
    `;
}

// Initialize
messageInput.focus();