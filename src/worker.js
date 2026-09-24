const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'access-control-allow-origin': 'https://jokiin.my.id',
  'access-control-allow-headers': 'content-type,x-webhook-token,x-mayar-signature',
  'access-control-allow-methods': 'GET,POST,OPTIONS'
};

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
const clean = (value, max = 250) => typeof value === 'string' ? value.trim().slice(0, max) : '';

function supabaseHeaders(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase secret belum dikonfigurasi.');
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'content-type': 'application/json'
  };
}

async function supabase(env, path, options = {}) {
  const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${path}`, {
    ...options,
    headers: { ...supabaseHeaders(env), ...(options.headers || {}) }
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!response.ok) throw new Error(`Supabase error ${response.status}`);
  return data;
}

async function mayar(env, method, path, body) {
  if (!env.MAYAR_API_KEY) throw new Error('Mayar secret belum dikonfigurasi.');
  const response = await fetch(`https://api.mayar.id/hl/v2/${path.replace(/^\//, '')}`, {
    method,
    headers: { authorization: `Bearer ${env.MAYAR_API_KEY}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  return { response, data, text };
}

async function reconcilePayment(env, order) {
  if (order.payment_status === 'PAID' || !order.mayar_transaction_id) return order;
  const lastCheck = Date.parse(order.last_verified_at || '');
  if (Number.isFinite(lastCheck) && Date.now() - lastCheck < 8000) return order;
  const result = await mayar(env, 'GET', `transactions/${encodeURIComponent(order.mayar_transaction_id)}`);
  if (!result.response.ok) return order;
  const transaction = result.data?.data;
  const status = String(transaction?.status || '').toLowerCase();
  const amount = Number(transaction?.amount);
  const changes = { last_verified_at: new Date().toISOString() };
  if (status === 'paid' && Number.isSafeInteger(amount) && amount >= Number(order.total_price)) {
    changes.payment_status = 'PAID';
    changes.paid_at = new Date().toISOString();
  } else if (['expired', 'canceled', 'cancelled', 'failed'].includes(status)) {
    changes.payment_status = 'CANCELED';
  }
  await supabase(env, `payment_orders?id=eq.${encodeURIComponent(order.id)}`, { method: 'PATCH', body: JSON.stringify(changes) });
  return { ...order, ...changes };
}

function corsOk(request) {
  const origin = request.headers.get('origin');
  return !origin || origin === 'https://jokiin.my.id' || origin === 'https://www.jokiin.my.id';
}

async function createPayment(request, env) {
  if (!corsOk(request)) return json({ error: 'Origin tidak diizinkan.' }, 403);
  const input = await request.json();
  const customer = input && typeof input.customer === 'object' ? input.customer : {};
  const items = Array.isArray(input?.items) ? input.items : [];
  const task = input && typeof input.task === 'object' && input.task !== null ? input.task : {};
  if (!clean(customer.name, 100) || !/^\S+@\S+\.\S+$/.test(clean(customer.email, 254))) return json({ error: 'Data pelanggan tidak valid.' }, 400);
  if (!items.length || items.length > 20) return json({ error: 'Keranjang tidak valid.' }, 400);
  if (!clean(task.title, 250) || !clean(task.notes, 3000) || !clean(task.deadline, 50)) return json({ error: 'Detail tugas belum lengkap.' }, 400);

  const slugs = [...new Set(items.map(item => clean(item?.productId, 80)).filter(Boolean))];
  if (!slugs.length || slugs.some(slug => !/^[a-z0-9-]+$/.test(slug))) return json({ error: 'Layanan tidak valid.' }, 400);
  const filter = slugs.map(encodeURIComponent).join(',');
  const services = await supabase(env, `services?slug=in.(${filter})&select=id,slug,name,price,is_active,sale_percent,sale_amount,sale_label`);
  const catalog = new Map(services.filter(item => item.is_active !== false).map(item => [item.slug, item]));
  let total = 0;
  const lines = [];
  for (const item of items) {
    const quantity = Number(item.quantity);
    const service = catalog.get(clean(item.productId, 80));
    if (!service || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) return json({ error: 'Layanan atau jumlah tidak valid.' }, 400);
    const originalPrice = Number(service.price);
    const salePercent = Math.max(0, Math.min(100, Number(service.sale_percent) || 0));
    const saleAmount = Math.max(0, Number(service.sale_amount) || 0);
    const price = Math.max(1, Math.round(originalPrice - (saleAmount > 0 ? saleAmount : originalPrice * salePercent / 100)));
    if (!Number.isSafeInteger(originalPrice) || originalPrice <= 0 || !Number.isSafeInteger(price) || price < 0) return json({ error: 'Harga layanan belum valid.' }, 503);
    total += price * quantity;
    lines.push({ service_id: service.id, product_id: service.slug, name: service.name, quantity, unit_price: price, original_price: originalPrice, sale_percent: salePercent, sale_amount: saleAmount, sale_label: clean(service.sale_label, 50) });
  }
  const submittedPromo = clean(input.promo, 24).toUpperCase();
  if (submittedPromo) {
    const campaign = await activePromo(env);
    if (!campaign || submittedPromo !== campaign.coupon) return json({ error: 'Kode promo tidak berlaku atau sudah berakhir.' }, 409);
    total = Math.round(total * (1 - campaign.discount_percent / 100));
  }
  if (Number(input.amount) !== total) return json({ error: 'Harga berubah. Muat ulang layanan sebelum membayar.' }, 409);
  const requestKey = clean(input.draftKey, 100);
  if (!/^(?:[0-9a-f-]{36}|req-[a-z0-9-]+)$/i.test(requestKey)) return json({ error: 'Identitas permintaan tidak valid.' }, 400);
  const previous = await supabase(env, `payment_orders?request_key=eq.${encodeURIComponent(requestKey)}&select=id,customer,total_price,payment_status,payment_url,mayar_transaction_id,expires_at&limit=1`);
  if (previous.length) {
    const saved = previous[0];
    if (saved.customer?.email !== clean(customer.email, 254).toLowerCase() || Number(saved.total_price) !== total) return json({ error: 'Permintaan checkout berubah. Coba ulang.' }, 409);
    // Link pending yang masih berlaku dikembalikan agar klik ulang tidak membuat tagihan ganda.
    if (saved.payment_status === 'PENDING' && saved.payment_url) {
      return json({ order_id: saved.id, paymentUrl: saved.payment_url, payment_status: saved.payment_status, transaction_id: saved.mayar_transaction_id, expires_at: saved.expires_at, total });
    }
    // Percobaan gagal/kedaluwarsa tidak boleh mengunci draft checkout selamanya.
    // Lepaskan request_key lama (tetap menyimpan riwayat barisnya) lalu buat tagihan baru di bawah.
    await supabase(env, `payment_orders?id=eq.${encodeURIComponent(saved.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        request_key: null,
        payment_status: saved.payment_status === 'PENDING' ? 'CANCELED' : saved.payment_status
      })
    });
  }
  const orderCode = `NUG-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
  const order = { order_code: orderCode, request_key: requestKey, customer: { name: clean(customer.name, 100), nim: clean(customer.nim, 50), email: clean(customer.email, 254).toLowerCase(), whatsapp: clean(customer.whatsapp, 24) }, task: { title: clean(task.title, 250), deadline: clean(task.deadline, 50), notes: clean(task.notes, 3000), googleDriveUrl: clean(task.googleDriveUrl, 2048) }, promo: submittedPromo, items: lines, total_price: total, payment_status: 'PENDING', status: 'pending' };
  const inserted = await supabase(env, 'payment_orders', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(order) });
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const payment = await mayar(env, 'POST', 'payments/create', { name: `JOKI.IN - ${lines[0].name}`, amount: total, email: order.customer.email, mobile: order.customer.whatsapp, description: `Pesanan ${orderCode}`, expiredAt: expiresAt });
  const data = payment.data?.data || {};
  const paymentUrl = data.link;
  const transactionId = data.transactionId || data.transaction_id || data.id;
  if (!payment.response.ok || typeof paymentUrl !== 'string' || !transactionId) {
    await supabase(env, `payment_orders?order_code=eq.${encodeURIComponent(orderCode)}`, { method: 'PATCH', body: JSON.stringify({ payment_status: 'CANCELED' }) }).catch(() => {});
    return json({ error: 'Layanan pembayaran sedang sibuk. Coba lagi.' }, 502);
  }
  await supabase(env, `payment_orders?order_code=eq.${encodeURIComponent(orderCode)}`, { method: 'PATCH', body: JSON.stringify({ payment_url: paymentUrl, mayar_transaction_id: transactionId, expires_at: expiresAt }) });
  return json({ order_id: inserted?.[0]?.id || orderCode, order_code: orderCode, paymentUrl, payment_status: 'PENDING', transaction_id: transactionId, expires_at: expiresAt, total }, 201);
}

async function webhook(request, env) {
  const expected = env.MAYAR_WEBHOOK_SECRET;
  const supplied = request.headers.get('x-webhook-token');
  if (expected && supplied !== expected) return json({ error: 'Unauthorized webhook.' }, 401);
  const payload = await request.json();
  const data = payload?.data || payload;
  const transactionId = data.transactionId || data.transaction_id || data.id;
  if (!transactionId) return json({ received: true, matched: false });
  const rows = await supabase(env, `payment_orders?mayar_transaction_id=eq.${encodeURIComponent(transactionId)}&select=id,order_code,payment_status,total_price,mayar_transaction_id,last_verified_at&limit=1`);
  if (!rows.length) return json({ received: true, matched: false });
  const verified = await reconcilePayment(env, rows[0]);
  return json({ received: true, matched: true, payment_status: verified.payment_status });
}

async function paymentStatus(request, env) {
  const url = new URL(request.url);
  const reference = clean(url.searchParams.get('order_code') || url.searchParams.get('order_id'), 80);
  if (!reference) return json({ error: 'Nomor pesanan wajib diisi.' }, 400);
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(reference);
  const filter = isUuid
    ? `id=eq.${encodeURIComponent(reference)}`
    : `order_code=eq.${encodeURIComponent(reference.toUpperCase())}`;
  const rows = await supabase(env, `payment_orders?${filter}&select=id,order_code,total_price,payment_status,payment_url,expires_at,mayar_transaction_id,last_verified_at&limit=1`);
  if (!rows.length) return json({ error: 'Pesanan tidak ditemukan.' }, 404);
  const order = await reconcilePayment(env, rows[0]);
  return json({ order_id: order.id, order_code: order.order_code, amount: order.total_price, payment_status: order.payment_status, payment_url: order.payment_status === 'PENDING' ? order.payment_url : null, expires_at: order.expires_at, transaction_id: order.mayar_transaction_id });
}

const DEFAULT_PROMO = {
  active: false,
  label: 'PROMO TERBATAS',
  text: 'Diskon s.d 30% semua pengerjaan tugas & makalah kuliah.',
  coupon: 'JOKIHEMAT',
  ends_at: null,
  discount_percent: 0
};

async function activePromo(env) {
  const rows = await supabase(env, 'site_settings?key=eq.home_promo&select=value&limit=1');
  const raw = rows?.[0]?.value;
  const p = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!p || p.active !== true) return null;
  const starts = Date.parse(p.starts_at || '');
  const ends = Date.parse(p.ends_at || '');
  const percent = Number(p.discount_percent);
  if (!Number.isFinite(starts) || !Number.isFinite(ends) || starts > Date.now() || ends <= Date.now()
    || ends - starts > 7 * 86400000 || !Number.isInteger(percent) || percent < 1 || percent > 90
    || !/^[A-Z0-9]{4,24}$/.test(p.coupon || '')) return null;
  return { ...p, coupon: p.coupon.toUpperCase(), discount_percent: percent };
}

async function promo(request, env) {
  if (!corsOk(request)) return json({ error: 'Origin tidak diizinkan.' }, 403);
  try {
    const stored = await activePromo(env);
    const code = new URL(request.url).searchParams.get('code');
    if (code !== null) return json({ valid: !!stored && clean(code, 24).toUpperCase() === stored.coupon,
      discount_percent: stored && clean(code, 24).toUpperCase() === stored.coupon ? stored.discount_percent : 0 });
    if (!stored) return json({ promo: DEFAULT_PROMO });
    return json({ promo: {
      active: true,
      label: clean(stored.label, 40) || DEFAULT_PROMO.label,
      text: clean(stored.text, 180) || DEFAULT_PROMO.text,
      coupon: stored.coupon,
      ends_at: stored.ends_at,
      discount_percent: stored.discount_percent
    } });
  } catch (_) {
    return json({ error: 'Pengaturan promo belum tersedia.' }, 503);
  }
}

export default { async fetch(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: JSON_HEADERS });
  const url = new URL(request.url);
  try {
    if (url.pathname === '/api/health') return json({ ok: true, worker: 'jokiin-payment-api' });
    if (url.pathname === '/api/create-mayar-payment' && request.method === 'POST') return await createPayment(request, env);
    if (url.pathname === '/api/mayar-webhook' && request.method === 'POST') return await webhook(request, env);
    if (url.pathname === '/api/check-status' && request.method === 'GET') return await paymentStatus(request, env);
    if (url.pathname === '/api/promo' && request.method === 'GET') return await promo(request, env);
    if (/\.(?:php|sql|sqlite|env)$/i.test(url.pathname) || /^\/(?:database|storage|api)\//i.test(url.pathname)) return json({ error: 'Not found' }, 404);
    // SPA fallback: direct visits such as /payment or /prices still serve index.html.
    if (env.ASSETS) {
      const asset = await env.ASSETS.fetch(request);
      if (asset.status !== 404) return asset;
      return env.ASSETS.fetch(new Request(new URL('/', request.url), request));
    }
    return json({ error: 'Not found' }, 404);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Worker error');
    return json({ error: 'Server belum dapat memproses permintaan.' }, 500);
  }
} };
