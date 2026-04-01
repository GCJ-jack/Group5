const API = "http://localhost:8080";

const tableBody = document.getElementById("table-body");
const totalElement = document.getElementById("total");
const assetForm = document.getElementById("asset-form");
const tickerInput = document.getElementById("ticker");
const quantityInput = document.getElementById("quantity");

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
    await loadTotal();
  } catch (error) {
    console.error(error);
    alert("Failed to load portfolio data.");
  }
}

async function addAsset() {
  const ticker = tickerInput.value.trim().toUpperCase();
  const quantity = Number(quantityInput.value);

  if (!ticker) {
    alert("Please enter a ticker.");
    return;
  }

  if (!isPositiveInteger(quantity)) {
    alert("Quantity must be a positive integer.");
    return;
  }

  try {
    const response = await fetch(`${API}/portfolio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker, quantity }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Add asset failed");
    }

    tickerInput.value = "";
    quantityInput.value = "";
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
