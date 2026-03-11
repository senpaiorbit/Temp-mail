# TempMail API v3 — Vercel Serverless

> **What was fixed:** The 405 error was caused by calling wrong route paths.  
> emailnator's backend routes are `POST /api/generate-email` and `POST /api/inbox`.  
> The previous version was calling `/api/generate` (a GET-only frontend route).

---

## Confirmed API Routes (emailnator.com backend)

| Step | Method | Path | Body |
|------|--------|------|------|
| 1 | GET | `/sanctum/csrf-cookie` | — |
| 2 | POST | `/api/generate-email` | `{ "email": ["domain","plusGmail",...] }` |
| 3 | POST | `/api/inbox` | `{ "email": "user@gmail.com" }` |
| 4 | POST | `/api/inbox` | `{ "email": "user@gmail.com", "messageID": "abc" }` |

Steps 3 and 4 use the **same endpoint** — the `messageID` field switches between list and fetch mode.

---

## Your API Endpoints

### `GET /api/generate`

```bash
curl "https://your-app.vercel.app/api/generate"
# With options:
curl "https://your-app.vercel.app/api/generate?dotGmail=false&domain=false"
```

```json
{
  "email": "va.ne.ss.ap@gmail.com",
  "raw": ["va.ne.ss.ap@gmail.com"],
  "options": ["plusGmail", "googleMail"]
}
```

---

### `GET /api/inbox?email=<email>`

```bash
curl "https://your-app.vercel.app/api/inbox?email=va.ne.ss.ap@gmail.com"
```

```json
{
  "email": "va.ne.ss.ap@gmail.com",
  "count": 1,
  "messages": [
    {
      "messageID": "MTkwZmQ4MjU3MjU4ODhkMQ==",
      "from": "noreply@example.com",
      "subject": "Verify your account",
      "time": "Just Now"
    }
  ]
}
```

> Note: emailnator always includes a `{ "messageID": "ad" }` entry — this is filtered out automatically.

---

### `GET /api/message?email=<email>&messageID=<id>`

Use the `messageID` value from `/api/inbox`.

```bash
curl "https://your-app.vercel.app/api/message?email=va.ne.ss.ap@gmail.com&messageID=MTkwZmQ4MjU3MjU4ODhkMQ=="
```

```json
{
  "email": "va.ne.ss.ap@gmail.com",
  "messageID": "MTkwZmQ4MjU3MjU4ODhkMQ==",
  "from": "noreply@example.com",
  "subject": "Verify your account",
  "time": "Just Now",
  "html": "<div>Click to verify: https://example.com/verify/token123</div>",
  "text": "Click to verify: https://example.com/verify/token123"
}
```

---

### `GET /api/health`
```json
{ "status": "ok", "timestamp": "2025-01-01T00:00:00.000Z" }
```

---

## Deploy

```bash
npm install
vercel login
vercel --prod
```

## Local Dev

```bash
npm install
vercel dev
# → http://localhost:3000
```

---

## How the CSRF session works

emailnator uses **Laravel Sanctum** to protect its API.  
Every request requires a fresh session established by a two-step handshake:

```
1. GET /sanctum/csrf-cookie
   → Sets cookies: XSRF-TOKEN (URL-encoded) + emailnator_session

2. POST /api/... 
   → Headers must include:
       X-XSRF-TOKEN: <decoded XSRF-TOKEN value>
       Cookie: XSRF-TOKEN=...; emailnator_session=...
```

`tough-cookie` + `axios-cookiejar-support` handle cookie persistence across both steps.  
Each serverless invocation creates a fresh cookie jar (no shared state between requests).
