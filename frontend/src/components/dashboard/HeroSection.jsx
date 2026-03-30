export function HeroSection() {
  return (
    <section className="hero-section">
      <div>
        <p className="eyebrow">Portfolio Overview</p>
        <h1 className="hero-section__value">$1,482,904.52</h1>

        <div className="hero-section__meta">
          <div className="pill pill--success">
            <span className="material-symbols-outlined">trending_up</span>
            <span>+4.25% ($62.4k) Today</span>
          </div>
          <span className="hero-section__subtle">Monthly: +12.8%</span>
        </div>
      </div>

      <div className="hero-section__actions">
        <button className="button button--primary">
          <span className="material-symbols-outlined">swap_vert</span>
          <span>Buy/Sell</span>
        </button>
        <button className="button button--secondary">
          <span className="material-symbols-outlined">account_balance</span>
          <span>Deposit</span>
        </button>
        <button className="button button--surface">
          <span className="material-symbols-outlined">payments</span>
          <span>Withdraw</span>
        </button>
      </div>
    </section>
  );
}
