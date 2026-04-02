// === 全局变量 ===
let currentStockData = null; // 存储当前选中的股票数据

// 1. 加载股票列表 (保持不变)
// function loadStocks() {
//     const loading = document.getElementById('loading');
//     const tbody = document.getElementById('stockBody');
//
//     loading.classList.remove('hidden');
//     tbody.innerHTML = '';
//
//     // ⭐ 你的后端接口
//     fetch('http://localhost:8081/api/symbols/all')
//         .then(response => response.json())
//         .then(data => {
//             loading.classList.add('hidden');
//
//             if (!data || data.length === 0) {
//                 tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No Data</td></tr>';
//                 return;
//             }
//
//             data.forEach((stock, index) => {
//                 // ⭐ 修正：使用 displaySymbol 和 description
//                 const row = `
//                     <tr>
//                         <td>${index + 1}</td>
//                         <td>${stock.displaySymbol || 'N/A'}</td>
//                         <td>${stock.description || 'N/A'}</td>
//                         <td>${stock.type || 'N/A'}</td>
//                         <td>${stock.currency || 'N/A'}</td>
//                         <td>
//                             <!-- 点击 Buy 时传入 stock 对象 -->
//                             <button class="add-btn" onclick='openTradeModal(${JSON.stringify(stock)})'>
//                                 Buy
//                             </button>
//                         </td>
//                     </tr>
//                 `;
//                 tbody.innerHTML += row;
//             });
//         })
//         .catch(error => {
//             console.error('Load Error:', error);
//             loading.innerText = 'Load Failed';
//         });
// }

// 2. 打开交易弹窗 (修改点：处理返回的时间)
function openTradeModal(stock) {
    currentStockData = stock;

    // 1. 填充基本信息
    document.getElementById('modalSymbol').innerText = stock.displaySymbol;
    document.getElementById('stockName').value = stock.description;
    document.getElementById('quantity').value = 1;
    document.getElementById('currentPrice').value = 'Loading...';

    // 清空之前的时间显示 (假设你有一个 id 为 'priceTimeDisplay' 的标签)
    const timeDisplay = document.getElementById('priceTimeDisplay');
    if(timeDisplay) timeDisplay.innerText = '';

    // 2. 调用后端接口
    fetch(`http://localhost:8081/api/quote?symbol=${stock.displaySymbol}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.currentPrice) {
                const price = data.currentPrice;
                document.getElementById('currentPrice').value = `$${price.toFixed(2)}`;

                // ⭐ 显示时间
                if (data.updateTime) {
                    const date = new Date(data.updateTime);
                    // 格式化为本地时间，例如 "10:30:05 AM"
                    if(timeDisplay) {
                        timeDisplay.innerText = `Price Time: ${date.toLocaleTimeString()}`;
                    }
                }

                updateTotalCost(price, 1);
            } else {
                document.getElementById('currentPrice').value = 'Error';
            }
        })
        .catch(err => {
            console.error('Error:', err);
            document.getElementById('currentPrice').value = 'Network Error';
        });

    // 3. 显示模态框
    const modal = new bootstrap.Modal(document.getElementById('tradeModal'));
    modal.show();
}
// 3. 实时计算总价 (辅助函数)
function updateTotalCost(price, qty) {
    const total = (price * qty).toFixed(2);
    document.getElementById('totalCostDisplay').innerText = `Total Estimated Cost: $${total}`;
}

// 监听数量输入框变化
document.getElementById('quantity').addEventListener('input', function() {
    const priceStr = document.getElementById('currentPrice').value;
    const price = parseFloat(priceStr.replace('$', '')) || 0;
    const qty = parseInt(this.value) || 1;
    updateTotalCost(price, qty);
});

// 4. 确认购买 (发送 POST 请求)
function confirmBuy() {
    const quantity = parseInt(document.getElementById('quantity').value);
    const priceStr = document.getElementById('currentPrice').value;
    const price = parseFloat(priceStr.replace('$', ''));

    if (isNaN(quantity) || quantity < 1 || isNaN(price)) {
        alert('Invalid quantity or price');
        return;
    }

    // ⭐ 构建发送给后端的数据对象
    // 注意：字段名必须与 TradeRequest.java 的属性名完全一致
    const tradeData = {
        symbol: currentStockData.displaySymbol, // 例如 "GEAHF"
        stockName: currentStockData.description,
        price: price,                           // 例如 15.5
        quantity: quantity,                     // 例如 10
        assetType: currentStockData.type || 'STOCK' // 例如 "Common Stock"
    };

    console.log('Sending to backend:', tradeData); // 调试用

    fetch('http://localhost:8081/api/trade/buy', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(tradeData)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            alert('Purchase successful!');
            const modal = bootstrap.Modal.getInstance(document.getElementById('tradeModal'));
            modal.hide();
        })
        .catch(error => {
            console.error('Network Error:', error);
            alert('Network Error: ' + error.message);
        });
}

// === 全局变量 ===
let allSymbols = []; // 存储所有股票的静态信息
let currentPage = 1; // 当前页码
const pageSize = 20; // 每页显示 20 条

// 1. 初始化加载
function init() {
    loadAllSymbolsStatic();
}

// 2. 加载所有股票的静态列表（只调用一次）
function loadAllSymbolsStatic() {
    fetch('http://localhost:8081/api/symbols/all')
        .then(res => res.json())
        .then(data => {
            allSymbols = data;
            renderPage(currentPage); // 渲染第一页
        });
}

// 3. 渲染当前页
function renderPage(page) {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageSymbols = allSymbols.slice(start, end);

    // 提取当前页的代码
    const symbols = pageSymbols.map(item => item.symbol);

    // 请求当前页的价格
    fetchPricesAndRender(symbols, pageSymbols);
}

// 4. 请求价格并渲染表格
function fetchPricesAndRender(symbols, pageSymbols) {
    fetch('http://localhost:8081/api/stocks/batch', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(symbols)
    })
        .then(res => res.json())
        .then(prices => {
            // 将价格合并到静态数据中
            const dataWithPrices = pageSymbols.map(item => {
                return {
                    ...item,
                    price: prices[item.symbol] // 假设后端返回的是 { symbol: price } 格式
                };
            });
            renderTable(dataWithPrices);
        });
}

// 5. 渲染表格
function renderTable(data) {
    const tableBody = document.getElementById('table-body');
    tableBody.innerHTML = data.map(item => `
        <tr>
            <td>${item.symbol}</td>
            <td>${item.name}</td>
            <td>${item.price || '加载中...'}</td> <!-- 显示价格 -->
        </tr>
    `).join('');
}

// 6. 下一页
function nextPage() {
    if (currentPage * pageSize < allSymbols.length) {
        currentPage++;
        renderPage(currentPage);
    }
}

// 7. 上一页
function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderPage(currentPage);
    }
}

// 初始化
init();



