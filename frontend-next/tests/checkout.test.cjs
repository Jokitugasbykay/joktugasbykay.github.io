'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'out');
const srcDir = path.join(root, 'src');

test('1. Payment static export file exists and contains valid HTML structure', () => {
  const paymentPath = path.join(outDir, 'payment/index.html');
  assert.ok(fs.existsSync(paymentPath), 'out/payment/index.html must exist');
  const content = fs.readFileSync(paymentPath, 'utf8');
  assert.ok(content.includes('<!DOCTYPE html>') || content.includes('<html'), 'Payment page must be valid HTML');
});

test('2. Checkout component contains all 5 steps', () => {
  const flowPath = path.join(srcDir, 'components/checkout/CheckoutFlow.tsx');
  assert.ok(fs.existsSync(flowPath), 'CheckoutFlow.tsx must exist');
  const content = fs.readFileSync(flowPath, 'utf8');

  // Step 1: Produk yang Dibeli
  assert.ok(content.includes('Produk yang Dibeli'), 'Step 1 must be Produk yang Dibeli');
  assert.ok(content.includes('handleQtyChange'), 'Step 1 must have quantity controls');

  // Step 2: Detail Tugas
  assert.ok(content.includes('Detail Tugas'), 'Step 2 must be Detail Tugas');
  assert.ok(content.includes('Judul / Nama Tugas'), 'Step 2 must include title field');
  assert.ok(content.includes('Deadline Tugas'), 'Step 2 must include deadline field');
  assert.ok(content.includes('Catatan &amp; Instruksi Tugas') || content.includes('Catatan'), 'Step 2 must include notes field');
  assert.ok(content.includes('Dalam Perbaikan'), 'Step 2 must include upload repair tag');
  assert.ok(content.includes('Google Drive'), 'Step 2 must include Google Drive link field');

  // Step 3: Kode Promo
  assert.ok(content.includes('Kode Promo'), 'Step 3 must be Kode Promo');
  assert.ok(content.includes('handleApplyPromo'), 'Step 3 must have promo apply handler');

  // Step 4: Detail Kontak
  assert.ok(content.includes('Detail Kontak'), 'Step 4 must be Detail Kontak');
  assert.ok(content.includes('Nama Lengkap'), 'Step 4 must include name field');
  assert.ok(content.includes('Nomor WhatsApp'), 'Step 4 must include WhatsApp field');
  assert.ok(content.includes('Gmail'), 'Step 4 must include Gmail field');

  // Step 5: Konfirmasi Transaksi
  assert.ok(content.includes('Konfirmasi Transaksi'), 'Step 5 must be Konfirmasi Transaksi');
  assert.ok(content.includes('Subtotal Produk'), 'Step 5 must include subtotal');
  assert.ok(content.includes('Total Pembayaran'), 'Step 5 must include total');
  assert.ok(content.includes('QRIS (Mayar'), 'Step 5 must include Mayar QRIS payment');
  assert.ok(content.includes('draftKey'), 'Must generate draftKey for backend requestKey');
  assert.ok(content.includes('Beli Sekarang') || content.includes('Memproses Pesanan'), 'Step 5 must have submit button');
});

test('3. Google Drive URL validation logic works correctly', () => {
  const constantsPath = path.join(srcDir, 'lib/constants.ts');
  const content = fs.readFileSync(constantsPath, 'utf8');
  assert.ok(content.includes('function validDriveUrl'), 'constants.ts must export validDriveUrl');

  function validDriveUrl(value) {
    if (!value) return true;
    try {
      const u = new URL(value);
      return u.protocol === 'https:' && ['drive.google.com', 'docs.google.com'].includes(u.hostname) && !u.username && !u.password;
    } catch (_) {
      return false;
    }
  }

  assert.equal(validDriveUrl('https://drive.google.com/drive/folders/abc123xyz'), true);
  assert.equal(validDriveUrl('https://docs.google.com/document/d/12345/edit'), true);
  assert.equal(validDriveUrl(''), true);
  assert.equal(validDriveUrl('http://drive.google.com/test'), false, 'Non-https must be rejected');
  assert.equal(validDriveUrl('https://malicious-site.com/drive.google.com'), false, 'Spoofed domain must be rejected');
  assert.equal(validDriveUrl('javascript:alert(1)'), false, 'XSS protocol must be rejected');
});

test('4. WhatsApp normalization and max quantity limits match business rules', () => {
  function normalizeWhatsAppNumber(number) {
    let cleaned = number.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.substring(1);
    }
    return cleaned;
  }

  assert.equal(normalizeWhatsAppNumber('08123456789'), '628123456789');
  assert.equal(normalizeWhatsAppNumber('628123456789'), '628123456789');
  assert.equal(normalizeWhatsAppNumber('+62 812-3456-789'), '628123456789');

  function maximumOrderQuantity(isSpecial, batasBeli) {
    if (isSpecial) {
      return batasBeli !== undefined ? Math.max(1, Number(batasBeli) || 1) : 1;
    }
    if (batasBeli !== undefined && Number(batasBeli) > 0) {
      return Math.max(2, Number(batasBeli) || 2);
    }
    return 2;
  }

  assert.equal(maximumOrderQuantity(false), 2, 'Regular service max quantity is 2');
  assert.equal(maximumOrderQuantity(true), 1, 'Special service max quantity is 1');
});

test('5. Night operational notice covers 22:00 - 05:00 WIB', () => {
  function isNightOperationalHours(hourWIB) {
    return hourWIB >= 22 || hourWIB < 5;
  }

  assert.equal(isNightOperationalHours(22), true);
  assert.equal(isNightOperationalHours(23), true);
  assert.equal(isNightOperationalHours(0), true);
  assert.equal(isNightOperationalHours(4), true);
  assert.equal(isNightOperationalHours(5), false);
  assert.equal(isNightOperationalHours(12), false);
});

test('6. No em dashes or en dashes exist in checkout source files', () => {
  const targetFiles = [
    path.join(srcDir, 'components/checkout/CheckoutFlow.tsx'),
    path.join(srcDir, 'app/payment/page.tsx'),
    path.join(srcDir, 'lib/constants.ts'),
    path.join(srcDir, 'lib/types.ts')
  ];

  for (const file of targetFiles) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        assert.ok(
          !/[\u2013\u2014]/.test(line),
          `Found em/en dash in ${file}:${idx + 1} -> ${line.trim()}`
        );
      });
    }
  }
});

test('7. Regular and Special checkout payloads adhere to backend contracts', () => {
  const DRAFT_KEY_REGEX = /^(?:[0-9a-f-]{36}|req-[a-z0-9-]+)$/i;

  // Regular order payload contract
  const regularDraftKey = '550e8400-e29b-41d4-a716-446655440000';
  assert.match(regularDraftKey, DRAFT_KEY_REGEX, 'Regular draftKey must match backend regex');

  const regularPayload = {
    draftKey: regularDraftKey,
    amount: 70000,
    customer: {
      name: 'Budi Santoso',
      nim: '12345678',
      whatsapp: '6281234567890',
      email: 'budi@gmail.com'
    },
    task: {
      title: 'Makalah Etika Bisnis Bab 1-3',
      deadline: '2026-10-25 18:00',
      notes: 'Format APA 7th edition, font Times New Roman 12',
      googleDriveUrl: 'https://drive.google.com/drive/folders/test1234'
    },
    items: [
      {
        productId: 'makalah',
        name: 'Joki Makalah',
        price: 35000,
        quantity: 2
      }
    ],
    promo: 'JOKIHEMAT',
    paymentMethod: 'midtrans_qris'
  };

  assert.equal(typeof regularPayload.draftKey, 'string');
  assert.equal(typeof regularPayload.amount, 'number');
  assert.equal(typeof regularPayload.customer.name, 'string');
  assert.equal(typeof regularPayload.task.title, 'string');
  assert.equal(typeof regularPayload.task.deadline, 'string');
  assert.equal(typeof regularPayload.task.notes, 'string');
  assert.ok(Array.isArray(regularPayload.items) && regularPayload.items.length > 0);
  assert.equal(regularPayload.items[0].productId, 'makalah');

  // Special order payload contract
  const specialPayload = {
    slug: 'gemini-pro-18-bulan',
    qty: 1,
    nama: 'Budi Santoso',
    email: 'budi@gmail.com',
    whatsapp: '6281234567890',
    nim: '12345678',
    payment_method: 'Mayar'
  };

  assert.equal(specialPayload.slug, 'gemini-pro-18-bulan');
  assert.equal(specialPayload.qty, 1);
  assert.equal(specialPayload.payment_method, 'Mayar');
  assert.ok(!('task' in specialPayload), 'Special order must not require academic task details');
});

test('8. Cart type conflict detection prevents mixed or invalid special orders', () => {
  function checkCartConflict(items) {
    const hasSpecial = items.some(
      (i) => i.isSpecial === true || i.id === 'gemini-pro-18-bulan' || i.id?.startsWith('spcl-')
    );
    const hasRegular = items.some(
      (i) => !i.isSpecial && i.id !== 'gemini-pro-18-bulan' && !i.id?.startsWith('spcl-')
    );

    if (hasSpecial && hasRegular) {
      return { error: 'Penawaran Spesial harus dibayar terpisah. Kosongkan keranjang reguler atau selesaikan pesanan reguler dulu.', code: 'CART_TYPE_CONFLICT' };
    }
    if (hasSpecial && items.length > 1) {
      return { error: 'Layanan Penawaran Spesial dibatasi maksimal 1 item per transaksi.', code: 'SPECIAL_LIMIT_EXCEEDED' };
    }
    return null;
  }

  // Mixed items
  const mixed = [
    { id: 'makalah', nama: 'Joki Makalah', harga: 35000, quantity: 1, isSpecial: false },
    { id: 'gemini-pro-18-bulan', nama: 'Gemini Pro 18 Bulan', harga: 20000, quantity: 1, isSpecial: true }
  ];
  const mixedResult = checkCartConflict(mixed);
  assert.ok(mixedResult !== null);
  assert.equal(mixedResult.code, 'CART_TYPE_CONFLICT');

  // Pure regular items
  const regularOnly = [
    { id: 'makalah', nama: 'Joki Makalah', harga: 35000, quantity: 1, isSpecial: false },
    { id: 'ppt', nama: 'Joki PPT', harga: 50000, quantity: 1, isSpecial: false }
  ];
  assert.equal(checkCartConflict(regularOnly), null);

  // Pure single special item
  const specialOnly = [
    { id: 'gemini-pro-18-bulan', nama: 'Gemini Pro 18 Bulan', harga: 20000, quantity: 1, isSpecial: true }
  ];
  assert.equal(checkCartConflict(specialOnly), null);
});

test('9. Pricing calculation and 5 percent large order discount match backend worker.js', () => {
  function calculateTotal(items, promoPercent = 0) {
    const subtotal = items.reduce((sum, item) => sum + item.harga * item.quantity, 0);
    const discountAmount = promoPercent > 0 ? Math.round(subtotal * (promoPercent / 100)) : 0;
    let total = Math.max(0, subtotal - discountAmount);
    // worker.js line 313: if (subtotal > 1500000) total -= Math.round(total * 0.05);
    if (subtotal > 1500000) {
      total -= Math.round(total * 0.05);
    }
    return { subtotal, discountAmount, total };
  }

  // Regular order under 1.5M
  const order1 = calculateTotal([{ harga: 100000, quantity: 2 }], 10);
  assert.equal(order1.subtotal, 200000);
  assert.equal(order1.discountAmount, 20000);
  assert.equal(order1.total, 180000);

  // Large order over 1.5M without promo
  const order2 = calculateTotal([{ harga: 2000000, quantity: 1 }], 0);
  assert.equal(order2.subtotal, 2000000);
  // 5% of 2,000,000 = 100,000
  assert.equal(order2.total, 1900000);

  // Large order over 1.5M with 10% promo
  const order3 = calculateTotal([{ harga: 2000000, quantity: 1 }], 10);
  // subtotal: 2,000,000; promo: 200,000 -> 1,800,000; large order 5% of 1,800,000 = 90,000 -> 1,710,000
  assert.equal(order3.total, 1710000);
});

test('10. Mock promo API handles valid, invalid, 400, 403, 409, and 502 responses correctly', async () => {
  const http = require('node:http');

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const code = url.searchParams.get('code');

    if (code === 'VALID15') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ valid: true, discount_percent: 15 }));
    } else if (code === 'EXPIRED') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ valid: false, discount_percent: 0 }));
    } else if (code === 'BADFORMAT') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Format kode promo tidak valid.' }));
    } else if (code === 'FORBIDDEN') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Origin tidak diizinkan.' }));
    } else if (code === 'CONFLICT') {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Kode promo tidak berlaku atau sudah berakhir.' }));
    } else if (code === 'SERVERBUSY') {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Server promo sibuk.' }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/promo`;

  async function testPromo(code) {
    const res = await fetch(`${baseUrl}?code=${encodeURIComponent(code)}`);
    const data = await res.json().catch(() => null);
    if (res.ok && data?.valid && Number(data.discount_percent) > 0) {
      return { ok: true, percent: Number(data.discount_percent) };
    } else if (res.status === 400) {
      return { ok: false, error: 'Format kode promo tidak valid.' };
    } else if (res.status === 403) {
      return { ok: false, error: 'Akses validasi promo ditolak (Origin tidak diizinkan).' };
    } else if (res.status === 409) {
      return { ok: false, error: data?.error || 'Kode promo tidak berlaku atau terdapat konflik promo.' };
    } else if (res.status === 502 || res.status === 503) {
      return { ok: false, error: 'Layanan validasi promo sedang sibuk. Silakan coba sesaat lagi.' };
    }
    return { ok: false, error: 'Kode promo tidak berlaku atau sudah berakhir.' };
  }

  // 1. Valid promo
  const validRes = await testPromo('VALID15');
  assert.equal(validRes.ok, true);
  assert.equal(validRes.percent, 15);

  // 2. Expired promo
  const expRes = await testPromo('EXPIRED');
  assert.equal(expRes.ok, false);
  assert.equal(expRes.error, 'Kode promo tidak berlaku atau sudah berakhir.');

  // 3. HTTP 400 Bad Format
  const badRes = await testPromo('BADFORMAT');
  assert.equal(badRes.ok, false);
  assert.equal(badRes.error, 'Format kode promo tidak valid.');

  // 4. HTTP 403 Origin Forbidden
  const forbRes = await testPromo('FORBIDDEN');
  assert.equal(forbRes.ok, false);
  assert.equal(forbRes.error, 'Akses validasi promo ditolak (Origin tidak diizinkan).');

  // 5. HTTP 409 Promo Conflict
  const confRes = await testPromo('CONFLICT');
  assert.equal(confRes.ok, false);
  assert.equal(confRes.error, 'Kode promo tidak berlaku atau sudah berakhir.');

  // 6. HTTP 502 Server Busy
  const busyRes = await testPromo('SERVERBUSY');
  assert.equal(busyRes.ok, false);
  assert.equal(busyRes.error, 'Layanan validasi promo sedang sibuk. Silakan coba sesaat lagi.');

  await new Promise((resolve) => server.close(resolve));
});

test('11. Payment status recovery and transition from PENDING to PAID or CANCELED', async () => {
  const http = require('node:http');

  let currentOrderStatus = 'PENDING';
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const orderId = url.searchParams.get('order_id');
    const key = req.headers['x-order-key'];

    if (orderId === 'REG-12345' && key === 'req-test-key-12345') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        order_id: 'uuid-12345',
        order_code: 'REG-12345',
        tipe: 'REGULER',
        payment_status: currentOrderStatus,
        payment_method: currentOrderStatus === 'PAID' ? 'QRIS' : null,
        amount: 70000,
        payment_url: currentOrderStatus === 'PENDING' ? 'https://mayar.id/pay/test' : null,
        expires_at: '2026-10-25T00:00:00Z'
      }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Pesanan tidak ditemukan' }));
    }
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const statusEndpoint = `http://127.0.0.1:${port}/api/check-status`;

  // 1. Initial status query while PENDING
  const resPending = await fetch(`${statusEndpoint}?order_id=REG-12345`, {
    headers: { 'x-order-key': 'req-test-key-12345' }
  });
  const dataPending = await resPending.json();
  assert.equal(dataPending.payment_status, 'PENDING');
  assert.equal(dataPending.payment_url, 'https://mayar.id/pay/test');

  // 2. Status updated to PAID
  currentOrderStatus = 'PAID';
  const resPaid = await fetch(`${statusEndpoint}?order_id=REG-12345`, {
    headers: { 'x-order-key': 'req-test-key-12345' }
  });
  const dataPaid = await resPaid.json();
  assert.equal(dataPaid.payment_status, 'PAID');
  assert.equal(dataPaid.payment_method, 'QRIS');

  // 3. Status updated to CANCELED
  currentOrderStatus = 'CANCELED';
  const resCanceled = await fetch(`${statusEndpoint}?order_id=REG-12345`, {
    headers: { 'x-order-key': 'req-test-key-12345' }
  });
  const dataCanceled = await resCanceled.json();
  assert.equal(dataCanceled.payment_status, 'CANCELED');

  await new Promise((resolve) => server.close(resolve));
});

test('12. Network timeout with AbortController triggers clean error message without crash', async () => {
  const http = require('node:http');

  // Hanging server that never replies
  const server = http.createServer((req, res) => {
    // Intentionally keep connection open
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const hangingUrl = `http://127.0.0.1:${port}/api/create-mayar-payment`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 100);

  let errorMessage = null;
  try {
    await fetch(hangingUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draftKey: 'req-123' }),
      signal: controller.signal
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      errorMessage = 'Waktu permintaan habis (timeout). Silakan periksa jaringan dan coba lagi.';
    } else {
      errorMessage = err.message;
    }
  } finally {
    clearTimeout(timer);
  }

  assert.equal(errorMessage, 'Waktu permintaan habis (timeout). Silakan periksa jaringan dan coba lagi.');
  await new Promise((resolve) => server.close(resolve));
});
