/**
 * api/_client.js
 *
 * CONFIRMED API flow for emailnator.com (Laravel Sanctum SPA):
 *
 *  STEP 1 — GET https://www.emailnator.com/sanctum/csrf-cookie
 *           → Response sets two cookies:
 *             - XSRF-TOKEN   (URL-encoded, must be decoded for use as header)
 *             - emailnator_session
 *
 *  STEP 2 — POST https://www.emailnator.com/api/generate-email
 *           Headers:  Content-Type: application/json
 *                     X-XSRF-TOKEN: <decoded XSRF-TOKEN value>
 *                     Cookie: XSRF-TOKEN=...; emailnator_session=...
 *           Body:     { "email": ["domain","plusGmail","dotGmail","googleMail"] }
 *           Returns:  { "email": ["user@gmail.com"] }
 *
 *  STEP 3 — POST https://www.emailnator.com/api/inbox
 *           Same headers as Step 2
 *           Body (list):    { "email": "user@gmail.com" }
 *           Body (message): { "email": "user@gmail.com", "messageID": "abc123" }
 *           Returns:  { "messageData": [...] }  OR full message HTML object
 *
 * NOTE: The 405 "POST method not supported" error happens when the path is wrong
 * (e.g. hitting a GET-only route like /api/generate instead of /api/generate-email).
 * The correct POST routes are: /api/generate-email and /api/inbox
 */

const axios = require("axios");
const { wrapper } = require("axios-cookiejar-support");
const { CookieJar } = require("tough-cookie");

const BASE_URL = "https://www.emailnator.com";

// Standard browser headers that emailnator.com expects
const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Origin": BASE_URL,
  "Referer": BASE_URL + "/",
  "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "Connection": "keep-alive",
};

/**
 * Creates a fresh axios client with its own isolated cookie jar.
 * Each serverless invocation gets a brand new session.
 */
function buildClient() {
  const jar = new CookieJar();

  const client = wrapper(
    axios.create({
      baseURL: BASE_URL,
      jar,
      withCredentials: true,
      headers: BROWSER_HEADERS,
      timeout: 20000,
      // Don't throw on 4xx/5xx so we can return proper error messages
      validateStatus: () => true,
    })
  );

  return { client, jar };
}

/**
 * Step 1: Fetch CSRF cookie from /sanctum/csrf-cookie.
 * Returns the decoded XSRF-TOKEN string ready for use as X-XSRF-TOKEN header.
 */
async function initCSRF(client, jar) {
  const csrfResp = await client.get("/sanctum/csrf-cookie", {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "sec-fetch-user": "?1",
      "Upgrade-Insecure-Requests": "1",
    },
  });

  if (csrfResp.status !== 204 && csrfResp.status !== 200) {
    throw new Error(`CSRF init failed with status ${csrfResp.status}`);
  }

  // Pull XSRF-TOKEN from cookie jar
  const cookies = await jar.getCookies(BASE_URL);
  const xsrfCookie = cookies.find((c) => c.key === "XSRF-TOKEN");

  if (!xsrfCookie) {
    throw new Error(
      "XSRF-TOKEN not found in cookies after /sanctum/csrf-cookie. " +
      "emailnator.com may have changed their auth flow."
    );
  }

  // Laravel URL-encodes the token value in the cookie
  return decodeURIComponent(xsrfCookie.value);
}

/**
 * Makes a POST request to emailnator.com with the correct CSRF headers.
 * Handles the full init → post flow.
 */
async function emailnatorPost(path, body) {
  const { client, jar } = buildClient();
  const xsrfToken = await initCSRF(client, jar);

  const response = await client.post(path, body, {
    headers: {
      "Content-Type": "application/json",
      "X-XSRF-TOKEN": xsrfToken,
      // Also send token as cookie (Laravel reads both)
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  return response;
}

// ─────────────────────────────────────────────
// Public API functions
// ─────────────────────────────────────────────

/**
 * Generate a new temporary email address.
 *
 * @param {string[]} options  One or more of: "domain", "plusGmail", "dotGmail", "googleMail"
 * @returns {Promise<{email: string[]}>}
 *
 * Route: POST /api/generate-email
 * Body:  { "email": ["domain", "plusGmail", ...] }
 */
async function generateEmail(options) {
  const response = await emailnatorPost("/api/generate-email", { email: options });

  if (response.status !== 200) {
    const err = new Error(`generateEmail failed: HTTP ${response.status}`);
    err.status = response.status;
    err.data = response.data;
    throw err;
  }

  return response.data; // { email: ["user@gmail.com"] }
}

/**
 * Get the list of messages in an inbox.
 *
 * @param {string} email
 * @returns {Promise<{messageData: Array}>}
 *
 * Route: POST /api/inbox
 * Body:  { "email": "user@gmail.com" }
 */
async function getInbox(email) {
  const response = await emailnatorPost("/api/inbox", { email });

  if (response.status !== 200) {
    const err = new Error(`getInbox failed: HTTP ${response.status}`);
    err.status = response.status;
    err.data = response.data;
    throw err;
  }

  return response.data; // { messageData: [{messageID, from, subject, time}, ...] }
}

/**
 * Get the full content of a specific message.
 *
 * @param {string} email
 * @param {string} messageID  — from getInbox().messageData[n].messageID
 * @returns {Promise<object>}  Full message with HTML body
 *
 * Route: POST /api/inbox
 * Body:  { "email": "user@gmail.com", "messageID": "abc123" }
 *
 * NOTE: Both inbox list and message detail use the SAME /api/inbox endpoint.
 * The presence of messageID in the body switches it to message-fetch mode.
 */
async function getMessage(email, messageID) {
  const response = await emailnatorPost("/api/inbox", { email, messageID });

  if (response.status !== 200) {
    const err = new Error(`getMessage failed: HTTP ${response.status}`);
    err.status = response.status;
    err.data = response.data;
    throw err;
  }

  return response.data;
}

module.exports = { generateEmail, getInbox, getMessage };
