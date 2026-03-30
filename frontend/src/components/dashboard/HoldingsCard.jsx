import { holdings } from "../../data/dashboardData";

export function HoldingsCard() {
  return (
    <article className="card card--holdings">
      <div className="card__header">
        <h3>Top Holdings</h3>
      </div>

      <div className="holdings-list">
        {holdings.map((holding) => (
          <div className="holding-row" key={holding.symbol}>
            <div className="holding-row__identity">
              <div className="holding-row__symbol">{holding.symbol}</div>
              <div>
                <p>{holding.name}</p>
                <span>{holding.shares}</span>
              </div>
            </div>

            <div className="holding-row__metrics">
              <p>{holding.value}</p>
              <span className={holding.positive ? "is-positive" : "is-negative"}>
                {holding.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <button className="text-button">View All Assets</button>
    </article>
  );
}
