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
        typeMessage(data.reply, 'assistant');

    } catch (err) {
        removeTypingIndicator();
        addMessage("Error connecting to server", 'assistant');
    }
}

// function analyzeInvestment() {
//     // Add analyze message
//     addMessage('Please help me analyze my recent investment portfolio performance', 'user');
//
//     setTimeout(() => {
//         showTypingIndicator();
//         setTimeout(() => {
//             removeTypingIndicator();
//             const analysisResponse = `
//                  <p><strong>Investment Portfolio Performance Analysis (as of March 31, 2026)</strong></p>
//
//                  <p><strong>Overall Performance:</strong></p>
//                  <ul>
//                      <li>Total Assets: $1,482,904.52</li>
//                      <li>Total Return: +$342,190.12 (+30.02%)</li>
//                      <li>Today's Return: +$12,402.00 (+0.84%)</li>
//                  </ul>
//
//                  <p><strong>Holdings Analysis:</strong></p>
//                  <ul>
//                      <li><strong>Apple (AAPL)</strong>: 1,240 shares, market value $228,432.80, 15.4%</li>
//                      <li><strong>NVIDIA (NVDA)</strong>: 450 shares, market value $393,876.00, 26.6%</li>
//                      <li><strong>Microsoft (MSFT)</strong>: 800 shares, market value $330,040.00, 22.3%</li>
//                      <li><strong>Tesla (TSLA)</strong>: 600 shares, market value $105,240.00, 7.1%</li>
//                  </ul>
//
//                  <p><strong>Risk Warning:</strong></p>
//                  <ul>
//                      <li>Technology stock allocation too high (NVDA + AAPL + MSFT = 64.3%)</li>
//                      <li>Recommend increasing industry diversification, consider defensive sectors like healthcare and consumer</li>
//                      <li>NVIDIA single position exceeds 25%, recommend reducing to below 15%</li>
//                  </ul>
//
//                  <p><strong>Optimization Suggestions:</strong> Consider reducing some NVIDIA positions and adding bonds or REITs to reduce volatility.</p>
//             `;
//             addMessage(analysisResponse, 'assistant', true);
//         }, 2000);
//     }, 500);
// }

// Convert Markdown tables to HTML
// Convert Markdown tables to HTML
// Convert Markdown tables to HTML
function parseMarkdownTable(text) {
    const lines = text.split('\n');
    let inTable = false;
    let tableLines = [];
    let result = text;

    // Find tables
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Detect if it's a table row (starts and ends with |)
        if (line.startsWith('|') && line.endsWith('|')) {
            if (!inTable) {
                inTable = true;
                tableLines = [];
            }
            tableLines.push(line);
        } else {
            // Table ended
            if (inTable && tableLines.length >= 3) {
                // Convert table to HTML
                const htmlTable = convertTableToHTML(tableLines);
                // Replace original table in text
                const markdownTable = tableLines.join('\n');
                result = result.replace(markdownTable, htmlTable);
            }
            inTable = false;
            tableLines = [];
        }
    }

    // Handle last table
    if (inTable && tableLines.length >= 3) {
        const htmlTable = convertTableToHTML(tableLines);
        const markdownTable = tableLines.join('\n');
        result = result.replace(markdownTable, htmlTable);
    }

    return result;
}

function convertTableToHTML(rows) {
    let html = '<table class="data-table"><thead><tr>';

    // Table header
    const headers = rows[0].split('|').filter(cell => cell.trim());
    headers.forEach(header => {
        const headerText = header.trim().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html += `<th>${headerText}</th>`;
    });
    html += '</tr></thead><tbody>';

    // Data rows (skip 2nd separator row)
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

// Modify addMessage function
function addMessage(content, sender, isHTML = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    const avatarText = sender === 'user' ? 'Me' : 'AI';
    const headerText = sender === 'user' ? 'You' : 'The Atelier AI';

    // If not HTML, first parse Markdown tables
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
//     const avatarText = sender === 'user' ? 'Me' : 'AI';
//     const headerText = sender === 'user' ? 'You' : 'The Atelier AI';
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
    typingDiv.innerHTML = `<div class="message-avatar">AI</div><div class="message-content"><div class="message-header">The Atelier AI</div><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

function typeMessage(content, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    const avatarText = sender === 'user' ? 'Me' : 'AI';
    const headerText = sender === 'user' ? 'You' : 'The Atelier AI';

    messageDiv.innerHTML = `
        <div class="message-avatar">${avatarText}</div>
        <div class="message-content">
            <div class="message-header">${headerText}</div>
            <div class="message-text"><span id="typingText"></span><span class="cursor">|</span></div>
        </div>
    `;

    messagesContainer.appendChild(messageDiv);

    const typingText = messageDiv.querySelector('#typingText');
    const cursor = messageDiv.querySelector('.cursor');

    // First parse Markdown tables
    const parsedContent = parseMarkdownTable(content);
    const isTable = parsedContent.includes('<table');

    // Handle line breaks and paragraphs (if not a table)
    let finalContent;
    if (isTable) {
        finalContent = parsedContent;
    } else {
        // Handle line breaks: convert multiple line breaks to paragraphs, single line breaks to <br>
        const paragraphs = content.split(/\n\s*\n/);
        finalContent = paragraphs.map(p => {
            const trimmed = p.trim().replace(/\n/g, '<br>');
            return `<p>${trimmed}</p>`;
        }).join('');
    }

    let index = 0;
    const speed = 30;

    function type() {
        if (index < content.length) {
            // If it's a table, display complete content directly
            if (isTable) {
                typingText.innerHTML = finalContent;
                cursor.remove();
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                return;
            }

            // Display plain text character by character
            typingText.textContent += content.charAt(index);
            index++;
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            setTimeout(type, speed);
        } else {
            // Typing completed, remove cursor, display formatted content
            cursor.remove();
            typingText.innerHTML = finalContent;  // ✅ Use formatted HTML
        }
    }

    type();
}

function startNewChat() {
    messagesContainer.innerHTML = `<div class="message assistant"><div class="message-avatar">AI</div><div class="message-content"><div class="message-header">The Atelier AI</div><div class="message-text"><p>New chat started! How can I help you?</p></div></div></div>`;
}

function replaceDatePlaceholder() {
    const placeholder = document.querySelector('[data-date-placeholder]');
    if (placeholder) {
        const now = new Date();
        const dateStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
        placeholder.innerHTML = placeholder.innerHTML.replace('{{DATE}}', dateStr);
    }
}

function replaceDatePlaceholder() {
    const placeholder = document.querySelector('[data-date-placeholder]');
    if (placeholder) {
        const now = new Date();
        const dateStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
        placeholder.innerHTML = placeholder.innerHTML.replace('{{DATE}}', dateStr);
    }
}

// ========== New: Export chat history function ==========
function exportChat() {
    // Get all chat messages
    const messages = messagesContainer.querySelectorAll('.message');

    if (messages.length === 0) {
        alert('No chat history to export!');
        return;
    }

    // Build export content
    let exportContent = '═══════════════════════════════════════\n';
    exportContent += '    The Atelier AI - Chat History\n';
    exportContent += '═══════════════════════════════════════\n\n';
    exportContent += `Export Time: ${new Date().toLocaleString('en-US')}\n`;
    exportContent += `Number of Messages: ${messages.length}\n`;
    exportContent += '\n───────────────────────────────────────\n\n';

    // Iterate through all messages
    messages.forEach((msg, index) => {
        const isUser = msg.classList.contains('user');
        const isAssistant = msg.classList.contains('assistant');

        const sender = isUser ? 'You' : (isAssistant ? 'The Atelier AI' : 'Unknown');
        const content = msg.querySelector('.message-text')?.textContent?.trim() || '';

        exportContent += `[${index + 1}] ${sender}\n`;
        exportContent += `${content}\n`;
        exportContent += '───────────────────────────────────────\n\n';
    });

    exportContent += '\n═══════════════════════════════════════\n';
    exportContent += '    Thank you for using The Atelier AI Investment Advisor\n';
    exportContent += '═══════════════════════════════════════\n';

    // Create Blob and download
    const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TheAtelier_ChatHistory_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Show success message
    alert(`Successfully exported ${messages.length} messages!`);
}
// =====================================

// Initialize
messageInput.focus();
replaceDatePlaceholder();

// Initialize
messageInput.focus();
replaceDatePlaceholder();