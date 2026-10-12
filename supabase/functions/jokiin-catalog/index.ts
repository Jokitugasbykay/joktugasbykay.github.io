// jokiin-catalog Edge Function
// REST API for product catalog, promo banners, and Workplace integration
const API = Deno.env.get('SUPABASE_URL')!;
const SECRET = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-client-info',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
};

class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
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
    method, headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { throw new ApiError(503, 'Server error.'); }
  if (!res.ok) {
    console.error('dbFetch error', res.status, data);
    throw new ApiError(503, 'Operasi database gagal. Coba lagi.');
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
    const err = await res.text();
    console.error('Storage upload error', res.status, err);
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
  return new Response(
    JSON.stringify({ error: known ? (error as ApiError).message : 'Server error. Coba lagi.' }),
    { status: known ? (error as ApiError).status : 500, headers: CORS }
  );
}

function getIp(req: Request): string {
  return req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'unknown';
}

const SLUG_RE = /^[a-z0-9-]{1,100}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
      // Worker can only update stok and harga_dasar
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

    // PATCH /api/admin/products/:id/stock (worker allowed: stok & optional harga_dasar)
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
        promo_judul: body?.promo_judul
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
