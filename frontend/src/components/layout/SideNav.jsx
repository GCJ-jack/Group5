import { navItems } from "../../data/dashboardData";

export function SideNav() {
  return (
    <aside className="side-nav">
      <div className="side-nav__brand-card">
        <div className="side-nav__brand-icon">
          <span className="material-symbols-outlined">architecture</span>
        </div>
        <div>
          <h2>The Atelier</h2>
          <p>Wealth Management</p>
        </div>
      </div>

      <nav className="side-nav__menu" aria-label="Primary">
        {navItems.map((item) => (
          <a
            href="#"
            key={item.label}
            className={`side-nav__link ${item.active ? "side-nav__link--active" : ""}`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span>{item.label}</span>
          </a>
        ))}
      </nav>

      <button className="primary-cta">
        <span className="material-symbols-outlined">add</span>
        <span>New Investment</span>
      </button>
    </aside>
  );
}
