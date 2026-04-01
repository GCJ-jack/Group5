const API = "http://localhost:8080";

const symbolElement = document.getElementById("detail-symbol");
const companyElement = document.getElementById("detail-company");
const quotePriceElement = document.getElementById("quote-price");
const quoteChangeElement = document.getElementById("quote-change");
const quoteOpenElement = document.getElementById("quote-open");
const candleRangeFiltersRoot = document.getElementById("candle-range-filters");
const candleChartRoot = document.getElementById("stock-candle-chart");
const companyNewsState = document.getElementById("company-news-state");
const companyNewsList = document.getElementById("company-news-list");

const candleRanges = ["1mo", "3mo", "6mo", "1y"];
const urlParams = new URLSearchParams(window.location.search);
const symbol = (urlParams.get("symbol") || "").trim().toUpperCase();

let activeCandleRange = "1mo";
let candleChart = null;

const FALLBACK_NEWS_IMAGE =
  "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatPercent(value) {
  const numericValue = Number(value || 0);
  return `${numericValue >= 0 ? "+" : ""}${numericValue.toFixed(2)}%`;
}

function formatNewsDate(unixTimestamp) {
  return new Date((unixTimestamp || 0) * 1000).toLocaleString();
}

function resolveNewsImage(imageUrl) {
  if (!imageUrl) {
    return FALLBACK_NEWS_IMAGE;
  }

  const normalizedUrl = imageUrl.toLowerCase();
  const looksLikeLogo =
    normalizedUrl.includes("/logo/") ||
    normalizedUrl.includes("_logo") ||
    normalizedUrl.includes("logo.");

  return looksLikeLogo ? FALLBACK_NEWS_IMAGE : imageUrl;
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

function renderRangeFilters() {
  candleRangeFiltersRoot.innerHTML = candleRanges
    .map(
      (range) => `
        <button
          class="segmented-control__item ${range === activeCandleRange ? "is-active" : ""}"
          type="button"
          data-range="${range}"
        >
          ${range.toUpperCase()}
        </button>
      `,
    )
    .join("");
}

function createCandleChart() {
  candleChart = new ApexCharts(candleChartRoot, {
    chart: {
      type: "candlestick",
      height: "100%",
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: "Inter, sans-serif",
    },
    series: [{ data: [] }],
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
          upward: "#cb3a31",
          downward: "#0a7f55",
        },
      },
    },
  });

  candleChart.render();
}

async function loadQuote() {
  const response = await fetch(`${API}/api/market/trending?symbols=${encodeURIComponent(symbol)}`);
  if (!response.ok) {
    throw new Error("Failed to load quote");
  }

  const [quote] = await response.json();
  const percentChange = Number(quote?.percentChange || 0);

  symbolElement.textContent = symbol;
  companyElement.textContent = `${quote?.name || symbol} live market snapshot`;
  quotePriceElement.textContent = formatCurrency(quote?.currentPrice);
  quoteChangeElement.textContent = formatPercent(percentChange);
  quoteChangeElement.classList.toggle("stock-quote-positive", percentChange >= 0);
  quoteChangeElement.classList.toggle("stock-quote-negative", percentChange < 0);
  quoteOpenElement.textContent = `${formatCurrency(quote?.open)} / ${formatCurrency(quote?.previousClose)}`;
}

async function loadCandles(range) {
  const response = await fetch(
    `${API}/api/market/candles?symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(range)}&interval=DAILY`,
  );
  if (!response.ok) {
    throw new Error("Failed to load candles");
  }

  const data = await response.json();
  const seriesData = (data.candles || []).map((candle) => ({
    x: new Date(candle.timestamp),
    y: [candle.open, candle.high, candle.low, candle.close],
  }));

  candleChart.updateSeries([{ data: seriesData }]);
}

async function loadCompanyNews() {
  const { from, to } = getNewsDateRange();
  const params = new URLSearchParams({ symbol, from, to });
  const response = await fetch(`${API}/api/market/company-news?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to load company news");
  }

  const news = await response.json();

  if (!news.length) {
    companyNewsState.textContent = "No recent company news found for this symbol.";
    companyNewsState.hidden = false;
    companyNewsList.innerHTML = "";
    return;
  }

  companyNewsState.hidden = true;
  companyNewsList.innerHTML = news
    .slice(0, 8)
    .map(
      (item) => `
        <article class="stock-news-item">
          <img
            class="stock-news-item__image"
            src="${resolveNewsImage(item.image)}"
            alt="${item.headline}"
          />

          <div>
            <div class="stock-news-item__meta">
              <span class="stock-news-item__source">${item.source}</span>
              <time>${formatNewsDate(item.datetime)}</time>
              <span>${item.related || symbol}</span>
            </div>

            <h4>${item.headline}</h4>
            <p>${item.summary || "No summary available."}</p>

            <a href="${item.url}" target="_blank" rel="noreferrer" class="stock-news-item__link">
              <span>Read original article</span>
              <span class="material-symbols-outlined">open_in_new</span>
            </a>
          </div>
        </article>
      `,
    )
    .join("");
}

async function initializePage() {
  if (!symbol) {
    symbolElement.textContent = "No Symbol";
    companyElement.textContent = "Select a company from the dashboard search bar first.";
    return;
  }

  renderRangeFilters();
  createCandleChart();

  try {
    await Promise.all([loadQuote(), loadCandles(activeCandleRange), loadCompanyNews()]);
  } catch (error) {
    console.error(error);
    companyElement.textContent = "Failed to load stock detail data.";
    companyNewsState.textContent = "Failed to load company news.";
  }
}

candleRangeFiltersRoot.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-range]");
  if (!button) {
    return;
  }

  activeCandleRange = button.dataset.range;
  renderRangeFilters();

  try {
    await loadCandles(activeCandleRange);
  } catch (error) {
    console.error(error);
  }
});

initializePage();
