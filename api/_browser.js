const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

// Cache the browser instance within the same warm lambda invocation
let _browser = null;

/**
 * Returns a puppeteer browser instance compatible with Vercel serverless.
 * Uses @sparticuz/chromium which ships a compressed Chromium binary
 * that fits within Vercel's 50MB function limit.
 */
async function getBrowser() {
  if (_browser && _browser.isConnected()) return _browser;

  // Required for serverless environment
  chromium.setHeadlessMode = true;
  chromium.setGraphicsMode = false;

  _browser = await puppeteer.launch({
    args: [
      ...chromium.args,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',         // important for Lambda/Vercel
      '--no-zygote',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-sync',
      '--disable-translate',
      '--hide-scrollbars',
      '--metrics-recording-only',
      '--mute-audio',
      '--safebrowsing-disable-auto-update',
    ],
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
    ignoreHTTPSErrors: true,
  });

  return _browser;
}

/**
 * Opens a new page with a realistic user agent.
 */
async function getPage() {
  const browser = await getBrowser();
  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );
  await page.setViewport({ width: 1280, height: 800 });

  // Block images, fonts, media to speed up scraping
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const type = req.resourceType();
    if (['image', 'media', 'font', 'stylesheet'].includes(type)) {
      req.abort();
    } else {
      req.continue();
    }
  });

  return page;
}

module.exports = { getBrowser, getPage };
