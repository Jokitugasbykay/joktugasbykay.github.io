const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');

(async () => {
    const browser = await chromium.launch({channel: 'chrome', headless: true});
    try {
        const page = await browser.newPage({reducedMotion: 'reduce'});
        await page.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.hostname !== 'layout.test') return route.abort();
            const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
            return file.startsWith(root + path.sep) && fs.existsSync(file) ? route.fulfill({path: file}) : route.abort();
        });
        await page.goto('https://layout.test/', {waitUntil: 'load'});
        await page.addStyleTag({content: '*,*::before,*::after{transition:none!important;animation:none!important}'});
        const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
        const block = (start, end) => {assert(html.includes(start) && html.includes(end)); return html.slice(html.indexOf(start), html.indexOf(end));};
        // Exercise the real carousel without booting authentication or payment APIs.
        await page.addScriptTag({content: 'const CONFIG = {PRODUCTS: []};\n'
            + block('        function formatRupiah(', '        window.openWhatsApp =')
            + block('        function productPriceLabel(', '        function formatFileSize(')
            + block('        let recommendationIndex = 0;', '        let websiteMetrics = null;')});
        await page.evaluate(() => {
            CONFIG.PRODUCTS = Array.from({length: 7}, (_, i) => ({id: i === 0 ? 'makalah' : 'check-' + i,
                title: 'Bimbingan Systematic Literature Review ' + i, category: 'Penelitian', priceNum: 1300000,
                desc: 'Pendampingan alur penelitian, strategi pencarian, seleksi artikel, dan pelaporan metode.',
                image: 'assets/ui-art/book.png'}));
            renderRecommendations();
        });
        const errors = [];
        for (const width of [761, 789, 820, 1024, 1025, 1100, 1280, 1920]) {
            await page.setViewportSize({width, height: 1100});
            for (const theme of ['light', 'dark']) {
                await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
                const header = await page.locator('.container > header').evaluate(el => ({height: el.getBoundingClientRect().height,
                    buttons: [...el.querySelectorAll('.header-actions button')].map(btn => btn.getBoundingClientRect().width)}));
                if (header.height > 100 || header.buttons.some(width => width > 170)) errors.push(`header stretched: ${width} ${theme} ${JSON.stringify(header)}`);
                if (width <= 1024) continue;
                const themeStyle = await page.evaluate(() => {
                    const swatch = document.createElement('span'); swatch.style.backgroundColor = 'var(--bg-color)'; document.body.append(swatch);
                    const expected = getComputedStyle(swatch).backgroundColor; swatch.remove();
                    return {expected, actual: getComputedStyle(document.body).backgroundColor,
                        radius: parseFloat(getComputedStyle(document.querySelector('.home-banner')).borderRadius)};
                });
                if (themeStyle.expected !== themeStyle.actual) errors.push(`background drift: ${width} ${theme}`);
                if (themeStyle.radius < 16) errors.push(`sharp banner: ${width} ${theme}`);
                for (const index of [0, 1, 6]) {
                    await page.evaluate(index => {recommendationIndex = index; updateFeaturedRecommendations();}, index);
                    const cards = await page.locator('.recommendation-card:visible').evaluateAll(cards => cards.map(card => {
                        const box = card.getBoundingClientRect(), footer = card.querySelector('.recommendation-card-footer').getBoundingClientRect();
                        return {left: box.left, id: card.querySelector('button').dataset.productId, clipped: footer.bottom > box.bottom - 8};
                    }).sort((a, b) => a.left - b.left));
                    const expected = Array.from({length: 4}, (_, slot) => {const i = (index + slot) % 7; return i === 0 ? 'makalah' : 'check-' + i;});
                    if (cards.some(card => card.clipped)) errors.push(`clipped recommendation: ${width} ${theme} index=${index}`);
                    if (JSON.stringify(cards.map(card => card.id)) !== JSON.stringify(expected)) errors.push(`recommendation order: ${width} ${theme} index=${index}`);
                }
            }
        }
        await page.setViewportSize({width: 390, height: 950});
        const snapshot = () => page.locator('.container > header, .home-hero-mobile, .recommendation-card.is-featured').evaluateAll(elements => elements.map(el => {
            const style = getComputedStyle(el), box = el.getBoundingClientRect();
            return [style.display, style.backgroundColor, style.borderRadius, box.width, box.height];
        }));
        await page.evaluate(() => document.querySelector('link[href*="desktop-storefront.css"]').sheet.disabled = true);
        const before = await snapshot();
        await page.evaluate(() => document.querySelector('link[href*="desktop-storefront.css"]').sheet.disabled = false);
        assert.deepEqual(await snapshot(), before, 'Phone layout must remain unchanged');
        assert.deepEqual(errors, [], 'Responsive desktop regressions');
        console.log('PASS: portrait header, sequential recommendations, unclipped actions, rounded banner, neutral theme and unchanged phone.');
    } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
