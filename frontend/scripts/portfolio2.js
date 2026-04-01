const API = "http://localhost:8080";

const tableBody = document.getElementById("table-body");
const totalElement = document.getElementById("total");
const assetForm = document.getElementById("asset-form");
const searchInput = document.getElementById("portfolio-search-input");
const sortSelect = document.getElementById("portfolio-sort-select");
const tickerInput = document.getElementById("ticker");
const quantityInput = document.getElementById("quantity");
const typeInput = document.getElementById("type");
const compositionChart = document.getElementById("composition-chart");
const compositionCount = document.getElementById("composition-count");
const compositionLegend = document.getElementById("composition-legend");
const lastUpdatedElement = document.getElementById("portfolio-last-updated");

const AUTO_REFRESH_INTERVAL_MS = 30000;

let portfolioRequestInFlight = false;
let portfolioItems = [];

const COMPOSITION_COLORS = {
  Equity: "#101828",
  Crypto: "#3b82f6",
  ETF: "#14b8a6",
  Bond: "#f97316",
  Cash: "#cbd5e1",
  Unknown: "#94a3b8",
};

function formatTime(time) {
  if (!time) {
    return "-";
  }

  return time.replace("T", " ").substring(0, 19);
}

function formatMoney(value) {
  return `$${Number(value).toFixed(2)}`;
}

function formatLastUpdated(date) {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function showToast(message, tone = "info") {
  let toastRoot = document.getElementById("toast-root");

  if (!toastRoot) {
    toastRoot = document.createElement("div");
    toastRoot.id = "toast-root";
    toastRoot.className = "toast-root";
    document.body.appendChild(toastRoot);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast--${tone}`;
  toast.textContent = message;
  toastRoot.appendChild(toast);

  window.setTimeout(() => {
    toast.classList.add("is-leaving");
    window.setTimeout(() => toast.remove(), 220);
  }, 2600);
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function getSortedItems(items) {
  const sortedItems = [...items];

  switch (sortSelect.value) {
    case "value-asc":
      sortedItems.sort((left, right) => Number(left.totalValue) - Number(right.totalValue));
      break;
    case "ticker-asc":
      sortedItems.sort((left, right) => left.ticker.localeCompare(right.ticker));
      break;
    case "ticker-desc":
      sortedItems.sort((left, right) => right.ticker.localeCompare(left.ticker));
      break;
    case "quantity-desc":
      sortedItems.sort((left, right) => Number(right.quantity) - Number(left.quantity));
      break;
    case "quantity-asc":
      sortedItems.sort((left, right) => Number(left.quantity) - Number(right.quantity));
      break;
    case "value-desc":
    default:
      sortedItems.sort((left, right) => Number(right.totalValue) - Number(left.totalValue));
      break;
  }

  return sortedItems;
}

function getVisibleItems() {
  const keyword = searchInput.value.trim().toLowerCase();
  const filteredItems = keyword
    ? portfolioItems.filter((item) =>
        [item.name, item.ticker, item.type]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(keyword)),
      )
    : portfolioItems;

  return getSortedItems(filteredItems);
}

function renderPortfolioView() {
  const visibleItems = getVisibleItems();
  renderRows(visibleItems);
  renderComposition(visibleItems);
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
    showToast("Failed to load total balance.", "error");
  }
}

function updateLastUpdated() {
  lastUpdatedElement.textContent = `Last updated ${formatLastUpdated(new Date())}`;
}

async function loadPortfolio(options = {}) {
  const { silent = false } = options;

  if (portfolioRequestInFlight) {
    return;
  }

  portfolioRequestInFlight = true;

  try {
    const response = await fetch(`${API}/portfolio`);
    if (!response.ok) {
      throw new Error("Failed to load portfolio");
    }

    portfolioItems = await response.json();
    renderPortfolioView();
    await loadTotal();
    updateLastUpdated();
  } catch (error) {
    console.error(error);
    if (!silent) {
      showToast("Failed to load portfolio data.", "error");
    }
  } finally {
    portfolioRequestInFlight = false;
  }
}

async function addAsset() {
  const ticker = tickerInput.value.trim().toUpperCase();
  const quantity = Number(quantityInput.value);
  const type = typeInput.value.trim();

  if (!ticker) {
    showToast("Please enter a ticker.", "error");
    return;
  }

  if (!isPositiveInteger(quantity)) {
    showToast("Quantity must be a positive integer.", "error");
    return;
  }

  if (!type) {
    showToast("Please select an asset type.", "error");
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
    await loadPortfolio();
    showToast("Asset added successfully.", "success");
  } catch (error) {
    console.error(error);
    showToast(error.message || "Failed to add asset.", "error");
  }
}

async function sellAsset(id, currentQuantity) {
  const sellInput = document.getElementById(`sell-${id}`);
  const sellQuantity = Number(sellInput.value);

  if (!isPositiveInteger(sellQuantity)) {
    showToast("Sell quantity must be a positive integer.", "error");
    return;
  }

  if (sellQuantity > currentQuantity) {
    showToast("Sell quantity cannot be greater than current holdings.", "error");
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
    showToast("Asset updated successfully.", "success");
  } catch (error) {
    console.error(error);
    showToast(error.message || "Failed to sell asset.", "error");
  }
}

assetForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await addAsset();
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

searchInput.addEventListener("input", () => {
  renderPortfolioView();
});

sortSelect.addEventListener("change", () => {
  renderPortfolioView();
});

loadPortfolio();
window.setInterval(() => {
  loadPortfolio({ silent: true });
}, AUTO_REFRESH_INTERVAL_MS);
