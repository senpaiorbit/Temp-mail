const { getMessage } = require('./_scraper');

/**
 * GET /api/message?email=<email>&id=<messageId>
 *
 * Response:
 *   { email: string, messageId: string, html: string, text: string }
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { email, id } = req.query;
  if (!email || !id) {
    return res.status(400).json({ error: 'Missing required query params: email, id' });
  }

  try {
    const result = await getMessage(email, id);
    res.status(200).json(result);
  } catch (err) {
    console.error('[/api/message]', err.message);
    res.status(500).json({ error: err.message });
  }
};
