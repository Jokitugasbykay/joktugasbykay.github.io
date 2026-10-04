const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('index.html', 'utf8');
const source = html.slice(html.indexOf('        let websiteMetrics = null;'), html.indexOf('        function renderApp()'));
const ratings = [{}, {}], grid = {};
let listener, subscribed, fetches = 0;
const row = { revision: 2, stats: { rating: 4.425287, reviewCount: 261, services: { 1: { score: 1 }, 2: { score: 3 }, 3: { score: 5 }, 4: { score: 4 }, 5: { score: 2 } } } };
const context = vm.createContext({
    CONFIG: { PRODUCTS: [1, 2, 3, 4, 5].map(serviceId => ({ serviceId, title: 'Service ' + serviceId, category: '', desc: '', price: '', icon: '', hasSale: false })) },
    document: { hidden: false, querySelectorAll: () => ratings, getElementById: () => grid, addEventListener: () => {} },
    escapeHTML: String, productPriceLabel: () => '', console,
    supabase: {
        from(table) { assert.equal(table, 'website_metrics'); return { select() { return this; }, eq() { return this; }, async single() { fetches++; return { data: row }; } }; },
        channel() { return { on(type, filter, callback) { assert.equal(filter.table, 'website_metrics'); listener = callback; return this; }, subscribe(callback) { subscribed = callback; } }; }
    }
});
vm.runInContext(source, context);
(async () => {
    context.startWebsiteMetrics();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(ratings[0].textContent, '4.4/5');
    assert.equal(ratings[1].textContent, '4.4/5');
    assert.deepEqual([...grid.innerHTML.matchAll(/<h3>(.*?)<\/h3>/g)].map(m => m[1]), ['Service 3', 'Service 4', 'Service 2', 'Service 5']);
    subscribed('SUBSCRIBED');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(fetches, 2);
    listener({ new: { revision: 3, stats: { ...row.stats, rating: 4.8, services: { 1: { score: 20 } } } } });
    assert.equal(ratings[0].textContent, '4.8/5');
    assert(grid.innerHTML.indexOf('Service 1') < grid.innerHTML.indexOf('Service 2'));
    context.applyWebsiteMetrics(row);
    assert.equal(ratings[0].textContent, '4.8/5');
    context.applyWebsiteMetrics({ revision: 4, stats: { reviewCount: 0, rating: null } });
    assert.equal(ratings[0].textContent, '--/5');
    assert.equal((html.match(/data-user-rating>/g) || []).length, 2);
    console.log('PASS: ranking, both hero ratings, realtime events, reconnect fetch, stale snapshot guard, empty ratings.');
})().catch(error => { console.error(error); process.exitCode = 1; });