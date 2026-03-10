# TempMail API — Vercel Serverless

Scrapes [emailnator.com](https://www.emailnator.com) (a dynamic React app) using **Puppeteer** + **@sparticuz/chromium** — a compressed Chromium binary built specifically for serverless environments (Vercel, AWS Lambda, etc).

## Why @sparticuz/chromium?

Vercel serverless functions have a **50MB compressed size limit** and **no system dependencies**. Standard Playwright/Chromium binaries are 300MB+. `@sparticuz/chromium` solves this by:
- Shipping a Brotli-compressed Chromium (~40MB compressed)
- Auto-decompressing to `/tmp` at runtime
- Working within Vercel's execution constraints

---

## Project Structure

```
tempmail-api/
├── api/
│   ├── _browser.js     # Shared Puppeteer/Chromium setup
│   ├── _scraper.js     # All scraping logic (generate, inbox, message)
│   ├── index.js        # GET /api  → API info
│   ├── generate.js     # GET /api/generate
│   ├── inbox.js        # GET /api/inbox
│   └── message.js      # GET /api/message
├── vercel.json         # Function memory/timeout config
├── package.json
└── .gitignore
```

---

## API Endpoints

### `GET /api/generate`

Generate a new temporary email address.

**Query params** (all optional, default `true`):

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `domain` | boolean | true | Include custom domain emails |
| `plusGmail` | boolean | true | Include +Gmail variant |
| `dotGmail` | boolean | true | Include .Gmail variant |
| `googleMail` | boolean | true | Include GoogleMail variant |

**Example:**
```
GET /api/generate?plusGmail=false
```
```json
{
  "email": "va.ne.ss.ap@gmail.com",
  "options": { "domain": true, "plusGmail": false, "dotGmail": true, "googleMail": true }
}
```

---

### `GET /api/inbox?email=<email>`

List all inbox messages for an email address.

**Example:**
```
GET /api/inbox?email=va.ne.ss.ap@gmail.com
```
```json
{
  "email": "va.ne.ss.ap@gmail.com",
  "messages": [
    { "id": "0", "from": "noreply@github.com", "subject": "Verify your email", "time": "2m ago" }
  ],
  "count": 1
}
```

---

### `GET /api/message?email=<email>&id=<id>`

Read a specific message. Use the `id` from `/api/inbox`.

**Example:**
```
GET /api/message?email=va.ne.ss.ap@gmail.com&id=0
```
```json
{
  "email": "va.ne.ss.ap@gmail.com",
  "messageId": "0",
  "text": "Please verify your email address by clicking the link below...",
  "html": "<div>...</div>"
}
```

---

## Deploy to Vercel

### Option A — Deploy via GitHub (Recommended)

1. **Push this project to a GitHub repo**
   ```bash
   git init
   git add .
   git commit -m "initial commit"
   git remote add origin https://github.com/YOUR_USER/tempmail-api.git
   git push -u origin main
   ```

2. **Import on Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click **"Import Git Repository"**
   - Select your repo
   - Framework: **Other**
   - Click **Deploy**

3. **Done!** Your API is live at `https://your-project.vercel.app`

---

### Option B — Deploy via CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login**
   ```bash
   vercel login
   ```

3. **Install dependencies & deploy**
   ```bash
   npm install
   vercel --prod
   ```

4. Follow the prompts — link to an existing project or create new.

---

## Run Locally

```bash
npm install
npx vercel dev
```

> Local dev uses a full Chromium installation. On local, `@sparticuz/chromium` detects it's not in a Lambda environment and falls back to system Chrome if available.
>
> **Optional:** Install full Puppeteer locally for easier local dev:
> ```bash
> npm install --save-dev puppeteer
> ```
> Then update `_browser.js` to use `require('puppeteer')` when `process.env.VERCEL !== '1'`.

---

## Vercel Plan Requirements

| Feature | Free (Hobby) | Pro |
|---------|-------------|-----|
| Function memory | Up to 1024 MB ✅ | Up to 3009 MB |
| Max duration | 10s ⚠️ (may timeout) | 60s ✅ |
| Executions/mo | 100,000 | Unlimited |

> ⚠️ **Important:** The Hobby plan limits function execution to **10 seconds**. Puppeteer + dynamic scraping typically takes **15–30 seconds**. You may need to **upgrade to the Pro plan** ($20/mo) for reliable operation, or optimize by reducing timeouts.

---

## Timeout Optimization Tips

If you're on Hobby plan (10s limit), try these in `_scraper.js`:

1. **Reduce navigation timeout:** Change `waitUntil: 'networkidle2'` → `'domcontentloaded'`
2. **Reduce `waitForTimeout` delays** from 2500ms → 1000ms
3. **Pre-warm** by hitting `/api/generate` on a schedule (e.g., UptimeRobot)

---

## Notes

- Scraping uses **real page element interactions** (clicks, form fills) — not static HTML parsing — because emailnator.com is a React SPA.
- Request interception blocks images/fonts/CSS to speed up page loads.
- The `@sparticuz/chromium` binary is decompressed to `/tmp` on first cold start — this adds ~5s to cold start time.
