// API 地址配置
const API_URL = 'http://localhost:8080/api/records';

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    loadData();

    // 绑定刷新按钮事件
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadData);
    }
});

/**
 * 从后端获取数据并渲染
 */
async function loadData() {
    const tbody = document.getElementById('recordTableBody');
    const emptyState = document.getElementById('emptyState');

    // 显示加载状态
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4"><i class="fas fa-spinner fa-spin mr-2"></i>加载中...</td></tr>';

    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error('网络响应错误');
        }

        const data = await response.json();

        // 重置表格
        tbody.innerHTML = '';

        if (data.length === 0) {
            emptyState.classList.remove('hidden');
            updateStats(0, 0, 0);
            return;
        } else {
            emptyState.classList.add('hidden');
        }

        let buyCount = 0;
        let sellCount = 0;

        // 遍历数据生成表格行
        data.forEach(record => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-blue-50 transition-colors duration-150';

            // 格式化时间
            const date = new Date(record.orderTime);
            const timeStr = date.toLocaleString('zh-CN', { hour12: false });

            // 根据类型设置样式
            const type = record.type.toUpperCase();
            let typeBadge = '';

            if (type.includes('BUY')) {
                typeBadge = '<span class="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700"><i class="fas fa-arrow-down mr-1"></i>买入</span>';
                buyCount++;
            } else if (type.includes('SELL')) {
                typeBadge = '<span class="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700"><i class="fas fa-arrow-up mr-1"></i>卖出</span>';
                sellCount++;
            } else {
                typeBadge = '<span class="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600">' + type + '</span>';
            }

            row.innerHTML = `
                <td class="px-6 py-4 text-gray-600 whitespace-nowrap">${timeStr}</td>
                <td class="px-6 py-4 font-medium text-gray-900">${record.stockName}</td>
                <td class="px-6 py-4 text-gray-500 font-mono">${record.symbol}</td>
                <td class="px-6 py-4 text-center">${typeBadge}</td>
                <td class="px-6 py-4 text-right font-mono text-gray-700">¥${formatNumber(record.price)}</td>
                <td class="px-6 py-4 text-right font-mono text-gray-700">${record.quantity}</td>
                <td class="px-6 py-4 text-right font-bold font-mono text-blue-600">¥${formatNumber(record.totalAmount)}</td>
            `;
            tbody.appendChild(row);
        });

        updateStats(data.length, buyCount, sellCount);

    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-red-500"><i class="fas fa-exclamation-circle mr-2"></i>加载失败，请检查后端服务</td></tr>';
    }
}

/**
 * 更新顶部统计数据
 */
function updateStats(total, buy, sell) {
    document.getElementById('totalCount').innerText = total;
    document.getElementById('buyCount').innerText = buy;
    document.getElementById('sellCount').innerText = sell;
}

/**
 * 格式化数字（增加千分位）
 */
function formatNumber(num) {
    if (!num) return '0.00';
    return parseFloat(num).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}
