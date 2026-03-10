const { generateEmail } = require('./_scraper');

/**
 * GET /api/generate
 *
 * Query params (all optional, default true):
 *   domain=true|false
 *   plusGmail=true|false
 *   dotGmail=true|false
 *   googleMail=true|false
 *
 * Response:
 *   { email: string, options: object }
 */
module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { domain, plusGmail, dotGmail, googleMail } = req.query;

  const options = {
    domain: domain !== 'false',
    plusGmail: plusGmail !== 'false',
    dotGmail: dotGmail !== 'false',
    googleMail: googleMail !== 'false',
  };

  try {
    const result = await generateEmail(options);
    res.status(200).json(result);
  } catch (err) {
    console.error('[/api/generate]', err.message);
    res.status(500).json({ error: err.message });
  }
};
