const API = "http://localhost:8080";

const tableBody = document.getElementById("history-table-body");
const stateElement = document.getElementById("history-state");
const totalCountElement = document.getElementById("history-total-count");
const quantityCountElement = document.getElementById("history-quantity-count");
const lastUpdatedElement = document.getElementById("history-last-updated");
const refreshButton = document.getElementById("history-refresh-button");
const searchInput = document.getElementById("history-search-input");
const typeFilter = document.getElementById("history-type-filter");
const tradeFilter = document.getElementById("history-trade-filter");

let historyRecords = [];

function getAssetType(record) {
  return String(record?.assetType || record?.type || "").trim();
}

function getTradeType(record) {
  return String(record?.tradeType || "").trim();
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

function setState(message = "", tone = "neutral") {
  if (!message) {
    stateElement.hidden = true;
    stateElement.textContent = "";
    stateElement.className = "history-state";
    return;
  }

  stateElement.hidden = false;
  stateElement.textContent = message;
  stateElement.className = `history-state${tone === "error" ? " is-error" : ""}`;
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("en-US", { hour12: false });
}

function formatLastUpdated(date) {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function updateStats(records) {
  const buyCount = records.filter((record) => getTradeType(record).toUpperCase() === "BUY").length;
  const sellCount = records.filter((record) => getTradeType(record).toUpperCase() === "SELL").length;

  totalCountElement.textContent = String(records.length);
  quantityCountElement.textContent = `${buyCount} / ${sellCount}`;
}

function populateTypeFilter(records) {
  const uniqueTypes = Array.from(
    new Set(records.map((record) => getAssetType(record)).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right));

  const previousValue = typeFilter.value || "ALL";
  typeFilter.innerHTML = `
    <option value="ALL">All Types</option>
    ${uniqueTypes
      .map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`)
      .join("")}
  `;

  if (uniqueTypes.includes(previousValue)) {
    typeFilter.value = previousValue;
  } else {
    typeFilter.value = "ALL";
  }
}

function populateTradeFilter(records) {
  const uniqueTradeTypes = Array.from(
    new Set(records.map((record) => getTradeType(record)).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right));

  const previousValue = tradeFilter.value || "ALL";
  tradeFilter.innerHTML = `
    <option value="ALL">All Trades</option>
    ${uniqueTradeTypes
      .map((tradeType) => `<option value="${escapeHtml(tradeType)}">${escapeHtml(tradeType)}</option>`)
      .join("")}
  `;

  if (uniqueTradeTypes.includes(previousValue)) {
    tradeFilter.value = previousValue;
  } else {
    tradeFilter.value = "ALL";
  }
}

function getVisibleRecords() {
  const keyword = searchInput.value.trim().toLowerCase();
  const selectedType = typeFilter.value;
  const selectedTradeType = tradeFilter.value;

  return historyRecords.filter((record) => {
    const matchesKeyword =
      !keyword ||
      [record.stockName, record.symbol]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));

    const matchesType = selectedType === "ALL" || getAssetType(record) === selectedType;
    const matchesTradeType = selectedTradeType === "ALL" || getTradeType(record) === selectedTradeType;

    return matchesKeyword && matchesType && matchesTradeType;
  });
}

function renderEmptyState() {
  tableBody.innerHTML = `
    <tr>
      <td colspan="7" class="history-empty">No portfolio history records yet.</td>
    </tr>
  `;
}

function renderRows(records) {
  if (!records.length) {
    renderEmptyState();
    return;
  }

  tableBody.innerHTML = records
    .map(
      (record) => `
        <tr>
          <td class="history-table__mono">${escapeHtml(formatDateTime(record.orderTime))}</td>
          <td class="history-table__name">${escapeHtml(record.stockName || record.symbol || "Unknown Asset")}</td>
          <td class="history-table__mono">${escapeHtml(record.symbol || "-")}</td>
          <td><span class="history-trade-pill history-trade-pill--${getTradeType(record).toLowerCase() || "unknown"}">${escapeHtml(getTradeType(record) || "Unavailable")}</span></td>
          <td><span class="history-type-pill">${escapeHtml(getAssetType(record) || "Unknown")}</span></td>
          <td class="history-table__mono">${escapeHtml(formatNumber(record.quantity))}</td>
          <td class="history-table__mono">${escapeHtml(formatMoney(record.price))}</td>
        </tr>
      `,
    )
    .join("");
}

async function loadHistory() {
  refreshButton.disabled = true;
  setState("Loading history...");
  tableBody.innerHTML = `
    <tr>
      <td colspan="7" class="history-empty">Loading history...</td>
    </tr>
  `;

  try {
    const response = await fetch(`${API}/portfolio/history`);
    if (!response.ok) {
      throw new Error("Failed to load portfolio history");
    }

    historyRecords = await response.json();
    populateTypeFilter(historyRecords);
    populateTradeFilter(historyRecords);
    const visibleRecords = getVisibleRecords();
    updateStats(visibleRecords);
    renderRows(visibleRecords);
    lastUpdatedElement.textContent = `Last updated ${formatLastUpdated(new Date())}`;
    setState("");
  } catch (error) {
    console.error(error);
    historyRecords = [];
    updateStats([]);
    lastUpdatedElement.textContent = "Unavailable";
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="history-empty">Failed to load portfolio history.</td>
      </tr>
    `;
    setState("Failed to load portfolio history.", "error");
  } finally {
    refreshButton.disabled = false;
  }
}

function applyFilters() {
  const visibleRecords = getVisibleRecords();
  updateStats(visibleRecords);
  renderRows(visibleRecords);
}

refreshButton.addEventListener("click", loadHistory);
searchInput.addEventListener("input", applyFilters);
typeFilter.addEventListener("change", applyFilters);
tradeFilter.addEventListener("change", applyFilters);
document.addEventListener("DOMContentLoaded", loadHistory);
