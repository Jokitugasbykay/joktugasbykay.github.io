const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/Maulana Riski/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--host-resolver-rules=MAP jokiin.my.id 172.67.156.92'] });
    try {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
        let campaign = { campaign_id: 'test-campaign-1', active: true, coupon: 'TESTCODE', label: 'PROMO TERBATAS', text: 'Test', discount_percent: 5, ends_at: new Date(Date.now() + 86400000).toISOString() };
        let used = false;
        await context.route('**/rest/v1/rpc/jokiin_promo_eligibility', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ promo: campaign, used }) }));
        const page = await context.newPage();
        await page.goto('https://jokiin.my.id/?promo-check=' + Date.now(), { waitUntil: 'load' });
        assert((await page.content()).includes("supabase.rpc('jokiin_promo_eligibility')"), 'Deployment contains account-aware promo');
        await page.locator('#promoStrip').waitFor({ state: 'visible' });
        await page.locator('#promoClose').click();
        await page.reload({ waitUntil: 'load' });
        await page.waitForTimeout(2000);
        assert.equal(await page.locator('#promoStrip').isVisible(), false, 'Dismissal survives refresh');
        const tab = await context.newPage();
        await tab.goto('https://jokiin.my.id/?promo-check=' + Date.now(), { waitUntil: 'load' });
        await tab.locator('#promoStrip').waitFor({ state: 'visible' });
        used = true;
        await tab.reload({ waitUntil: 'load' });
        await tab.waitForTimeout(2000);
        assert.equal(await tab.locator('#promoStrip').isVisible(), false, 'Paid campaign remains hidden');
        campaign = { ...campaign, campaign_id: 'test-campaign-2' }; used = false;
        await page.reload({ waitUntil: 'load' });
        await page.locator('#promoStrip').waitFor({ state: 'visible' });
        assert.equal(await page.locator('#promoBadge').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(224, 245, 233)');
        console.log('PASS LIVE: refresh dismissed, new tab visible, paid campaign hidden, new campaign visible, no yellow badge.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });