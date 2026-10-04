const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('C:/Users/Maulana Riski/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--host-resolver-rules=MAP jokiin.my.id 172.67.156.92']});
 try {
  const context=await browser.newContext();
  if(!process.argv.includes('--live')) {
   await context.route('https://jokiin.my.id/?review-preview',r=>r.fulfill({contentType:'text/html',body:fs.readFileSync('index.html','utf8')}));
   for(const asset of ['review-compose.css','review-moderation.js']) await context.route('**/assets/'+asset+'?*',r=>r.fulfill({contentType:asset.endsWith('css')?'text/css':'application/javascript',body:fs.readFileSync('assets/'+asset,'utf8')}));
  }
  const page=await context.newPage();
  await page.goto(process.argv.includes('--live')?'https://jokiin.my.id/?review-live='+Date.now():'https://jokiin.my.id/?review-preview',{waitUntil:'load'});
  await page.waitForFunction(()=>typeof window.switchTab==='function');
  for(const width of [390,1440]) for(const theme of ['light','dark']) {
   await page.setViewportSize({width,height:900});
   await page.evaluate(theme=>{document.documentElement.setAttribute('data-theme',theme);document.body.setAttribute('data-theme',theme);document.getElementById('reviewModal').style.display='flex';document.getElementById('reviewProductName').textContent='Joki PPT';},theme);
   await page.getByRole('button',{name:'4 bintang',exact:true}).click();
   assert((await page.locator('#reviewRatingLabel').innerText()).includes('4 / 5'));
   await page.locator('#revText').fill('Pelayanannya bagus.');
   assert.equal(await page.locator('#reviewCharCount').innerText(),'19 / 500');
   const bounds=await page.locator('.review-compose').boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=width);
   await page.screenshot({path:'tests/review-'+width+'-'+theme+'.png'});
  }
  await page.setContent('<img src="https://lh3.googleusercontent.com/a/ACg8ocKoDT683OYKT1A7eTyqcI66V6EBmT65ylHFSiWJGKo5lWYh=s96-c"><img src="https://lh3.googleusercontent.com/a/ACg8ocKUdNgMyjVlRqSZ3vHVRm9G6H19qEhlSDe7S4VPiAT__dJdWTg=s96-c">');
  await page.waitForTimeout(2000);await page.screenshot({path:'tests/review-google-avatars.png'});
  await page.evaluate(async()=>{for(const image of document.images) await window.checkReviewAvatar(image);});
  assert((await page.locator('img').first().getAttribute('src')).endsWith('/default.jpg'));
  assert((await page.locator('img').nth(1).getAttribute('src')).includes('ACg8ocKUdNg'));
  console.log(await page.evaluate(async()=>{const img=new Image();img.crossOrigin='anonymous';const done=new Promise(resolve=>{img.onload=()=>{try{const c=document.createElement('canvas');c.width=96;c.height=96;c.getContext('2d').drawImage(img,0,0,96,96);resolve([...c.getContext('2d').getImageData(0,0,1,1).data]);}catch(e){resolve(e.message);}};img.onerror=()=>resolve('CORS image failed');});img.src='https://lh3.googleusercontent.com/a/ACg8ocKoDT683OYKT1A7eTyqcI66V6EBmT65ylHFSiWJGKo5lWYh=s96-c';return done;}));
  console.log('PASS: responsive review modal, rating controls, counter, light/dark screenshots.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});