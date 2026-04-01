const API = "http://localhost:8080";

const tableBody = document.getElementById("table-body");
const totalElement = document.getElementById("total");
const assetForm = document.getElementById("asset-form");
const tickerInput = document.getElementById("ticker");
const quantityInput = document.getElementById("quantity");
const typeInput = document.getElementById("type");
const tickerSearchDropdown = document.getElementById("ticker-search-dropdown");
const compositionChart = document.getElementById("composition-chart");
const compositionCount = document.getElementById("composition-count");
const compositionLegend = document.getElementById("composition-legend");

let tickerSearchTimeoutId = null;

const COMPOSITION_COLORS = {
  Equity: "#101828",
  Crypto: "#3b82f6",
  ETF: "#14b8a6",
  Bond: "#f97316",
  Cash: "#cbd5e1",
  Unknown: "#94a3b8",
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
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

function normalizeSearchValue(value) {
  return String(value || "").trim().toUpperCase();
}

function formatTime(time) {
  if (!time) {
    return "-";
  }

  return time.replace("T", " ").substring(0, 19);
}

function formatMoney(value) {
  return `$${Number(value).toFixed(2)}`;
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function hideTickerSearchDropdown() {
  tickerSearchDropdown.hidden = true;
  tickerSearchDropdown.innerHTML = "";
}

function renderTickerSearchState(message) {
  tickerSearchDropdown.innerHTML = `
    <div class="search-dropdown__state">${escapeHtml(message)}</div>
  `;
  tickerSearchDropdown.hidden = false;
}

function getTickerSimilarityScore(query, result) {
  const normalizedQuery = normalizeSearchValue(query);
  const symbol = normalizeSearchValue(result.symbol);

  if (!normalizedQuery) {
    return 0;
  }

  let score = 0;

  if (symbol === normalizedQuery) {
    score += 1000;
  }

  if (symbol.startsWith(normalizedQuery)) {
    score += 700 - Math.max(0, symbol.length - normalizedQuery.length) * 8;
  } else if (symbol.includes(normalizedQuery)) {
    score += 420 - symbol.indexOf(normalizedQuery) * 12;
  }

  if (symbol[0] === normalizedQuery[0]) {
    score += 60;
  }

  score -= Math.abs(symbol.length - normalizedQuery.length) * 4;

  return score;
}

function rankTickerSearchResults(results, keyword) {
  const normalizedQuery = normalizeSearchValue(keyword);
  const filteredResults =
    normalizedQuery.length === 1
      ? results.filter((result) => normalizeSearchValue(result.symbol).startsWith(normalizedQuery))
      : results;

  return [...filteredResults].sort((left, right) => {
    const rightScore = getTickerSimilarityScore(keyword, right);
    const leftScore = getTickerSimilarityScore(keyword, left);

    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }

    return left.symbol.localeCompare(right.symbol);
  });
}

function renderTickerSearchResults(results) {
  if (!results.length) {
    renderTickerSearchState("No matching symbols found.");
    return;
  }

  tickerSearchDropdown.innerHTML = results
    .map(
      (result) => `
        <button
          class="search-dropdown__item"
          type="button"
          data-symbol="${escapeHtml(result.symbol)}"
        >
          <span class="search-dropdown__symbol">${escapeHtml(result.symbol)}</span>
        </button>
      `,
    )
    .join("");

  tickerSearchDropdown.hidden = false;
}

async function searchTickerSymbols(keyword) {
  try {
    const response = await fetch(`${API}/search?keyword=${encodeURIComponent(keyword)}`);
    if (!response.ok) {
      throw new Error("Failed to search symbols");
    }

    const results = await response.json();
    renderTickerSearchResults(rankTickerSearchResults(results, keyword).slice(0, 8));
  } catch (error) {
    console.error(error);
    renderTickerSearchState("Search is temporarily unavailable.");
  }
}

function scheduleTickerSearch(keyword) {
  clearTimeout(tickerSearchTimeoutId);

  if (keyword.length < 1) {
    hideTickerSearchDropdown();
    return;
  }

  renderTickerSearchState("Searching symbols...");
  tickerSearchTimeoutId = window.setTimeout(() => {
    searchTickerSymbols(keyword);
  }, 200);
}

function renderEmptyState() {
  tableBody.innerHTML = `
    <tr class="portfolio-empty">
      <td colspan="8">No assets yet. Add your first holding from the form on the right.</td>
    </tr>
  `;
}

function renderRows(items) {
  if (!items.length) {
    renderEmptyState();
    return;
  }

  tableBody.innerHTML = items
    .map(
      (item) => `
        <tr>
          <td>${item.name}</td>
          <td>${item.ticker}</td>
          <td>${item.type}</td>
          <td>${item.quantity}</td>
          <td>${formatMoney(item.price)}</td>
          <td>${formatTime(item.time)}</td>
          <td>${formatMoney(item.totalValue)}</td>
          <td>
            <div class="portfolio-action">
              <input
                class="portfolio-action__input"
                type="number"
                id="sell-${item.id}"
                placeholder="qty"
                min="1"
                max="${item.quantity}"
                step="1"
              />
              <button
                class="portfolio-action__button"
                type="button"
                data-sell-id="${item.id}"
                data-current-quantity="${item.quantity}"
              >
                Sell
              </button>
            </div>
          </td>
        </tr>
      `,
    )
    .join("");
}

function renderComposition(items) {
  if (!items.length) {
    compositionCount.textContent = "0";
    compositionChart.style.background = "conic-gradient(#e2e8f0 0deg 360deg)";
    compositionLegend.innerHTML = `
      <div class="composition-legend__empty">
        Composition will appear after you add portfolio holdings.
      </div>
    `;
    return;
  }

  const totalsByType = items.reduce((accumulator, item) => {
    const type = item.type || "Unknown";
    accumulator[type] = (accumulator[type] || 0) + Number(item.totalValue || 0);
    return accumulator;
  }, {});

  const entries = Object.entries(totalsByType)
    .sort(([, left], [, right]) => right - left);

  compositionCount.textContent = String(entries.length);

  const totalValue = entries.reduce((sum, [, value]) => sum + value, 0);
  let currentAngle = 0;

  const segments = entries.map(([type, value]) => {
    const percentage = totalValue === 0 ? 0 : (value / totalValue) * 100;
    const startAngle = currentAngle;
    currentAngle += (percentage / 100) * 360;
    const endAngle = currentAngle;

    return {
      type,
      value,
      percentage,
      color: COMPOSITION_COLORS[type] || COMPOSITION_COLORS.Unknown,
      startAngle,
      endAngle,
    };
  });

  compositionChart.style.background = `conic-gradient(${segments
    .map((segment) => `${segment.color} ${segment.startAngle}deg ${segment.endAngle}deg`)
    .join(", ")})`;

  compositionLegend.innerHTML = segments
    .map(
      (segment) => `
        <div class="composition-legend__item">
          <div class="composition-legend__label">
            <span
              class="composition-legend__swatch"
              style="background:${segment.color}"
            ></span>
            <span>${segment.type}</span>
          </div>
          <strong>${segment.percentage.toFixed(0)}%</strong>
        </div>
      `,
    )
    .join("");
}

async function loadTotal() {
  try {
    const response = await fetch(`${API}/portfolio/value`);
    if (!response.ok) {
      throw new Error("Failed to load total value");
    }

    const total = await response.text();
    totalElement.innerText = formatMoney(total);
  } catch (error) {
    console.error(error);
    alert("Failed to load total balance.");
  }
}

async function loadPortfolio() {
  try {
    const response = await fetch(`${API}/portfolio`);
    if (!response.ok) {
      throw new Error("Failed to load portfolio");
    }

    const data = await response.json();
    renderRows(data);
    renderComposition(data);
    await loadTotal();
  } catch (error) {
    console.error(error);
    alert("Failed to load portfolio data.");
  }
}

async function addAsset() {
  const ticker = tickerInput.value.trim().toUpperCase();
  const quantity = Number(quantityInput.value);
  const type = typeInput.value.trim();

  if (!ticker) {
    alert("Please enter a ticker.");
    return;
  }

  if (!isPositiveInteger(quantity)) {
    alert("Quantity must be a positive integer.");
    return;
  }

  if (!type) {
    alert("Please select an asset type.");
    return;
  }

  try {
    const response = await fetch(`${API}/portfolio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker, quantity, type }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Add asset failed");
    }

    tickerInput.value = "";
    quantityInput.value = "";
    typeInput.value = "";
    hideTickerSearchDropdown();
    await loadPortfolio();
  } catch (error) {
    console.error(error);
    alert(error.message || "Failed to add asset.");
  }
}

async function sellAsset(id, currentQuantity) {
  const sellInput = document.getElementById(`sell-${id}`);
  const sellQuantity = Number(sellInput.value);

  if (!isPositiveInteger(sellQuantity)) {
    alert("Sell quantity must be a positive integer.");
    return;
  }

  if (sellQuantity > currentQuantity) {
    alert("Sell quantity cannot be greater than current holdings.");
    return;
  }

  try {
    const response = await fetch(`${API}/portfolio/sell`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, quantity: sellQuantity }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Sell asset failed");
    }

    await loadPortfolio();
  } catch (error) {
    console.error(error);
    alert(error.message || "Failed to sell asset.");
  }
}

assetForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await addAsset();
});

tickerInput.addEventListener("input", (event) => {
  scheduleTickerSearch(event.target.value.trim());
});

tickerInput.addEventListener("focus", () => {
  const keyword = tickerInput.value.trim();
  if (keyword.length >= 1 && tickerSearchDropdown.innerHTML) {
    tickerSearchDropdown.hidden = false;
  }
});

tickerSearchDropdown.addEventListener("click", (event) => {
  const option = event.target.closest("[data-symbol]");
  if (!option) {
    return;
  }

  tickerInput.value = option.dataset.symbol;
  hideTickerSearchDropdown();
  quantityInput.focus();
});

document.addEventListener("click", (event) => {
  if (event.target.closest(".form-field--ticker")) {
    return;
  }

  hideTickerSearchDropdown();
});

tableBody.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-sell-id]");
  if (!button) {
    return;
  }

  const id = Number(button.dataset.sellId);
  const currentQuantity = Number(button.dataset.currentQuantity);
  await sellAsset(id, currentQuantity);
});

loadPortfolio();
