const services = {
  mlbb: ['Mobile Legends', /mlbb|mobile[ -]legends/i], ff: ['Free Fire', /free[ -]fire|(?:^|[\s-])ff(?:$|[\s-])/i],
  genshin: ['Genshin Impact', /genshin/i], hsr: ['Honkai: Star Rail', /honkai[\s:-]+star[ -]rail|\bhsr\b/i],
  zzz: ['Zenless Zone Zero', /zenless|\bzzz\b/i], pubg: ['PUBG Mobile', /pubg/i],
  hok: ['Honor of Kings', /honor[ -]of[ -]kings|\bhok\b/i], gemini: ['Google AI Pro', /gemini|google[ -]ai[ -]pro/i],
  claude: ['Claude', /claude/i], axis: ['Pulsa AXIS', /\baxis\b/i], tri: ['Pulsa Tri', /\btri\b|\bthree\b/i], telkomsel: ['Pulsa Telkomsel', /telkomsel/i]
};
const params = new URLSearchParams(location.search);
const key = params.get('game');
const provider = params.get('provider');
const service = Object.hasOwn(services, key) ? services[key] : null;
const title = service?.[0] || provider;
const el = id => document.getElementById(id);
const container = el('packages-container');
const format = new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', maximumFractionDigits:0 });
const node = (tag, text, className) => { const n = document.createElement(tag); n.textContent = text; if (className) n.className = className; return n; };
let selected = null;
const checkout = el('inline-checkout');
const checkoutStatus = el('inline-checkout-status');
const checkoutButton = el('btn-pay-now');
if (title) { el('game-hero-title').textContent = title; document.title = title + ' · JOKI.IN'; }
el('nominal-section-title').textContent = 'Pilih paket';
const status = node('p', 'Memuat paket…');
status.setAttribute('role', 'status');
container.append(status);
async function load() {
  if (!title) throw new Error('Pilih layanan dari etalase.');
  const res = await fetch('/api/digital-store/products', { signal: AbortSignal.timeout(15000) });
  const data = await res.json();
  if (!res.ok || !data.ok || !Array.isArray(data.products)) throw new Error(data.error || 'Katalog belum dapat dimuat.');
  const products = data.products.filter(p => {
    const name = [p.slug,p.nama,p.provider,p.brand].filter(Boolean).join(' ');
    return service ? service[1].test(name) : (p.provider || p.brand) === provider || p.nama?.startsWith(provider + ' ');
  });
  status.remove();
  if (!products.length) { container.append(node('p','Belum ada paket aktif untuk layanan ini.')); return; }
  for (const product of products) {
    const price = Math.round(Number(product.harga_dasar) * (1 - Math.min(100,Math.max(0,Number(product.diskon_persen)||0)) / 100));
    const available = Number(product.stok) > 0 && Number.isSafeInteger(price) && price >= 500 && product.slug;
    const card = node('button', '', 'digital-store-package-card');
    card.type = 'button'; card.disabled = !available;
    card.append(node('strong',product.nama,'digital-store-card-title'),node('span',price >= 500 ? format.format(price) : 'Harga belum tersedia','digital-store-price-val'));
    if (!available) card.append(node('small', Number(product.stok) > 0 ? 'Belum bisa dibeli' : 'Stok habis'));
    card.addEventListener('click', () => {
      container.querySelectorAll('.digital-store-package-card').forEach(item => item.classList.remove('selected'));
      if (selected?.slug !== product.slug) {
        checkout.hidden = true;
        checkout.querySelector('.layout')?.remove();
      }
      card.classList.add('selected'); selected = product;
      el('selection-empty').style.display = 'none'; el('selection-active').style.display = 'block';
      el('summary-title').textContent = product.nama; el('summary-desc').textContent = product.deskripsi || 'Periksa detail paket sebelum melanjutkan.';
      el('summary-price').textContent = format.format(price); el('summary-total').textContent = format.format(price);
      const button = el('btn-pay-now'); button.disabled = false; button.classList.remove('disabled'); button.classList.add('ready'); el('btn-pay-label').textContent = 'Lanjut ke checkout';
    });
    container.append(card);
  }
}
checkoutButton.addEventListener('click', async () => {
  if (!selected || checkoutButton.disabled) return;
  checkout.hidden = false;
  checkout.scrollIntoView({ block: 'start' });
  if (checkout.querySelector('.layout')) return;
  checkoutStatus.hidden = false;
  checkoutStatus.textContent = 'Memuat checkout…';
  checkoutButton.disabled = true;
  const choices = [...container.querySelectorAll('button:not(:disabled)')];
  choices.forEach(choice => { choice.disabled = true; });
  try {
    const { showCheckout } = await import('./order-flow.js?v=store3');
    await showCheckout({ slug: selected.slug, root: checkout, status: checkoutStatus });
  } catch (error) {
    checkoutStatus.textContent = error.name === 'TimeoutError' ? 'Checkout terlalu lama. Coba lagi.' : error.message;
  } finally {
    checkoutButton.disabled = false;
    choices.forEach(choice => { choice.disabled = false; });
  }
});
load().catch(error => { status.textContent = error.name === 'TimeoutError' ? 'Permintaan terlalu lama. Muat ulang halaman.' : error.message; });
