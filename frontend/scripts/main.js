const { performanceFilters, holdings, marketNews, suggestions } = window.dashboardData;

const performanceFiltersRoot = document.getElementById("performance-filters");
const holdingsRoot = document.getElementById("holdings-list");
const newsRoot = document.getElementById("news-list");
const suggestionRoot = document.getElementById("suggestion-list");

function renderPerformanceFilters() {
  performanceFiltersRoot.innerHTML = performanceFilters
    .map(
      (filter, index) => `
        <button class="segmented-control__item ${index === 0 ? "is-active" : ""}">
          ${filter}
        </button>
      `,
    )
    .join("");
}

function renderHoldings() {
  holdingsRoot.innerHTML = holdings
    .map(
      (holding) => `
        <div class="holding-row">
          <div class="holding-row__identity">
            <div class="holding-row__symbol">${holding.symbol}</div>
            <div>
              <p>${holding.name}</p>
              <span>${holding.shares}</span>
            </div>
          </div>

          <div class="holding-row__metrics">
            <p>${holding.value}</p>
            <span class="${holding.positive ? "is-positive" : "is-negative"}">
              ${holding.change}
            </span>
          </div>
        </div>
      `,
    )
    .join("");
}

function renderNews() {
  newsRoot.innerHTML = marketNews
    .map(
      (item) => `
        <article class="news-card">
          <div class="news-card__meta">
            <span class="news-card__tag news-card__tag--${item.tone}">${item.category}</span>
            <time>${item.published}</time>
          </div>

          <h3>${item.title}</h3>
          <p>${item.summary}</p>
        </article>
      `,
    )
    .join("");
}

function renderSuggestions() {
  suggestionRoot.innerHTML = suggestions
    .map(
      (suggestion) => `
        <div class="insight-check">
          <span class="material-symbols-outlined">check_circle</span>
          <p>${suggestion}</p>
        </div>
      `,
    )
    .join("");
}

renderPerformanceFilters();
renderHoldings();
renderNews();
renderSuggestions();
