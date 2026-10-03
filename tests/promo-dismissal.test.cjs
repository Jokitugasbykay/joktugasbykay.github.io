const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const html = fs.readFileSync(process.argv[2] || path.join(__dirname, '../index.html'), 'utf8');
const promo = html.slice(html.indexOf('let promoTimer = null;'), html.indexOf('async function loadPromo()'));
const close = html.match(/document\.getElementById\('promoClose'\)\?\.addEventListener\('click', \(\) => \{[\s\S]*?\n        \}\);/)[0];
let now = 100000000;
const storage = new Map();
function session(blockedStorage = false) {
    const elements = new Map();
    let onClose;
    const element = id => {
        if (!elements.has(id)) elements.set(id, { hidden: true, dataset: {}, addEventListener: (_, fn) => { onClose = fn; } });
        return elements.get(id);
    };
    const context = vm.createContext({
        document: { getElementById: element, querySelector: element },
        sessionStorage: { getItem: key => { if (blockedStorage) throw Error('Blocked'); return storage.get(key); }, setItem: (key, value) => { if (blockedStorage) throw Error('Blocked'); storage.set(key, value); } },
        Date: class extends Date { static now() { return now; } },
        setInterval: () => 1, clearInterval: () => {}, DEFAULT_PROMO: {}, appliedPromoDiscount: 0
    });
    vm.runInContext(promo + close, context);
    return { render: (extra = {}) => context.renderPromo({ campaign_id: 'campaign-1', active: true, ends_at: new Date(now + 86400000).toISOString(), discount_percent: 5, ...extra }), close: () => onClose(), strip: element('promoStrip') };
}
let page = session(); page.render(); assert.equal(page.strip.hidden, false);
page.close(); assert.equal(page.strip.hidden, true);
assert.equal(Number(storage.get('jokiin_promo_dismissed_until:campaign-1')), now + 120 * 60000);
page.render(); assert.equal(page.strip.hidden, true, 'Late API render cannot reopen promo');
now += 119 * 60000; page = session(); page.render(); assert.equal(page.strip.hidden, true, 'Refresh before 120 minutes');
now += 60000; page = session(); page.render(); assert.equal(page.strip.hidden, false, 'Returns at 120 minutes');
page = session(true); page.render(); page.close(); page.render(); assert.equal(page.strip.hidden, true, 'Close still works when storage is blocked');
storage.clear(); page = session(); page.render(); assert.equal(page.strip.hidden, false, 'New tab shows promo');
page.close(); page.render({ campaign_id: 'campaign-2' }); assert.equal(page.strip.hidden, false, 'New campaign ignores old dismissal');
page.render({ used: true }); assert.equal(page.strip.hidden, true, 'Redeemed campaign stays hidden');
console.log('PASS: per-tab 120-minute dismissal, new campaign, redeemed account, late renders and blocked storage.');