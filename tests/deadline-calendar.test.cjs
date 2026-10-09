const {test} = require('node:test');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const path = require('node:path');
test('themed deadline calendar retains ISO values and restored checkout dates', async () => {
    const browser = await chromium.launch({channel:'chrome',headless:true});
    try {
        const page = await browser.newPage({viewport:{width:390,height:844}});
        await page.setContent('<label for="chkTaskDeadline">Deadline</label><input type="date" id="chkTaskDeadline" value="2026-10-20">');
        const asset = file => path.join(__dirname,'../assets',file);
        await page.addStyleTag({path:asset('vendor/flatpickr/flatpickr.min.css')});
        await page.addStyleTag({path:asset('ui-refinements.css')});
        await page.addScriptTag({path:asset('vendor/flatpickr/flatpickr.min.js')});
        await page.addScriptTag({path:asset('vendor/flatpickr/id.js')});
        await page.addScriptTag({path:asset('deadline-calendar.js')});
        await page.locator('#chkTaskDeadline').click();
        await page.locator('.flatpickr-day[aria-label="Oktober 21, 2026"]').click();
        assert.equal(await page.locator('#chkTaskDeadline').inputValue(),'2026-10-21');
        await page.evaluate(() => document.getElementById('chkTaskDeadline').value='2026-11-12');
        await page.locator('#chkTaskDeadline').click();
        assert.match(await page.locator('.flatpickr-day.selected').getAttribute('aria-label'),/November 12, 2026/);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('.flatpickr-calendar.open').count(),0);
    } finally {await browser.close();}
});
