/**
 * GET /api/generate
 *
 * Query params (all default true):
 *   domain=true|false
 *   plusGmail=true|false
 *   dotGmail=true|false
 *   googleMail=true|false
 *
 * Internally calls: POST /api/generate-email
 * Body: { "email": ["domain", "plusGmail", ...] }
 *
 * Response:
 *   { "email": "user@gmail.com", "raw": ["user@gmail.com"], "options": [...] }
 */

const { generateEmail } = require("./_client");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed. Use GET." });
  }

  // Build the options array that emailnator expects
  const selected = {
    domain:     req.query.domain     !== "false",
    plusGmail:  req.query.plusGmail  !== "false",
    dotGmail:   req.query.dotGmail   !== "false",
    googleMail: req.query.googleMail !== "false",
  };

  const options = Object.entries(selected)
    .filter(([, on]) => on)
    .map(([key]) => key);

  if (options.length === 0) {
    return res.status(400).json({
      error: "At least one option must be enabled.",
      available: ["domain", "plusGmail", "dotGmail", "googleMail"],
    });
  }

  try {
    // → POST /api/generate-email  { email: ["domain","plusGmail",...] }
    const data = await generateEmail(options);

    // Response shape: { email: ["user@gmail.com"] }
    const emailList = Array.isArray(data.email) ? data.email : [data.email];
    const email = emailList[0];

    if (!email) {
      return res.status(502).json({
        error: "emailnator returned an empty address",
        raw: data,
      });
    }

    return res.status(200).json({ email, raw: emailList, options });

  } catch (err) {
    console.error("[generate] error:", err.message, "| status:", err.status, "| data:", err.data);

    if (err.status) {
      return res.status(502).json({
        error: "emailnator API error",
        status: err.status,
        detail: err.data,
        hint: err.status === 405
          ? "Route mismatch — emailnator expects POST /api/generate-email (not /api/generate)"
          : undefined,
      });
    }
    return res.status(500).json({ error: err.message });
  }
};
