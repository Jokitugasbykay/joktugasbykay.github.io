const services = {
  mlbb: 'Mobile Legends', ff: 'Free Fire', genshin: 'Genshin Impact',
  hsr: 'Honkai: Star Rail', zzz: 'Zenless Zone Zero', pubg: 'PUBG Mobile',
  gemini: 'Google AI Pro', claude: 'Claude', axis: 'Pulsa AXIS',
  tri: 'Pulsa Tri', telkomsel: 'Pulsa Telkomsel', hok: 'Honor of Kings'
};
const patterns = {
  mlbb: /mlbb|mobile[ -]legends/i, ff: /free[ -]fire|(?:^|[\s-])ff(?:$|[\s-])/i,
  genshin: /genshin/i, hsr: /honkai[\s:-]+star[ -]rail|(?:^|[\s-])hsr(?:$|[\s-])/i,
  zzz: /zenless[ -]zone[ -]zero|(?:^|[\s-])zzz(?:$|[\s-])/i,
  pubg: /pubg/i, gemini: /gemini|google[ -]ai[ -]pro/i, claude: /claude/i,
  axis: /\baxis\b/i, tri: /\btri\b|\bthree\b/i, telkomsel: /telkomsel/i,
  hok: /honor[ -]of[ -]kings|(?:^|[\s-])hok(?:$|[\s-])/i
};
const root = document.querySelector('main');
const status = document.querySelector('#status');
const query = new URLSearchParams(location.search);
const format = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const unit = p => Math.round(Number(p.harga_dasar) * (1 - Math.min(100, Math.max(0, Number(p.diskon_persen) || 0)) / 100));
const stock = p => p.stok == null ? 10 : Number(p.stok);
function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  if (className) element.className = className;
  return element;
}
function link(text, href, className) {
  const a = node('a', text, className);
  a.href = href;
  return a;
}
async function api(path, options) {
  const response = await fetch('/api/digital-store/' + path, {
    ...options,
    signal: AbortSignal.timeout(15000)
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw Object.assign(new Error(result.error || 'Permintaan gagal.'), { orderCode: result.order_code });
  return result;
}
async function showProducts() {
  const key = query.get('game');
  const provider = query.get('provider');
  const title = Object.hasOwn(services, key) ? services[key] : provider;
  if (!title) throw new Error('Pilih layanan dari etalase.');
  document.querySelector('h1').textContent = title;
  document.title = title + ' · JOKI.IN';
  const { products } = await api('products');
  const packages = products.filter(p => {
    const name = [p.slug, p.nama, p.provider, p.brand].filter(Boolean).join(' ');
    return Object.hasOwn(patterns, key) ? patterns[key].test(name) : (p.provider || p.brand) === provider || p.nama?.startsWith(provider + ' ');
  });
  if (!packages.length) { status.textContent = 'Belum ada paket aktif untuk layanan ini.'; return; }
  status.hidden = true;
  const grid = node('div', '', 'packages');
  for (const p of packages) {
    const card = node('article', '', 'panel package');
    card.append(node('h2', p.nama), node('strong', unit(p) >= 500 ? format.format(unit(p)) : 'Harga belum tersedia'));
    if (stock(p) > 0 && unit(p) >= 500 && p.slug) card.append(link('Pilih paket', '/produk-digital/checkout/?slug=' + encodeURIComponent(p.slug), 'action'));
    else card.append(node('p', stock(p) <= 0 ? 'Stok habis' : 'Belum bisa dibeli'));
    grid.append(card);
  }
  root.append(grid);
}
function field(form, name, title, kind) {
  const label = node('label', title);
  const input = node(kind === 'region' ? 'select' : 'input');
  input.name = name;
  input.required = true;
  if (kind === 'region') {
    for (const value of ['', 'Asia', 'America', 'Europe', 'TW, HK, MO']) {
      const option = node('option', value || 'Pilih server');
      option.value = value;
      input.append(option);
    }
  } else {
    input.type = { email: 'email', phone: 'tel' }[kind] || 'text';
    if (kind === 'id') { input.inputMode = 'numeric'; input.pattern = '[0-9]{1,24}'; input.maxLength = 24; }
    else input.maxLength = kind === 'email' ? 254 : kind === 'phone' ? 24 : 100;
    if (kind === 'email') input.autocomplete = 'email';
  }
  label.append(input);
  form.append(label);
  return input;
}
async function showCheckout() {
  const slug = query.get('slug') || '';
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) throw new Error('Pilih paket terlebih dahulu.');
  const { product } = await api('products/' + encodeURIComponent(slug));
  if (!Array.isArray(product.recipient_fields)) throw new Error('Checkout sedang diperbarui. Muat ulang untuk mencoba lagi.');
  const price = unit(product);
  const limit = Math.min(10, stock(product), Number(product.batas_beli_per_orang) || 10);
  if (!Number.isSafeInteger(price) || price < 500 || limit < 1) throw new Error('Paket ini belum bisa dibeli.');
  status.hidden = true;
  const layout = node('div', '', 'layout');
  const summary = node('section', '', 'panel');
  const total = node('strong', '', 'total');
  const form = node('form', '', 'panel payment');
  const quantity = field(summary, 'quantity', 'Jumlah paket', 'number');
  quantity.type = 'number';
  quantity.min = 1;
  quantity.max = limit;
  quantity.value = Math.min(limit, Math.max(1, Number.parseInt(query.get('qty'), 10) || 1));
  quantity.setAttribute('form', 'checkout-payment');
  form.id = 'checkout-payment';
  const updateTotal = () => { total.textContent = format.format(price * (Number(quantity.value) || 0)); };
  quantity.addEventListener('input', updateTotal);
  summary.prepend(node('h2', 'Ringkasan pesanan'), node('p', product.nama), node('p', format.format(price) + ' per paket'));
  summary.append(node('p', 'Total pesanan'), total);
  updateTotal();
  if (product.recipient_fields.length) {
    form.append(node('h2', 'Tujuan pengiriman'));
    for (const item of product.recipient_fields) field(form, 'recipient_' + item.key, item.label, item.kind);
  }
  form.append(node('h2', 'Kontak pembeli'));
  field(form, 'name', 'Nama lengkap', 'text').autocomplete = 'name';
  field(form, 'email', 'Email pengiriman dan bukti bayar', 'email');
  field(form, 'whatsapp', 'Nomor WhatsApp pembeli', 'phone').autocomplete = 'tel';
  const button = node('button', 'Lanjut ke Mayar', 'action');
  const notice = node('p', '', 'notice');
  notice.setAttribute('role', 'status');
  form.append(node('p', 'Metode pembayaran dipilih di halaman Mayar.'), button, notice);
  layout.append(summary, form);
  root.append(layout);
  let request;
  let pending = false;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (pending || !form.reportValidity()) return;
    const data = new FormData(form);
    const phone = value => String(value || '').replace(/[+\s()-]/g, '');
    const recipient = Object.fromEntries(product.recipient_fields.map(({key,kind}) => {
      const value = data.get('recipient_' + key);
      return [key, kind === 'phone' ? phone(value) : String(value).trim()];
    }));
    const qty = Number(data.get('quantity'));
    const payload = { slug, qty, recipient, expected_total: price * qty, customer: {
      name: String(data.get('name')).trim(), email: String(data.get('email')).trim(), whatsapp: phone(data.get('whatsapp'))
    }};
    const signature = JSON.stringify(payload);
    if (request?.signature !== signature) request = { signature, key: 'digital-' + crypto.randomUUID() };
    pending = true;
    button.disabled = true;
    notice.textContent = 'Menyiapkan pembayaran…';
    try {
      const result = await api('checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, request_key: request.key }) });
      if (result.payment_status === 'PAID') location.assign('/produk-digital/pesanan/?order=' + encodeURIComponent(result.order_code));
      else {
        const url = new URL(result.payment_url);
        if (url.protocol !== 'https:') throw new Error('Tautan pembayaran tidak valid.');
        location.assign(url.href);
      }
    } catch (error) {
      notice.textContent = error.name === 'TimeoutError' ? 'Pembayaran belum merespons. Coba lagi dengan data yang sama.' : error.message;
      if (error.orderCode) {
        notice.append(' ', link('Lihat status pesanan', '/produk-digital/pesanan/?order=' + encodeURIComponent(error.orderCode)));
      } else button.disabled = false;
    } finally { pending = false; }
  });
}
const load = document.body.dataset.page === 'checkout' ? showCheckout : showProducts;
load().catch(error => { status.hidden = false; status.textContent = error.name === 'TimeoutError' ? 'Permintaan terlalu lama. Muat ulang untuk mencoba lagi.' : error.message; });
