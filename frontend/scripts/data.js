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
