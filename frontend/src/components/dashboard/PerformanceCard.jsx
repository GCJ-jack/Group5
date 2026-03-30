import { performanceFilters } from "../../data/dashboardData";

export function PerformanceCard() {
  return (
    <article className="card card--performance">
      <div className="card__header">
        <h3>Portfolio Performance</h3>

        <div className="segmented-control">
          {performanceFilters.map((filter, index) => (
            <button
              key={filter}
              className={`segmented-control__item ${index === 0 ? "is-active" : ""}`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-shell">
        <div className="chart-shell__glow" />

        <svg viewBox="0 0 800 200" preserveAspectRatio="none" className="chart-shell__svg">
          <defs>
            <linearGradient id="performanceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(17, 24, 39, 0.25)" />
              <stop offset="100%" stopColor="rgba(17, 24, 39, 0)" />
            </linearGradient>
          </defs>

          <path
            d="M0,180 C100,160 150,190 250,140 C350,90 450,120 550,60 C650,0 750,40 800,20"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M0,180 C100,160 150,190 250,140 C350,90 450,120 550,60 C650,0 750,40 800,20 L800,200 L0,200 Z"
            fill="url(#performanceGradient)"
          />
        </svg>
      </div>
    </article>
  );
}
