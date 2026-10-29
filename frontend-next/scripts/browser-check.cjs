const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { hash } = require('./export-information.cjs');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'out');
const publication = JSON.parse(fs.readFileSync(path.join(root, '.verification/publication.json')));
const allowed = new Set(publication.map(item => '/' + item.file));
for (const item of publication) assert.equal(hash(fs.readFileSync(path.join(out, item.file))), item.sha256, 'Output changed after preflight: ' + item.file);
const modulePath = process.env.PLAYWRIGHT_MODULE_PATH;
assert(modulePath, 'Set PLAYWRIGHT_MODULE_PATH to the separately provisioned Playwright installation');
assert.equal(require(path.join(modulePath, 'package.json')).version, '1.64.1');
const { chromium } = require(modulePath);
const { expect } = require(path.join(modulePath, 'test'));
const origin = 'http://127.0.0.1:8788';
const results = [];
const label = theme => theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap';
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE,
    headless: true, args: ['--disable-background-networking', '--disable-component-update', '--no-first-run'] });
  try {
    for (const width of [320, 390, 1440]) for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block', acceptDownloads: false });
      const denied = [], errors = [], fontsMocked = [];
      await context.routeWebSocket('**/*', socket => { denied.push('WebSocket'); socket.close(); });
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        if (request.method() === 'GET' && url.protocol === 'https:' &&
            url.hostname === 'fonts.googleapis.com' && url.pathname === '/css2' &&
            request.resourceType() === 'stylesheet') {
          fontsMocked.push(url.pathname);
          return route.fulfill({ status: 200, contentType: 'text/css', body: '/* offline font fixture: system fallback */' });
        }
        if (url.origin === origin && request.method() === 'GET') {
          if (url.pathname === '/') return route.fulfill({ contentType: 'text/html',
            body: '<!doctype html><title>Synthetic storefront destination</title><h1>Synthetic storefront destination</h1>' });
          let relative;
          if (url.pathname === '/information/') relative = 'information/index.html';
          else if (allowed.has(decodeURIComponent(url.pathname))) relative = decodeURIComponent(url.pathname).slice(1);
          if (relative) {
            const file = path.resolve(out, relative);
            assert(file.startsWith(out + path.sep));
            let body = fs.readFileSync(file);
            assert.equal(hash(body), publication.find(item => item.file === relative).sha256);
            if (relative.endsWith('.html')) body = Buffer.from(body.toString().replace(/<link[^>]*rel="preconnect"[^>]*>/g, ''));
            const extension = path.extname(relative);
            return route.fulfill({ status: 200, contentType: ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
              '.txt': 'text/plain', '.png': 'image/png', '.webp': 'image/webp' })[extension] || 'application/octet-stream', body });
          }
        }
        denied.push(request.method() + ' ' + url.origin + url.pathname);
        return route.abort('blockedbyclient');
      });
      await context.addInitScript(({ theme }) => {
        if (localStorage.getItem('theme') === null) localStorage.setItem('theme', theme);
      }, { theme });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('download', download => { denied.push('download'); void download.cancel(); });
      page.on('popup', popup => { denied.push('popup'); void popup.close(); });
      try {
        await page.goto(origin + '/information/?fixture=1#info-about', { waitUntil: 'networkidle' });
        await expect(page.getByRole('heading', { name: 'Update & Informasi', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: label(theme), exact: true })).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.locator('.brand-logo-img:visible').count(), 1);
        assert(await page.locator('.brand-' + theme).isVisible());
        const button = page.getByRole('button', { name: label(theme), exact: true });
        assert.equal(await button.getAttribute('title'), null, 'No duplicate native title tooltip');
        await button.hover();
        const tooltip = page.locator('[role="tooltip"]');
        assert.equal(await tooltip.count(), 1);
        await expect(tooltip).toBeVisible();
        const bounds = await tooltip.boundingBox();
        assert(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width + 1, 'Tooltip outside viewport');
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
        assert(!overflow, 'Horizontal page overflow');
        await page.screenshot({ path: path.join(root, `.verification/information-${width}-${theme}.png`), fullPage: true, animations: 'disabled' });
        await button.focus();
        await page.keyboard.press('Enter');
        const changed = theme === 'dark' ? 'light' : 'dark';
        await expect(page.getByRole('button', { name: label(changed), exact: true })).toBeVisible();
        assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), changed);
        await page.reload({ waitUntil: 'networkidle' });
        await expect(page.getByRole('button', { name: label(changed), exact: true })).toBeVisible();
        await page.getByRole('link', { name: 'Kembali ke Storefront', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'Synthetic storefront destination', exact: true })).toBeVisible();
        await page.goBack({ waitUntil: 'networkidle' });
        assert.equal(new URL(page.url()).search, '?fixture=1');
        assert.equal(new URL(page.url()).hash, '#info-about');
        await expect(page.getByRole('button', { name: label(changed), exact: true })).toBeVisible();
        await page.goForward({ waitUntil: 'networkidle' });
        await expect(page.getByRole('heading', { name: 'Synthetic storefront destination', exact: true })).toBeVisible();
        assert.deepEqual(denied, [], 'Unexpected transport/navigation attempt');
        assert.deepEqual(errors, [], 'Browser runtime or console errors');
        results.push({ id: `B-${width}-${theme}`, status: 'PASS', viewport: { width, height: 900 }, theme,
          url: origin + '/information/?fixture=1#info-about', browser: await browser.version(), fontsMocked, denied, errors });
      } catch (error) {
        results.push({ id: `B-${width}-${theme}`, status: 'FAIL', error: error.message, denied, errors });
        throw error;
      } finally { await context.close(); }
    }
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(root, '.verification/browser-results.json'), JSON.stringify({
      cases: results, limitation: 'Request-level fixture only, no OS network-isolation claim. Google Fonts mocked; storefront destination synthetic. No real legacy bootstrap/payment/auth executed.'
    }, null, 2) + '\n');
    console.log(JSON.stringify(results, null, 2));
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
