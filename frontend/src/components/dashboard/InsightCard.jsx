import { suggestions } from "../../data/dashboardData";

export function InsightCard() {
  return (
    <aside className="insight-card">
      <div className="insight-card__orb" />

      <div className="insight-card__content">
        <div>
          <h3>Investment Insight</h3>
          <p className="insight-card__description">
            Your portfolio is currently 15% overweight in Technology. Consider
            diversifying into defensive sectors like Utilities to reduce volatility.
          </p>

          <div className="insight-card__checks">
            {suggestions.map((suggestion) => (
              <div className="insight-check" key={suggestion}>
                <span className="material-symbols-outlined">check_circle</span>
                <p>{suggestion}</p>
              </div>
            ))}
          </div>
        </div>

        <button className="insight-card__button">Apply Optimization</button>
      </div>
    </aside>
  );
}
