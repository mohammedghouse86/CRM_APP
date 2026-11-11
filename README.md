# Sample CRM (dummy app)

> **Disclaimer:** This is a dummy sample app for testing. It is not a real product and it contains intentional security weaknesses. Use it only with dummy data.

## What it is

- Multi-tenant CRM: 3 tenants, 3 fixed roles (`admin`, `manager`, `agent`). Role creation is not available.
- 151 API endpoints, all listed in the UI under **API Explorer** (each has a *Try* button).
- Data is stored in a JSON file (`backend/data/db.json`). No paid database.
- Weaknesses for each category are listed in [VULNERABILITIES.md](VULNERABILITIES.md).

## Demo accounts

Password for every account: `Demo@123`

| Tenant | Admin | Manager | Agent |
|---|---|---|---|
| Northwind Logistics (t1) | ava.admin@northwind.example | marco.manager@northwind.example | ana.agent@northwind.example |
| Contoso Health (t2) | priya.admin@contoso.example | lukas.manager@contoso.example | mia.agent@contoso.example |
| Fabrikam Retail (t3) | sam.admin@fabrikam.example | noor.manager@fabrikam.example | eli.agent@fabrikam.example |

## Run locally

```bash
cd backend
npm install
npm start            # http://localhost:3000
```

Open `frontend/index.html` in a browser (or serve the `frontend` folder with any static server). `frontend/config.js` points to `http://localhost:3000` by default.

## Deploy

**Backend on Render (free web service):**
1. Push this folder to a GitHub repository.
2. In Render, choose *New > Blueprint* and select the repo (uses `render.yaml`), or create a Web Service with root directory `backend`, build command `npm install`, start command `node src/server.js`.
3. Note the service URL, for example `https://your-crm-api.onrender.com`.

**Frontend on GitHub Pages:**
1. In the repo settings, set *Pages > Source* to *GitHub Actions*.
2. Set `apiBase` in `frontend/config.js` to the Render URL, commit, and push. The workflow in `.github/workflows/pages.yml` publishes the `frontend` folder.

## Data persistence

Data is saved to `backend/data/db.json` after every change. On Render's free plan the disk is temporary, so data is reset when the service restarts or redeploys. Sample data is generated again on the next start.

## Tools

- `node scripts/gen-vuln-doc.js`: rebuilds `VULNERABILITIES.md` and reports any category with no endpoint.
- `node scripts/smoke-test.js http://localhost:3000`: calls every endpoint with its sample data. Use a fresh server, because some samples delete or disable records.
