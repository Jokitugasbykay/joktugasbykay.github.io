// jokiin-catalog Edge Function
// REST API for product catalog, promo banners, cart separation, special & regular checkout, and Workplace integration
const API = Deno.env.get('SUPABASE_URL')!;
const SECRET = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MAYAR_API_KEY = Deno.env.get('MAYAR_API_KEY') || '';
const MAYAR_BASE_URL = (Deno.env.get('MAYAR_BASE_URL') || 'https://api.mayar.id/hl/v2').replace(/\/+$/, '');
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-client-info,x-cart-id',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
};

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public extra?: Record<string, unknown>,
  ) {
    super(message);
  }
}

const loginAttempts = new Map<string, { count: number; reset: number }>();

function checkLoginRate(ip: string): void {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || entry.reset < now) {
    loginAttempts.set(ip, { count: 1, reset: now + 60_000 });
    return;
  }
  if (entry.count >= 5) throw new ApiError(429, 'Terlalu banyak percobaan login. Tunggu 1 menit.');
  entry.count++;
}

async function dbFetch(path: string, method = 'GET', body?: unknown, prefer?: string): Promise<any> {
  const headers: Record<string, string> = {
    apikey: SECRET,
    Authorization: `Bearer ${SECRET}`,
    'Content-Type': 'application/json',
  };
  if (prefer) headers['Prefer'] = prefer;
  const res = await fetch(`${API}/rest/v1/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new ApiError(503, 'Server error.');
  }
  if (!res.ok) {
    console.error('dbFetch error', res.status, data);
    throw new ApiError(503, data?.message || 'Operasi database gagal. Coba lagi.');
  }
  return data;
}

async function rpcCall(fn: string, params: Record<string, unknown>): Promise<any> {
  const res = await fetch(`${API}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: SECRET,
      Authorization: `Bearer ${SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new ApiError(503, 'Server error.');
  }
  if (!res.ok) {
    const rawMsg = String(data?.message || data?.details || 'Operasi checkout gagal.');
    if (rawMsg.includes('CART_TYPE_CONFLICT')) {
      const clean = rawMsg.replace(/^.*CART_TYPE_CONFLICT:\s*/, '').trim() ||
        'Penawaran Spesial harus dibayar terpisah dari pesanan reguler.';
      throw new ApiError(409, clean, { code: 'CART_TYPE_CONFLICT' });
    }
    if (rawMsg.includes('OUT_OF_STOCK')) {
      const clean = rawMsg.replace(/^.*OUT_OF_STOCK:\s*/, '').trim() ||
        'Stok produk sudah habis atau tidak mencukupi.';
      throw new ApiError(409, clean, { code: 'OUT_OF_STOCK', field: 'gmail' });
    }
    if (rawMsg.includes('BUY_LIMIT_EXCEEDED')) {
      const clean = rawMsg.replace(/^.*BUY_LIMIT_EXCEEDED:\s*/, '').trim() ||
        'Batas pembelian per orang untuk Penawaran Spesial telah tercapai.';
      throw new ApiError(409, clean, {
        code: 'BUY_LIMIT_EXCEEDED',
        field: 'gmail',
        field_errors: {
          gmail: clean,
          whatsapp: clean,
        },
      });
    }
    if (rawMsg.includes('PRODUCT_NOT_FOUND') || rawMsg.includes('SERVICE_UNAVAILABLE')) {
      const clean = rawMsg.replace(/^.*(PRODUCT_NOT_FOUND|SERVICE_UNAVAILABLE):\s*/, '').trim() ||
        'Produk tidak ditemukan atau sedang tidak aktif.';
      throw new ApiError(404, clean, { code: 'PRODUCT_NOT_FOUND' });
    }
    if (rawMsg.includes('INVALID_QTY') || rawMsg.includes('INVALID_ITEMS')) {
      const clean = rawMsg.replace(/^.*(INVALID_QTY|INVALID_ITEMS):\s*/, '').trim() ||
        'Jumlah item tidak valid.';
      throw new ApiError(400, clean, { code: 'INVALID_INPUT' });
    }
    console.error('rpcCall error', fn, res.status, data);
    throw new ApiError(400, rawMsg);
  }
  return data;
}

async function storageUpload(bucket: string, path: string, data: Uint8Array, contentType: string): Promise<string> {
  const res = await fetch(`${API}/storage/v1/object/${bucket}/${path}`, {
    method: 'POST',
    headers: {
      apikey: SECRET,
      Authorization: `Bearer ${SECRET}`,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body: data,
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error('Storage upload error', res.status, errText);
    throw new ApiError(503, 'Upload gambar gagal. Coba lagi.');
  }
  return `${API}/storage/v1/object/public/${bucket}/${path}`;
}

async function getUser(req: Request): Promise<any | null> {
  const auth = req.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const res = await fetch(`${API}/auth/v1/user`, {
    headers: { apikey: SECRET, Authorization: auth },
  });
  if (!res.ok) return null;
  const user = await res.json();
  return user?.id ? user : null;
}

async function requireAuth(req: Request): Promise<any> {
  const user = await getUser(req);
  if (!user) throw new ApiError(401, 'Sesi tidak valid. Silakan login kembali.');
  return user;
}

async function getUserRole(userId: string): Promise<string | null> {
  const rows = await dbFetch(`user_roles?user_id=eq.${userId}&select=role&limit=1`);
  if (rows?.[0]?.role) return rows[0].role;
  const prof = await dbFetch(`profiles?id=eq.${userId}&select=role&limit=1`).catch(() => []);
  if (prof?.[0]?.role === 'admin' || prof?.[0]?.role === 'worker') return prof[0].role;
  return null;
}

async function requireAdmin(req: Request): Promise<any> {
  const user = await requireAuth(req);
  const role = await getUserRole(user.id);
  if (role !== 'admin') throw new ApiError(403, 'Akses admin diperlukan.');
  return user;
}

async function requireAdminOrWorker(req: Request): Promise<{ user: any; role: string }> {
  const user = await requireAuth(req);
  const role = await getUserRole(user.id);
  if (role !== 'admin' && role !== 'worker') throw new ApiError(403, 'Akses tidak diizinkan.');
  return { user, role };
}

function ok(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}

function err(error: unknown): Response {
  const known = error instanceof ApiError;
  if (!known) console.error('Unhandled error', error instanceof Error ? error.message : error);
  const payload: Record<string, unknown> = {
    error: known ? (error as ApiError).message : 'Server error. Coba lagi.',
  };
  if (known && (error as ApiError).extra) {
    Object.assign(payload, (error as ApiError).extra);
  }
  return new Response(JSON.stringify(payload), {
    status: known ? (error as ApiError).status : 500,
    headers: CORS,
  });
}

function getIp(req: Request): string {
  return req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'unknown';
}

const SLUG_RE = /^[a-z0-9-]{1,100}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ORDER_ID_RE = /^(NUG[A-HJ-NP-Z2-9]{26}|SPCL[A-HJ-NP-Z2-9]{23})$/;
const GMAIL_RE = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;
const WA_DIGITS_NO_ZERO_RE = /^[1-9][0-9]{7,14}$/;

export function getOrderTypeFromId(orderId: string): 'REGULER' | 'SPESIAL' | null {
  const code = String(orderId || '').trim();
  if (/^SPCL[A-HJ-NP-Z2-9]{23}$/.test(code)) return 'SPESIAL';
  if (/^NUG[A-HJ-NP-Z2-9]{26}$/.test(code)) return 'REGULER';
  return null;
}

function validateContactFields(body: any, requireTaskFields: boolean) {
  const fieldErrors: Record<string, string> = {};
  const rawNama = String(body?.nama ?? body?.customer?.name ?? '').trim();
  const rawNim = String(body?.nim ?? body?.customer?.nim ?? '').trim();
  const rawWa = String(body?.whatsapp ?? body?.customer?.whatsapp ?? '').trim();
  const rawCountry = String(body?.country_code ?? body?.customer?.country_code ?? '62').replace(/\D/g, '') || '62';
  const rawGmail = String(body?.gmail ?? body?.email ?? body?.customer?.email ?? '').trim().toLowerCase();

  if (!rawNama || rawNama.length < 2) {
    fieldErrors.nama = 'Nama lengkap wajib diisi.';
  } else if (rawNama.length > 120) {
    fieldErrors.nama = 'Nama lengkap maksimal 120 karakter.';
  }

  if (rawNim.length > 50) {
    fieldErrors.nim = 'NIM maksimal 50 karakter.';
  }

  if (!rawWa) {
    fieldErrors.whatsapp = 'Nomor WhatsApp wajib diisi.';
  } else if (!/^\d+$/.test(rawWa)) {
    fieldErrors.whatsapp = 'Nomor WhatsApp hanya boleh berisi angka.';
  } else if (rawWa.startsWith('0') || rawWa.startsWith('620')) {
    fieldErrors.whatsapp = 'Nomor WhatsApp tidak boleh diawali angka 0 (masukkan mulai angka 8, contoh: 81234567890).';
  } else if (!WA_DIGITS_NO_ZERO_RE.test(rawWa)) {
    fieldErrors.whatsapp = 'Nomor WhatsApp harus terdiri dari 8 hingga 15 digit angka tanpa awalan 0.';
  }

  if (!rawGmail) {
    fieldErrors.gmail = 'Alamat Gmail wajib diisi.';
  } else if (!GMAIL_RE.test(rawGmail)) {
    fieldErrors.gmail = 'Gunakan alamat email @gmail.com yang valid.';
  }

  let rawJudul = '';
  let rawDeadline = '';
  let rawCatatan = '';

  if (requireTaskFields) {
    rawJudul = String(body?.judul_tugas ?? body?.task?.title ?? '').trim();
    rawDeadline = String(body?.deadline ?? body?.task?.deadline ?? '').trim();
    rawCatatan = String(body?.catatan ?? body?.task?.notes ?? '').trim();

    if (!rawJudul || rawJudul.length < 3) {
      fieldErrors.judul_tugas = 'Judul tugas wajib diisi untuk pesanan reguler.';
    }
    if (!rawCatatan || rawCatatan.length < 3) {
      fieldErrors.catatan = 'Catatan / instruksi tugas wajib diisi untuk pesanan reguler.';
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    const firstField = Object.keys(fieldErrors)[0];
    const firstMsg = fieldErrors[firstField];
    throw new ApiError(400, firstMsg, {
      code: 'VALIDATION_ERROR',
      field: firstField,
      field_errors: fieldErrors,
    });
  }

  const normalizedWa = rawWa.startsWith(rawCountry) ? rawWa : `${rawCountry}${rawWa}`;

  return {
    nama: rawNama,
    nim: rawNim || '-',
    whatsapp: normalizedWa,
    whatsapp_local: rawWa,
    gmail: rawGmail,
    judul_tugas: rawJudul,
    deadline: rawDeadline || '-',
    catatan: rawCatatan,
  };
}

async function resolveItemTipe(rawItem: any): Promise<{
  slug: string;
  nama: string;
  qty: number;
  harga_satuan: number;
  tipe: 'REGULER' | 'SPESIAL';
  is_limited_edition: boolean;
}> {
  const slug = String(rawItem?.slug ?? rawItem?.product_slug ?? rawItem?.productId ?? rawItem?.product_id ?? rawItem?.id ?? '').trim();
  const qty = Math.max(1, Number(rawItem?.qty ?? rawItem?.quantity ?? 1) || 1);
  if (!slug) throw new ApiError(400, 'Produk tidak valid.');

  const isUuid = UUID_RE.test(slug);
  const prodQuery = isUuid
    ? `products?id=eq.${slug}&select=id,nama,slug,harga_dasar,diskon_persen,stok,is_active,is_limited_edition&limit=1`
    : `products?slug=eq.${encodeURIComponent(slug)}&select=id,nama,slug,harga_dasar,diskon_persen,stok,is_active,is_limited_edition&limit=1`;
  const prodRows = await dbFetch(prodQuery);
  if (prodRows?.length) {
    const p = prodRows[0];
    const isSpecial = Boolean(p.is_limited_edition) || p.slug === 'gemini-pro-18-bulan';
    const unitPrice = Math.max(0, Math.round(Number(p.harga_dasar) * (100 - Number(p.diskon_persen || 0)) / 100));
    return {
      slug: p.slug,
      nama: p.nama,
      qty,
      harga_satuan: unitPrice,
      tipe: isSpecial ? 'SPESIAL' : 'REGULER',
      is_limited_edition: isSpecial,
    };
  }

  const svcRows = await dbFetch(`services?slug=eq.${encodeURIComponent(slug)}&select=id,name,slug,price,sale_amount,sale_percent,status&limit=1`).catch(() => []);
  if (svcRows?.length) {
    const s = svcRows[0];
    const unitPrice = Math.max(
      1,
      Math.round(Number(s.price) - (Number(s.sale_amount) > 0 ? Number(s.sale_amount) : (Number(s.price) * Number(s.sale_percent || 0)) / 100)),
    );
    return {
      slug: s.slug,
      nama: s.name,
      qty,
      harga_satuan: unitPrice,
      tipe: 'REGULER',
      is_limited_edition: false,
    };
  }

  const fallbackSpecial = Boolean(rawItem?.is_limited_edition) ||
    String(rawItem?.tipe || '').toUpperCase() === 'SPESIAL' ||
    slug === 'gemini-pro-18-bulan';
  return {
    slug,
    nama: String(rawItem?.nama ?? rawItem?.name ?? slug),
    qty,
    harga_satuan: Math.max(0, Number(rawItem?.price ?? rawItem?.harga ?? 0)),
    tipe: fallbackSpecial ? 'SPESIAL' : 'REGULER',
    is_limited_edition: fallbackSpecial,
  };
}

async function sendOrderConfirmationEmail(order: any): Promise<{ sent: boolean; order_id: string; recipient: string }> {
  const orderId = String(order?.order_code || order?.id || '');
  const recipient = String(order?.gmail || order?.customer?.email || '');
  const tipe = getOrderTypeFromId(orderId) || order?.tipe || 'REGULER';
  if (!RESEND_API_KEY || !recipient) {
    return { sent: false, order_id: orderId, recipient };
  }
  try {
    const isSpecial = tipe === 'SPESIAL';
    const subject = isSpecial
      ? `[Joki.in] Konfirmasi Penawaran Spesial #${orderId}`
      : `[Joki.in] Konfirmasi Pesanan #${orderId}`;
    const html = `
      <div style="font-family:'Plus Jakarta Sans',Arial,sans-serif;background:#0a0e11;color:#eef3f1;padding:28px;border-radius:16px;max-width:540px;margin:0 auto;border:1px solid #1d262b;">
        <h2 style="color:#1fd18b;margin:0 0 12px;">Pesanan Berhasil Dibuat</h2>
        <p style="color:#8a9993;font-size:14px;line-height:1.6;">Halo <b>${order?.nama || order?.customer?.name || 'Pelanggan'}</b>, terima kasih telah melakukan pemesanan di Joki.in.</p>
        <div style="background:#0f161a;border:1px solid #1d262b;border-radius:12px;padding:16px;margin:16px 0;">
          <div style="font-size:12px;color:#8a9993;text-transform:uppercase;letter-spacing:.08em;">ID Pesanan (${tipe})</div>
          <div style="font-size:20px;font-weight:800;color:#ffd54a;margin-top:4px;letter-spacing:.04em;">${orderId}</div>
          <div style="margin-top:12px;font-size:14px;color:#eef3f1;">Total Pembayaran: <b style="color:#1fd18b;">Rp ${Number(order?.total || order?.total_price || 0).toLocaleString('id-ID')}</b></div>
        </div>
        <p style="color:#8a9993;font-size:13px;">Simpan ID pesanan <b>${orderId}</b> untuk melacak status pesanan Anda di halaman Pesanan Saya.</p>
      </div>
    `;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Joki.in <noreply@jokiin.my.id>',
        to: [recipient],
        subject,
        html,
      }),
    });
    return { sent: res.ok, order_id: orderId, recipient };
  } catch {
    return { sent: false, order_id: orderId, recipient };
  }
}

async function createMayarPaymentIfConfigured(order: any, originUrl: string): Promise<string | null> {
  if (!MAYAR_API_KEY) return null;
  try {
    const orderCode = String(order.order_code || order.id);
    const total = Number(order.total || order.total_price || 0);
    if (total <= 0) return null;
    const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const prodName = String(order.product?.nama || order.items?.[0]?.name || 'Gemini Pro 18 Bulan');
    const res = await fetch(`${MAYAR_BASE_URL}/payments/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MAYAR_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `Pembayaran JOKI.IN - ${prodName}`,
        email: String(order.gmail || order.customer?.email || ''),
        amount: total,
        mobile: String(order.whatsapp || order.customer?.whatsapp || '').slice(0, 20),
        redirectUrl: `${originUrl}/?payment=complete&order_id=${encodeURIComponent(orderCode)}`,
        description: `Pesanan JOKI.IN ${orderCode} (${order.tipe || 'SPESIAL'})`,
        expiredAt,
        extraData: {
          orderCode,
          tipe: order.tipe,
        },
      }),
    });
    const json = await res.json().catch(() => null);
    const link = json?.data?.link ? String(json.data.link) : null;
    const txId = json?.data?.id ? String(json.data.id) : (json?.data?.transactionId ? String(json.data.transactionId) : null);
    if (link) {
      await Promise.all([
        dbFetch(`payment_orders?order_code=eq.${encodeURIComponent(orderCode)}`, 'PATCH', {
          payment_url: link,
          mayar_transaction_id: txId,
        }).catch(() => {}),
        dbFetch(`orders?order_code=eq.${encodeURIComponent(orderCode)}`, 'PATCH', {
          payment_url: link,
          mayar_transaction_id: txId,
        }).catch(() => {})
      ]);
    }
    return link;
  } catch {
    return null;
  }
}

function validateProduct(body: any, partial = false) {
  const out: Record<string, any> = {};
  if (!partial || body.nama !== undefined) {
    if (typeof body.nama !== 'string' || !body.nama.trim()) throw new ApiError(400, 'Nama produk wajib diisi.');
    out.nama = body.nama.trim().slice(0, 200);
  }
  if (!partial || body.slug !== undefined) {
    if (typeof body.slug !== 'string' || !SLUG_RE.test(body.slug)) throw new ApiError(400, 'Slug tidak valid (hanya huruf kecil, angka, dan tanda hubung).');
    out.slug = body.slug;
  }
  if (!partial || body.kategori !== undefined) {
    if (typeof body.kategori !== 'string' || !body.kategori.trim()) throw new ApiError(400, 'Kategori wajib diisi.');
    out.kategori = body.kategori.trim().slice(0, 80);
  }
  if (body.deskripsi !== undefined) out.deskripsi = String(body.deskripsi || '').slice(0, 3000);
  if (body.harga_dasar !== undefined) {
    const h = Number(body.harga_dasar);
    if (!Number.isInteger(h) || h < 0) throw new ApiError(400, 'Harga dasar tidak valid.');
    out.harga_dasar = h;
  }
  if (body.diskon_persen !== undefined) {
    const d = Number(body.diskon_persen);
    if (!Number.isInteger(d) || d < 0 || d > 100) throw new ApiError(400, 'Diskon 0–100.');
    out.diskon_persen = d;
  }
  if (body.stok !== undefined) {
    const s = Number(body.stok);
    if (!Number.isInteger(s) || s < 0) throw new ApiError(400, 'Stok tidak valid.');
    out.stok = s;
  }
  if (body.batas_beli_per_orang !== undefined) {
    const b = Number(body.batas_beli_per_orang);
    if (!Number.isInteger(b) || b < 1) throw new ApiError(400, 'Batas beli minimal 1.');
    out.batas_beli_per_orang = b;
  }
  if (body.is_active !== undefined) out.is_active = Boolean(body.is_active);
  if (body.is_limited_edition !== undefined) out.is_limited_edition = Boolean(body.is_limited_edition);
  if (body.gambar_url !== undefined) out.gambar_url = body.gambar_url ? String(body.gambar_url).slice(0, 1000) : null;
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const url = new URL(req.url);
  const raw = url.pathname.replace(/^\/jokiin-catalog/, '').replace(/^\/functions\/v1\/jokiin-catalog/, '');
  const path = raw || '/';
  const method = req.method;

  try {
    if (!SECRET || !API) throw new ApiError(503, 'Konfigurasi server belum lengkap.');

    // ─── CART & CHECKOUT ROUTES (STEP 3 & 4) ───

    // GET /api/cart
    if (method === 'GET' && path === '/api/cart') {
      const cartId = String(url.searchParams.get('cart_id') || req.headers.get('x-cart-id') || getIp(req)).slice(0, 120);
      const rows = await dbFetch(`carts?id=eq.${encodeURIComponent(cartId)}&limit=1`);
      const cart = rows?.[0] || { id: cartId, tipe: null, items: [] };
      return ok({ cart });
    }

    // POST /api/cart/items — Rejects mixed REGULER and SPESIAL items with 409
    if (method === 'POST' && path === '/api/cart/items') {
      const body = await req.json().catch(() => { throw new ApiError(400, 'Body tidak valid.'); });
      const cartId = String(body?.cart_id || req.headers.get('x-cart-id') || url.searchParams.get('cart_id') || getIp(req)).slice(0, 120);

      // Check existing cart in DB
      const existingRows = await dbFetch(`carts?id=eq.${encodeURIComponent(cartId)}&limit=1`);
      const existingCart = existingRows?.[0] || null;
      const existingItems: any[] = Array.isArray(existingCart?.items) ? existingCart.items : [];
      const clientCurrentTipe = body?.current_tipe || body?.cart_tipe || null;
      const activeCartTipe: 'REGULER' | 'SPESIAL' | null =
        clientCurrentTipe === 'REGULER' || clientCurrentTipe === 'SPESIAL'
          ? clientCurrentTipe
          : (existingItems.length > 0 ? existingCart?.tipe : null);

      // Support single item or batch items
      const incomingRawItems = Array.isArray(body?.items)
        ? body.items
        : [body?.item || body];

      if (!incomingRawItems.length) {
        throw new ApiError(400, 'Item keranjang wajib diisi.');
      }

      const resolvedIncoming = [];
      for (const rawItem of incomingRawItems) {
        const resolved = await resolveItemTipe(rawItem);
        resolvedIncoming.push(resolved);
      }

      // Check if incoming items themselves mix REGULER and SPESIAL
      const incomingTypes = new Set(resolvedIncoming.map((i) => i.tipe));
      if (incomingTypes.size > 1) {
        throw new ApiError(
          409,
          'Penawaran Spesial harus dibayar terpisah. Kosongkan keranjang reguler atau selesaikan pesanan reguler dulu?',
          {
            code: 'CART_TYPE_CONFLICT',
            cart_tipe: 'REGULER',
            item_tipe: 'SPESIAL',
          },
        );
      }

      const newItemTipe = resolvedIncoming[0].tipe;

      // Check conflict against active cart
      if (activeCartTipe && activeCartTipe !== newItemTipe) {
        const msg = activeCartTipe === 'REGULER'
          ? 'Penawaran Spesial harus dibayar terpisah. Kosongkan keranjang reguler atau selesaikan pesanan reguler dulu?'
          : 'Pesanan reguler tidak dapat digabung dengan Penawaran Spesial. Kosongkan keranjang Penawaran Spesial atau selesaikan pembayaran dulu?';
        throw new ApiError(409, msg, {
          code: 'CART_TYPE_CONFLICT',
          cart_tipe: activeCartTipe,
          item_tipe: newItemTipe,
        });
      }

      // Merge items into cart
      const mergedMap = new Map<string, any>();
      for (const item of existingItems) {
        if (item?.slug) mergedMap.set(item.slug, { ...item });
      }
      for (const item of resolvedIncoming) {
        const prev = mergedMap.get(item.slug);
        if (prev) {
          prev.qty = (Number(prev.qty) || 1) + item.qty;
          prev.subtotal = prev.qty * item.harga_satuan;
        } else {
          mergedMap.set(item.slug, {
            slug: item.slug,
            productId: item.slug,
            nama: item.nama,
            qty: item.qty,
            harga_satuan: item.harga_satuan,
            subtotal: item.qty * item.harga_satuan,
            tipe: item.tipe,
            is_limited_edition: item.is_limited_edition,
          });
        }
      }
      const finalItems = Array.from(mergedMap.values());

      const [savedCart] = await dbFetch(
        'carts',
        'POST',
        {
          id: cartId,
          tipe: newItemTipe,
          items: finalItems,
          updated_at: new Date().toISOString(),
        },
        'resolution=merge-duplicates,return=representation',
      );

      return ok({ cart: savedCart || { id: cartId, tipe: newItemTipe, items: finalItems } });
    }

    // DELETE /api/cart — Clears active cart
    if (method === 'DELETE' && path === '/api/cart') {
      const body = await req.json().catch(() => ({}));
      const cartId = String(body?.cart_id || url.searchParams.get('cart_id') || req.headers.get('x-cart-id') || getIp(req)).slice(0, 120);
      await dbFetch(`carts?id=eq.${encodeURIComponent(cartId)}`, 'DELETE').catch(() => {});
      return ok({
        success: true,
        cart: { id: cartId, tipe: null, items: [] },
      });
    }

    // POST /api/checkout/spesial — Creates SPCL... order (27 chars) with row lock, stock check, and buy limit check
    if (method === 'POST' && path === '/api/checkout/spesial') {
      const body = await req.json().catch(() => { throw new ApiError(400, 'Body tidak valid.'); });
      const user = await getUser(req);

      // Check if client sent mixed items or regular cart conflict
      if (body?.cart_tipe === 'REGULER') {
        throw new ApiError(
          409,
          'Penawaran Spesial harus dibayar terpisah. Kosongkan keranjang reguler atau selesaikan pesanan reguler dulu?',
          { code: 'CART_TYPE_CONFLICT', cart_tipe: 'REGULER', item_tipe: 'SPESIAL' },
        );
      }

      if (Array.isArray(body?.items) && body.items.length > 0) {
        for (const it of body.items) {
          const resolved = await resolveItemTipe(it);
          if (resolved.tipe !== 'SPESIAL') {
            throw new ApiError(
              409,
              'Penawaran Spesial harus dibayar terpisah. Keranjang dengan campuran tipe tidak diizinkan.',
              { code: 'CART_TYPE_CONFLICT' },
            );
          }
        }
      }

      // Check active server cart if cart_id explicitly provided
      const explicitCartId = body?.cart_id || req.headers.get('x-cart-id');
      if (explicitCartId) {
        const cartRows = await dbFetch(`carts?id=eq.${encodeURIComponent(String(explicitCartId))}&limit=1`);
        const activeCart = cartRows?.[0];
        if (activeCart && activeCart.tipe === 'REGULER' && Array.isArray(activeCart.items) && activeCart.items.length > 0) {
          throw new ApiError(
            409,
            'Penawaran Spesial harus dibayar terpisah. Kosongkan keranjang reguler atau selesaikan pesanan reguler dulu?',
            { code: 'CART_TYPE_CONFLICT', cart_tipe: 'REGULER', item_tipe: 'SPESIAL' },
          );
        }
      }

      // Validate contact fields (judul_tugas & catatan NOT required for SPESIAL)
      const contact = validateContactFields(body, false);

      const slug = String(
        body?.slug ??
          body?.product_slug ??
          body?.product_id ??
          body?.productId ??
          body?.items?.[0]?.slug ??
          body?.items?.[0]?.product_slug ??
          body?.items?.[0]?.productId ??
          'gemini-pro-18-bulan',
      ).trim();
      const qty = Number(body?.qty ?? body?.quantity ?? body?.items?.[0]?.qty ?? body?.items?.[0]?.quantity ?? 1);

      const order = await rpcCall('catalog_checkout_spesial', {
        p_slug: slug,
        p_qty: qty,
        p_nama: contact.nama,
        p_nim: contact.nim,
        p_whatsapp: contact.whatsapp,
        p_gmail: contact.gmail,
        p_user_id: user?.id || null,
        p_payment_method: String(body?.payment_method || 'Mayar'),
      });

      // Clear server cart if present
      const cartIdToClear = explicitCartId || getIp(req);
      await dbFetch(`carts?id=eq.${encodeURIComponent(String(cartIdToClear))}`, 'DELETE').catch(() => {});

      const originUrl = req.headers.get('origin') || 'https://jokiin.my.id';
      const paymentUrl = await createMayarPaymentIfConfigured(order, originUrl);
      const emailConfirmation = await sendOrderConfirmationEmail(order);

      return ok(
        {
          order: {
            ...order,
            payment_url: paymentUrl,
            emailConfirmation: {
              sent: emailConfirmation.sent,
              to: emailConfirmation.recipient,
              orderId: order.order_code,
            },
          },
          id: order.order_code,
          order_code: order.order_code,
          tipe: 'SPESIAL',
          total: order.total,
          subtotal: order.subtotal,
          remaining_stock: order?.product?.stok_sisa,
          payment_url: paymentUrl,
          email_confirmation: emailConfirmation,
        },
        201,
      );
    }

    // POST /api/checkout/reguler — Creates NUG... order (29 chars)
    if (method === 'POST' && path === '/api/checkout/reguler') {
      const body = await req.json().catch(() => { throw new ApiError(400, 'Body tidak valid.'); });
      const user = await getUser(req);

      if (body?.cart_tipe === 'SPESIAL') {
        throw new ApiError(
          409,
          'Pesanan reguler tidak dapat digabung dengan Penawaran Spesial. Kosongkan keranjang Penawaran Spesial dulu?',
          { code: 'CART_TYPE_CONFLICT', cart_tipe: 'SPESIAL', item_tipe: 'REGULER' },
        );
      }

      const explicitCartId = body?.cart_id || req.headers.get('x-cart-id');
      if (explicitCartId) {
        const cartRows = await dbFetch(`carts?id=eq.${encodeURIComponent(String(explicitCartId))}&limit=1`);
        const activeCart = cartRows?.[0];
        if (activeCart && activeCart.tipe === 'SPESIAL' && Array.isArray(activeCart.items) && activeCart.items.length > 0) {
          throw new ApiError(
            409,
            'Pesanan reguler tidak dapat digabung dengan Penawaran Spesial. Kosongkan keranjang Penawaran Spesial dulu?',
            { code: 'CART_TYPE_CONFLICT', cart_tipe: 'SPESIAL', item_tipe: 'REGULER' },
          );
        }
      }

      const rawItems = Array.isArray(body?.items) ? body.items : [];
      if (!rawItems.length) {
        throw new ApiError(400, 'Keranjang belanja kosong.', { code: 'EMPTY_CART' });
      }

      // Check for any SPESIAL item in items array before field validation so mixed cart always fails with 409
      for (const it of rawItems) {
        const resolved = await resolveItemTipe(it);
        if (resolved.tipe === 'SPESIAL') {
          throw new ApiError(
            409,
            'Penawaran Spesial harus dibayar terpisah dari pesanan reguler.',
            { code: 'CART_TYPE_CONFLICT' },
          );
        }
      }

      // Validate contact + required task fields (judul_tugas & catatan required for REGULER)
      const contact = validateContactFields(body, true);

      const order = await rpcCall('catalog_checkout_reguler', {
        p_items: rawItems,
        p_nama: contact.nama,
        p_nim: contact.nim,
        p_whatsapp: contact.whatsapp,
        p_gmail: contact.gmail,
        p_judul_tugas: contact.judul_tugas,
        p_deadline: contact.deadline,
        p_catatan: contact.catatan,
        p_user_id: user?.id || null,
        p_payment_method: String(body?.payment_method || 'Mayar'),
        p_promo: body?.promo ? String(body.promo) : null,
        p_files: Array.isArray(body?.files) ? body.files : (Array.isArray(body?.task?.files) ? body.task.files : []),
      });

      const cartIdToClear = explicitCartId || getIp(req);
      await dbFetch(`carts?id=eq.${encodeURIComponent(String(cartIdToClear))}`, 'DELETE').catch(() => {});

      const originUrl = req.headers.get('origin') || 'https://jokiin.my.id';
      const paymentUrl = await createMayarPaymentIfConfigured(order, originUrl);
      const emailConfirmation = await sendOrderConfirmationEmail(order);

      return ok(
        {
          order: {
            ...order,
            payment_url: paymentUrl,
          },
          id: order.order_code,
          order_code: order.order_code,
          tipe: 'REGULER',
          total: order.total,
          subtotal: order.subtotal,
          payment_url: paymentUrl,
          email_confirmation: emailConfirmation,
        },
        201,
      );
    }

    // GET /api/orders/:orderCode — Public order lookup reading prefix (NUG vs SPCL)
    const orderLookupMatch = path.match(/^\/api\/orders\/([^/]+)$/);
    if (method === 'GET' && orderLookupMatch) {
      const code = decodeURIComponent(orderLookupMatch[1]).trim().toUpperCase();
      if (!ORDER_ID_RE.test(code)) {
        throw new ApiError(400, 'Format ID pesanan tidak valid.');
      }
      const tipe = getOrderTypeFromId(code)!;
      const [ordersRows, itemsRows] = await Promise.all([
        dbFetch(`orders?order_code=eq.${encodeURIComponent(code)}&select=order_code,tipe,status,payment_status,total,total_price,subtotal,nama,nim,whatsapp,gmail,judul_tugas,deadline,catatan,items,created_at&limit=1`),
        dbFetch(`order_items?order_id=eq.${encodeURIComponent(code)}&select=produk,product_slug,qty,harga_satuan,subtotal`),
      ]);
      if (!ordersRows?.length) {
        throw new ApiError(404, 'Pesanan tidak ditemukan.');
      }
      return ok({
        order: {
          ...ordersRows[0],
          id: ordersRows[0].order_code,
          tipe,
          order_items: itemsRows || [],
        },
      });
    }

    // GET /api/products (public)
    if (method === 'GET' && path === '/api/products') {
      const kategori = url.searchParams.get('kategori');
      let q = 'products?is_active=eq.true&select=id,nama,slug,kategori,deskripsi,harga_dasar,diskon_persen,stok,batas_beli_per_orang,is_active,is_limited_edition,gambar_url&order=created_at.desc&limit=200';
      if (kategori) q += `&kategori=eq.${encodeURIComponent(kategori)}`;
      const products = await dbFetch(q);
      return ok({ products });
    }

    // GET /api/products/:idOrSlug (public)
    const productPublicMatch = path.match(/^\/api\/products\/([^/]+)$/);
    if (method === 'GET' && productPublicMatch) {
      const idOrSlug = productPublicMatch[1];
      const isUuid = UUID_RE.test(idOrSlug);
      const q = isUuid
        ? `products?id=eq.${idOrSlug}&is_active=eq.true&select=id,nama,slug,kategori,deskripsi,harga_dasar,diskon_persen,stok,batas_beli_per_orang,is_active,is_limited_edition,gambar_url&limit=1`
        : `products?slug=eq.${encodeURIComponent(idOrSlug)}&is_active=eq.true&select=id,nama,slug,kategori,deskripsi,harga_dasar,diskon_persen,stok,batas_beli_per_orang,is_active,is_limited_edition,gambar_url&limit=1`;
      const rows = await dbFetch(q);
      if (!rows.length) throw new ApiError(404, 'Produk tidak ditemukan.');
      return ok({ product: rows[0] });
    }

    // GET /api/promo/banner (public)
    if (method === 'GET' && path === '/api/promo/banner') {
      const [banners, settings] = await Promise.all([
        dbFetch('promo_banners?is_active=eq.true&order=urutan.asc,created_at.desc&select=id,judul,gambar_url,tampil_di_atas,urutan'),
        dbFetch('promo_settings?key=in.(penawaran_spesial_aktif,promo_judul,promo_deadline)&select=key,value'),
      ]);
      const settingsMap: Record<string, string> = {};
      for (const s of (settings || [])) settingsMap[s.key] = s.value;
      return ok({
        banners,
        penawaran_spesial_aktif: settingsMap['penawaran_spesial_aktif'] === 'true',
        promo_judul: settingsMap['promo_judul'] || 'Penawaran Spesial Minggu Ini',
        promo_deadline: settingsMap['promo_deadline'] || null,
        server_time: new Date().toISOString(),
      });
    }

    // POST /api/auth/login
    if (method === 'POST' && path === '/api/auth/login') {
      checkLoginRate(getIp(req));
      const body = await req.json().catch(() => { throw new ApiError(400, 'Body tidak valid.'); });
      const email = String(body?.email || '').toLowerCase().trim();
      const password = String(body?.password || '');
      if (!email || !password) throw new ApiError(400, 'Email dan password wajib diisi.');
      const res = await fetch(`${API}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: SECRET, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new ApiError(401, 'Email atau password salah.');
      const role = await getUserRole(data.user?.id);
      if (!role) throw new ApiError(403, 'Akun ini tidak memiliki akses Workplace.');
      return ok({ access_token: data.access_token, refresh_token: data.refresh_token, user: { id: data.user.id, email: data.user.email, role } });
    }

    // POST /api/auth/logout
    if (method === 'POST' && path === '/api/auth/logout') {
      const auth = req.headers.get('Authorization') || '';
      if (auth.startsWith('Bearer ')) {
        await fetch(`${API}/auth/v1/logout`, {
          method: 'POST',
          headers: { apikey: SECRET, Authorization: auth },
        }).catch(() => {});
      }
      return ok({ success: true });
    }

    // GET /api/admin/products (admin + worker: returns all products including inactive)
    if (method === 'GET' && path === '/api/admin/products') {
      await requireAdminOrWorker(req);
      const products = await dbFetch('products?select=*&order=created_at.desc&limit=200');
      return ok({ products });
    }

    // POST /api/admin/products
    if (method === 'POST' && path === '/api/admin/products') {
      await requireAdmin(req);
      const body = await req.json().catch(() => { throw new ApiError(400, 'Body tidak valid.'); });
      const data = validateProduct(body);
      if (!data.nama || !data.slug || !data.kategori || data.harga_dasar === undefined) {
        throw new ApiError(400, 'Nama, slug, kategori, dan harga dasar wajib diisi.');
      }
      const [product] = await dbFetch('products', 'POST', data, 'return=representation');
      await dbFetch('sync_logs', 'POST', { status: 'success', pesan: `Produk ditambahkan: ${product.nama}` }).catch(() => {});
      return ok({ product }, 201);
    }

    // PUT /api/admin/products/:id
    const adminProductMatch = path.match(/^\/api\/admin\/products\/([^/]+)$/);
    if (method === 'PUT' && adminProductMatch) {
      const { role } = await requireAdminOrWorker(req);
      const id = adminProductMatch[1];
      if (!UUID_RE.test(id)) throw new ApiError(400, 'ID tidak valid.');
      const body = await req.json().catch(() => { throw new ApiError(400, 'Body tidak valid.'); });
      let data: Record<string, any>;
      if (role === 'worker') {
        data = {};
        if (body.stok !== undefined) {
          const s = Number(body.stok);
          if (!Number.isInteger(s) || s < 0) throw new ApiError(400, 'Stok tidak valid.');
          data.stok = s;
        }
        if (body.harga_dasar !== undefined) {
          const h = Number(body.harga_dasar);
          if (!Number.isInteger(h) || h < 0) throw new ApiError(400, 'Harga dasar tidak valid.');
          data.harga_dasar = h;
        }
      } else {
        data = validateProduct(body, true);
      }
      if (!Object.keys(data).length) throw new ApiError(400, 'Tidak ada data yang diubah.');
      const [product] = await dbFetch(`products?id=eq.${id}`, 'PATCH', data, 'return=representation');
      if (!product) throw new ApiError(404, 'Produk tidak ditemukan.');
      await dbFetch('sync_logs', 'POST', { status: 'success', pesan: `Produk diperbarui: ${product.nama}` }).catch(() => {});
      return ok({ product });
    }

    // DELETE /api/admin/products/:id
    if (method === 'DELETE' && adminProductMatch) {
      await requireAdmin(req);
      const id = adminProductMatch[1];
      if (!UUID_RE.test(id)) throw new ApiError(400, 'ID tidak valid.');
      await dbFetch(`products?id=eq.${id}`, 'DELETE');
      await dbFetch('sync_logs', 'POST', { status: 'success', pesan: `Produk dihapus (${id})` }).catch(() => {});
      return ok({ success: true });
    }

    // PATCH /api/admin/products/:id/stock
    const stockMatch = path.match(/^\/api\/admin\/products\/([^/]+)\/stock$/);
    if (method === 'PATCH' && stockMatch) {
      await requireAdminOrWorker(req);
      const id = stockMatch[1];
      if (!UUID_RE.test(id)) throw new ApiError(400, 'ID tidak valid.');
      const body = await req.json().catch(() => { throw new ApiError(400, 'Body tidak valid.'); });
      const patch: Record<string, any> = {};
      if (body?.stok !== undefined) {
        const stok = Number(body.stok);
        if (!Number.isInteger(stok) || stok < 0) throw new ApiError(400, 'Stok tidak valid (minimal 0).');
        patch.stok = stok;
      }
      if (body?.harga_dasar !== undefined) {
        const harga = Number(body.harga_dasar);
        if (!Number.isInteger(harga) || harga < 0) throw new ApiError(400, 'Harga dasar tidak valid.');
        patch.harga_dasar = harga;
      }
      if (!Object.keys(patch).length) throw new ApiError(400, 'Stok wajib diisi.');
      const [product] = await dbFetch(`products?id=eq.${id}`, 'PATCH', patch, 'return=representation');
      if (!product) throw new ApiError(404, 'Produk tidak ditemukan.');
      return ok({ product });
    }

    // PATCH /api/admin/products/:id/toggle
    const toggleMatch = path.match(/^\/api\/admin\/products\/([^/]+)\/toggle$/);
    if (method === 'PATCH' && toggleMatch) {
      await requireAdmin(req);
      const id = toggleMatch[1];
      if (!UUID_RE.test(id)) throw new ApiError(400, 'ID tidak valid.');
      const rows = await dbFetch(`products?id=eq.${id}&select=is_active,nama&limit=1`);
      if (!rows.length) throw new ApiError(404, 'Produk tidak ditemukan.');
      const [product] = await dbFetch(`products?id=eq.${id}`, 'PATCH', { is_active: !rows[0].is_active }, 'return=representation');
      return ok({ product });
    }

    // PATCH /api/admin/promo/penawaran-spesial
    if (method === 'PATCH' && path === '/api/admin/promo/penawaran-spesial') {
      await requireAdmin(req);
      const body = await req.json().catch(() => { throw new ApiError(400, 'Body tidak valid.'); });
      if (body?.aktif !== undefined && typeof body?.aktif !== 'boolean') {
        throw new ApiError(400, 'Field "aktif" harus boolean.');
      }
      const nowIso = new Date().toISOString();
      if (typeof body?.aktif === 'boolean') {
        await dbFetch(`promo_settings?key=eq.penawaran_spesial_aktif`, 'PATCH', { value: String(body.aktif), updated_at: nowIso });
      }
      if (typeof body?.promo_deadline === 'string') {
        await dbFetch(`promo_settings?key=eq.promo_deadline`, 'PATCH', { value: body.promo_deadline.trim(), updated_at: nowIso });
      }
      if (typeof body?.promo_judul === 'string' && body.promo_judul.trim()) {
        await dbFetch(`promo_settings?key=eq.promo_judul`, 'PATCH', { value: body.promo_judul.trim().slice(0, 200), updated_at: nowIso });
      }
      await dbFetch('sync_logs', 'POST', { status: 'success', pesan: `Pengaturan Penawaran Spesial diperbarui` }).catch(() => {});
      return ok({
        penawaran_spesial_aktif: body?.aktif,
        promo_deadline: body?.promo_deadline,
        promo_judul: body?.promo_judul,
      });
    }

    // POST /api/admin/promo/banner/upload
    if (method === 'POST' && path === '/api/admin/promo/banner/upload') {
      await requireAdmin(req);
      const contentType = req.headers.get('content-type') || '';
      if (!contentType.includes('multipart/form-data')) throw new ApiError(400, 'Gunakan multipart/form-data.');
      const form = await req.formData().catch(() => { throw new ApiError(400, 'Form data tidak valid.'); });
      const file = form.get('file') as File | null;
      if (!file) throw new ApiError(400, 'Field "file" wajib ada.');
      const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
      const mime = file.type;
      if (!ALLOWED.includes(mime)) throw new ApiError(400, 'Tipe file harus JPG, PNG, atau WebP.');
      if (file.size > 2 * 1024 * 1024) throw new ApiError(400, 'Ukuran gambar maksimal 2 MB.');
      const ext = mime === 'image/jpeg' ? 'jpg' : mime === 'image/png' ? 'png' : 'webp';
      const filename = `${crypto.randomUUID()}.${ext}`;
      const bytes = new Uint8Array(await file.arrayBuffer());
      const isJpg = bytes[0] === 0xFF && bytes[1] === 0xD8;
      const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
      const isWebp = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
      if (mime === 'image/jpeg' && !isJpg) throw new ApiError(400, 'File bukan JPEG yang valid.');
      if (mime === 'image/png' && !isPng) throw new ApiError(400, 'File bukan PNG yang valid.');
      if (mime === 'image/webp' && !isWebp) throw new ApiError(400, 'File bukan WebP yang valid.');
      const publicUrl = await storageUpload('banners', filename, bytes, mime);
      const judul = String(form.get('judul') || 'Banner Promo').slice(0, 200);
      const [banner] = await dbFetch('promo_banners', 'POST', { judul, gambar_url: publicUrl, is_active: true, tampil_di_atas: true, urutan: 0 }, 'return=representation');
      return ok({ banner, url: publicUrl }, 201);
    }

    // POST /api/admin/sync
    if (method === 'POST' && path === '/api/admin/sync') {
      await requireAdmin(req);
      const start = Date.now();
      try {
        const products = await dbFetch('products?is_active=eq.true&select=id&limit=1000');
        const elapsed = Date.now() - start;
        const [log] = await dbFetch('sync_logs', 'POST', {
          status: 'success',
          pesan: `Sinkron berhasil. ${products.length} produk aktif. Durasi: ${elapsed}ms`,
        }, 'return=representation');
        return ok({ success: true, product_count: products.length, elapsed_ms: elapsed, log });
      } catch (syncErr) {
        await dbFetch('sync_logs', 'POST', {
          status: 'error',
          pesan: syncErr instanceof Error ? syncErr.message : 'Error tidak diketahui',
        }).catch(() => {});
        throw syncErr;
      }
    }

    // GET /api/admin/sync/status
    if (method === 'GET' && path === '/api/admin/sync/status') {
      await requireAdminOrWorker(req);
      const logs = await dbFetch('sync_logs?order=waktu.desc&limit=10&select=id,waktu,status,pesan');
      const settings = await dbFetch('promo_settings?key=eq.catalog_url&select=value&limit=1');
      return ok({ logs, catalog_url: settings?.[0]?.value || 'https://jokiin.my.id' });
    }

    throw new ApiError(404, 'Endpoint tidak ditemukan.');
  } catch (error) {
    return err(error);
  }
});
