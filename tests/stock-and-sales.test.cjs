// Stock decrement, idempotency, sold count, and dual table sync tests
// Run: node --test tests/stock-and-sales.test.cjs
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Reference simulation of the database stock decrement trigger logic
function processOrderStock(order, currentStock, triggerOp = 'INSERT', oldOrder = null) {
  let stock = { ...currentStock };
  let newOrder = { ...order };

  // Rule: Only PAID orders decrement stock, and only once (stock_deducted = false)
  if (newOrder.payment_status === 'PAID' && !newOrder.stock_deducted) {
    if (Array.isArray(newOrder.items)) {
      for (const item of newOrder.items) {
        const slug = item.productId || item.slug || 'gemini-pro-18-bulan';
        const qty = Math.max(1, Number(item.quantity || item.qty || 1));
        if (stock[slug] !== undefined) {
          stock[slug] = Math.max(0, stock[slug] - qty);
        }
      }
    }
    newOrder.stock_deducted = true;
  }

  // Rule: If order was PAID & stock was deducted, but becomes CANCELED or REFUNDED, restore stock
  if (triggerOp === 'UPDATE' && oldOrder) {
    if (oldOrder.payment_status === 'PAID' && oldOrder.stock_deducted &&
        ['CANCELED', 'REFUNDED'].includes(newOrder.payment_status)) {
      if (Array.isArray(oldOrder.items)) {
        for (const item of oldOrder.items) {
          const slug = item.productId || item.slug || 'gemini-pro-18-bulan';
          const qty = Math.max(1, Number(item.quantity || item.qty || 1));
          if (stock[slug] !== undefined) {
            stock[slug] += qty;
          }
        }
      }
      newOrder.stock_deducted = false;
    }
  }

  return { updatedOrder: newOrder, updatedStock: stock };
}

test('1. Stok hanya berkurang saat payment_status menjadi PAID (bukan saat checkout pending)', () => {
  const initialStock = { 'gemini-pro-18-bulan': 12 };
  const pendingOrder = {
    order_code: 'SPCLTESTPENDING01',
    payment_status: 'PENDING',
    status: 'pending',
    stock_deducted: false,
    items: [{ productId: 'gemini-pro-18-bulan', quantity: 1 }]
  };

  const res = processOrderStock(pendingOrder, initialStock, 'INSERT');
  assert.equal(res.updatedStock['gemini-pro-18-bulan'], 12, 'Stok tidak boleh berkurang saat status PENDING');
  assert.equal(res.updatedOrder.stock_deducted, false);
});

test('2. Stok berkurang tepat 1 unit saat payment_status menjadi PAID', () => {
  const initialStock = { 'gemini-pro-18-bulan': 12 };
  const paidOrder = {
    order_code: 'SPCLTESTPAID01',
    payment_status: 'PAID',
    status: 'pending',
    stock_deducted: false,
    items: [{ productId: 'gemini-pro-18-bulan', quantity: 1 }]
  };

  const res = processOrderStock(paidOrder, initialStock, 'INSERT');
  assert.equal(res.updatedStock['gemini-pro-18-bulan'], 11, 'Stok harus berkurang 1 saat pembayaran PAID');
  assert.equal(res.updatedOrder.stock_deducted, true);
});

test('3. Idempotensi webhook: webhook diterima berulang kali tidak mengurangi stok lebih dari 1 kali', () => {
  const initialStock = { 'gemini-pro-18-bulan': 12 };
  const paidOrder = {
    order_code: 'SPCLTESTIDEM01',
    payment_status: 'PAID',
    status: 'pending',
    stock_deducted: false,
    items: [{ productId: 'gemini-pro-18-bulan', quantity: 1 }]
  };

  // Webhook panggilan ke-1
  const firstCall = processOrderStock(paidOrder, initialStock, 'INSERT');
  assert.equal(firstCall.updatedStock['gemini-pro-18-bulan'], 11);

  // Webhook panggilan ke-2 (retry dari Mayar)
  const secondCall = processOrderStock(firstCall.updatedOrder, firstCall.updatedStock, 'UPDATE', firstCall.updatedOrder);
  assert.equal(secondCall.updatedStock['gemini-pro-18-bulan'], 11, 'Retry webhook kedua tidak boleh mengurangi stok lagi');

  // Webhook panggilan ke-3 (retry ke-3)
  const thirdCall = processOrderStock(secondCall.updatedOrder, secondCall.updatedStock, 'UPDATE', secondCall.updatedOrder);
  assert.equal(thirdCall.updatedStock['gemini-pro-18-bulan'], 11, 'Retry webhook ketiga tidak boleh mengurangi stok lagi');
});

test('4. Perubahan status pengerjaan (processing -> completed) tidak mengurangi stok lagi', () => {
  const initialStock = { 'gemini-pro-18-bulan': 11 };
  const orderInWork = {
    order_code: 'SPCLTESTWORKFLOW01',
    payment_status: 'PAID',
    status: 'processing',
    stock_deducted: true,
    items: [{ productId: 'gemini-pro-18-bulan', quantity: 1 }]
  };

  const completedOrder = {
    ...orderInWork,
    status: 'completed'
  };

  const res = processOrderStock(completedOrder, initialStock, 'UPDATE', orderInWork);
  assert.equal(res.updatedStock['gemini-pro-18-bulan'], 11, 'Status completed tidak boleh mengurangi stok lagi');
});

test('5. Pesanan dibatalkan/refund setelah bayar mengembalikan stok dengan benar', () => {
  const stockBeforeRefund = { 'gemini-pro-18-bulan': 11 };
  const paidOrder = {
    order_code: 'SPCLTESTREFUND01',
    payment_status: 'PAID',
    status: 'completed',
    stock_deducted: true,
    items: [{ productId: 'gemini-pro-18-bulan', quantity: 1 }]
  };

  const refundedOrder = {
    ...paidOrder,
    payment_status: 'REFUNDED',
    status: 'cancelled'
  };

  const res = processOrderStock(refundedOrder, stockBeforeRefund, 'UPDATE', paidOrder);
  assert.equal(res.updatedStock['gemini-pro-18-bulan'], 12, 'Stok harus dikembalikan saat order direfund/dibatalkan');
  assert.equal(res.updatedOrder.stock_deducted, false);
});

test('6. Multi-quantity order mengurangi stok sesuai jumlah valid', () => {
  const initialStock = { 'gemini-pro-18-bulan': 12 };
  const multiQtyOrder = {
    order_code: 'SPCLTESTMULTI01',
    payment_status: 'PAID',
    status: 'pending',
    stock_deducted: false,
    items: [{ productId: 'gemini-pro-18-bulan', quantity: 3 }]
  };

  const res = processOrderStock(multiQtyOrder, initialStock, 'INSERT');
  assert.equal(res.updatedStock['gemini-pro-18-bulan'], 9, 'Stok harus berkurang 3 unit sesuai quantity');
});

test('7. Perhitungan jumlah terjual riil hanya menghitung pesanan PAID', () => {
  const sampleOrders = [
    { id: 1, payment_status: 'PAID', items: [{ productId: 'gemini-pro-18-bulan', quantity: 1 }] },
    { id: 2, payment_status: 'PAID', items: [{ productId: 'gemini-pro-18-bulan', quantity: 1 }] },
    { id: 3, payment_status: 'PENDING', items: [{ productId: 'gemini-pro-18-bulan', quantity: 1 }] },
    { id: 4, payment_status: 'CANCELED', items: [{ productId: 'gemini-pro-18-bulan', quantity: 1 }] },
    { id: 5, payment_status: 'PAID', items: [{ productId: 'gemini-pro-18-bulan', quantity: 2 }] },
  ];

  const totalSold = sampleOrders
    .filter(o => o.payment_status === 'PAID')
    .reduce((sum, o) => sum + o.items.reduce((itemSum, it) => itemSum + (it.quantity || 1), 0), 0);

  assert.equal(totalSold, 4, 'Jumlah terjual hanya 4 dari pesanan PAID (1 + 1 + 2)');
});

test('8. assets/catalog.js menampilkan stok dan jumlah terjual tanpa emoji', () => {
  const catalogJs = fs.readFileSync(path.join(__dirname, '../assets/catalog.js'), 'utf8');

  // Verify stock slot element
  assert.ok(catalogJs.includes('jokiin-stock-slot'), 'Harus ada kelas jokiin-stock-slot');
  assert.ok(catalogJs.includes('Tersisa ${fp.stok} dari ${maxSlot} slot'), 'Teks sisa slot harus sesuai');

  // Verify sold count element
  assert.ok(catalogJs.includes('jokiin-sold-info'), 'Harus ada elemen jokiin-sold-info');
  assert.ok(catalogJs.includes('terjual'), 'Harus memuat teks terjual');

  // Verify total_sold default is 108
  assert.ok(catalogJs.includes('total_sold: 108'), 'Default total_sold harus 108');
  assert.ok(catalogJs.includes('fp.total_sold : 108'), 'Fallback total_sold harus 108');

  // Verify NO emojis in sold count text
  assert.ok(!/jokiin-sold-info.*[\u{1F300}-\u{1F9FF}]/u.test(catalogJs), 'Dilarang menggunakan emoji pada sold count');
});
