const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--host-resolver-rules=MAP jokiin.my.id 172.67.156.92'] });
    try {
        const context = await browser.newContext();
        await context.route('https://jokiin.my.id/?metrics-*', async route => {
            const response = process.argv.includes('--live') ? await route.fetch() : null;
            const html = response ? await response.text() : fs.readFileSync('index.html', 'utf8');
            const probe = 'window.__metricsTest = { get row() { return websiteMetrics; }, get ready() { return catalogueReady; }, get client() { return supabase; }, get products() { return CONFIG.PRODUCTS; }, apply: applyWebsiteMetrics };\n';
            await route.fulfill({ contentType: 'text/html', body: html.replace('        function renderApp() {', probe + '        function renderApp() {') });
        });
        const page = await context.newPage();
        await page.goto(process.argv.includes('--live') ? 'https://jokiin.my.id/?metrics-live=' + Date.now() : 'https://jokiin.my.id/?metrics-preview', { waitUntil: 'load' });
        await page.waitForFunction(() => window.__metricsTest?.row && window.__metricsTest.ready);
        await page.waitForFunction(() => window.__metricsTest.client.getChannels().some(channel => channel.topic === 'realtime:website-metrics' && channel.state === 'joined'));
        const result = await page.evaluate(() => {
            const websiteMetrics = window.__metricsTest.row, CONFIG = { PRODUCTS: window.__metricsTest.products };
            const expected = [...CONFIG.PRODUCTS].sort((a, b) => (websiteMetrics.stats.services[b.serviceId]?.score || 0) - (websiteMetrics.stats.services[a.serviceId]?.score || 0) || a.serviceId - b.serviceId).slice(0, 4).map(product => product.title);
            return { expected, actual: [...document.querySelectorAll('#preview-layanan h3')].map(el => el.textContent), ratings: [...document.querySelectorAll('[data-user-rating]')].map(el => el.textContent), average: websiteMetrics.stats.rating.toFixed(1) + '/5' };
        });
        assert.deepEqual(result.actual, result.expected);
        assert.deepEqual(result.ratings, [result.average, result.average]);
        await page.evaluate(() => {
            const websiteMetrics = window.__metricsTest.row, applyWebsiteMetrics = window.__metricsTest.apply;
            const input = document.querySelector('#tab-beranda input') || document.querySelector('input');
            input.focus();
            const row = websiteMetrics;
            applyWebsiteMetrics({ ...row, revision: Number(row.revision) + 1, stats: { ...row.stats, rating: 4.8 } });
            if (document.activeElement !== input) throw new Error('Metrics update stole search focus');
            if (document.querySelector('[data-user-rating]').textContent !== '4.8/5') throw new Error('Live update failed');
            applyWebsiteMetrics({ ...row, revision: Number(row.revision) + 2 });
        });
        for (const width of [390, 1440]) {
            await page.setViewportSize({ width, height: 950 });
            await page.screenshot({ path: 'tests/metrics-' + width + '.png' });
        }
        console.log('PASS: public aggregate fetch, connected realtime subscription, ranking, mobile/desktop ratings, focus preserved.', result);
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
