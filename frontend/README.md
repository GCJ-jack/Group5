# Financial Atelier Dashboard

Componentized React + Vite implementation of the portfolio dashboard.

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Structure

```text
frontend/
├── index.html
├── package.json
├── vite.config.js
├── README.md
└── src
    ├── App.jsx
    ├── main.jsx
    ├── components
    │   ├── dashboard
    │   └── layout
    ├── data
    └── styles
```

## Notes

- `layout/` contains the global frame: top navigation and sidebar.
- `dashboard/` contains the page sections and cards.
- `data/` centralizes static content so the UI stays easy to replace with API data later.
- `styles/index.css` holds the local design tokens and responsive layout rules.
