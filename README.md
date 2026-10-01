# Smart Energy Optimizer (flux)

> A full-stack energy dashboard that schedules a home battery against 24-hour demand, solar, and grid prices to minimize the daily electricity bill.

[![CI](https://github.com/AkashNaickar/flux/actions/workflows/ci.yml/badge.svg)](https://github.com/AkashNaickar/flux/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Live demo](https://img.shields.io/badge/demo-live-success)](https://flux-energy-ui.vercel.app)

**[Live demo →](https://flux-energy-ui.vercel.app)**

![Smart Energy Optimizer dashboard showing 24-hour forecast inputs and optimization results](docs/preview.png)

## Features

- Interactive 24-hour input grid for household demand, solar generation, and grid price.
- Battery capacity (M) and max charge/discharge rate (Z) as tunable hardware constraints.
- Dynamic-programming optimizer on the backend that computes the lowest possible 24-hour bill and an hourly action plan (buy, sell, charge, discharge).
- Recharts visualizations: demand/solar/price profile, energy actions with state-of-charge (SOC) tracking, and a detailed action table.
- "Load Sample" button to populate a realistic 24-hour scenario in one click.

## Tech stack

| Layer | Tech |
|-------|------|
| Backend | Python, FastAPI, Pydantic, Uvicorn |
| Frontend | React 19, Vite, Tailwind CSS v4, Recharts, Lucide |
| Tests | pytest + FastAPI TestClient |
| CI | GitHub Actions (pytest, ESLint, Vite build, gitleaks) |
| Hosting | Render (API), Vercel (UI) |

## Architecture

```mermaid
flowchart LR
  U[User] --> UI[React dashboard<br/>Vercel]
  UI -->|POST /api/optimize| API[FastAPI optimizer<br/>Render]
  API --> DP[Dynamic programming<br/>24h battery scheduler]
  DP --> API
  API -->|schedule + total cost| UI
```

The optimizer (`main.py`) runs a backward dynamic program over 24 hourly states
(battery level 0..M). For each hour it evaluates every charge/discharge rate in
`[-Z, Z]`, computes the net grid exchange `D - X + Δ`, prices it at the hourly
rate, and picks the path with the minimum total cost. The recovered policy is
returned as an hourly action plan.

## Quick start

> These commands were executed from a clean clone.

```bash
git clone https://github.com/AkashNaickar/flux.git
cd flux

# backend
python -m venv .venv
.venv\Scripts\activate            # Windows (source .venv/bin/activate on macOS/Linux)
pip install -r requirements.txt
uvicorn main:app --reload         # http://127.0.0.1:8000

# frontend (second terminal)
cd energy-ui
npm install
npm run dev                       # http://localhost:5173
```

Open the dashboard, click **Load Sample**, then **Run Optimization**.

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | no | Backend base URL for the frontend (default `http://localhost:8000`) |
| `ALLOWED_ORIGINS` | no | Comma-separated extra CORS origins allowed by the API (the deployed frontend is preconfigured on Render) |

## Testing

```bash
pip install -r requirements-dev.txt
pytest -q
```

7 tests cover the optimizer's core logic (battery constraints, bookkeeping,
no-battery baseline, surplus selling) and the `/api/optimize` endpoint.

## Deployment

- **API**: Render web service `flux-energy-api` — Python runtime, `pip install -r requirements.txt`, `uvicorn main:app --host 0.0.0.0 --port $PORT`. https://flux-energy-api.onrender.com
- **UI**: Vercel project `flux-energy-ui` — Vite build from `energy-ui/` with `VITE_API_URL` set. https://flux-energy-ui.vercel.app

## Roadmap

- [ ] Battery efficiency losses and degradation cost in the model
- [ ] Export/import of forecast scenarios (CSV/JSON)
- [ ] Tariff presets (TOU, flat, dynamic)

## Contributing

Issues and PRs welcome.

## License

MIT — see [LICENSE](LICENSE).
