/**
 * GET /api/message?email=<address>&messageID=<id>
 *
 * Fetches the full HTML content of a specific email message.
 * Use the messageID from /api/inbox response.
 *
 * Response:
 *   {
 *     email: "user@gmail.com",
 *     messageID: "abc123",
 *     from: "noreply@example.com",
 *     subject: "Verify your account",
 *     time: "Just Now",
 *     html: "<div>...</div>",
 *     text: "plain text version..."
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
    return res.status(400).json({ error: "Missing required query param: messageID (get this from /api/inbox)" });
  }

  try {
    const data = await getMessage(email, messageID);

    /**
     * emailnator returns the full message object.
     * The mail body HTML is in data.mail (a string of HTML).
     * Other fields: from, subject, time, etc.
     *
     * Structure example:
     * {
     *   from: "Service <noreply@example.com>",
     *   subject: "Verify your account",
     *   time: "Just Now",
     *   mail: "<html>...</html>"   ← full email HTML
     * }
     */

    // Extract plain text from HTML using cheerio
    let plainText = "";
    const html = data.mail || data.html || data.body || "";

    if (html) {
      const $ = cheerio.load(html);
      // Remove script/style tags before extracting text
      $("script, style, head").remove();
      plainText = $.root().text().replace(/\s+/g, " ").trim();
    }

    return res.status(200).json({
      email,
      messageID,
      from:    data.from    || "",
      subject: data.subject || "",
      time:    data.time    || "",
      html,
      text: plainText,
    });
  } catch (err) {
    console.error("[message] error:", err.message);

    if (err.response) {
      return res.status(502).json({
        error: "emailnator API error",
        status: err.response.status,
        detail: err.response.data,
      });
    }

    return res.status(500).json({ error: err.message });
  }
};
