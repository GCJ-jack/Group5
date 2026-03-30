import { HeroSection } from "./components/dashboard/HeroSection";
import { HoldingsCard } from "./components/dashboard/HoldingsCard";
import { InsightCard } from "./components/dashboard/InsightCard";
import { NewsSection } from "./components/dashboard/NewsSection";
import { PerformanceCard } from "./components/dashboard/PerformanceCard";
import { SideNav } from "./components/layout/SideNav";
import { TopNav } from "./components/layout/TopNav";

function App() {
  return (
    <div className="app-shell">
      <TopNav />
      <SideNav />

      <main className="main-content">
        <div className="page-wrap">
          <HeroSection />

          <section className="dashboard-grid">
            <PerformanceCard />
            <HoldingsCard />
          </section>

          <section className="news-grid">
            <NewsSection />
            <InsightCard />
          </section>
        </div>
      </main>

      <button className="floating-action-button" aria-label="Add investment">
        <span className="material-symbols-outlined">add</span>
      </button>
    </div>
  );
}

export default App;
