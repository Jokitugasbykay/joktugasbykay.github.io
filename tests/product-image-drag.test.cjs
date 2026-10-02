const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('C:/Users/Maulana Riski/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.join(__dirname, '..');
(async () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const handler = html.match(/document\.addEventListener\('dragstart', event => \{[\s\S]*?\}, true\);/)[0];
    assert(html.includes("event.pointerType === 'mouse' && event.target.closest('.recommendation-card-image')"));
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        await page.route('https://jokiin.my.id/**', route => route.fulfill({ contentType: 'text/html', body: '<section class="home-banner" draggable="true"><img alt=""></section><img class="recommendation-card-image" alt=""><div class="service-photo"><img alt=""></div><img class="unrelated" alt="">' }));
        for (const route of ['/', '/services', '/prices']) {
            await page.goto('https://jokiin.my.id' + route);
            await page.addScriptTag({ content: "const ROUTES = {beranda:'/',layanan:'/services',harga:'/prices'};" + handler });
            for (const selector of ['.home-banner img', '.recommendation-card-image', '.service-photo img', '.unrelated']) {
                const result = await page.locator(selector).evaluate(el => {
                    const dataTransfer = new DataTransfer();
                    dataTransfer.setData('text/uri-list', 'https://images.example/photo.jpg');
                    dataTransfer.setData('text/html', '<img src="https://images.example/photo.jpg">');
                    el.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer }));
                    return { uri: dataTransfer.getData('text/uri-list'), plain: dataTransfer.getData('text/plain'), html: dataTransfer.getData('text/html') };
                });
                if (selector === '.unrelated') assert.equal(result.uri, 'https://images.example/photo.jpg');
                else {
                    const expected = 'https://jokiin.my.id' + (selector === '.service-photo img' ? route : '/');
                    assert.equal(result.uri, expected);
                    assert.equal(result.plain, expected);
                    assert.equal(result.html, '');
                }
            }
        }
        console.log('PASS: banner/recommendations drag home; services/prices drag their page; unrelated images unchanged.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
