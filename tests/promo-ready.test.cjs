const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(process.argv[2] || require('node:path').join(__dirname, '../index.html'),'utf8');
const start = html.indexOf('async function loadPromo()');
const code = html.slice(start,html.indexOf('function readStored',start));
(async () => {
    let loaded, displayed = 0, requested = 0;
    const context = {document:{readyState:'interactive'},window:{addEventListener:(type,fn)=>{assert.equal(type,'load');loaded=fn;}},supabase:{rpc:async()=>{requested++;return {data:{promo:{active:true}}};}},promoLoadVersion:0,DEFAULT_PROMO:{},renderPromo:()=>{displayed++;}};
    vm.runInNewContext(code,context);
    const pending = context.loadPromo();
    assert.equal(requested,0);assert.equal(displayed,0);
    loaded();await pending;
    assert.equal(requested,1);assert.equal(displayed,1);
    console.log('Promo waits for styles/page load before rendering');
})().catch(error=>{console.error(error);process.exitCode=1;});
