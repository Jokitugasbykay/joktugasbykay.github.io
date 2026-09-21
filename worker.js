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

function corsOk(request) {
  const origin = request.headers.get('origin');
  return !origin || origin === 'https://jokiin.my.id' || origin === 'https://www.jokiin.my.id';
}

async function createPayment(request, env) {
  if (!corsOk(request)) return json({ error: 'Origin tidak diizinkan.' }, 403);
  const input = await request.json();
  const customer = input && typeof input.customer === 'object' ? input.customer : {};
  const items = Array.isArray(input?.items) ? input.items : [];
  if (!clean(customer.name, 100) || !/^\S+@\S+\.\S+$/.test(clean(customer.email, 254))) return json({ error: 'Data pelanggan tidak valid.' }, 400);
  if (!items.length || items.length > 20) return json({ error: 'Keranjang tidak valid.' }, 400);

  const slugs = [...new Set(items.map(item => clean(item?.productId, 80)).filter(Boolean))];
  if (!slugs.length || slugs.some(slug => !/^[a-z0-9-]+$/.test(slug))) return json({ error: 'Layanan tidak valid.' }, 400);
  const filter = slugs.map(encodeURIComponent).join(',');
  const services = await supabase(env, `services?slug=in.(${filter})&select=id,slug,name,price,is_active`);
  const catalog = new Map(services.filter(item => item.is_active !== false).map(item => [item.slug, item]));
  let total = 0;
  const lines = [];
  for (const item of items) {
    const quantity = Number(item.quantity);
    const service = catalog.get(clean(item.productId, 80));
    if (!service || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) return json({ error: 'Layanan atau jumlah tidak valid.' }, 400);
    const price = Number(service.price);
    if (!Number.isSafeInteger(price) || price < 0) return json({ error: 'Harga layanan belum valid.' }, 503);
    total += price * quantity;
    lines.push({ service_id: service.id, product_id: service.slug, name: service.name, quantity, unit_price: price });
  }
  const orderCode = `NUG-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
  const order = { order_code: orderCode, customer: { name: clean(customer.name, 100), email: clean(customer.email, 254).toLowerCase(), whatsapp: clean(customer.whatsapp, 24) }, items: lines, total_price: total, payment_status: 'PENDING', status: 'pending' };
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
  return json({ order_id: inserted?.[0]?.id || orderCode, order_code: orderCode, paymentUrl, payment_status: 'PENDING', transaction_id: transactionId, total }, 201);
}

async function webhook(request, env) {
  const expected = env.MAYAR_WEBHOOK_SECRET;
  const supplied = request.headers.get('x-webhook-token') || request.headers.get('x-mayar-signature');
  if (expected && supplied !== expected) return json({ error: 'Unauthorized webhook.' }, 401);
  const payload = await request.json();
  const data = payload?.data || payload;
  const transactionId = data.transactionId || data.transaction_id || data.id;
  if (!transactionId) return json({ received: true, matched: false });
  const rows = await supabase(env, `payment_orders?mayar_transaction_id=eq.${encodeURIComponent(transactionId)}&select=id,order_code,payment_status,total_price&limit=1`);
  if (!rows.length || ['PAID', 'CANCELED'].includes(rows[0].payment_status)) return json({ received: true, matched: Boolean(rows.length) });
  const status = String(data.status || '').toLowerCase();
  const next = ['paid', 'settled', 'success'].includes(status) ? 'PAID' : ['expired', 'canceled', 'cancelled', 'failed'].includes(status) ? 'CANCELED' : 'PENDING';
  if (next !== 'PENDING') await supabase(env, `payment_orders?id=eq.${encodeURIComponent(rows[0].id)}`, { method: 'PATCH', body: JSON.stringify({ payment_status: next, paid_at: next === 'PAID' ? new Date().toISOString() : null }) });
  return json({ received: true, matched: true, payment_status: next });
}

async function paymentStatus(request, env) {
  const url = new URL(request.url);
  const reference = clean(url.searchParams.get('order_code') || url.searchParams.get('order_id'), 80);
  if (!reference) return json({ error: 'Nomor pesanan wajib diisi.' }, 400);
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(reference);
  const filter = isUuid
    ? `id=eq.${encodeURIComponent(reference)}`
    : `order_code=eq.${encodeURIComponent(reference.toUpperCase())}`;
  const rows = await supabase(env, `payment_orders?${filter}&select=id,order_code,total_price,payment_status,payment_url,expires_at,mayar_transaction_id&limit=1`);
  if (!rows.length) return json({ error: 'Pesanan tidak ditemukan.' }, 404);
  return json({ order_id: rows[0].id, order_code: rows[0].order_code, amount: rows[0].total_price, payment_status: rows[0].payment_status, payment_url: rows[0].payment_status === 'PENDING' ? rows[0].payment_url : null, expires_at: rows[0].expires_at, transaction_id: rows[0].mayar_transaction_id });
}

export default { async fetch(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: JSON_HEADERS });
  const url = new URL(request.url);
  try {
    if (url.pathname === '/api/health') return json({ ok: true, worker: 'jokiin-payment-api' });
    if (url.pathname === '/api/create-mayar-payment' && request.method === 'POST') return await createPayment(request, env);
    if (url.pathname === '/api/mayar-webhook' && request.method === 'POST') return await webhook(request, env);
    if (url.pathname === '/api/check-status' && request.method === 'GET') return await paymentStatus(request, env);
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
