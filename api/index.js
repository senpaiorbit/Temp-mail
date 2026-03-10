/**
 * GET /api
 * API documentation and endpoint list
 */
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  return res.status(200).json({
    service: "TempMail API",
    powered_by: "emailnator.com",
    stack: "axios + tough-cookie (no headless browser)",
    version: "2.0.0",
    endpoints: {
      "GET /api/generate": {
        description: "Generate a new temporary email address",
        query_params: {
          domain:     "true|false  (default: true) — include custom domain variant",
          plusGmail:  "true|false  (default: true) — include +Gmail variant",
          dotGmail:   "true|false  (default: true) — include .Gmail variant",
          googleMail: "true|false  (default: true) — include GoogleMail variant",
        },
        example: "/api/generate?plusGmail=true&dotGmail=false",
        response: { email: "user@gmail.com", raw: ["user@gmail.com"] },
      },
      "GET /api/inbox": {
        description: "List all inbox messages for a given email address",
        query_params: {
          email: "string (required) — the temp email address",
        },
        example: "/api/inbox?email=user@gmail.com",
        response: {
          email: "user@gmail.com",
          count: 1,
          messages: [
            {
              messageID: "abc123",
              from: "noreply@example.com",
              subject: "Verify your account",
              time: "Just Now",
            },
          ],
        },
      },
      "GET /api/message": {
        description: "Get the full content of a specific message",
        query_params: {
          email:     "string (required) — the temp email address",
          messageID: "string (required) — messageID from /api/inbox",
        },
        example: "/api/message?email=user@gmail.com&messageID=abc123",
        response: {
          email: "user@gmail.com",
          messageID: "abc123",
          subject: "Verify your account",
          from: "noreply@example.com",
          html: "<div>Click to verify...</div>",
          text: "Click to verify...",
        },
      },
      "GET /api/health": {
        description: "Health check",
        response: { status: "ok" },
      },
    },
  });
};
