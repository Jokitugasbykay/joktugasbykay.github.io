const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('index.html', 'utf8');
const start = html.indexOf('        function canModerateReviews()');
const end = html.indexOf('        window.openReviewModal', start);
const filters = [];
const context = vm.createContext({ currentUser: null, window: { showToast() {} }, confirm: () => true,
    requireUser: async () => true, loadReviews: async () => {},
    supabase: { from() { return { delete() { return this; }, eq() { return this; }, lte(column, value) { filters.push([column, value]); return this; }, async select() { return { data: [{ id: 1 }] }; } }; } }
});
vm.runInContext(html.slice(start, end), context);
(async () => {
    for (const workplaceRole of ['founder', 'supervisor']) {
        context.currentUser = { uid: 'moderator', role: 'admin', workplaceRole };
        assert.equal(context.canDeleteReview({ rating: 5, userId: 'someone-else' }), true);
        await context.window.deleteCustomerReview(1, {});
        assert.equal(filters.length, 0);
    }
    context.currentUser = { uid: 'owner', role: 'user', workplaceRole: 'founder' };
    assert.equal(context.canDeleteReview({ rating: 5, userId: 'owner' }), false);
    assert.equal(context.canDeleteReview({ rating: 4, userId: 'someone-else' }), false);
    assert.equal(context.canDeleteReview({ rating: 4, userId: 'owner' }), true);
    await context.window.deleteCustomerReview(1, {});
    assert.deepEqual(filters, [['rating', 4]]);
    context.currentUser = null;
    assert.equal(context.canDeleteReview({ rating: 4 }), false);
    console.log('PASS: founder/supervisor all ratings, customer ownership and low-rating restriction, anonymous denied.');
})().catch(error => { console.error(error); process.exitCode = 1; });