/**
 * GET /api
 * API documentation
 */
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  return res.status(200).json({
    service: "TempMail API",
    powered_by: "emailnator.com",
    version: "3.0.0",
    note: "Uses axios + tough-cookie to POST to emailnator's real Laravel backend API.",
    confirmed_routes: {
      csrf:         "GET  /sanctum/csrf-cookie",
      generateEmail:"POST /api/generate-email",
      inbox:        "POST /api/inbox  (body: {email})",
      message:      "POST /api/inbox  (body: {email, messageID})",
    },
    your_endpoints: {
      "GET /api/generate": {
        description: "Generate a new temporary email address",
        params: {
          domain:     "true|false (default true)",
          plusGmail:  "true|false (default true)",
          dotGmail:   "true|false (default true)",
          googleMail: "true|false (default true)",
        },
        example: "/api/generate?domain=true&plusGmail=true",
      },
      "GET /api/inbox?email=": {
        description: "List messages in the inbox",
        example: "/api/inbox?email=user@gmail.com",
      },
      "GET /api/message?email=&messageID=": {
        description: "Read full message content",
        example: "/api/message?email=user@gmail.com&messageID=MTkwZmQ4",
      },
      "GET /api/health": "Health check",
    },
  });
};
