const {test} = require('node:test');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const path = require('node:path');
test('themed deadline calendar retains ISO values and restored checkout dates', async () => {
    const browser = await chromium.launch({channel:'chrome',headless:true});
    try {
        const page = await browser.newPage({viewport:{width:390,height:844}});
        await page.setContent('<style>:root{--card-solid:#fff;--text-main:#0f172a;--border-color:#e2e8f0;--primary:#079669}body{margin:16px}.form-control{width:100%;box-sizing:border-box;height:44px}</style><div style="height:500px"></div><label for="chkTaskDeadline">Deadline</label><input class="form-control" type="date" id="chkTaskDeadline" value="2026-10-20"><div style="height:900px"></div>');
        const asset = file => path.join(__dirname,'../assets',file);
        await page.addStyleTag({path:asset('vendor/flatpickr/flatpickr.min.css')});
        await page.addStyleTag({path:asset('ui-refinements.css')});
        await page.addScriptTag({path:asset('vendor/flatpickr/flatpickr.min.js')});
        await page.addScriptTag({path:asset('vendor/flatpickr/id.js')});
        await page.addScriptTag({path:asset('deadline-calendar.js')});
        await page.locator('#chkTaskDeadline').click();
        for (const width of [320,390,1440]) {
            await page.setViewportSize({width,height:900});
            await page.evaluate(() => window.scrollTo(0,250));
            const boxes = await page.evaluate(() => ({input:document.getElementById('chkTaskDeadline').getBoundingClientRect().toJSON(),calendar:document.querySelector('.flatpickr-calendar').getBoundingClientRect().toJSON()}));
            assert(Math.abs(boxes.calendar.top - boxes.input.bottom - 8) < 2,'Calendar must stay anchored while scrolling/resizing');
            assert(boxes.calendar.left >= 0 && boxes.calendar.right <= width,'Calendar fits the viewport');
        }
        await page.screenshot({path:path.join(__dirname,'output/deadline-calendar-redesign.png')});
        await page.locator('.flatpickr-day[aria-label="Oktober 21, 2026"]').click();
        assert.equal(await page.locator('#chkTaskDeadline').inputValue(),'2026-10-21');
        await page.evaluate(() => document.getElementById('chkTaskDeadline').value='2026-11-12');
        await page.locator('#chkTaskDeadline').click();
        assert.match(await page.locator('.flatpickr-day.selected').getAttribute('aria-label'),/November 12, 2026/);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('.flatpickr-calendar.open').count(),0);
    } finally {await browser.close();}
});
