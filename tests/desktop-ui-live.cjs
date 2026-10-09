const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'tests/output');
fs.mkdirSync(output, {recursive: true});

(async () => {
    const browser = await chromium.launch({channel: 'chrome', headless: true, args: ['--host-resolver-rules=MAP jokiin.my.id 172.67.156.92']});
    try {
        const context = await browser.newContext({reducedMotion: 'reduce'});
        await context.addInitScript(() => localStorage.setItem('jokiin_theme', 'light'));
        await context.route('https://jokiin.my.id/**', async route => {
            const url = new URL(route.request().url());
            const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)));
            if (!file.startsWith(root + path.sep)) return route.abort();
            if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return route.abort();
            if (url.pathname !== '/') return route.fulfill({path: file});
            const html = fs.readFileSync(file, 'utf8');
            return route.fulfill({contentType: 'text/html', body: html.replace('        function renderApp() {', 'window.__desktopCheck = {get ready() {return catalogueReady;}};\n        function renderApp() {')});
        });
        // UI verification must never create a charge or write a review.
        await context.route('**/functions/v1/**', route => route.abort());
        await context.route('**/api/create-mayar-payment', route => route.abort());
        const page = await context.newPage();
        const failures = [];
        page.on('pageerror', error => failures.push(error.message));
        await page.setViewportSize({width: 1440, height: 1000});
        await page.goto('https://jokiin.my.id/?desktop-check', {waitUntil: 'load'});
        await page.waitForFunction(() => window.__desktopCheck?.ready && document.querySelectorAll('#preview-layanan .service-card').length === 4, {timeout: 60000});
        await page.waitForFunction(() => document.querySelector('#homeTestimonialsTrack .tr-24__card'), {timeout: 60000});
        await page.evaluate(() => document.fonts.ready);
        await page.addStyleTag({content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'});
        const theme = value => page.evaluate(value => {document.documentElement.dataset.theme = value; document.body.classList.toggle('dark-mode', value === 'dark');}, value);
        const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        async function unchanged(label, selector = '.container') {
            const snapshot = () => page.locator(selector).evaluate(root => [root, ...root.querySelectorAll('*')].filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden').map(el => {
                const rect = el.getBoundingClientRect(), css = getComputedStyle(el);
                return [el.tagName, el.id, el.className, ...['display','color','backgroundColor','borderRadius','padding','margin','fontSize','fontWeight','gap','gridTemplateColumns'].map(key => css[key]), ...['x','y','width','height'].map(key => Math.round(rect[key] * 100) / 100)];
            }));
            await page.evaluate(() => document.querySelector('link[href*="desktop-storefront.css"]').sheet.disabled = true);
            await settle();
            const before = await snapshot();
            await page.evaluate(() => document.querySelector('link[href*="desktop-storefront.css"]').sheet.disabled = false);
            await settle();
            const after = await snapshot();
            const changed = after.findIndex((row, index) => JSON.stringify(row) !== JSON.stringify(before[index]));
            assert.equal(changed, -1, label + ': ' + JSON.stringify({before: before[changed], after: after[changed]}));
            assert.equal(after.length, before.length, label + ': visible element count changed');
            console.log('PASS unchanged:', label);
        }
        for (const width of [320, 390, 430, 768, 820, 1024]) {
            await page.setViewportSize({width, height: 950});
            await page.evaluate(() => window.switchTab('beranda'));
            for (const value of ['light', 'dark']) {
                await theme(value);
                await unchanged('mobile/tablet home ' + width + ' ' + value);
            }
        }
        await page.setViewportSize({width: 390, height: 950});
        for (const tab of ['layanan','harga','testimoni','informasi','carapesan','bantuan']) {
            await page.evaluate(tab => window.switchTab(tab), tab);
            await unchanged('mobile ' + tab);
        }
        for (const width of [390, 1440]) {
            await page.setViewportSize({width, height: 1000});
            await page.evaluate(() => window.directCheckout('makalah'));
            for (const value of ['light', 'dark']) {
                await theme(value);
                await unchanged('checkout ' + width + ' ' + value);
            }
        }
        await page.evaluate(() => window.switchTab('beranda'));
        for (const width of [1100, 1280, 1440, 1920]) {
            await page.setViewportSize({width, height: 950});
            for (const value of ['light', 'dark']) {
                await theme(value);
                await page.evaluate(() => window.scrollTo(0, 0));
                await settle();
                await page.locator('.home-banner img:visible').evaluate(img => img.decode());
                const bad = await page.evaluate(() => [...document.querySelectorAll('#nav-container .pill, .home-banner h1, .home-banner__description, .home-banner__actions button, .home-banner__stats, .home-category')].filter(el => el.scrollWidth > el.clientWidth + 1).map(el => el.textContent));
                assert.deepEqual(bad, [], 'Overflow ' + width + ' ' + value);
                assert.equal(await page.locator('.home-hero-mobile').isVisible(), false);
                assert.equal(await page.locator('#preview-layanan .service-icon img').count(), 4);
                await page.screenshot({path: path.join(output, 'desktop-' + width + '-' + value + '.png')});
            }
        }
        await page.setViewportSize({width: 1440, height: 1000});
        await page.locator('.recommendation-viewport').evaluate(el => el.scrollIntoView({block: 'center', behavior: 'instant'}));
        await page.locator('.recommendation-card:visible img').evaluateAll(images => Promise.all(images.map(img => img.decode())));
        assert.equal(await page.locator('.recommendation-card:visible').count(), 4);
        const clipped = await page.locator('.recommendation-card:visible').evaluateAll(cards => cards.filter(card => card.querySelector('.recommendation-card-footer').getBoundingClientRect().bottom > card.getBoundingClientRect().bottom).length);
        assert.equal(clipped, 0, 'Recommendation actions must fit their cards');
        await page.screenshot({path: path.join(output, 'desktop-recommendations.png')});
        await page.locator('.popular-grid').evaluate(el => el.scrollIntoView({block: 'center', behavior: 'instant'}));
        await page.screenshot({path: path.join(output, 'desktop-popular.png')});
        for (const tab of ['layanan', 'harga', 'testimoni', 'informasi', 'carapesan', 'bantuan']) {
            await page.locator('#nav-container .pill[data-target="' + tab + '"]').click();
            assert(await page.locator('#tab-' + tab).isVisible());
            assert.equal(await page.locator('#nav-container .pill.active').getAttribute('aria-current'), 'page');
            await page.screenshot({path: path.join(output, 'desktop-' + tab + '.png')});
        }
        await page.locator('#nav-container .pill[data-target="harga"]').click();
        const buy = page.locator('#full-harga .cf-card-actions button').first();
        assert(await buy.isVisible(), 'Price action must be visible without hovering');
        const actionRows = await page.locator('#full-harga .cf-card-actions').evaluateAll(rows => rows.slice(0, 4).map(row => row.getBoundingClientRect().y));
        assert(actionRows.every(y => Math.abs(y - actionRows[0]) < 1), 'First price row actions must align');
        await page.evaluate(() => window.switchTab('beranda'));
        const search = page.locator('#tab-beranda .searchInputGlobal');
        await search.fill('Makalah');
        await page.waitForFunction(() => document.querySelector('#tab-search')?.classList.contains('active'));
        assert((await page.locator('#searchResultsGrid .service-card').count()) > 0);
        assert.deepEqual(failures, [], 'Runtime errors');
        console.log('PASS: desktop light/dark, images/icons, navigation, visible price actions and search; no charge created.');
    } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
