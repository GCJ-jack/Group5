const API = "http://localhost:8080";

const followingListRoot = document.getElementById("following-list-full");
const followingSidebarStateElement = document.getElementById("following-sidebar-state");
const followingCountElement = document.getElementById("following-count");
const followingLastUpdatedElement = document.getElementById("following-last-updated");
const detailContentElement = document.getElementById("following-detail-content");
const detailLogoElement = document.getElementById("following-detail-logo");
const detailTypeElement = document.getElementById("following-detail-type");
const detailSymbolElement = document.getElementById("following-detail-symbol");
const detailNameElement = document.getElementById("following-detail-name");
const detailSummaryElement = document.getElementById("following-detail-summary");
const quotePriceElement = document.getElementById("following-quote-price");
const quoteChangeElement = document.getElementById("following-quote-change");
const quoteOpenElement = document.getElementById("following-quote-open");
const infoTypeElement = document.getElementById("following-info-type");
const infoCreatedAtElement = document.getElementById("following-info-created-at");
const infoExchangeElement = document.getElementById("following-info-exchange");
const infoIndustryElement = document.getElementById("following-info-industry");
const infoRegionElement = document.getElementById("following-info-region");
const infoIpoElement = document.getElementById("following-info-ipo");
const rangeFiltersRoot = document.getElementById("following-range-filters");
const intervalFiltersRoot = document.getElementById("following-interval-filters");
const chartDescriptionElement = document.getElementById("following-chart-description");
const chartStateElement = document.getElementById("following-chart-state");
const chartRoot = document.getElementById("following-candle-chart");
const newsStateElement = document.getElementById("following-news-state");
const newsListElement = document.getElementById("following-news-list");

const candleRanges = ["5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "max"];
const candleIntervals = ["DAILY", "WEEKLY", "MONTHLY"];

let followingItems = [];
let sidebarQuotes = [];
let activeSymbol = "";
let activeRange = "1mo";
let activeInterval = "DAILY";
let candleChart = null;
let deletingFollowingId = null;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

function formatFollowingDate(value) {
  if (!value) {
    return "Recently followed";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Recently followed";
  }

  return `Followed on ${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function formatPercent(value) {
  const numericValue = Number(value ?? 0);
  return `${numericValue >= 0 ? "+" : ""}${numericValue.toFixed(2)}%`;
}

function formatLastUpdated(date) {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatIntervalLabel(interval) {
  return interval.charAt(0) + interval.slice(1).toLowerCase();
}

function hasText(value) {
  return String(value ?? "").trim().length > 0;
}

function formatNewsDate(unixTimestamp) {
  return new Date((unixTimestamp || 0) * 1000).toLocaleString();
}

function getNewsDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 30);

  const formatDate = (date) => date.toISOString().split("T")[0];
  return {
    from: formatDate(from),
    to: formatDate(to),
  };
}

function findQuoteForSymbol(quotes, symbol) {
  const normalizedSymbol = String(symbol || "").trim().toUpperCase();
  return quotes.find((quote) => {
    const candidates = [quote?.symbol, quote?.name, quote?.ticker];
    return candidates.some((candidate) => String(candidate || "").trim().toUpperCase() === normalizedSymbol);
  });
}

function setChartState(message, isVisible = true) {
  chartStateElement.textContent = message;
  chartStateElement.hidden = !isVisible;
  chartRoot.hidden = isVisible;
}

function setNewsState(message, isVisible = true) {
  newsStateElement.textContent = message;
  newsStateElement.hidden = !isVisible;
}

function setSidebarState(message, tone = "neutral") {
  if (!message) {
    followingSidebarStateElement.hidden = true;
    followingSidebarStateElement.textContent = "";
    followingSidebarStateElement.className = "following-sidebar-state";
    return;
  }

  followingSidebarStateElement.hidden = false;
  followingSidebarStateElement.textContent = message;
  followingSidebarStateElement.className = `following-sidebar-state following-sidebar-state--${tone}`;
}

async function readErrorMessage(response, fallbackMessage) {
  try {
    const payload = await response.json();
    return payload?.detail || payload?.message || payload?.error?.description || payload?.error || fallbackMessage;
  } catch (error) {
    return fallbackMessage;
  }
}

function updateChartDescription() {
  chartDescriptionElement.textContent = `${formatIntervalLabel(activeInterval)} candlestick chart for ${activeRange} of trading history.`;
}

function createCandleChart() {
  candleChart = new ApexCharts(chartRoot, {
    chart: {
      type: "candlestick",
      height: "100%",
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: "Inter, sans-serif",
    },
    series: [{ data: [] }],
    noData: {
      text: "No chart data available.",
      align: "center",
      verticalAlign: "middle",
      style: {
        color: "#667085",
        fontSize: "14px",
        fontFamily: "Inter, sans-serif",
      },
    },
    xaxis: {
      type: "datetime",
      labels: {
        style: {
          colors: "#667085",
          fontSize: "12px",
          fontWeight: 600,
        },
      },
    },
    yaxis: {
      tooltip: { enabled: true },
      labels: {
        formatter: (value) => formatCurrency(value),
        style: {
          colors: "#667085",
          fontSize: "12px",
          fontWeight: 600,
        },
      },
    },
    grid: {
      borderColor: "rgba(148, 163, 184, 0.18)",
      strokeDashArray: 5,
    },
    plotOptions: {
      candlestick: {
        colors: {
          upward: "#0a7f55",
          downward: "#cb3a31",
        },
      },
    },
  });

  candleChart.render();
}

function renderRangeFilters() {
  rangeFiltersRoot.innerHTML = candleRanges
    .map(
      (range) => `
        <button
          class="segmented-control__item ${range === activeRange ? "is-active" : ""}"
          type="button"
          data-range="${range}"
        >
          ${range.toUpperCase()}
        </button>
      `,
    )
    .join("");
}

function renderIntervalFilters() {
  intervalFiltersRoot.innerHTML = candleIntervals
    .map(
      (interval) => `
        <button
          class="segmented-control__item ${interval === activeInterval ? "is-active" : ""}"
          type="button"
          data-interval="${interval}"
        >
          ${formatIntervalLabel(interval)}
        </button>
      `,
    )
    .join("");
}

function renderFollowingList() {
  if (!followingItems.length) {
    followingListRoot.innerHTML = `
      <div class="following-state">
        Add companies from the stock detail page to start your following list.
      </div>
    `;
    return;
  }

  followingListRoot.innerHTML = followingItems
    .map((item) => {
      const symbol = item.symbol;
      const displayName = item.name || symbol;
      const quote = findQuoteForSymbol(sidebarQuotes, symbol);
      const hasQuote = Boolean(quote);
      const percentChange = Number(quote?.percentChange ?? 0);
      const isPositive = percentChange >= 0;

      return `
        <div
          class="following-item ${symbol === activeSymbol ? "is-active" : ""}"
          role="button"
          tabindex="0"
          data-symbol="${escapeHtml(symbol)}"
          aria-label="View ${escapeHtml(displayName)} details"
        >
          <div class="following-item__shell">
            <div class="following-item__header">
              <div class="following-item__top">
                <div>
                  <div class="following-item__symbol">${escapeHtml(symbol)}</div>
                  <p class="following-item__name">${escapeHtml(displayName)}</p>
                </div>
                <span class="following-type-pill">${escapeHtml(item.type || "STOCK")}</span>
              </div>

              <button
                class="following-item__delete"
                type="button"
                data-delete-id="${escapeHtml(item.id)}"
                aria-label="Delete ${escapeHtml(displayName)} from following"
                ${String(item.id) === String(deletingFollowingId) ? "disabled" : ""}
              >
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>

            <div class="following-item__bottom">
              <span class="following-item__date">${escapeHtml(formatFollowingDate(item.createdAt))}</span>
              ${
                hasQuote
                  ? `
                    <div>
                      <div class="following-item__price">${formatCurrency(quote.currentPrice)}</div>
                      <span class="holding-change-pill ${isPositive ? "is-positive" : "is-negative"}">
                        ${formatPercent(percentChange)}
                      </span>
                    </div>
                  `
                  : `<span class="following-item__quote-missing">Quote unavailable</span>`
              }
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

function updateDetailHeader(item, quote) {
  const displayName = item.name || item.symbol;
  detailTypeElement.textContent = item.type || "STOCK";
  detailSymbolElement.textContent = item.symbol;
  detailNameElement.textContent = displayName;
  detailLogoElement.hidden = true;
  detailLogoElement.removeAttribute("src");
  detailLogoElement.alt = "";
  detailSummaryElement.textContent =
    item.type === "CRYPTO"
      ? `${displayName} is saved in your following list as a crypto asset. Live quote and longer-term price action are shown below.`
      : `${displayName} is saved in your following list as a stock. Use the quote snapshot and candlestick chart below to review today's move and recent performance.`;

  quotePriceElement.textContent = formatCurrency(quote?.currentPrice);
  quoteChangeElement.textContent = formatPercent(quote?.percentChange);
  quoteChangeElement.classList.toggle("stock-quote-positive", Number(quote?.percentChange ?? 0) >= 0);
  quoteChangeElement.classList.toggle("stock-quote-negative", Number(quote?.percentChange ?? 0) < 0);
  quoteOpenElement.textContent = `${formatCurrency(quote?.open)} / ${formatCurrency(quote?.previousClose)}`;
  infoTypeElement.textContent = item.type || "STOCK";
  infoCreatedAtElement.textContent = formatFollowingDate(item.createdAt);
  infoExchangeElement.textContent = "--";
  infoIndustryElement.textContent = "--";
  infoRegionElement.textContent = "--";
  infoIpoElement.textContent = "--";
}

async function loadCompanyProfile(symbol, itemType) {
  if (String(itemType || "").toUpperCase() === "CRYPTO") {
    return null;
  }

  const response = await fetch(`${API}/stocks/profile2?symbol=${encodeURIComponent(symbol)}`);
  if (!response.ok) {
    const message = await readErrorMessage(response, "Failed to load company profile.");
    throw new Error(message);
  }

  return response.json();
}

function updateProfileDetails(item, profile) {
  const displayName = profile?.name || item.name || item.symbol;
  const isCrypto = String(item.type || "").toUpperCase() === "CRYPTO";
  const regionParts = [profile?.country, profile?.currency].filter((value) => hasText(value));
  const summaryParts = [
    profile?.finnhubIndustry,
    profile?.exchange,
    regionParts.join(" / "),
  ].filter((value) => hasText(value));

  detailNameElement.textContent = displayName;

  if (hasText(profile?.logo)) {
    detailLogoElement.src = profile.logo;
    detailLogoElement.alt = `${displayName} logo`;
    detailLogoElement.hidden = false;
  } else {
    detailLogoElement.hidden = true;
    detailLogoElement.removeAttribute("src");
    detailLogoElement.alt = "";
  }

  if (isCrypto) {
    detailSummaryElement.textContent = `${displayName} is saved in your following list as a crypto asset. Live quote and price action are available below.`;
    return;
  }

  if (summaryParts.length) {
    detailSummaryElement.textContent = summaryParts.join(" • ");
  } else {
    detailSummaryElement.textContent = `${displayName} is saved in your following list as a stock. Live quote and recent company news are available below.`;
  }

  infoExchangeElement.textContent = hasText(profile?.exchange) ? profile.exchange : "--";
  infoIndustryElement.textContent = hasText(profile?.finnhubIndustry) ? profile.finnhubIndustry : "--";
  infoRegionElement.textContent = regionParts.length ? regionParts.join(" / ") : "--";
  infoIpoElement.textContent = hasText(profile?.ipo) ? profile.ipo : "--";
}

async function loadSidebarQuotes() {
  const query = new URLSearchParams();
  followingItems.forEach((item) => {
    query.append("symbols", item.symbol);
  });

  const response = await fetch(`${API}/api/market/trending?${query.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to load following quotes");
  }

  sidebarQuotes = await response.json();
}

async function refreshFollowingSidebar() {
  if (!followingItems.length) {
    sidebarQuotes = [];
    followingCountElement.textContent = "0";
    followingLastUpdatedElement.textContent = "No items yet";
    renderFollowingList();
    return;
  }

  try {
    await loadSidebarQuotes();
  } catch (error) {
    console.error(error);
    sidebarQuotes = [];
  }

  followingCountElement.textContent = String(followingItems.length);
  followingLastUpdatedElement.textContent = formatLastUpdated(new Date());
  renderFollowingList();
}

async function loadDetailQuote(symbol) {
  const response = await fetch(`${API}/api/market/trending?symbols=${encodeURIComponent(symbol)}`);
  if (!response.ok) {
    throw new Error("Failed to load quote");
  }

  const [quote] = await response.json();
  return quote || null;
}

async function loadCandles(symbol) {
  setChartState("Loading price chart...");

  const response = await fetch(
    `${API}/api/market/candles?symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(activeRange)}&interval=${encodeURIComponent(activeInterval)}`,
  );

  if (!response.ok) {
    const message = await readErrorMessage(response, "Failed to load price chart.");
    setChartState(message);
    throw new Error(message);
  }

  const data = await response.json();
  const seriesData = (data.candles || []).map((candle) => ({
    x: new Date(candle.timestamp),
    y: [candle.open, candle.high, candle.low, candle.close],
  }));

  updateChartDescription();
  candleChart.updateSeries([{ data: seriesData }]);
  setChartState("", false);
}

async function loadCompanyNews(symbol, itemType) {
  newsListElement.innerHTML = "";

  if (String(itemType || "").toUpperCase() === "CRYPTO") {
    setNewsState("News is currently shown for stock symbols only.");
    return;
  }

  setNewsState("Loading company news...");

  const { from, to } = getNewsDateRange();
  const params = new URLSearchParams({ symbol, from, to });
  const response = await fetch(`${API}/api/market/company-news?${params.toString()}`);

  if (!response.ok) {
    const message = await readErrorMessage(response, "Failed to load company news.");
    setNewsState(message);
    throw new Error(message);
  }

  const news = await response.json();

  if (!news.length) {
    setNewsState("No recent company news found for this symbol.");
    return;
  }

  setNewsState("", false);
  newsListElement.innerHTML = news
    .slice(0, 8)
    .map(
      (item) => `
        <article class="following-news-item">
          <div class="following-news-item__meta">
            <span class="following-news-item__source">${escapeHtml(item.source || "News")}</span>
            <time>${escapeHtml(formatNewsDate(item.datetime))}</time>
            <span>${escapeHtml(item.related || symbol)}</span>
          </div>

          <h4>${escapeHtml(item.headline || "Untitled article")}</h4>
          <p>${escapeHtml(item.summary || "No summary available.")}</p>

          <a href="${escapeHtml(item.url || "#")}" target="_blank" rel="noreferrer" class="following-news-item__link">
            <span>Read original article</span>
            <span class="material-symbols-outlined">open_in_new</span>
          </a>
        </article>
      `,
    )
    .join("");
}

async function selectSymbol(symbol) {
  const item = followingItems.find((entry) => entry.symbol === symbol);
  if (!item) {
    return;
  }

  activeSymbol = symbol;
  renderFollowingList();

  try {
    const quote = await loadDetailQuote(symbol);
    updateDetailHeader(item, quote);

    try {
      const profile = await loadCompanyProfile(symbol, item.type);
      updateProfileDetails(item, profile);
    } catch (error) {
      console.error(error);
      updateProfileDetails(item, null);
    }

    try {
      await loadCandles(symbol);
    } catch (error) {
      console.error(error);
    }

    try {
      await loadCompanyNews(symbol, item.type);
    } catch (error) {
      console.error(error);
    }
  } catch (error) {
    console.error(error);
  }
}

async function initializeFollowingPage() {
  renderRangeFilters();
  renderIntervalFilters();
  updateChartDescription();
  createCandleChart();

  try {
    const response = await fetch(`${API}/api/following`);
    if (!response.ok) {
      throw new Error("Failed to load following list");
    }

    followingItems = await response.json();
    followingCountElement.textContent = String(followingItems.length);

    if (!followingItems.length) {
      renderFollowingList();
      followingLastUpdatedElement.textContent = "No items yet";
      return;
    }

    await refreshFollowingSidebar();
    activeSymbol = followingItems[0].symbol;
    await selectSymbol(activeSymbol);
  } catch (error) {
    console.error(error);
    followingCountElement.textContent = "0";
    followingLastUpdatedElement.textContent = "Unavailable";
    renderFollowingList();
  }
}

followingListRoot.addEventListener("click", async (event) => {
  const deleteButton = event.target.closest("[data-delete-id]");
  if (deleteButton) {
    event.preventDefault();
    event.stopPropagation();

    const targetId = deleteButton.dataset.deleteId;
    if (!targetId || deletingFollowingId) {
      return;
    }

    deletingFollowingId = targetId;
    setSidebarState("Removing asset from following...");
    renderFollowingList();

    try {
      const response = await fetch(`${API}/api/following/${encodeURIComponent(targetId)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const message = await readErrorMessage(response, "Failed to delete asset from following.");
        throw new Error(message);
      }

      const removedItem = followingItems.find((item) => String(item.id) === String(targetId));
      const removedActiveSymbol = removedItem?.symbol === activeSymbol;
      followingItems = followingItems.filter((item) => String(item.id) !== String(targetId));

      if (!followingItems.length) {
        activeSymbol = "";
        await refreshFollowingSidebar();
        setSidebarState("Asset removed from following.", "success");
        setNewsState("", false);
        newsListElement.innerHTML = "";
        setChartState("Select an asset to load price chart.");
        return;
      }

      if (removedActiveSymbol) {
        activeSymbol = followingItems[0].symbol;
      }

      await refreshFollowingSidebar();
      setSidebarState("Asset removed from following.", "success");

      if (removedActiveSymbol) {
        await selectSymbol(activeSymbol);
      }
    } catch (error) {
      console.error(error);
      setSidebarState(error.message || "Failed to delete asset from following.", "error");
    } finally {
      deletingFollowingId = null;
      renderFollowingList();
    }

    return;
  }

  const button = event.target.closest("[data-symbol]");
  if (!button) {
    return;
  }

  if (button.dataset.symbol === activeSymbol) {
    return;
  }

  await selectSymbol(button.dataset.symbol);
});

followingListRoot.addEventListener("keydown", async (event) => {
  const item = event.target.closest("[data-symbol]");
  if (!item) {
    return;
  }

  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  event.preventDefault();

  if (item.dataset.symbol === activeSymbol) {
    return;
  }

  await selectSymbol(item.dataset.symbol);
});

rangeFiltersRoot.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-range]");
  if (!button || !activeSymbol) {
    return;
  }

  activeRange = button.dataset.range;
  renderRangeFilters();
  updateChartDescription();

  try {
    await loadCandles(activeSymbol);
  } catch (error) {
    console.error(error);
  }
});

intervalFiltersRoot.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-interval]");
  if (!button || !activeSymbol) {
    return;
  }

  activeInterval = button.dataset.interval;
  renderIntervalFilters();
  updateChartDescription();

  try {
    await loadCandles(activeSymbol);
  } catch (error) {
    console.error(error);
  }
});

initializeFollowingPage();
