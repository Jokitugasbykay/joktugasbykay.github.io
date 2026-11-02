const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const workerSource = fs.readFileSync(path.join(root, 'src/worker.js'), 'utf8')
  .replace('export default {', 'globalThis.worker = {');

function createHarness({ mayarStatus = 200, mayarBody = { data: { link: 'https://pay.example/link', transactionId: 'tx-123' } } } = {}) {
  let mayarCapturedPayload = null;
  let supabaseCapturedPatch = null;

  const fetchMock = async (url, options = {}) => {
    const u = new URL(url);
    if (u.pathname.endsWith('/rpc/jokiin_rate_limit')) {
      return new Response(JSON.stringify(true), { status: 200 });
    }
    if (u.pathname.endsWith('/services')) {
      return new Response(JSON.stringify([
        {
          id: 6,
          slug: 'skripsi',
          name: 'Joki Skripsi',
          price: 16000000,
          sale_amount: 3000000,
          sale_percent: 0,
          sale_label: '',
          is_active: true
        }
      ]), { status: 200 });
    }
    if (u.pathname.endsWith('/payment_orders')) {
      if (options.method === 'POST') {
        return new Response(JSON.stringify([{ id: 'order-uuid-1' }]), { status: 201 });
      }
      if (options.method === 'PATCH') {
        supabaseCapturedPatch = JSON.parse(options.body);
        return new Response(JSON.stringify([{ id: 'order-uuid-1' }]), { status: 200 });
      }
      return new Response(JSON.stringify([]), { status: 200 });
    }
    if (u.pathname.endsWith('/order_items')) {
      return new Response(JSON.stringify([]), { status: 201 });
    }
    if (u.pathname.endsWith('/payments/create')) {
      mayarCapturedPayload = JSON.parse(options.body);
      return new Response(JSON.stringify(mayarBody), { status: mayarStatus });
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  const ctx = vm.createContext({
    Response,
    Request,
    URL,
    console,
    crypto,
    TextEncoder,
    TextDecoder,
    Uint8Array,
    fetch: fetchMock
  });

  vm.runInContext(workerSource, ctx);

  const env = {
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-key',
    MAYAR_API_KEY: 'test-mayar-key'
  };

  const sendCheckout = async (payload) => {
    const req = new Request('https://worker.example/api/create-mayar-payment', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://jokiin.my.id'
      },
      body: JSON.stringify(payload)
    });
    const res = await ctx.worker.fetch(req, env);
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  };

  return {
    sendCheckout,
    getMayarPayload: () => mayarCapturedPayload,
    getSupabasePatch: () => supabaseCapturedPatch
  };
}

test('Price calculation produces exact Subtotal Rp13.000.000, Discount Rp650.000, Total Rp12.350.000 for skripsi', async () => {
  const harness = createHarness();
  const res = await harness.sendCheckout({
    customer: { name: 'Test User', email: 'test@gmail.com', whatsapp: '081234567890' },
    task: { title: 'Tugas Skripsi', notes: 'Bab 1 sampai 5', deadline: '2026-11-20' },
    items: [{ productId: 'skripsi', quantity: 1 }],
    draftKey: 'req-calc-test-1',
    amount: 12350000
  });

  assert.equal(res.status, 201);
  assert.equal(res.data.total, 12350000);
  assert.equal(res.data.paymentUrl, 'https://pay.example/link');

  const mayarPayload = harness.getMayarPayload();
  assert.equal(mayarPayload.amount, 12350000);
  assert.equal(mayarPayload.mobile, '6281234567890');
  assert.equal(mayarPayload.name, 'Test User');
});

test('Rejects invalid WhatsApp numbers with HTTP 400 before creating payment order or calling Mayar', async () => {
  const invalidNumbers = [
    '62567895477654769134', // 20 digits (the failing screenshot attempt)
    '62182379817231789',    // 17 digits (earlier test attempt)
    '12345',                // Too short
    '08123',                // Incomplete
    'abcdefghijk'           // Non-numeric
  ];

  for (const wa of invalidNumbers) {
    const harness = createHarness();
    const res = await harness.sendCheckout({
      customer: { name: 'Test User', email: 'test@gmail.com', whatsapp: wa },
      task: { title: 'Tugas Skripsi', notes: 'Bab 1 sampai 5', deadline: '2026-11-20' },
      items: [{ productId: 'skripsi', quantity: 1 }],
      draftKey: 'req-calc-test-invalid',
      amount: 12350000
    });

    assert.equal(res.status, 400, `Expected 400 for ${wa}`);
    assert.match(res.data.error, /Nomor WhatsApp tidak valid/);
    assert.equal(harness.getMayarPayload(), null, 'Mayar must not be called when WhatsApp number is invalid');
  }
});

test('Surfaces Mayar 400 client rejection message instead of generic 502', async () => {
  const harness = createHarness({
    mayarStatus: 400,
    mayarBody: { statusCode: 400, message: 'Format nomor ponsel tidak valid' }
  });

  const res = await harness.sendCheckout({
    customer: { name: 'Test User', email: 'test@gmail.com', whatsapp: '081234567890' },
    task: { title: 'Tugas Skripsi', notes: 'Bab 1 sampai 5', deadline: '2026-11-20' },
    items: [{ productId: 'skripsi', quantity: 1 }],
    draftKey: 'req-calc-test-mayar-400',
    amount: 12350000
  });

  assert.equal(res.status, 400);
  assert.equal(res.data.error, 'Format nomor ponsel tidak valid');
  assert.deepEqual(harness.getSupabasePatch(), { payment_status: 'CANCELED' });
});

test('Returns 502 with friendly message when Mayar gateway experiences 5xx failure', async () => {
  const harness = createHarness({
    mayarStatus: 503,
    mayarBody: { statusCode: 503, message: 'Service Unavailable' }
  });

  const res = await harness.sendCheckout({
    customer: { name: 'Test User', email: 'test@gmail.com', whatsapp: '081234567890' },
    task: { title: 'Tugas Skripsi', notes: 'Bab 1 sampai 5', deadline: '2026-11-20' },
    items: [{ productId: 'skripsi', quantity: 1 }],
    draftKey: 'req-calc-test-mayar-503',
    amount: 12350000
  });

  assert.equal(res.status, 502);
  assert.equal(res.data.error, 'Layanan pembayaran sedang sibuk. Coba lagi.');
  assert.deepEqual(harness.getSupabasePatch(), { payment_status: 'CANCELED' });
});
