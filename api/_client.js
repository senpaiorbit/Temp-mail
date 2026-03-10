/**
 * _client.js
 * 
 * Emailnator.com uses Laravel Sanctum for CSRF protection.
 * Flow for every session:
 *   1. GET /sanctum/csrf-cookie  → sets XSRF-TOKEN cookie + laravel_session cookie
 *   2. POST /api/generate-email  → body: { email: [...options] }
 *   3. POST /api/inbox           → body: { email: "..." }
 *   4. POST /api/inbox           → body: { email: "...", messageID: "..." }
 *
 * We use tough-cookie + axios-cookiejar-support so cookies persist
 * across requests within one serverless invocation (no browser needed).
 */

const axios = require("axios");
const { wrapper } = require("axios-cookiejar-support");
const { CookieJar } = require("tough-cookie");

const BASE = "https://www.emailnator.com";

// Common browser-like headers that emailnator expects
const COMMON_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Origin": BASE,
  "Referer": BASE + "/",
  "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
};

/**
 * Creates a fresh axios instance with its own cookie jar.
 * Must call initSession() before making API requests.
 */
function createClient() {
  const jar = new CookieJar();
  const client = wrapper(
    axios.create({
      baseURL: BASE,
      jar,
      withCredentials: true,
      headers: { ...COMMON_HEADERS },
      timeout: 20000,
    })
  );
  return { client, jar };
}

/**
 * Step 1: Hit /sanctum/csrf-cookie to get XSRF-TOKEN + session cookie.
 * Returns the decoded XSRF token string.
 */
async function initSession(client) {
  await client.get("/sanctum/csrf-cookie", {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
    },
  });

  // Extract XSRF-TOKEN from the cookie jar
  // tough-cookie stores it as URL-encoded, so decode it
  const cookies = await client.defaults.jar.getCookies(BASE);
  const xsrfCookie = cookies.find((c) => c.key === "XSRF-TOKEN");

  if (!xsrfCookie) {
    throw new Error("Failed to obtain XSRF-TOKEN from emailnator.com");
  }

  // The cookie value is URL-encoded — decode it for use as a header
  return decodeURIComponent(xsrfCookie.value);
}

/**
 * Step 2: Generate a new temporary email address.
 *
 * @param {string[]} options  Array of: "domain", "plusGmail", "dotGmail", "googleMail"
 * @returns {Promise<{ email: string[] }>}
 */
async function generateEmail(options = ["domain", "plusGmail", "dotGmail", "googleMail"]) {
  const { client } = createClient();
  const xsrf = await initSession(client);

  const response = await client.post(
    "/api/generate-email",
    { email: options },
    {
      headers: {
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": xsrf,
      },
    }
  );

  return response.data; // { email: ["user@gmail.com"] }
}

/**
 * Step 3: Get the inbox message list for an email address.
 *
 * @param {string} email
 * @returns {Promise<{ messageData: Array }>}
 */
async function getInbox(email) {
  const { client } = createClient();
  const xsrf = await initSession(client);

  const response = await client.post(
    "/api/inbox",
    { email },
    {
      headers: {
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": xsrf,
      },
    }
  );

  return response.data; // { messageData: [...] }
}

/**
 * Step 4: Get the full content of a specific message.
 *
 * @param {string} email
 * @param {string} messageID  — the messageID field from /api/inbox response
 * @returns {Promise<object>}  Full message object with HTML body
 */
async function getMessage(email, messageID) {
  const { client } = createClient();
  const xsrf = await initSession(client);

  // First load inbox to establish session context
  await client.post(
    "/api/inbox",
    { email },
    {
      headers: {
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": xsrf,
      },
    }
  );

  // Refresh XSRF in case it rotated
  const cookies = await client.defaults.jar.getCookies(BASE);
  const xsrfCookie = cookies.find((c) => c.key === "XSRF-TOKEN");
  const freshXsrf = xsrfCookie ? decodeURIComponent(xsrfCookie.value) : xsrf;

  const response = await client.post(
    "/api/inbox",
    { email, messageID },
    {
      headers: {
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": freshXsrf,
      },
    }
  );

  return response.data;
}

module.exports = { generateEmail, getInbox, getMessage };
