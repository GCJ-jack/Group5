window.dashboardData = {
  performanceFilters: ["1D", "1W", "1M", "YTD"],
};

const FALLBACK_NEWS_IMAGE =
  "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80";

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

async function loadNews() {
  try {
    const response = await fetch("http://localhost:8080/api/market/news");
    const data = await response.json();
    const newsList = document.getElementById("news-list");

    newsList.innerHTML = "";

    data.slice(0, 10).forEach((item) => {
      const imageUrl = resolveNewsImage(item.image);
      const newsItem = `<div class="news-item" style="display:flex; gap:12px; margin-bottom:16px;">
        <img src="${imageUrl}"
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

async function loadTopGainers() {
  try {
    const portfolioResponse = await fetch("http://localhost:8080/portfolio");
    if (!portfolioResponse.ok) {
      throw new Error("Failed to load portfolio");
    }

    const portfolio = await portfolioResponse.json();
    const uniqueHoldings = Array.from(
      new Map(
        portfolio.map((item) => [
          item.ticker,
          {
            ticker: item.ticker,
            name: item.name,
            quantity: item.quantity,
          },
        ]),
      ).values(),
    );

    const list = document.getElementById("holdings-list");
    if (!list) {
      return;
    }
    list.innerHTML = "";

    if (!uniqueHoldings.length) {
      list.innerHTML = `
        <div style="color:var(--muted); font-size:14px;">
          Add holdings in Portfolio first to see your top gainers.
        </div>
      `;
      return;
    }

    const query = new URLSearchParams();
    uniqueHoldings.forEach((item) => {
      query.append("symbols", item.ticker);
    });

    const quoteResponse = await fetch(`http://localhost:8080/api/market/trending?${query.toString()}`);
    if (!quoteResponse.ok) {
      throw new Error("Failed to load quotes");
    }

    const quotes = await quoteResponse.json();
    const ranking = quotes
      .map((quote) => {
        const holding = uniqueHoldings.find((item) => item.ticker === quote.name);
        return {
          symbol: quote.name,
          name: holding?.name ?? quote.name,
          quantity: holding?.quantity ?? 0,
          currentPrice: quote.currentPrice ?? 0,
          change: quote.change ?? 0,
          percentChange: quote.percentChange ?? 0,
        };
      })
      .sort((left, right) => right.percentChange - left.percentChange)
      .slice(0, 5);

    ranking.forEach((item) => {
      const isPositive = (item.percentChange ?? 0) >= 0;

      const html = `
        <div class="holding-row ${isPositive ? "holding-row--positive" : "holding-row--negative"}">
          <div class="holding-row__identity">
            <div class="holding-row__symbol">${item.symbol}</div>
            <div>
              <p>${item.name}</p>
              <span>${item.quantity} Shares</span>
            </div>
          </div>

          <div class="holding-row__metrics">
            <p>$${(item.currentPrice ?? 0).toFixed(2)}</p>
            <span class="holding-change-pill ${isPositive ? "is-positive" : "is-negative"}">
              ${isPositive ? '+' : ''}${(item.percentChange ?? 0).toFixed(2)}%
            </span>
          </div>
        </div>
      `;

      list.innerHTML += html;
    });

  } catch (error) {
    console.error("加载涨幅排行失败:", error);
  }
}

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

function formatQuoteCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function findQuoteForSymbol(quotes, symbol) {
  const normalizedSymbol = String(symbol || "").trim().toUpperCase();
  return quotes.find((quote) => {
    const candidates = [quote?.symbol, quote?.name, quote?.ticker];
    return candidates.some((candidate) => String(candidate || "").trim().toUpperCase() === normalizedSymbol);
  });
}

async function loadFollowingList() {
  const list = document.getElementById("following-list");
  if (!list) {
    return;
  }

  try {
    const response = await fetch("http://localhost:8080/api/following");
    if (!response.ok) {
      throw new Error("Failed to load following list");
    }

    const following = await response.json();
    list.innerHTML = "";

    if (!following.length) {
      list.innerHTML = `
        <div class="following-state">
          Add companies from the stock detail page to start your following list.
        </div>
      `;
      return;
    }

    const query = new URLSearchParams();
    following.forEach((item) => {
      query.append("symbols", item.symbol);
    });

    let quotes = [];
    try {
      const quoteResponse = await fetch(`http://localhost:8080/api/market/trending?${query.toString()}`);
      if (!quoteResponse.ok) {
        throw new Error("Failed to load following quotes");
      }
      quotes = await quoteResponse.json();
    } catch (error) {
      console.error("加载关注列表行情失败:", error);
    }

    list.innerHTML = following
      .map((item) => {
        const symbol = item.symbol;
        const displayName = item.name || symbol;
        const quote = findQuoteForSymbol(quotes, symbol);
        const hasQuote = Boolean(quote);
        const percentChange = Number(quote?.percentChange ?? 0);
        const change = Number(quote?.change ?? 0);
        const isPositive = percentChange >= 0;
        const priceMarkup = quote
          ? `
            <p>${formatQuoteCurrency(quote.currentPrice)}</p>
            <span class="holding-change-pill ${isPositive ? "is-positive" : "is-negative"}">
              ${isPositive ? "+" : ""}${change.toFixed(2)} / ${isPositive ? "+" : ""}${percentChange.toFixed(2)}%
            </span>
          `
          : `
            <p>Quote unavailable</p>
            <span class="following-row__fallback">Live quote unavailable right now.</span>
          `;

        return `
          <div class="holding-row ${hasQuote ? (isPositive ? "holding-row--positive" : "holding-row--negative") : "following-row--neutral"} following-row">
            <div class="holding-row__identity">
              <div class="holding-row__symbol">${escapeHtml(symbol)}</div>
              <div>
                <p>${escapeHtml(displayName)}</p>
                <span class="following-row__meta">
                  <span class="following-type-pill">${escapeHtml(item.type || "STOCK")}</span>
                  <span>${escapeHtml(formatFollowingDate(item.createdAt))}</span>
                </span>
              </div>
            </div>

            <div class="holding-row__metrics">
              ${priceMarkup}
            </div>
          </div>
        `;
      })
      .join("");
  } catch (error) {
    console.error("加载关注列表失败:", error);
    list.innerHTML = `
      <div class="following-state">
        Failed to load following list.
      </div>
    `;
  }
}

document.addEventListener("DOMContentLoaded", loadNews);
document.addEventListener("DOMContentLoaded", loadTopGainers);
document.addEventListener("DOMContentLoaded", loadFollowingList);
