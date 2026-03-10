/**
 * GET /api/inbox?email=<address>
 *
 * Lists all messages in the inbox of the given email address.
 *
 * Response:
 *   {
 *     email: "user@gmail.com",
 *     count: 2,
 *     messages: [
 *       { messageID: "abc123", from: "noreply@x.com", subject: "Hello", time: "Just Now" },
 *       ...
 *     ]
 *   }
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
    const data = await getInbox(email);

    /**
     * emailnator returns:
     * {
     *   messageData: [
     *     { messageID: "ad", from: "...", subject: "...", time: "..." },
     *     { messageID: "abc123", from: "...", subject: "...", time: "..." }
     *   ]
     * }
     *
     * Note: The first entry is always { messageID: "ad" } — it's an ad placeholder.
     * We filter it out.
     */
    const raw = Array.isArray(data.messageData) ? data.messageData : [];
    const messages = raw.filter((m) => m.messageID && m.messageID !== "ad");

    return res.status(200).json({
      email,
      count: messages.length,
      messages,
    });
  } catch (err) {
    console.error("[inbox] error:", err.message);

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
