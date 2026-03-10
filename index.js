const express = require('express');
const { chromium } = require('playwright');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;
const BASE_URL = 'https://www.emailnator.com';

// Browser instance pool
let browser = null;

async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
  }
  return browser;
}

async function getNewPage() {
  const b = await getBrowser();
  const context = await b.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  return { page, context };
}

/**
 * GET /generate
 * Generate a new temporary email address
 * Query params: domain=true/false, plusGmail=true/false, dotGmail=true/false, googleMail=true/false
 */
app.get('/generate', async (req, res) => {
  const { context, page } = await getNewPage();
  try {
    const options = {
      domain: req.query.domain !== 'false',
      plusGmail: req.query.plusGmail !== 'false',
      dotGmail: req.query.dotGmail !== 'false',
      googleMail: req.query.googleMail !== 'false',
    };

    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for the email input to be populated
    await page.waitForSelector('input.form-control[readonly]', { timeout: 15000 });

    // Toggle checkboxes based on options
    const checkboxMap = {
      domain: '#custom-switch-domain',
      plusGmail: '#custom-switch-plusGmail',
      dotGmail: '#custom-switch-dotGmail',
      googleMail: '#custom-switch-googleMail',
    };

    for (const [key, selector] of Object.entries(checkboxMap)) {
      const checkbox = await page.$(selector);
      if (checkbox) {
        const isChecked = await checkbox.isChecked();
        if (options[key] !== isChecked) {
          await checkbox.click();
          await page.waitForTimeout(300);
        }
      }
    }

    // Click "Generate New" button
    await page.click('button:has-text("Generate New")');
    await page.waitForTimeout(2000);

    // Wait for new email to appear
    await page.waitForSelector('input.form-control[readonly]', { timeout: 10000 });

    const email = await page.inputValue('input.form-control[readonly]');

    if (!email) {
      return res.status(500).json({ error: 'Failed to generate email' });
    }

    res.json({ email, options });
  } catch (err) {
    console.error('Generate error:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    await context.close();
  }
});

/**
 * GET /inbox?email=<email>
 * Get the inbox messages for a given email address
 */
app.get('/inbox', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'email query param required' });

  const { context, page } = await getNewPage();
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for email input
    await page.waitForSelector('input.form-control[readonly]', { timeout: 15000 });

    // Check if it's a custom email flow
    // First, set the email using the "custom email" feature if it differs
    const currentEmail = await page.inputValue('input.form-control[readonly]');

    if (currentEmail !== email) {
      // Use custom email input
      const customToggle = await page.$('#custom-email');
      if (customToggle) {
        await customToggle.click();
        await page.waitForTimeout(500);

        // Wait for collapse to open
        await page.waitForSelector('#custom-container-collapse.show', { timeout: 5000 }).catch(() => {});

        const customInput = await page.$('input[name="customEmail"]');
        if (customInput) {
          await customInput.fill(email);
          await page.waitForTimeout(300);

          // Click custom Go button
          const goBtn = await page.$('button[name="goCustomBtn"]');
          if (goBtn) {
            // Enable button if disabled
            await page.evaluate(() => {
              const btn = document.querySelector('button[name="goCustomBtn"]');
              if (btn) btn.removeAttribute('disabled');
            });
            await goBtn.click();
          }
        }
      } else {
        // Just click Go! with whatever email is there — navigate to inbox directly
        await page.fill('input.form-control[readonly]', email).catch(() => {});
        await page.click('button[name="goBtn"]').catch(() => {});
      }

      await page.waitForTimeout(2000);
    } else {
      // Click the Go! button
      await page.click('button[name="goBtn"]');
      await page.waitForTimeout(2000);
    }

    // Wait for inbox/messages to load - look for table rows or "no message" indicator
    await page.waitForSelector('.card-body, .inbox-body, table, .message-list, [class*="inbox"]', {
      timeout: 15000,
    }).catch(() => {});

    await page.waitForTimeout(2000);

    // Scrape message list from the DOM
    const messages = await page.evaluate(() => {
      const rows = [];

      // Try table rows
      const tableRows = document.querySelectorAll('table tbody tr, .table tr');
      tableRows.forEach((row) => {
        const cols = row.querySelectorAll('td');
        if (cols.length >= 2) {
          rows.push({
            from: cols[0]?.innerText?.trim() || '',
            subject: cols[1]?.innerText?.trim() || '',
            time: cols[2]?.innerText?.trim() || cols[cols.length - 1]?.innerText?.trim() || '',
            id: row.getAttribute('data-id') || row.id || null,
          });
        }
      });

      // Try list items / cards
      if (rows.length === 0) {
        const items = document.querySelectorAll('.list-group-item, .email-item, [class*="message-item"], [class*="inbox-item"]');
        items.forEach((item) => {
          rows.push({
            from: item.querySelector('[class*="from"], .from')?.innerText?.trim() || '',
            subject: item.querySelector('[class*="subject"], .subject')?.innerText?.trim() || item.innerText?.trim() || '',
            time: item.querySelector('[class*="time"], .time, small')?.innerText?.trim() || '',
            id: item.getAttribute('data-id') || item.id || null,
          });
        });
      }

      return rows;
    });

    res.json({ email, messages, count: messages.length });
  } catch (err) {
    console.error('Inbox error:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    await context.close();
  }
});

/**
 * GET /message?email=<email>&id=<messageId>
 * Read a specific message by clicking on it in the inbox
 */
app.get('/message', async (req, res) => {
  const { email, id } = req.query;
  if (!email || !id) return res.status(400).json({ error: 'email and id query params required' });

  const { context, page } = await getNewPage();
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('input.form-control[readonly]', { timeout: 15000 });

    const currentEmail = await page.inputValue('input.form-control[readonly]');

    // Navigate to inbox
    if (currentEmail !== email) {
      const customToggle = await page.$('#custom-email');
      if (customToggle) {
        await customToggle.click();
        await page.waitForTimeout(500);
        await page.waitForSelector('#custom-container-collapse.show', { timeout: 5000 }).catch(() => {});

        const customInput = await page.$('input[name="customEmail"]');
        if (customInput) {
          await customInput.fill(email);
          await page.evaluate(() => {
            const btn = document.querySelector('button[name="goCustomBtn"]');
            if (btn) btn.removeAttribute('disabled');
          });
          await page.$('button[name="goCustomBtn"]').then((b) => b?.click());
        }
      }
    } else {
      await page.click('button[name="goBtn"]');
    }

    await page.waitForTimeout(2000);

    // Click the message row by id or index
    const clicked = await page.evaluate((msgId) => {
      // Try data-id
      let el = document.querySelector(`[data-id="${msgId}"]`);
      if (!el) {
        // Try by row index
        const rows = document.querySelectorAll('table tbody tr, .list-group-item');
        const idx = parseInt(msgId, 10);
        if (!isNaN(idx) && rows[idx]) el = rows[idx];
      }
      if (el) {
        el.click();
        return true;
      }
      return false;
    }, id);

    if (!clicked) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Wait for message content to appear
    await page.waitForTimeout(3000);

    const content = await page.evaluate(() => {
      // Look for modal or message detail panel
      const modal = document.querySelector('.modal-body, .message-body, .email-body, [class*="message-content"], [class*="email-content"]');
      if (modal) {
        return {
          html: modal.innerHTML,
          text: modal.innerText?.trim(),
        };
      }

      // Fallback - grab main content area
      const main = document.querySelector('main, #root');
      return {
        html: main?.innerHTML || '',
        text: main?.innerText?.trim() || '',
      };
    });

    res.json({ email, id, ...content });
  } catch (err) {
    console.error('Message error:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    await context.close();
  }
});

/**
 * GET /health
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * GET /
 */
app.get('/', (req, res) => {
  res.json({
    service: 'TempMail API (emailnator.com)',
    endpoints: {
      'GET /generate': 'Generate a new temporary email. Query: domain, plusGmail, dotGmail, googleMail (true/false)',
      'GET /inbox?email=<email>': 'List inbox messages for an email',
      'GET /message?email=<email>&id=<id>': 'Read a specific message by id or row index',
      'GET /health': 'Health check',
    },
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`TempMail API running on port ${PORT}`);
});

process.on('SIGTERM', async () => {
  if (browser) await browser.close();
  process.exit(0);
});
