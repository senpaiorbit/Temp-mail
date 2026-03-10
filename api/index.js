/**
 * GET /api  — API documentation
 */
module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.status(200).json({
    service: "TempMail API — powered by emailnator.com",
    version: "1.0.0",
    note: "All scraping is done via headless Chromium interacting with live page elements.",
    endpoints: {
      "GET /api/generate":
        "Generate a new temp email. Query params: domain, plusGmail, dotGmail, googleMail (true/false)",
      "GET /api/inbox?email=<email>": "List inbox messages for the given email address",
      "GET /api/message?email=<email>&id=<id>":
        "Read full message content by message id (row index 0,1,2...)",
      "GET /api/health": "Health check",
    },
    examples: {
      generate: "/api/generate?domain=true&plusGmail=true",
      inbox: "/api/inbox?email=your.email@gmail.com",
      message: "/api/message?email=your.email@gmail.com&id=0",
    },
  });
};
