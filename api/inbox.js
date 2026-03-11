/**
 * GET /api/inbox?email=<address>
 *
 * Lists all messages in the inbox.
 *
 * Internally calls: POST /api/inbox  { "email": "user@gmail.com" }
 *
 * emailnator response shape:
 *   {
 *     "messageData": [
 *       { "messageID": "ad" },          ← ad placeholder, always filter out
 *       { "messageID": "abc123", "from": "...", "subject": "...", "time": "..." },
 *       ...
 *     ]
 *   }
 *
 * Our response:
 *   { "email": "...", "count": 2, "messages": [{messageID, from, subject, time}] }
 */

const { getInbox } = require("./_client");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed. Use GET." });
  }

  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ error: "Missing required query param: email" });
  }

  try {
    // → POST /api/inbox  { "email": "user@gmail.com" }
    const data = await getInbox(email);

    // Filter out the "ad" placeholder entry that emailnator always includes
    const raw = Array.isArray(data.messageData) ? data.messageData : [];
    const messages = raw.filter(
      (m) => m && m.messageID && m.messageID !== "ad"
    );

    return res.status(200).json({
      email,
      count: messages.length,
      messages,
    });

  } catch (err) {
    console.error("[inbox] error:", err.message, "| status:", err.status, "| data:", err.data);

    if (err.status) {
      return res.status(502).json({
        error: "emailnator API error",
        status: err.status,
        detail: err.data,
        hint: err.status === 405
          ? "Route mismatch — emailnator expects POST /api/inbox"
          : undefined,
      });
    }
    return res.status(500).json({ error: err.message });
  }
};
