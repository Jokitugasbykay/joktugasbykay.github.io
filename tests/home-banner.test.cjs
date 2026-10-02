const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('C:/Users/Maulana Riski/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.join(__dirname, '..');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.hostname !== 'banner.test') return route.abort();
      const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return route.abort();
      return route.fulfill({ path: file });
    });
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('https://banner.test/', { waitUntil: 'domcontentloaded' });
      const mobile = width <= 820;
      const hero = page.locator(mobile ? '.home-hero-mobile' : '.home-banner');
      assert(await hero.isVisible());
      assert(!(await page.locator(mobile ? '.home-banner' : '.home-hero-mobile').isVisible()));
      if (mobile) {
        assert.equal(await hero.locator('img').count(), 0);
        assert((await hero.locator('h2').textContent()).includes('Tugas Kamu,'));
        assert.equal(await hero.locator('.hero-stats span').count(), 4);
      } else {
        await hero.locator('img:visible').evaluate(img => img.decode());
        const mobileHeading = await page.locator('.home-hero-mobile h2').textContent();
        assert.equal((await hero.locator('h1').textContent()).replace(/\s+/g,''), mobileHeading.replace(/\s+/g,''));
      }
      const valid = await hero.evaluate(el => {
        const box = el.getBoundingClientRect();
        return [...el.querySelectorAll('h1,h2,p,button,ul')].every(child => {
          const r = child.getBoundingClientRect();
          return r.left >= box.left && r.right <= box.right + 1 && child.scrollWidth <= child.clientWidth + 1;
        });
      });
      assert(valid, `Content overflow at ${width}px`);
      await page.evaluate(() => { window.switchTab = tab => window.clickedTab = tab; window.scrollToAdminContacts = () => window.clickedAdmin = true; });
      await hero.getByRole('button', { name: 'Lihat Layanan' }).click();
      assert.equal(await page.evaluate(() => window.clickedTab), 'layanan');
      await hero.getByRole('button', { name: 'Konsultasi via WhatsApp' }).click();
      assert(await page.evaluate(() => window.clickedAdmin));
      await hero.evaluate(el => window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - 120));
      await hero.screenshot({ path: path.join(root, `../../avatar-inspection/banner-${width}.png`) });
      await page.evaluate(() => document.documentElement.setAttribute('data-theme','dark'));
      if (!mobile) {
        assert(await hero.locator('.home-banner__photo--dark').isVisible());
        assert(!(await hero.locator('.home-banner__photo--light').isVisible()));
        await hero.locator('img:visible').evaluate(img => img.decode());
        assert.equal(await hero.evaluate(el => getComputedStyle(el).borderRadius), '24px');
      }
      await hero.screenshot({ path: path.join(root, `../../avatar-inspection/banner-dark-${width}.png`) });
      console.log(`PASS: ${mobile ? 'original mobile hero without image' : 'new desktop banner'}, text fit and actions at ${width}px.`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
