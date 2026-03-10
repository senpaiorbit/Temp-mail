# TempMail API — Vercel Serverless (axios + cheerio)

A lightweight REST API for temporary Gmail addresses via **emailnator.com**.  
No headless browser — uses **axios** + **tough-cookie** to call emailnator's real backend API directly.

✅ Works on **Vercel Free Plan**  
✅ No Playwright / Puppeteer / Chromium  
✅ Fast cold starts (~200ms vs 15s for browser-based)  
✅ Only 4 small dependencies

---

## How It Works

Emailnator is a React SPA but its **backend is a standard Laravel REST API** protected by Sanctum CSRF.

The flow for every request:
1. `GET /sanctum/csrf-cookie` → Laravel sets `XSRF-TOKEN` + `laravel_session` cookies
2. Extract `XSRF-TOKEN` from the cookie jar
3. `POST /api/generate-email` / `POST /api/inbox` with the token as `X-XSRF-TOKEN` header

`tough-cookie` + `axios-cookiejar-support` handle cookie persistence across steps within a single serverless invocation.

---

## Project Structure

```
├── api/
│   ├── _client.js    ← Core: session init, CSRF, all emailnator API calls
│   ├── index.js      ← GET /api              — docs
│   ├── health.js     ← GET /api/health       — health check
│   ├── generate.js   ← GET /api/generate     — generate temp email
│   ├── inbox.js      ← GET /api/inbox        — list messages
│   └── message.js    ← GET /api/message      — read message (cheerio parses HTML→text)
├── vercel.json       ← 30s timeout, 512MB per function
├── package.json
└── .gitignore
```

---

## API Reference

### `GET /api/generate`
Generate a new temporary email address.

| Param | Default | Description |
|-------|---------|-------------|
| `domain` | `true` | Custom domain variant |
| `plusGmail` | `true` | +Gmail trick (user+tag@gmail.com) |
| `dotGmail` | `true` | Dot trick (u.s.e.r@gmail.com) |
| `googleMail` | `true` | @googlemail.com variant |

```bash
curl "https://your-app.vercel.app/api/generate"
```
```json
{
  "email": "va.ne.ss.ap@gmail.com",
  "raw": ["va.ne.ss.ap@gmail.com"],
  "options": ["domain", "plusGmail", "dotGmail", "googleMail"]
}
```

---

### `GET /api/inbox?email=<email>`
List inbox messages for an email.

```bash
curl "https://your-app.vercel.app/api/inbox?email=va.ne.ss.ap@gmail.com"
```
```json
{
  "email": "va.ne.ss.ap@gmail.com",
  "count": 1,
  "messages": [
    {
      "messageID": "ABC123xyz",
      "from": "noreply@example.com",
      "subject": "Verify your account",
      "time": "Just Now"
    }
  ]
}
```

---

### `GET /api/message?email=<email>&messageID=<id>`
Read the full content of a message. Use `messageID` from `/api/inbox`.

```bash
curl "https://your-app.vercel.app/api/message?email=va.ne.ss.ap@gmail.com&messageID=ABC123xyz"
```
```json
{
  "email": "va.ne.ss.ap@gmail.com",
  "messageID": "ABC123xyz",
  "from": "noreply@example.com",
  "subject": "Verify your account",
  "time": "Just Now",
  "html": "<div>Click here to verify: https://example.com/verify/token</div>",
  "text": "Click here to verify: https://example.com/verify/token"
}
```

---

### `GET /api/health`
```json
{ "status": "ok", "timestamp": "2025-01-01T00:00:00.000Z" }
```

---

## Deploy to Vercel Free Plan

### Option A — CLI

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Install dependencies
npm install

# 3. Login
vercel login

# 4. Deploy
vercel --prod
```

Vercel will ask a few setup questions on first deploy. Accept defaults.  
Your API will be live at: `https://<your-project>.vercel.app`

---

### Option B — GitHub Import

1. Push to a GitHub repo
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import the repo — click **Deploy**. Done.

---

## Local Development

```bash
npm install
vercel dev
# API at http://localhost:3000
```

---

## Vercel Free Plan Compatibility

| Limit | Free Plan | This API |
|-------|-----------|----------|
| Function timeout | 60s max | ✅ 30s set |
| Memory | 1024MB max | ✅ 512MB set |
| Executions/month | 100,000 | ✅ Fine for personal/dev use |
| Bundle size | 50MB max | ✅ ~5MB total |
| Cold start | ~200ms | ✅ No browser overhead |

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `axios` | HTTP requests to emailnator |
| `tough-cookie` | Cookie jar (stores XSRF + session across requests) |
| `axios-cookiejar-support` | Connects tough-cookie to axios |
| `cheerio` | Parses message HTML to extract plain text |
