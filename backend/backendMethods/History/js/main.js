// API 地址配置
const API_URL = 'http://localhost:8080/api/records';

// 全局变量：用于存储从后端获取的原始数据
let allData = [];

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    // 1. 初始加载数据
    loadData();

    // 2. 绑定筛选器和搜索框的事件监听
    const typeFilter = document.getElementById('filterType');
    const assetFilter = document.getElementById('filterAsset');
    const searchInput = document.getElementById('searchInput'); // 获取搜索框

    // 当用户改变下拉菜单或输入搜索内容时，触发筛选
    typeFilter.addEventListener('change', applyFilters);
    assetFilter.addEventListener('change', applyFilters);
    searchInput.addEventListener('input', applyFilters); // 监听输入框的实时输入
});

/**
 * 从后端获取原始数据
 */
async function loadData() {
    const tbody = document.getElementById('recordTableBody');

    // 显示加载状态
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4"><i class="fas fa-spinner fa-spin mr-2"></i>加载中...</td></tr>';

    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('网络响应错误');

        // 获取数据并保存到全局变量
        allData = await response.json();
        console.log('获取到的原始数据:', allData);

        // 获取完数据后，立即应用筛选（默认显示全部）
        applyFilters();

    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-red-500"><i class="fas fa-exclamation-circle mr-2"></i>加载失败，请检查后端服务</td></tr>';
    }
}

/**
 * 根据下拉菜单和搜索框的值筛选数据并渲染
 */
function applyFilters() {
    const typeValue = document.getElementById('filterType').value;
    const assetValue = document.getElementById('filterAsset').value;
    const searchValue = document.getElementById('searchInput').value.toLowerCase().trim(); // 获取搜索词并转为小写

    // 1. 过滤数据
    const filteredData = allData.filter(record => {
        // 交易类型判断 (BUY/SELL)
        const matchType = (typeValue === 'ALL') || (record.type && record.type.toUpperCase() === typeValue);

        // 资产类型判断 (股票/基金等)
        const currentAssetType = record.assetType || '股票';
        const matchAsset = (assetValue === 'ALL') || (currentAssetType === assetValue);

        // 【新增】搜索判断 (名称或代码)
        // 检查股票名称或代码是否包含搜索词
        const stockName = (record.stockName || '').toLowerCase();
        const symbol = (record.symbol || '').toLowerCase();
        const matchSearch = !searchValue || stockName.includes(searchValue) || symbol.includes(searchValue);

        // 必须同时满足所有条件
        return matchType && matchAsset && matchSearch;
    });

    // 2. 渲染筛选后的数据
    renderTable(filteredData);
}

/**
 * 渲染表格的独立函数
 */
function renderTable(data) {
    const tbody = document.getElementById('recordTableBody');
    const emptyState = document.getElementById('emptyState');

    tbody.innerHTML = ''; // 清空表格

    if (data.length === 0) {
        emptyState.classList.remove('hidden');
        updateStats(0, 0, 0);
        return;
    } else {
        emptyState.classList.add('hidden');
    }

    let buyCount = 0;
    let sellCount = 0;

    data.forEach(record => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-blue-50 transition-colors duration-150 border-b border-gray-100';

        // 格式化时间
        const date = new Date(record.orderTime);
        const timeStr = date.toLocaleString('zh-CN', { hour12: false });

        // 交易类型样式
        const type = record.type.toUpperCase();
        let typeBadge = '';
        if (type.includes('BUY')) {
            typeBadge = '<span class="px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-600">买入</span>';
            buyCount++;
        } else if (type.includes('SELL')) {
            typeBadge = '<span class="px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-600">卖出</span>';
            sellCount++;
        } else {
            typeBadge = '<span class="px-2 py-1 rounded text-xs font-bold bg-gray-100 text-gray-600">' + type + '</span>';
        }

        // 资产类型标签样式
        const assetType = record.assetType || '股票';
        let assetBadge = '';
        if (assetType === '基金') {
            assetBadge = '<span class="px-2 py-1 rounded text-xs font-bold bg-purple-100 text-purple-600"><i class="fas fa-coins mr-1"></i>基金</span>';
        } else if (assetType === '债券') {
            assetBadge = '<span class="px-2 py-1 rounded text-xs font-bold bg-orange-100 text-orange-600"><i class="fas fa-file-contract mr-1"></i>债券</span>';
        } else {
            assetBadge = '<span class="px-2 py-1 rounded text-xs font-bold bg-blue-50 text-blue-600"><i class="fas fa-chart-line mr-1"></i>股票</span>';
        }

        row.innerHTML = `
            <td class="px-6 py-4 text-gray-500 whitespace-nowrap text-sm">${timeStr}</td>
            <td class="px-6 py-4 font-medium text-gray-900">${record.stockName}</td>
            <td class="px-6 py-4 text-gray-500 font-mono text-sm">${record.symbol}</td>
            <td class="px-6 py-4 text-center">${assetBadge}</td>
            <td class="px-6 py-4 text-center">${typeBadge}</td>
            <td class="px-6 py-4 text-right font-mono text-gray-700">¥${formatNumber(record.price)}</td>
            <td class="px-6 py-4 text-right font-mono text-gray-700">${record.quantity}</td>
            <td class="px-6 py-4 text-right font-bold font-mono text-blue-600">¥${formatNumber(record.totalAmount)}</td>
        `;
        tbody.appendChild(row);
    });

    updateStats(data.length, buyCount, sellCount);
}

function updateStats(total, buy, sell) {
    document.getElementById('totalCount').innerText = total;
    document.getElementById('buyCount').innerText = buy;
    document.getElementById('sellCount').innerText = sell;
}

function formatNumber(num) {
    if (!num) return '0.00';
    return parseFloat(num).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}
