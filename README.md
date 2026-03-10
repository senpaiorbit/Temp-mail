# TempMail API

A REST API that provides temporary email functionality by scraping [emailnator.com](https://www.emailnator.com) using Playwright (headless Chromium). Works with the dynamic React-based site by interacting with page elements rather than static HTML.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | API info & endpoint list |
| GET | `/health` | Health check |
| GET | `/generate` | Generate a new temp email |
| GET | `/inbox?email=<email>` | List inbox messages |
| GET | `/message?email=<email>&id=<id>` | Read a specific message |

### `/generate` Query Parameters

| Param | Default | Description |
|-------|---------|-------------|
| `domain` | `true` | Include custom domain emails |
| `plusGmail` | `true` | Include +Gmail variant |
| `dotGmail` | `true` | Include .Gmail variant |
| `googleMail` | `true` | Include GoogleMail variant |

**Example:**
```
GET /generate?domain=true&plusGmail=false
```
```json
{
  "email": "va.ne.ss.ap@gmail.com",
  "options": { "domain": true, "plusGmail": false, "dotGmail": true, "googleMail": true }
}
```

### `/inbox`

```
GET /inbox?email=va.ne.ss.ap@gmail.com
```
```json
{
  "email": "va.ne.ss.ap@gmail.com",
  "messages": [
    { "from": "noreply@example.com", "subject": "Welcome!", "time": "2 min ago", "id": "0" }
  ],
  "count": 1
}
```

### `/message`

```
GET /message?email=va.ne.ss.ap@gmail.com&id=0
```
```json
{
  "email": "va.ne.ss.ap@gmail.com",
  "id": "0",
  "text": "Welcome to Example! Click here to verify...",
  "html": "<div>...</div>"
}
```

---

## Deploy to Fly.io

### Prerequisites

- [Fly.io account](https://fly.io) (free tier works)
- [flyctl CLI](https://fly.io/docs/hands-on/install-flyctl/) installed

### Steps

1. **Install flyctl**
   ```bash
   # macOS
   brew install flyctl

   # Linux
   curl -L https://fly.io/install.sh | sh

   # Windows
   pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"
   ```

2. **Login**
   ```bash
   fly auth login
   ```

3. **Edit `fly.toml`** — change the app name to something unique:
   ```toml
   app = "your-unique-app-name"
   ```

4. **Create the app on Fly.io**
   ```bash
   fly apps create your-unique-app-name
   ```

5. **Deploy**
   ```bash
   fly deploy
   ```
   > First deploy may take 5–10 minutes as it installs Playwright + Chromium.

6. **Open your API**
   ```bash
   fly open
   ```
   Your API will be live at: `https://your-unique-app-name.fly.dev`

### Useful Commands

```bash
# View logs
fly logs

# SSH into the machine
fly ssh console

# Scale memory if needed
fly scale memory 1024

# Check status
fly status
```

---

## Run Locally

```bash
npm install
npx playwright install chromium
npm start
```

API runs at `http://localhost:8080`

---

## Notes

- **Dynamic scraping**: Uses Playwright headless Chromium to interact with emailnator.com's React-based UI by clicking buttons and reading DOM elements — not static HTML parsing.
- **Memory**: Playwright requires at least 512MB RAM. The `fly.toml` sets 1GB.
- **Cold starts**: With `auto_stop_machines = true`, first request after idle may take ~10–15s to spin up Chromium.
- **Rate limiting**: emailnator.com may throttle excessive requests. Add delays between calls if needed.
- **Ethics**: Use responsibly. Do not abuse the free service.
