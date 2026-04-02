const API = "http://localhost:8080";

const tableBody = document.getElementById("history-table-body");
const stateElement = document.getElementById("history-state");
const totalCountElement = document.getElementById("history-total-count");
const quantityCountElement = document.getElementById("history-quantity-count");
const lastUpdatedElement = document.getElementById("history-last-updated");
const refreshButton = document.getElementById("history-refresh-button");

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
  const quantityTotal = records.reduce((sum, record) => sum + Number(record.quantity || 0), 0);

  totalCountElement.textContent = String(records.length);
  quantityCountElement.textContent = formatNumber(quantityTotal);
}

function renderEmptyState() {
  tableBody.innerHTML = `
    <tr>
      <td colspan="5" class="history-empty">No portfolio history records yet.</td>
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
          <td><span class="history-type-pill">${escapeHtml(record.type || "Unknown")}</span></td>
          <td class="history-table__mono">${escapeHtml(formatNumber(record.quantity))}</td>
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
      <td colspan="5" class="history-empty">Loading history...</td>
    </tr>
  `;

  try {
    const response = await fetch(`${API}/portfolio/history`);
    if (!response.ok) {
      throw new Error("Failed to load portfolio history");
    }

    const records = await response.json();
    updateStats(records);
    renderRows(records);
    lastUpdatedElement.textContent = `Last updated ${formatLastUpdated(new Date())}`;
    setState("");
  } catch (error) {
    console.error(error);
    updateStats([]);
    lastUpdatedElement.textContent = "Unavailable";
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="history-empty">Failed to load portfolio history.</td>
      </tr>
    `;
    setState("Failed to load portfolio history.", "error");
  } finally {
    refreshButton.disabled = false;
  }
}

refreshButton.addEventListener("click", loadHistory);
document.addEventListener("DOMContentLoaded", loadHistory);
