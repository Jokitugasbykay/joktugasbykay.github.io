const fs = require('node:fs');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
(async () => {
    const html = fs.readFileSync(process.argv[2] || require('node:path').join(__dirname, '../index.html'), 'utf8');
    const browser = await chromium.launch({channel:'chrome',headless:true});
    try {
        const page = await browser.newPage();
        for(const cls of ['tr-24__avatar-circle','tr-03__ava']) {
            const opening = html.match(new RegExp('<div class="'+cls+'"[^>]*>'))[0];
            await page.setContent(opening+'<img draggable="false" alt=""></div>');
            const avatar = page.locator('.'+cls);
            assert.equal(await page.locator('a,button').count(),0);
            assert.equal(await avatar.evaluate(el=>el.draggable),true);
            assert.equal(await page.locator('img').evaluate(el=>el.draggable),false);
            const uri = await avatar.evaluate(el=>{
                const dataTransfer = new DataTransfer();
                el.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer}));
                return dataTransfer.getData('text/uri-list');
            });
            assert.equal(uri,'https://jokiin.my.id/testimonials');
        }
        console.log('PASS: avatars are not links or buttons; dragging retains the testimonials URL.');
    } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});

