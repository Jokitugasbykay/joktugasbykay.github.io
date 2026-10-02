const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('C:/Users/Maulana Riski/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const root = path.join(__dirname, '..');
  const css = fs.readFileSync(path.join(root, 'assets/ui-enhancements.css'), 'utf8');
  const photo = fs.readFileSync(path.join(root, 'assets/review-avatars/legacy-406.jpg')).toString('base64');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 600 });
      await page.setContent(`<style>${css}</style><header class="tr-03__rh"><a class="tr-03__ava"><img src="data:image/jpeg;base64,${photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"><span hidden>V</span></a><div><b>Vin***</b><span>Pesanan Terverifikasi</span></div></header><figure class="tr-24__card"><footer><a class="tr-24__avatar-circle"><img src="data:image/jpeg;base64,${photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"><span hidden>V</span></a><span>Vin***</span></footer></figure>`);
      await page.waitForFunction(() => [...document.images].every(img => img.complete && img.naturalWidth));
      for (const selector of ['.tr-03__ava', '.tr-24__avatar-circle']) {
        const shape = await page.locator(selector).evaluate(el => {
          const box = el.getBoundingClientRect();
          const img = el.querySelector('img').getBoundingClientRect();
          return { width: box.width, height: box.height, imageWidth: img.width, imageHeight: img.height };
        });
        assert(Math.abs(shape.width - shape.height) < 0.1, `${selector} container: ${JSON.stringify(shape)}`);
        assert(Math.abs(shape.imageWidth - shape.imageHeight) < 0.1, `${selector} picture: ${JSON.stringify(shape)}`);
        assert(shape.imageWidth <= shape.width && shape.imageHeight <= shape.height);
      }
      await page.screenshot({ path: path.join(root, `../../avatar-inspection/circle-${width}.png`) });
    }
  } finally { await browser.close(); }
  console.log('PASS: portrait pictures stay square inside circular avatars at 320px and 1440px.');
})().catch(error => { console.error(error); process.exit(1); });

