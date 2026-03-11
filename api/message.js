/**
 * GET /api/message?email=<address>&messageID=<id>
 *
 * Reads the full content of a specific message.
 * Get the messageID from /api/inbox response.
 *
 * Internally calls: POST /api/inbox  { "email": "...", "messageID": "..." }
 *
 * emailnator response contains the full email HTML in `data.mail`.
 * We also extract plain text via cheerio.
 *
 * Our response:
 *   {
 *     email, messageID,
 *     from, subject, time,
 *     html,   ← raw HTML of email body
 *     text    ← plain text stripped by cheerio
 *   }
 */

const { getMessage } = require("./_client");
const cheerio = require("cheerio");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed. Use GET." });
  }

  const { email, messageID } = req.query;

  if (!email) {
    return res.status(400).json({ error: "Missing required query param: email" });
  }
  if (!messageID) {
    return res.status(400).json({
      error: "Missing required query param: messageID",
      hint: "Get the messageID from GET /api/inbox?email=...",
    });
  }

  try {
    // → POST /api/inbox  { "email": "...", "messageID": "..." }
    const data = await getMessage(email, messageID);

    /**
     * emailnator message response shape:
     * {
     *   "from":    "Sender Name <sender@example.com>",
     *   "subject": "Your verification code",
     *   "time":    "Just Now",
     *   "mail":    "<html>...</html>"   ← full email HTML body
     * }
     *
     * Some fields may vary; defensively fall back to empty string.
     */
    const html = data.mail || data.html || data.body || data.message || "";
    const from    = data.from    || "";
    const subject = data.subject || "";
    const time    = data.time    || "";

    // Use cheerio to extract clean plain text from the HTML
    let text = "";
    if (html) {
      const $ = cheerio.load(html);
      $("script, style, head, noscript, iframe").remove();
      text = $.root()
        .text()
        .replace(/[ \t]+/g, " ")       // collapse horizontal whitespace
        .replace(/\n{3,}/g, "\n\n")     // collapse excessive blank lines
        .trim();
    }

    return res.status(200).json({
      email,
      messageID,
      from,
      subject,
      time,
      html,
      text,
    });

  } catch (err) {
    console.error("[message] error:", err.message, "| status:", err.status, "| data:", err.data);

    if (err.status) {
      return res.status(502).json({
        error: "emailnator API error",
        status: err.status,
        detail: err.data,
        hint: err.status === 405
          ? "Route mismatch — emailnator expects POST /api/inbox with {email, messageID} body"
          : undefined,
      });
    }
    return res.status(500).json({ error: err.message });
  }
};
