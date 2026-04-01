const { performanceFilters } = window.dashboardData;

const performanceFiltersRoot = document.getElementById("performance-filters");
const performanceChartRoot = document.getElementById("performance-chart");
const dashboardSearchInput = document.getElementById("dashboard-search-input");
const dashboardSearchDropdown = document.getElementById("dashboard-search-dropdown");

const performanceSeriesByFilter = {
  "1D": {
    categories: ["09:30", "10:30", "11:30", "12:30", "13:30", "14:30", "15:30", "16:00"],
    values: [1421000, 1428600, 1425400, 1431800, 1439200, 1434600, 1442800, 1449100],
  },
  "1W": {
    categories: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    values: [1382400, 1398800, 1415200, 1431100, 1449100],
  },
  "1M": {
    categories: ["Week 1", "Week 2", "Week 3", "Week 4"],
    values: [1315000, 1352400, 1403600, 1449100],
  },
  YTD: {
    categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    values: [1180000, 1234000, 1298000, 1365000, 1419000, 1449100],
  },
};

let performanceChart = null;
let activePerformanceFilter = performanceFilters[0];
let dashboardSearchTimeoutId = null;

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

function createPerformanceChart() {
  if (!performanceChartRoot || typeof ApexCharts === "undefined") {
    return;
  }

  const initialSeries = performanceSeriesByFilter[activePerformanceFilter];

  performanceChart = new ApexCharts(performanceChartRoot, {
    chart: {
      type: "area",
      height: "100%",
      toolbar: { show: false },
      zoom: { enabled: false },
      sparkline: { enabled: false },
      fontFamily: "Inter, sans-serif",
    },
    series: [
      {
        name: "Portfolio Value",
        data: initialSeries.values,
      },
    ],
    xaxis: {
      categories: initialSeries.categories,
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

function updatePerformanceChart(filter) {
  activePerformanceFilter = filter;

  performanceFiltersRoot.querySelectorAll("[data-filter]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === filter);
  });

  if (!performanceChart) {
    return;
  }

  const nextSeries = performanceSeriesByFilter[filter];
  performanceChart.updateOptions({
    xaxis: {
      categories: nextSeries.categories,
    },
  });
  performanceChart.updateSeries([
    {
      name: "Portfolio Value",
      data: nextSeries.values,
    },
  ]);
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

performanceFiltersRoot.addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) {
    return;
  }

  updatePerformanceChart(button.dataset.filter);
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
