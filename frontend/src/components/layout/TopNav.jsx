export function TopNav() {
  return (
    <header className="top-nav">
      <div className="top-nav__brand-group">
        <span className="top-nav__brand">Financial Atelier</span>

        <label className="search-field" aria-label="Search markets, assets, or news">
          <span className="material-symbols-outlined search-field__icon">search</span>
          <input
            type="text"
            placeholder="Search markets, assets, or news..."
            className="search-field__input"
          />
        </label>
      </div>

      <div className="top-nav__actions">
        <button className="icon-button icon-button--notification" aria-label="Notifications">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="icon-button" aria-label="Wallet">
          <span className="material-symbols-outlined">account_balance_wallet</span>
        </button>

        <div className="profile-avatar">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBsf8hdnDwPXCTQhU11zxDD04Mr9j8iOm2WOeiOjETjlZ0qv0ou2gsxra3Bxck5UeotfA7J4RbtcxC0KNwCXupsECv39-E-FQjOvc9ZOgCD9u9FpGgpj8gTWkVNL827zBUC5BHOmuo4A7B3MwOfrjkBtCtV96TeP10z4gHMWqK6_R666WtJcPjFf6zNVEmM9JRFugb3zmIw3eoAP7h7kXBB6d4MWbhx53IZa68ry2jGXPBGbdWJCvd1bjbAm3qW1fc0oxMwwx2Vj04"
            alt="User profile"
          />
        </div>
      </div>
    </header>
  );
}
