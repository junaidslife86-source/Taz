# Taz

**Taz** is a privacy-first, offline-first personal finance web app that runs entirely in your browser. Track spending, import bank statements, manage assets and liabilities, and watch your net worth — without accounts, cloud sync, or third-party services.

Your financial data stays on your device. Always.

Taz is a serverless personal finance app — it runs entirely in your browser with no Taz backend. Deploy it as static files; your data stays on your device unless you optionally enable AI Assist with your own Gemini API key.

---

## Privacy-first by design

- No accounts or login
- No backend servers
- No cloud storage
- No accounts, auth providers, or cloud sync
- Fully local categorisation with keyword rules by default
- **Optional AI Assist** — your own Google Gemini API key; off by default
- Works offline after the first load (PWA)

**You are responsible for backing up your data.** Use **Settings → Export backup** to download a JSON file you can restore anytime.

---

## Features

- **Onboarding** — Quick intro and privacy overview
- **Dashboard** — Net worth, monthly income/expenses, spending charts
- **Statement import** — CSV, XLSX, and PDF with column mapping, reconciliation, and learned statement profiles
- **Local categorisation** — Default rules, custom rules, remembered choices, recurring patterns
- **AI Assist (optional)** — Bring your own Gemini API key for suggestions when rules do not match
- **Transactions** — Search, filter, categorise, and manual entry
- **Assets & liabilities** — Track balances and net worth snapshots
- **Settings** — Categories (with emojis), backups, statement profiles

---

## Tech stack

| Layer | Technology |
|-------|------------|
| UI | React 19 + TypeScript |
| Build | Vite |
| Routing | React Router |
| Local database | IndexedDB (Dexie) |
| State | Zustand |
| File parsing | PapaParse, SheetJS, pdfjs-dist (all in-browser) |
| Charts | Recharts |
| Validation | Zod |
| Offline | vite-plugin-pwa |

---

## Install & develop

```bash
git clone <repo-url>
cd Taz
npm install --legacy-peer-deps
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

---

## Production build

```bash
npm run build
npm run preview   # optional: test the production build locally
```

Deploy the contents of **`dist/`** to any static host (nginx, S3, GitHub Pages, etc.). No server runtime or environment variables are required.

---

## How to use

1. Complete onboarding
2. Import statements (**Import**) or add transactions manually
3. Add assets and liabilities
4. Review the dashboard and net worth pages
5. Export backups regularly from **Settings**

### Import statements

1. **Import Statements** → upload CSV, XLSX, or PDF
2. Map columns (CSV/XLSX) or review extracted rows (PDF)
3. Confirm import — transactions are categorised locally

Sample files: `sample-data/sample-statement.csv`, `sample-data/sample-statement.xlsx`

> PDF import is best-effort. Always review before saving.

### Categorisation priority

1. User-defined rules
2. Remembered choices
3. Recurring patterns
4. Default keyword rules
5. Fallback: Income or Other
6. Optional Gemini AI (Settings → AI Assist, when enabled)

### AI Assist (optional)

1. Open **Settings → AI Assist**
2. Create a key at [Google AI Studio](https://aistudio.google.com/apikey)
3. Paste the key, click **Save API key**, then enable the toggle

When enabled, only transactions that local rules cannot categorise may send description, amount, and date to Google Gemini. Import preview stays local-only for speed. Disable anytime — the app works fully without AI Assist.

---

## Project structure

```
Taz/
  public/           Static assets and PWA icons
  sample-data/      Sample import files
  src/
    app/            Routing
    components/     Shared UI
    features/       Pages
    lib/            DB, parsers, calculations
    types/          TypeScript types
    styles/         Global CSS
  dist/             Production build output (after npm run build)
```

---

## Security

- Backups **exclude** Gemini API keys by default (opt-in to include).
- Backup restore uses strict schema validation; API keys are never restored from backups.
- Import limits: 10 MB files, 50 PDF pages, 20k rows.
- See [SECURITY.md](SECURITY.md) for responsible disclosure.

Run `npm test` and `npm audit` before deploying.

## Limitations

Taz is a personal finance tracking tool, not financial advice. PDF import quality varies by bank. Stock/ETF values are manual. Data lives in your browser profile unless you export a backup.

---

## License

AGPL-3.0 — see [LICENSE](LICENSE) in this repository.
