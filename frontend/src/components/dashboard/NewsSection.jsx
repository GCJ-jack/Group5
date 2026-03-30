import { marketNews } from "../../data/dashboardData";

export function NewsSection() {
  return (
    <section className="news-panel">
      <div className="section-heading">
        <div>
          <h2>Market News</h2>
          <p>Analysis tailored to your portfolio risk profile.</p>
        </div>

        <button className="inline-link">
          <span>Explore Feed</span>
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>

      <div className="news-list">
        {marketNews.map((item) => (
          <article className="news-card" key={item.title}>
            <div className="news-card__meta">
              <span className={`news-card__tag news-card__tag--${item.tone}`}>{item.category}</span>
              <time>{item.published}</time>
            </div>

            <h3>{item.title}</h3>
            <p>{item.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
