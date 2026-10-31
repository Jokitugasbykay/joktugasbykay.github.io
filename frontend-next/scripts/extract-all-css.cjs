const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../../');
const htmlPath = path.join(rootDir, 'legacy', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const regex = /(<link\s+rel=["']stylesheet["'][^>]*>|<style[^>]*>[\s\S]*?<\/style>)/gi;
let match;
let count = 0;

let combinedCss = '/* JOKI.IN AUTHENTIC COMPLETE STOREFRONT STYLES */\n\n';

while ((match = regex.exec(html)) !== null) {
  count++;
  const tag = match[0];
  if (tag.startsWith('<link')) {
    const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
    const href = hrefMatch ? hrefMatch[1] : '';
    console.log(`${count}: LINK href="${href}"`);
    // Extract local asset file if available
    let assetRel = href.replace(/^\//, '').split('?')[0];
    const assetPath = path.join(rootDir, assetRel);
    if (fs.existsSync(assetPath)) {
      console.log(`  -> Bundling asset: ${assetPath}`);
      const content = fs.readFileSync(assetPath, 'utf8');
      combinedCss += `\n/* === EXTERNAL STYLESHEET: ${assetRel} === */\n` + content + '\n';
    } else {
      console.log(`  -> Not found or remote: ${assetPath}`);
    }
  } else {
    const idMatch = tag.match(/id=["']([^"']*)["']/i);
    const id = idMatch ? idMatch[1] : `inline-style-${count}`;
    console.log(`${count}: STYLE id="${id}"`);
    const cssContent = tag.replace(/<style[^>]*>/i, '').replace(/<\/style>/i, '');
    combinedCss += `\n/* === INLINE STYLE: #${id} === */\n` + cssContent + '\n';
  }
}

console.log(`Total styles/links extracted: ${count}`);
const outCssPath = path.join(__dirname, '../src/app/legacy-storefront.css');
fs.writeFileSync(outCssPath, combinedCss, 'utf8');
console.log(`Wrote combined CSS (${combinedCss.length} bytes) to ${outCssPath}`);
