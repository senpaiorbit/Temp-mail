/**
 * GET /api/generate
 *
 * Query params (all default to true):
 *   domain=true|false
 *   plusGmail=true|false
 *   dotGmail=true|false
 *   googleMail=true|false
 *
 * Response:
 *   { email: "user@gmail.com", raw: ["user@gmail.com"], options: [...] }
 */

const { generateEmail } = require("./_client");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed. Use GET." });
  }

  // Build options array from query params
  const optionMap = {
    domain:     req.query.domain     !== "false",
    plusGmail:  req.query.plusGmail  !== "false",
    dotGmail:   req.query.dotGmail   !== "false",
    googleMail: req.query.googleMail !== "false",
  };

  // emailnator expects the options as an array of enabled option names
  const options = Object.entries(optionMap)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key);

  // Must have at least one option selected
  if (options.length === 0) {
    return res.status(400).json({
      error: "At least one option must be true (domain, plusGmail, dotGmail, googleMail)",
    });
  }

  try {
    const data = await generateEmail(options);

    // emailnator returns { email: ["address@gmail.com"] }
    const emailList = Array.isArray(data.email) ? data.email : [data.email];
    const email = emailList[0];

    if (!email) {
      return res.status(502).json({ error: "emailnator returned an empty email", raw: data });
    }

    return res.status(200).json({
      email,
      raw: emailList,
      options,
    });
  } catch (err) {
    console.error("[generate] error:", err.message);

    // Surface useful info if emailnator rejected the request
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
