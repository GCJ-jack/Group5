const { performanceFilters } = window.dashboardData;

const API = "http://localhost:8080";

const totalValueElement = document.getElementById("dashboard-total-value");
const pnlPillElement = document.getElementById("dashboard-pnl-pill");
const pnlIconElement = document.getElementById("dashboard-pnl-icon");
const pnlTextElement = document.getElementById("dashboard-pnl-text");
const costBasisElement = document.getElementById("dashboard-cost-basis");
const performanceFiltersRoot = document.getElementById("performance-filters");
const performanceChartRoot = document.getElementById("performance-chart");
const dashboardSearchInput = document.getElementById("dashboard-search-input");
const dashboardSearchDropdown = document.getElementById("dashboard-search-dropdown");

let performanceChart = null;
let activePerformanceFilter = performanceFilters[0];
let dashboardSearchTimeoutId = null;
let performanceRequestInFlight = false;

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

function renderPerformanceFilters() {
  performanceFiltersRoot.innerHTML = performanceFilters
    .map(
      (filter, index) => `
        <button
          class="segmented-control__item ${index === 0 ? "is-active" : ""}"
          type="button"
          data-filter="${filter}"
        >
          ${filter}
        </button>
      `,
    )
    .join("");
}

function formatCompactCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function formatSignedCurrency(value) {
  const amount = Number(value ?? 0);
  return `${amount >= 0 ? "+" : "-"}${formatCurrency(Math.abs(amount))}`;
}

function formatSignedPercent(value) {
  const amount = Number(value ?? 0);
  return `${amount >= 0 ? "+" : "-"}${Math.abs(amount).toFixed(2)}%`;
}

function setPortfolioOverviewState({ totalValue = 0, costBasis = 0, profitLoss = 0, profitLossPercent = 0, isEmpty = false }) {
  totalValueElement.textContent = formatCurrency(totalValue);
  costBasisElement.textContent = `Cost basis: ${formatCurrency(costBasis)}`;

  if (isEmpty) {
    pnlPillElement.classList.add("pill--success");
    pnlPillElement.classList.remove("pill--danger");
    pnlIconElement.textContent = "inventory_2";
    pnlTextElement.textContent = "No holdings yet";
    costBasisElement.textContent = "Add assets in Portfolio to see live totals";
    return;
  }

  const isPositive = profitLoss >= 0;
  pnlPillElement.classList.toggle("pill--success", isPositive);
  pnlPillElement.classList.toggle("pill--danger", !isPositive);
  pnlIconElement.textContent = isPositive ? "trending_up" : "trending_down";
  pnlTextElement.textContent = `${formatSignedPercent(profitLossPercent)} (${formatSignedCurrency(profitLoss)}) Unrealized`;
}

async function loadPortfolioOverview() {
  try {
    const response = await fetch(`${API}/portfolio`);
    if (!response.ok) {
      throw new Error("Failed to load portfolio overview");
    }

    const items = await response.json();
    if (!items.length) {
      setPortfolioOverviewState({ isEmpty: true });
      return;
    }

    const totals = items.reduce(
      (accumulator, item) => {
        const quantity = Number(item.quantity || 0);
        const price = Number(item.price || 0);
        const buyPrice = Number(item.buyPrice || 0);

        accumulator.totalValue += Number(item.totalValue || quantity * price);
        accumulator.costBasis += quantity * buyPrice;
        return accumulator;
      },
      { totalValue: 0, costBasis: 0 },
    );

    const profitLoss = totals.totalValue - totals.costBasis;
    const profitLossPercent = totals.costBasis > 0 ? (profitLoss / totals.costBasis) * 100 : 0;

    setPortfolioOverviewState({
      totalValue: totals.totalValue,
      costBasis: totals.costBasis,
      profitLoss,
      profitLossPercent,
    });
  } catch (error) {
    console.error(error);
    totalValueElement.textContent = "$0.00";
    pnlPillElement.classList.remove("pill--danger");
    pnlPillElement.classList.add("pill--success");
    pnlIconElement.textContent = "error";
    pnlTextElement.textContent = "Failed to load portfolio overview";
    costBasisElement.textContent = "Cost basis unavailable";
  }
}

function createPerformanceChart() {
  if (!performanceChartRoot || typeof ApexCharts === "undefined") {
    return;
  }

  performanceChart = new ApexCharts(performanceChartRoot, {
    chart: {
      type: "area",
      height: "100%",
      toolbar: { show: false },
      zoom: { enabled: false },
      sparkline: { enabled: false },
      fontFamily: "Inter, sans-serif",
    },
    series: [{ name: "Portfolio Value", data: [] }],
    noData: {
      text: "Loading portfolio performance...",
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
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: {
          colors: "#667085",
          fontSize: "12px",
          fontWeight: 600,
        },
      },
    },
    yaxis: {
      labels: {
        formatter: formatCompactCurrency,
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
      padding: {
        left: 12,
        right: 12,
        top: 8,
        bottom: 0,
      },
    },
    dataLabels: { enabled: false },
    stroke: {
      curve: "smooth",
      width: 4,
      colors: ["#101828"],
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.28,
        opacityTo: 0.02,
        stops: [0, 90, 100],
        colorStops: [
          [
            { offset: 0, color: "#101828", opacity: 0.3 },
            { offset: 100, color: "#101828", opacity: 0.02 },
          ],
        ],
      },
    },
    tooltip: {
      theme: "light",
      y: {
        formatter: (value) => new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 2,
        }).format(value),
      },
    },
    markers: {
      size: 0,
      hover: {
        size: 6,
      },
    },
    legend: { show: false },
  });

  performanceChart.render();
}

function getPerformanceQuery(filter) {
  switch (filter) {
    case "3M":
      return { range: "3mo", interval: "DAILY" };
    case "6M":
      return { range: "6mo", interval: "DAILY" };
    case "1Y":
      return { range: "1y", interval: "WEEKLY" };
    case "MAX":
      return { range: "max", interval: "MONTHLY" };
    case "1M":
    default:
      return { range: "1mo", interval: "DAILY" };
  }
}

async function updatePerformanceChart(filter) {
  activePerformanceFilter = filter;

  performanceFiltersRoot.querySelectorAll("[data-filter]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === filter);
  });

  if (!performanceChart) {
    return;
  }

  if (performanceRequestInFlight) {
    return;
  }

  performanceRequestInFlight = true;

  try {
    const { range, interval } = getPerformanceQuery(filter);
    const response = await fetch(
      `${API}/portfolio/performance?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}`,
    );

    if (!response.ok) {
      const errorText = await response.text();
      const detail = errorText ? `: ${errorText}` : "";
      throw new Error(`Failed to load performance data${detail}`);
    }

    const payload = await response.json();
    const seriesData = (payload.points || []).map((point) => ({
      x: new Date(point.timestamp),
      y: Number(point.portfolioValue || 0),
    }));

    performanceChart.updateOptions({
      noData: {
        text: "No portfolio performance data available.",
      },
    });
    performanceChart.updateSeries([
      {
        name: "Portfolio Value",
        data: seriesData,
      },
    ]);
  } catch (error) {
    console.error(error);
    performanceChart.updateSeries([{ name: "Portfolio Value", data: [] }]);
    performanceChart.updateOptions({
      noData: {
        text: "Failed to load portfolio performance.",
      },
    });
  } finally {
    performanceRequestInFlight = false;
  }
}

function hideDashboardSearchDropdown() {
  dashboardSearchDropdown.hidden = true;
  dashboardSearchDropdown.innerHTML = "";
}

function renderDashboardSearchState(message) {
  dashboardSearchDropdown.innerHTML = `
    <div class="search-dropdown__state">${escapeHtml(message)}</div>
  `;
  dashboardSearchDropdown.hidden = false;
}

function renderDashboardSearchResults(results) {
  if (!results.length) {
    renderDashboardSearchState("No matching companies or symbols found.");
    return;
  }

  dashboardSearchDropdown.innerHTML = results
    .slice(0, 8)
    .map(
      (result) => `
        <button
          class="search-dropdown__item"
          type="button"
          data-symbol="${escapeHtml(result.symbol)}"
          data-description="${escapeHtml(result.description)}"
        >
          <span class="search-dropdown__symbol">${escapeHtml(result.symbol)}</span>
          <span class="search-dropdown__description">${escapeHtml(result.description)}</span>
        </button>
      `,
    )
    .join("");

  dashboardSearchDropdown.hidden = false;
}

async function searchDashboardSymbols(keyword) {
  try {
    const response = await fetch(`http://localhost:8080/search?keyword=${encodeURIComponent(keyword)}`);
    if (!response.ok) {
      throw new Error("Failed to search dashboard symbols");
    }

    const results = await response.json();
    renderDashboardSearchResults(results);
  } catch (error) {
    console.error(error);
    renderDashboardSearchState("Search is temporarily unavailable.");
  }
}

function scheduleDashboardSearch(keyword) {
  clearTimeout(dashboardSearchTimeoutId);

  if (keyword.length < 1) {
    hideDashboardSearchDropdown();
    return;
  }

  renderDashboardSearchState("Searching companies and symbols...");
  dashboardSearchTimeoutId = window.setTimeout(() => {
    searchDashboardSymbols(keyword);
  }, 220);
}

renderPerformanceFilters();
createPerformanceChart();
loadPortfolioOverview();
updatePerformanceChart(activePerformanceFilter);

performanceFiltersRoot.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) {
    return;
  }

  await updatePerformanceChart(button.dataset.filter);
});

dashboardSearchInput.addEventListener("input", (event) => {
  scheduleDashboardSearch(event.target.value.trim());
});

dashboardSearchInput.addEventListener("focus", () => {
  if (dashboardSearchInput.value.trim().length >= 1 && dashboardSearchDropdown.innerHTML) {
    dashboardSearchDropdown.hidden = false;
  }
});

dashboardSearchDropdown.addEventListener("click", (event) => {
  const option = event.target.closest("[data-symbol]");
  if (!option) {
    return;
  }

  const symbol = option.dataset.symbol;
  window.location.href = `./stock-detail.html?symbol=${encodeURIComponent(symbol)}`;
  hideDashboardSearchDropdown();
});

dashboardSearchInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") {
    return;
  }

  event.preventDefault();

  const firstOption = dashboardSearchDropdown.querySelector("[data-symbol]");
  const directSymbol = dashboardSearchInput.value.trim().split(/\s+/)[0].toUpperCase();

  if (firstOption?.dataset.symbol) {
    window.location.href = `./stock-detail.html?symbol=${encodeURIComponent(firstOption.dataset.symbol)}`;
    return;
  }

  if (directSymbol) {
    window.location.href = `./stock-detail.html?symbol=${encodeURIComponent(directSymbol)}`;
  }
});

document.addEventListener("click", (event) => {
  if (event.target.closest(".dashboard-search")) {
    return;
  }

  hideDashboardSearchDropdown();
});
