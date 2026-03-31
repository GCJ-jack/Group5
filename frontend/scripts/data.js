window.dashboardData = {
  performanceFilters: ["1D", "1W", "1M", "YTD"],
  holdings: [
    {
      symbol: "AAPL",
      name: "Apple Inc.",
      shares: "240 Shares",
      value: "$42,810.00",
      change: "+1.2%",
      positive: true,
    },
    {
      symbol: "TSLA",
      name: "Tesla, Inc.",
      shares: "115 Shares",
      value: "$19,420.50",
      change: "-0.8%",
      positive: false,
    },
    {
      symbol: "NVDA",
      name: "NVIDIA Corp.",
      shares: "80 Shares",
      value: "$68,200.12",
      change: "+5.4%",
      positive: true,
    },
  ],
  marketNews: [
    {
      category: "Macro Economy",
      published: "14 mins ago",
      title: "Federal Reserve hints at potential rate stabilization by Q3",
      summary:
        "Recent minutes from the FOMC meeting suggest a more dovish stance on inflation as supply chains normalize across the Pacific region.",
      tone: "primary",
    },
    {
      category: "Technology",
      published: "2 hours ago",
      title: "Semiconductor demand spikes as AI infrastructure builds accelerate",
      summary:
        "Top-tier cloud providers are increasing capital expenditure guidance for the upcoming fiscal year, signaling durable momentum for chip manufacturers.",
      tone: "accent",
    },
  ],
  suggestions: [
    "Rebalance suggested: -5% NVDA, +5% XLU",
    "Dividend alert: AAPL payout in 3 days",
  ],
};


async function loadNews() {
  try{
    const response = await fetch("http://localhost:8080/api/market/news")

    const data = await response.json();

    const newsList = document.getElementById("news-list");

    //清空newslist
    newsList.innerHTML = '';

    data.slice(0, 10).forEach((item) => {
      const newsItem =  `<div class="news-item" style="display:flex; gap:12px; margin-bottom:16px;">

        <img src="${item.image}"
             style="width:100px; height:70px; object-fit:cover; border-radius:8px;" />

        <div>
          <a href="${item.url}" target="_blank"
             style="font-weight:600; text-decoration:none; color:#111;">
            ${item.headline}
          </a>

          <p style="font-size:12px; color:gray; margin:4px 0;">
            ${item.source} · ${new Date(item.datetime * 1000).toLocaleString()}
          </p>

          <p style="font-size:13px;">
            ${item.summary}
          </p>
        </div>
      </div>`;
      newsList.innerHTML += newsItem;
    });
  } catch (error) {
    console.error("加载新闻失败:", error);
  }
}

document.addEventListener("DOMContentLoaded", loadNews)
