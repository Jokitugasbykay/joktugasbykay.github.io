const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');

(async () => {
    const browser = await chromium.launch({channel: 'chrome', headless: true});
    try {
        const page = await browser.newPage();
        await page.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.hostname !== 'dropdown.test') return route.abort();
            const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
            return file.startsWith(root + path.sep) && fs.existsSync(file) ? route.fulfill({path: file}) : route.abort();
        });
        await page.goto('https://dropdown.test/', {waitUntil: 'load'});
        await page.evaluate(() => {
            document.querySelector('.tab-content.active').classList.remove('active');
            document.getElementById('tab-harga').classList.add('active');
            window.sortCalls = [];
            window.sortHarga = value => window.sortCalls.push(value);
        });
        const select = page.locator('#hargaSortSelect');
        assert.equal(await select.evaluate(el => getComputedStyle(el).appearance), 'base-select', 'Use the website-styled picker, not the OS popup');
        assert.equal(await select.getAttribute('aria-label'), 'Urutkan harga layanan');
        assert.notEqual(await page.locator('#chkWACountry').evaluate(el => getComputedStyle(el).appearance), 'base-select', 'Checkout must remain untouched');
        for (const width of [320, 390, 789, 1440]) {
            await page.setViewportSize({width, height: 900});
            for (const theme of ['light', 'dark']) {
                await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
                await select.click();
                const picker = await select.evaluate(el => {
                    const css = getComputedStyle(el, '::picker(select)');
                    const options = [...el.options].map(option => option.getBoundingClientRect());
                    return {open: el.matches(':open'), appearance: css.appearance, background: css.backgroundColor,
                        radius: css.borderRadius,
                        fits: options.every(box => box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight && box.height >= 40)};
                });
                assert(picker.open && picker.fits, `Picker must fit at ${width} ${theme}`);
                assert.equal(picker.appearance, 'base-select');
                assert.equal(picker.radius, '8px');
                assert.equal(picker.background, theme === 'dark' ? 'rgb(23, 26, 31)' : 'rgb(255, 255, 255)');
                await select.locator('option[value="desc"]').click();
                assert.equal(await select.inputValue(), 'desc');
                assert.equal(await page.evaluate(() => window.sortCalls.at(-1)), 'desc');
                assert.equal(await select.evaluate(el => el.matches(':open')), false);
                await select.press('Space');
                await page.keyboard.press('Home');
                await page.keyboard.press('ArrowDown');
                await page.keyboard.press('Enter');
                assert.equal(await select.inputValue(), 'asc', 'Keyboard selection must invoke the existing sort handler');
                assert.equal(await page.evaluate(() => window.sortCalls.at(-1)), 'asc');
                await select.press('Space');
                await page.keyboard.press('Escape');
                assert.equal(await select.evaluate(el => el.matches(':open')), false);
                assert(await select.evaluate(el => document.activeElement === el), 'Escape restores select focus');
                assert.notEqual(await select.evaluate(el => getComputedStyle(el).outlineStyle), 'none', 'Keyboard focus must be visible');
                await select.click();
                await page.getByRole('heading', {name: 'Daftar Harga Layanan', exact: true}).click();
                assert.equal(await select.evaluate(el => el.matches(':open')), false, 'Outside click dismisses the menu');
            }
        }
        console.log('PASS: themed picker, responsive options, click/keyboard sorting, Escape/outside dismissal and untouched checkout.');
    } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
