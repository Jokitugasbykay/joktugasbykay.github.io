const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'access-control-allow-origin': 'https://jokiin.my.id',
  'access-control-allow-headers': 'content-type,authorization,x-webhook-token,x-mayar-signature,x-order-id,x-order-key,x-file-name,x-file-size',
  'access-control-allow-methods': 'GET,POST,PUT,OPTIONS'
};

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
const clean = (value, max = 250) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const MAX_TASK_BYTES = 50 * 1024 * 1024;

class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
async function digest(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(n => n.toString(16).padStart(2, '0')).join('');
}
async function limitRequest(request, env, action, count, seconds) {
  // Only Cloudflare's platform-provided address is trusted; arbitrary forwarded headers are ignored.
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const key = await digest(`${env.SUPABASE_SERVICE_ROLE_KEY}:${action}:${ip}`);
  const allowed = await supabase(env, 'rpc/jokiin_rate_limit', {
    method: 'POST', body: JSON.stringify({p_key:`worker:${key}`,p_limit:count,p_seconds:seconds})
  });
  if (allowed !== true) throw new ApiError(429, 'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.');
}
async function readJSON(request, max = 48000) {
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, 'Permintaan kosong.');
  let length = 0; const chunks = [];
  while (true) {
    const {done,value} = await reader.read(); if (done) break;
    length += value.length;
    if (length > max) { await reader.cancel(); throw new ApiError(413, 'Permintaan terlalu besar.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new ApiError(400, 'Format permintaan tidak valid.'); }
}

const FILE_MIMES = {pdf:'application/pdf',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',zip:'application/zip',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png'};

const base64Url = value => btoa(String.fromCharCode(...new Uint8Array(value instanceof ArrayBuffer ? value : new TextEncoder().encode(value)))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');

function pemToBuffer(pem) {
  const base64 = String(pem || '').replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function serviceAccountToken(env) {
  if (!env.GOOGLE_SERVICE_ACCOUNT_JSON) return null;
  let account;
  try { account = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON); } catch { throw new Error('Service account Google Drive tidak valid.'); }
  if (!account?.client_email || !account?.private_key) throw new Error('Service account Google Drive tidak lengkap.');
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({alg:'RS256',typ:'JWT'}));
  const claims = base64Url(JSON.stringify({iss:account.client_email,scope:'https://www.googleapis.com/auth/drive',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now + 3600}));
  const key = await crypto.subtle.importKey('pkcs8', pemToBuffer(account.private_key), {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'}, false, ['sign']);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claims}`));
  const response = await fetch('https://oauth2.googleapis.com/token', { method:'POST', headers:{'content-type':'application/x-www-form-urlencoded'}, body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:`${header}.${claims}.${base64Url(signature)}`}) });
  if (!response.ok) throw new Error(`Drive service account error ${response.status}`);
  return (await response.json()).access_token;
}

async function googleToken(env) {
  if (!env.GOOGLE_DRIVE_CLIENT_ID || !env.GOOGLE_DRIVE_CLIENT_SECRET || !env.GOOGLE_DRIVE_REFRESH_TOKEN) return serviceAccountToken(env);
  const response = await fetch('https://oauth2.googleapis.com/token', { method:'POST', headers:{'content-type':'application/x-www-form-urlencoded'}, body:new URLSearchParams({client_id:env.GOOGLE_DRIVE_CLIENT_ID,client_secret:env.GOOGLE_DRIVE_CLIENT_SECRET,refresh_token:env.GOOGLE_DRIVE_REFRESH_TOKEN,grant_type:'refresh_token'}) });
  if (!response.ok) throw new Error(`Drive token error ${response.status}`);
  return (await response.json()).access_token;
}

const driveDateFolderName = () => new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric'
}).format(new Date()).replace(/\./g, '');

const driveQueryValue = value => String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

async function ensureDailyDriveFolder(token, rootFolderId) {
  const name = driveDateFolderName();
  const query = `name = '${driveQueryValue(name)}' and '${driveQueryValue(rootFolderId)}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const lookup = await fetch(`https://www.googleapis.com/drive/v3/files?${new URLSearchParams({q:query,fields:'files(id,name)',pageSize:'1',supportsAllDrives:'true',includeItemsFromAllDrives:'true'})}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!lookup.ok) throw new Error(`Drive folder lookup error ${lookup.status}`);
  const existing = (await lookup.json()).files?.[0];
  if (existing?.id) return { id: existing.id, name };
  const created = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id,name', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'content-type':'application/json' },
    body: JSON.stringify({ name, mimeType:'application/vnd.google-apps.folder', parents:[rootFolderId] })
  });
  if (!created.ok) throw new Error(`Drive folder create error ${created.status}`);
  const folder = await created.json();
  if (!folder?.id) throw new Error('Drive folder returned no ID');
  return { id: folder.id, name };
}

async function taskFolderSetting(request, env) {
  if (!corsOk(request)) return json({error:'Origin tidak diizinkan.'},403);
  const userId = await authenticatedUserId(request, env);
  if (!userId) return json({error:'Login admin diperlukan.'},401);
  const profile = await supabase(env,`profiles?id=eq.${encodeURIComponent(userId)}&select=role&limit=1`);
  if (!['admin','super_admin'].includes(profile?.[0]?.role)) return json({error:'Akses admin diperlukan.'},403);
  if (request.method === 'GET') {
    const rows = await supabase(env,'site_settings?key=eq.task_upload_drive_folder&select=value&limit=1');
    return json({folder_url:rows?.[0]?.value?.folder_url || ''});
  }
  const body = await readJSON(request);
  const folderUrl = clean(body?.folder_url,300);
  const match = /^https:\/\/drive\.google\.com\/drive\/folders\/([A-Za-z0-9_-]{10,120})\/?(?:\?.*)?$/.exec(folderUrl);
  if (!match) return json({error:'Gunakan link folder Google Drive yang valid.'},400);
  await supabase(env,'site_settings?on_conflict=key',{method:'POST',headers:{Prefer:'resolution=merge-duplicates'},body:JSON.stringify({key:'task_upload_drive_folder',value:{folder_id:match[1],folder_url:folderUrl}})});
  return json({folder_url:folderUrl});
}

async function uploadTaskFile(request, env) {
  if (!corsOk(request)) return json({error:'Origin tidak diizinkan.'},403);
  await limitRequest(request, env, 'upload', 30, 600);
  const id = clean(request.headers.get('x-order-id'),80);
  const draftKey = clean(request.headers.get('x-order-key'),100);
  let name;
  try { name = decodeURIComponent(request.headers.get('x-file-name') || ''); } catch { return json({error:'Nama file tidak valid.'},400); }
  const extension = name.split('.').pop()?.toLowerCase();
  const size = Number(request.headers.get('x-file-size') || request.headers.get('content-length'));
  if (!id || !draftKey || name.length > 200 || !FILE_MIMES[extension] || /[\\/\x00-\x1f]/.test(name) || !Number.isInteger(size) || size < 1 || size > MAX_TASK_BYTES) return json({error:'Lampiran tidak valid atau melebihi 50 MB.'},400);
  const rows = await supabase(env,`payment_orders?id=eq.${encodeURIComponent(id)}&request_key=eq.${encodeURIComponent(draftKey)}&select=id,task,payment_status&limit=1`);
  const order = rows?.[0];
  if (!order || order.payment_status !== 'PENDING') return json({error:'Pesanan tidak tersedia untuk lampiran.'},403);
  const attachments = Array.isArray(order.task?.attachments) ? order.task.attachments : [];
  const existing = attachments.find(file => file.name === name && Number(file.size) === size);
  if (existing) return json({attachment:existing});
  if (attachments.length >= 10 || attachments.reduce((sum,file)=>sum+Number(file.size||0),size)>MAX_TASK_BYTES) return json({error:'Maksimal 10 file / total 50 MB.'},400);
  const settings = await supabase(env,'site_settings?key=eq.task_upload_drive_folder&select=value&limit=1');
  const folderId = clean(settings?.[0]?.value?.folder_id,120);
  let token;
  try { token = await googleToken(env); }
  catch { return json({error:'Autorisasi Google Drive gagal. Admin perlu memperbarui kredensial Google Drive di Worker.'},503); }
  if (!/^[A-Za-z0-9_-]{10,120}$/.test(folderId) || !token) return json({error:'Folder lampiran belum siap. Hubungi admin.'},503);
  let file;
  try {
    const folderResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}?fields=id,mimeType,driveId,capabilities(canAddChildren)&supportsAllDrives=true`,{headers:{Authorization:`Bearer ${token}`}});
    if (!folderResponse.ok) return json({error:'Folder Google Drive tidak dapat diakses. Periksa ID folder dan izin akun upload.'},502);
    const folder = await folderResponse.json();
    if (folder.mimeType !== 'application/vnd.google-apps.folder' || !folder.capabilities?.canAddChildren) return json({error:'Akun upload tidak memiliki izin menambahkan file ke folder tujuan.'},502);
    const usingOAuth = env.GOOGLE_DRIVE_CLIENT_ID && env.GOOGLE_DRIVE_CLIENT_SECRET && env.GOOGLE_DRIVE_REFRESH_TOKEN;
    if (!usingOAuth && !folder.driveId) return json({error:'Upload ke My Drive memerlukan OAuth akun pemilik. Service account tidak memiliki kuota penyimpanan; gunakan Shared Drive atau konfigurasi OAuth di Worker.'},503);
    const dailyFolder = await ensureDailyDriveFolder(token, folderId);
    const session = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name&supportsAllDrives=true',{method:'POST',headers:{Authorization:`Bearer ${token}`,'content-type':'application/json','x-upload-content-type':FILE_MIMES[extension],'x-upload-content-length':String(size)},body:JSON.stringify({name,parents:[dailyFolder.id]})});
    const location = session.headers.get('location');
    if (!session.ok || !location?.startsWith('https://www.googleapis.com/')) throw new Error(`Drive session error ${session.status}`);
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength !== size) return json({error:'Ukuran file tidak sesuai. Pilih ulang lampiran dan coba lagi.'},400);
    const uploaded = await fetch(location,{method:'PUT',headers:{'content-type':FILE_MIMES[extension],'content-length':String(size)},body:bytes});
    if (!uploaded.ok) throw new Error(`Drive upload error ${uploaded.status}`);
    file = await uploaded.json();
    if (!file?.id) throw new Error('Drive returned no file ID');
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Drive upload error');
    return json({error:'Google Drive gagal menerima lampiran. Admin perlu memeriksa kuota penyimpanan, izin folder, dan kredensial upload.'},502);
  }
  const entry = {name,size,drive_url:`https://drive.google.com/file/d/${encodeURIComponent(file.id)}/view`};
  await supabase(env,`payment_orders?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify({task:{...order.task,attachments:[...attachments,entry]}})});
  return json({attachment:entry},201);
}

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

async function authenticatedUserId(request, env) {
  const bearer = request.headers.get('authorization');
  if (!bearer) return null; // Guest checkout remains supported.
  if (!/^Bearer [^\s]+$/.test(bearer)) throw new Error('Sesi pengguna tidak valid.');
  const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: bearer }
  });
  if (!response.ok) throw new Error('Sesi pengguna tidak valid.');
  const user = await response.json();
  if (!user?.id) throw new Error('Sesi pengguna tidak valid.');
  const profiles = await supabase(env, `profiles?id=eq.${encodeURIComponent(user.id)}&select=id&limit=1`);
  if (!profiles.length) {
    await supabase(env, 'profiles?on_conflict=id', {
      method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates' },
      body: JSON.stringify({ id: user.id, name: clean(user.email?.split('@')[0], 120) || 'Pengguna', email: user.email || null, role: 'user' })
    });
  }
  return user.id;
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
  try {
    let result = await mayar(env, 'GET', `transactions/${encodeURIComponent(order.mayar_transaction_id)}`).catch(() => null);
    if (!result || !result.response || !result.response.ok) {
      result = await mayar(env, 'GET', `payments/${encodeURIComponent(order.mayar_transaction_id)}`).catch(() => null);
    }
    if (!result || !result.response || !result.response.ok) return order;
    const transaction = result.data?.data;
    const status = String(transaction?.status || '').toLowerCase();
    const amount = Number(transaction?.amount);
    const changes = { last_verified_at: new Date().toISOString() };
    if (status === 'paid' && Number.isSafeInteger(amount) && amount >= Number(order.total_price)) {
      changes.payment_status = 'PAID';
      changes.paid_at = new Date().toISOString();
      const rawMethod = [transaction?.paymentMethod, transaction?.payment_method, transaction?.paymentType, transaction?.payment_type, transaction?.method, transaction?.methodName, transaction?.payment?.method, transaction?.payment?.name, transaction?.payment?.type].find(value => typeof value === 'string' && value.trim());
      if (rawMethod) {
        const normalized = rawMethod.trim().toUpperCase();
        changes.payment_method = /QRIS|QR_CODE|QRCODE/.test(normalized) ? 'QRIS' : rawMethod.trim().slice(0, 80);
      }
    } else if (['expired', 'canceled', 'cancelled', 'failed'].includes(status)) {
      changes.payment_status = 'CANCELED';
    }
    await supabase(env, `payment_orders?id=eq.${encodeURIComponent(order.id)}`, { method: 'PATCH', body: JSON.stringify(changes) }).catch(() => {});
    if (order.order_code && changes.payment_status) {
      const orderChanges = {
        payment_status: changes.payment_status
      };
      if (changes.payment_method) orderChanges.payment_method = changes.payment_method;
      await supabase(env, `orders?order_code=eq.${encodeURIComponent(order.order_code)}`, { method: 'PATCH', body: JSON.stringify(orderChanges) }).catch(() => {});
    }
    return { ...order, ...changes };
  } catch (err) {
    console.error('reconcilePayment error:', err);
    return order;
  }
}

function corsOk(request) {
  const origin = request.headers.get('origin');
  return !origin || origin === 'https://jokiin.my.id' || origin === 'https://www.jokiin.my.id';
}

async function createPayment(request, env) {
  if (!corsOk(request)) return json({ error: 'Origin tidak diizinkan.' }, 403);
  await limitRequest(request, env, 'checkout', 10, 600);
  const userId = await authenticatedUserId(request, env);
  const input = await readJSON(request);
  const customer = input && typeof input.customer === 'object' ? input.customer : {};
  const items = Array.isArray(input?.items) ? input.items : [];
  const task = input && typeof input.task === 'object' && input.task !== null ? input.task : {};
  if (!clean(customer.name, 100) || !/^\S+@\S+\.\S+$/.test(clean(customer.email, 254))) return json({ error: 'Data pelanggan tidak valid.' }, 400);
  if (!items.length || items.length > 20) return json({ error: 'Keranjang tidak valid.' }, 400);
  if (items.some(it => it?.productId === 'gemini-pro-18-bulan' || it?.slug === 'gemini-pro-18-bulan' || it?.is_limited_edition === true || String(it?.tipe || '').toUpperCase() === 'SPESIAL')) {
    return json({ error: 'Penawaran Spesial harus dibayar terpisah. Kosongkan keranjang reguler atau selesaikan pesanan reguler dulu.', code: 'CART_TYPE_CONFLICT' }, 409);
  }
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
    if (!service || !Number.isSafeInteger(quantity) || quantity < 1) return json({ error: 'Layanan atau jumlah tidak valid.' }, 400);
    const originalPrice = Number(service.price);
    const salePercent = Math.max(0, Math.min(100, Number(service.sale_percent) || 0));
    const saleAmount = Math.max(0, Number(service.sale_amount) || 0);
    const price = Math.max(1, Math.round(originalPrice - (saleAmount > 0 ? saleAmount : originalPrice * salePercent / 100)));
    if (!Number.isSafeInteger(originalPrice) || originalPrice <= 0 || !Number.isSafeInteger(price) || price < 0) return json({ error: 'Harga layanan belum valid.' }, 503);
    total += price * quantity;
    if (!Number.isSafeInteger(total)) return json({ error: 'Total pesanan tidak valid.' }, 400);
    lines.push({ service_id: service.id, product_id: service.slug, name: service.name, quantity, unit_price: price, original_price: originalPrice, sale_percent: salePercent, sale_amount: saleAmount, sale_label: clean(service.sale_label, 50), tipe: 'REGULER' });
  }
  const subtotal = total;
  const submittedPromo = clean(input.promo, 24).toUpperCase();
  if (submittedPromo) {
    const campaign = await activePromo(env);
    if (!campaign || submittedPromo !== campaign.coupon) return json({ error: 'Kode promo tidak berlaku atau sudah berakhir.' }, 409);
    total = Math.round(total * (1 - campaign.discount_percent / 100));
  }
  if (subtotal > 1500000) total -= Math.round(total * 0.05);
  if (Number(input.amount) !== total) return json({ error: 'Harga berubah. Muat ulang layanan sebelum membayar.' }, 409);
  const requestKey = clean(input.draftKey, 100);
  if (!/^(?:[0-9a-f-]{36}|req-[a-z0-9-]+)$/i.test(requestKey)) return json({ error: 'Identitas permintaan tidak valid.' }, 400);
  const previous = await supabase(env, `payment_orders?request_key=eq.${encodeURIComponent(requestKey)}&select=id,order_code,customer,user_id,total_price,payment_status,payment_method,payment_url,mayar_transaction_id,expires_at&limit=1`);
  if (previous.length) {
    const saved = previous[0];
    if (saved.customer?.email !== clean(customer.email, 254).toLowerCase() || Number(saved.total_price) !== total || saved.user_id !== userId) return json({ error: 'Permintaan checkout berubah. Coba ulang.' }, 409);
    if (saved.payment_status === 'PAID') {
      return json({ order_id: saved.id, order_code: saved.order_code, payment_status: 'PAID', payment_method:saved.payment_method || null, total });
    }
    if (saved.payment_status === 'PENDING' && saved.payment_url) {
      return json({ order_id: saved.id, order_code: saved.order_code, paymentUrl: saved.payment_url, payment_status: saved.payment_status, transaction_id: saved.mayar_transaction_id, expires_at: saved.expires_at, total });
    }
    await supabase(env, `payment_orders?id=eq.${encodeURIComponent(saved.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        request_key: null,
        payment_status: saved.payment_status === 'PENDING' ? 'CANCELED' : saved.payment_status
      })
    });
  }
  const orderCode = await generateUniqueOrderId(env, 'REGULER');
  const cleanCustomer = { name: clean(customer.name, 100), nim: clean(customer.nim, 50), email: clean(customer.email, 254).toLowerCase(), whatsapp: clean(customer.whatsapp, 24) };
  const cleanTask = { title: clean(task.title, 250), deadline: clean(task.deadline, 50), notes: clean(task.notes, 3000), googleDriveUrl: clean(task.googleDriveUrl, 2048) };
  const order = {
    order_code: orderCode,
    tipe: 'REGULER',
    total,
    nama: cleanCustomer.name,
    nim: cleanCustomer.nim || '-',
    whatsapp: cleanCustomer.whatsapp,
    gmail: cleanCustomer.email,
    judul_tugas: cleanTask.title,
    deadline: cleanTask.deadline,
    catatan: cleanTask.notes,
    request_key: requestKey,
    user_id: userId,
    customer: cleanCustomer,
    task: cleanTask,
    promo: submittedPromo,
    items: lines,
    total_price: total,
    payment_status: 'PENDING',
    status: 'pending'
  };
  const inserted = await supabase(env, 'payment_orders', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(order) });
  await supabase(env, 'order_items', {
    method: 'POST',
    body: JSON.stringify(lines.map(l => ({
      order_id: orderCode,
      produk: l.name,
      product_slug: l.product_id,
      qty: l.quantity,
      harga_satuan: l.unit_price,
      subtotal: l.unit_price * l.quantity
    })))
  }).catch(() => {});
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const customerName = String(order.customer?.name || order.customer?.nama || order.nama || 'Pelanggan JOKI.IN').trim();
  const prodSummary = lines.map(l => l.name + ' x' + l.quantity).join(', ');
  const payment = await mayar(env, 'POST', 'payments/create', { name: customerName, amount: total, email: order.customer.email, mobile: order.customer.whatsapp, description: `Pesanan JOKI.IN ${orderCode} - ${prodSummary}`, expiredAt: expiresAt });
  const data = payment.data?.data || {};
  const paymentUrl = data.link;
  const transactionId = data.transactionId || data.transaction_id || data.id;
  if (!payment.response.ok || typeof paymentUrl !== 'string' || !transactionId) {
    await supabase(env, `payment_orders?order_code=eq.${encodeURIComponent(orderCode)}`, { method: 'PATCH', body: JSON.stringify({ payment_status: 'CANCELED' }) }).catch(() => {});
    return json({ error: 'Layanan pembayaran sedang sibuk. Coba lagi.' }, 502);
  }
  await supabase(env, `payment_orders?order_code=eq.${encodeURIComponent(orderCode)}`, { method: 'PATCH', body: JSON.stringify({ payment_url: paymentUrl, mayar_transaction_id: transactionId, expires_at: expiresAt }) });
  return json({ order_id: inserted?.[0]?.id || orderCode, order_code: orderCode, tipe: 'REGULER', paymentUrl, payment_status: 'PENDING', transaction_id: transactionId, expires_at: expiresAt, total }, 201);
}

const ORDER_ID_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateCryptoOrderId(tipe = 'REGULER') {
  const normTipe = String(tipe || '').toUpperCase();
  const isSpecial = normTipe === 'SPESIAL';
  const isDigital = normTipe === 'DIGITAL';
  const prefix = isDigital ? 'DGT' : (isSpecial ? 'SPCL' : 'NUG');
  const targetLen = isDigital ? 24 : (isSpecial ? 23 : 26);
  let suffix = '';
  while (suffix.length < targetLen) {
    const bytes = crypto.getRandomValues(new Uint8Array(64));
    for (let i = 0; i < bytes.length && suffix.length < targetLen; i++) {
      if (bytes[i] < 248) {
        suffix += ORDER_ID_ALPHABET[bytes[i] % 31];
      }
    }
  }
  return prefix + suffix;
}

async function generateUniqueOrderId(env, tipe = 'REGULER') {
  try {
    const generated = await supabase(env, 'rpc/generate_jokiin_order_id', {
      method: 'POST',
      body: JSON.stringify({ p_tipe: tipe })
    });
    if (typeof generated === 'string' && /^(NUG[A-HJ-NP-Z2-9]{26}|SPCL[A-HJ-NP-Z2-9]{23})$/.test(generated)) {
      return generated;
    }
  } catch (_) {}
  return generateCryptoOrderId(tipe);
}

async function webhook(request, env) {
  const expected = env.MAYAR_WEBHOOK_SECRET;
  if (!expected) return json({ error: 'Konfigurasi webhook belum lengkap.' }, 503);
  await limitRequest(request, env, 'webhook', 100, 60);
  const url = new URL(request.url);
  const supplied = request.headers.get('x-webhook-token') ||
                   request.headers.get('x-mayar-token') ||
                   request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
                   url.searchParams.get('token');
  if (supplied !== expected) return json({ error: 'Unauthorized webhook.' }, 401);
  const payload = await readJSON(request);
  const data = payload?.data || payload;
  const transactionId = data.transactionId || data.transaction_id || data.id || data.paymentId || data.payment_id;
  const orderCode = data.extraData?.orderCode || data.extra_data?.orderCode || data.orderCode || data.order_code;

  let rows = [];
  if (orderCode) {
    rows = await supabase(env, `payment_orders?order_code=eq.${encodeURIComponent(orderCode)}&select=id,order_code,payment_status,total_price,mayar_transaction_id,last_verified_at&limit=1`);
  }
  if (!rows.length && transactionId) {
    rows = await supabase(env, `payment_orders?mayar_transaction_id=eq.${encodeURIComponent(transactionId)}&select=id,order_code,payment_status,total_price,mayar_transaction_id,last_verified_at&limit=1`);
  }
  if (!rows.length) return json({ received: true, matched: false });

  const order = rows[0];
  const status = String(data.status || payload.event || '').toLowerCase();
  if (status === 'paid' || status.includes('payment.received') || status.includes('paid')) {
    const amount = Number(data.amount || data.totalAmount || order.total_price);
    const changes = {
      payment_status: 'PAID',
      paid_at: new Date().toISOString(),
      last_verified_at: new Date().toISOString()
    };
    const rawMethod = [data.paymentMethod, data.payment_method, data.paymentType, data.payment_type, data.method, data.methodName].find(v => typeof v === 'string' && v.trim());
    if (rawMethod) {
      const normalized = rawMethod.trim().toUpperCase();
      changes.payment_method = /QRIS|QR_CODE|QRCODE/.test(normalized) ? 'QRIS' : rawMethod.trim().slice(0, 80);
    }
    await supabase(env, `payment_orders?id=eq.${encodeURIComponent(order.id)}`, { method: 'PATCH', body: JSON.stringify(changes) }).catch(() => {});
    if (order.order_code) {
      const orderChanges = { payment_status: 'PAID' };
      if (changes.payment_method) orderChanges.payment_method = changes.payment_method;
      await supabase(env, `orders?order_code=eq.${encodeURIComponent(order.order_code)}`, { method: 'PATCH', body: JSON.stringify(orderChanges) }).catch(() => {});
    }
    return json({ received: true, matched: true, payment_status: 'PAID' });
  }

  const verified = await reconcilePayment(env, order);
  return json({ received: true, matched: true, payment_status: verified.payment_status });
}

async function paymentStatus(request, env) {
  await limitRequest(request, env, 'status', 60, 60);
  const url = new URL(request.url);
  const reference = clean(url.searchParams.get('order_code') || url.searchParams.get('order_id'), 80);
  if (!reference) return json({ error: 'Nomor pesanan wajib diisi.' }, 400);
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(reference);
  const filter = isUuid
    ? `id=eq.${encodeURIComponent(reference)}`
    : `order_code=eq.${encodeURIComponent(reference.toUpperCase())}`;
  const rows = await supabase(env, `payment_orders?${filter}&select=id,user_id,request_key,order_code,tipe,total_price,payment_status,payment_method,payment_url,expires_at,mayar_transaction_id,last_verified_at&limit=1`);
  if (!rows.length) return json({ error: 'Pesanan tidak ditemukan.' }, 404);
  const order = await reconcilePayment(env, rows[0]);
  const userId = await authenticatedUserId(request, env);
  const key = request.headers.get('x-order-key');
  const orderTipe = String(order.order_code || '').startsWith('SPCL') ? 'SPESIAL' : 'REGULER';
  const isSpecial = orderTipe === 'SPESIAL';
  const owner = isSpecial || (userId && userId === order.user_id) || (key && key === order.request_key) || !order.request_key;
  const summary = { order_id: order.id, order_code: order.order_code, tipe: orderTipe, payment_status: order.payment_status, expires_at: order.expires_at };
  if (!owner) return json(summary);
  return json({ ...summary, amount: order.total_price, payment_method: order.payment_status === 'PAID' ? order.payment_method || null : null, payment_url: order.payment_status === 'PENDING' ? order.payment_url : null });
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

async function proxyCatalogEdge(request, env, url) {
  const baseUrl = (env.SUPABASE_URL || 'https://xdbnwjvxqtpkoaigedsk.supabase.co').replace(/\/+$/, '');
  const target = `${baseUrl}/functions/v1/jokiin-catalog${url.pathname}${url.search}`;
  const headers = new Headers();
  for (const [k, v] of request.headers.entries()) {
    const lk = k.toLowerCase();
    if (!['host', 'connection', 'cf-ray', 'cf-visitor', 'cf-connecting-ip'].includes(lk)) {
      headers.set(k, v);
    }
  }
  // Ensure valid key for Supabase gateway; publishable key is always valid
  if (!headers.has('apikey')) {
    headers.set('apikey', 'sb_publishable_WuihnHZo0ZJbVGCMe1sWJg_QVdRKw4z');
  }
  const init = {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.clone().text()
  };
  return fetch(target, init);
}

async function handleSpecialCheckoutWithMayar(request, env, url) {
  const edgeRes = await proxyCatalogEdge(request, env, url);
  const text = await edgeRes.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }

  if (!edgeRes.ok || !data) {
    return new Response(text, {
      status: edgeRes.status,
      headers: { ...JSON_HEADERS, 'content-type': 'application/json' }
    });
  }

  const order = data.order || data;
  const orderCode = String(order.order_code || order.id || '');
  const total = Number(order.total || order.total_price || 20000);

  if (env.MAYAR_API_KEY && total > 0 && orderCode) {
    try {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const originUrl = request.headers.get('origin') || 'https://jokiin.my.id';
      const redirectUrl = `${originUrl}/?payment=complete&order_id=${encodeURIComponent(orderCode)}`;
      const customerEmail = String(order.gmail || order.customer?.email || '').trim();
      const customerWa = String(order.whatsapp || order.customer?.whatsapp || '').trim();
      const customerName = String(order.nama || order.customer?.name || order.customer?.nama || 'Pelanggan JOKI.IN').trim();
      const prodName = String(order.product?.nama || order.items?.[0]?.name || 'Gemini Pro 18 Bulan');

      const payment = await mayar(env, 'POST', 'payments/create', {
        name: customerName,
        amount: total,
        email: customerEmail,
        mobile: customerWa,
        redirectUrl,
        description: `Pesanan Penawaran Spesial JOKI.IN ${orderCode} - ${prodName}`,
        expiredAt: expiresAt
      });

      const mData = payment.data?.data || {};
      const paymentUrl = mData.link;
      const transactionId = mData.transactionId || mData.transaction_id || mData.id;

      if (paymentUrl && transactionId) {
        await Promise.all([
          supabase(env, `payment_orders?order_code=eq.${encodeURIComponent(orderCode)}`, {
            method: 'PATCH',
            body: JSON.stringify({
              payment_url: paymentUrl,
              mayar_transaction_id: transactionId,
              expires_at: expiresAt
            })
          }).catch(() => {}),
          supabase(env, `orders?order_code=eq.${encodeURIComponent(orderCode)}`, {
            method: 'PATCH',
            body: JSON.stringify({
              payment_url: paymentUrl,
              mayar_transaction_id: transactionId
            })
          }).catch(() => {})
        ]);

        data.paymentUrl = paymentUrl;
        data.payment_url = paymentUrl;
        data.transaction_id = transactionId;
        data.expires_at = expiresAt;
        if (data.order) {
          data.order.paymentUrl = paymentUrl;
          data.order.payment_url = paymentUrl;
          data.order.mayar_transaction_id = transactionId;
          data.order.expires_at = expiresAt;
        }
      } else {
        console.error('Mayar payment creation returned no link:', payment.text);
      }
    } catch (mayarErr) {
      console.error('Mayar creation error for special checkout:', mayarErr);
    }
  }

  return json(data, edgeRes.status);
}


const ADMIN_KAYLA_ID = '92e7a1cb-2136-496a-913b-00cd402c04f5';

function getAuthTokenFromRequest(request) {
  const authHeader = request.headers.get('authorization') || '';
  const match = authHeader.match(/^Bearer\s+([^\s]+)$/i);
  if (request.headers.has('authorization')) return match ? match[1] : null;

  const cookie = request.headers.get('cookie') || '';
  const cookieMatch = cookie.match(/(?:^|;\s*)(?:sb-access-token|sb-[a-z0-9]+-auth-token)=([^;]+)/i);
  if (cookieMatch) {
    try {
      const decoded = decodeURIComponent(cookieMatch[1]);
      if (decoded.startsWith('[') || decoded.startsWith('{')) {
        const parsed = JSON.parse(decoded);
        return parsed.access_token || parsed[0] || decoded;
      }
      return decoded;
    } catch (_) {
      return null;
    }
  }
  return null;
}

async function verifyAdminKayla(request, env) {
  const token = getAuthTokenFromRequest(request);
  if (typeof token !== 'string' || !token.trim()) return { ok: false, reason: 'unauthenticated' };

  const controller = new AbortController();
  let timeout;
  try {
    const apikey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
    if (!apikey || !env.SUPABASE_URL) return { ok: false, reason: 'error' };
    const user = await Promise.race([
      (async () => {
        const res = await fetch(`${env.SUPABASE_URL.replace(/\/+$/, '')}/auth/v1/user`, {
          headers: { apikey, authorization: `Bearer ${token}` },
          redirect: 'manual',
          signal: controller.signal
        });
        if (!res.ok) return null;
        return await res.json();
      })(),
      new Promise((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(new Error('Auth verification timed out'));
        }, 5000);
      })
    ]);
    if (!user || typeof user.id !== 'string' || !user.id) return { ok: false, reason: 'unauthenticated' };
    if (user.id !== ADMIN_KAYLA_ID) return { ok: false, reason: 'forbidden', userId: user.id };
    return { ok: true, user };
  } catch (_) {
    return { ok: false, reason: 'error' };
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}

const DIGITAL_LOCKED_HTML = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>403 Akses Ditolak - JOKI.IN</title>
<style>
body { background: #0d1117; color: #f0f6fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; text-align: center; }
.card { background: #161b22; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 36px 28px; max-width: 440px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
.badge { display: inline-block; padding: 4px 14px; border-radius: 999px; background: rgba(239,68,68,0.15); color: #ef4444; font-size: 12px; font-weight: 700; margin-bottom: 16px; letter-spacing: 0.5px; border: 1px solid rgba(239,68,68,0.3); }
h1 { font-size: 20px; font-weight: 700; margin-bottom: 12px; }
p { font-size: 14px; color: #8b949e; line-height: 1.6; margin-bottom: 24px; }
a { display: inline-block; padding: 10px 22px; border-radius: 8px; background: #10b981; color: #fff; text-decoration: none; font-weight: 600; font-size: 14px; transition: background 0.2s; }
a:hover { background: #059669; }
</style>
</head>
<body>
<div class="card">
  <div class="badge">AKSES TERBATAS</div>
  <h1>Khusus Admin Kayla</h1>
  <p>Modul Toko Produk Digital sedang dalam masa pengembangan dan pengujian internal terbatas. Akses publik akan dibuka setelah pengujian selesai.</p>
  <a href="/">Kembali ke Beranda</a>
</div>
</body>
</html>`;

async function handleDigitalStoreApi(request, env, url) {
  const auth = await verifyAdminKayla(request, env);
  if (!auth.ok) {
    if (auth.reason === 'forbidden') {
      return json({ error: 'Akses ditolak. Modul ini dalam masa pengembangan terbatas khusus Admin Kayla.', code: 'FORBIDDEN' }, 403);
    }
    return json({ error: 'Login admin diperlukan.', code: 'UNAUTHORIZED' }, 401);
  }

  // GET /api/digital-store/auth-verify
  if (url.pathname === '/api/digital-store/auth-verify' && request.method === 'GET') {
    return json({ ok: true, authorized: true, user: { id: ADMIN_KAYLA_ID, email: auth.user.email, name: 'Kayla' } });
  }

  // GET /api/digital-store/products
  if (url.pathname === '/api/digital-store/products' && request.method === 'GET') {
    const categoryFilter = url.searchParams.get('kategori');
    let q = 'products?is_active=eq.true&order=created_at.desc&limit=100';
    if (categoryFilter && categoryFilter !== 'semua') {
      q += `&kategori=eq.${encodeURIComponent(categoryFilter)}`;
    }
    const [products, banners] = await Promise.all([
      supabase(env, q).catch(() => []),
      supabase(env, 'promo_banners?is_active=eq.true&order=urutan.asc&limit=10').catch(() => [])
    ]);

    const categories = [
      { id: 'semua', slug: 'semua', name: 'Semua Produk', icon: 'grid' },
      { id: 'ai', slug: 'ai-produktivitas', name: 'Akun AI & Produktivitas', icon: 'sparkles' },
      { id: 'template', slug: 'template-desain', name: 'Template & Desain', icon: 'layout' },
      { id: 'tools', slug: 'tools-akademik', name: 'Tools Akademik', icon: 'tool' },
      { id: 'ecourse', slug: 'ecourse-panduan', name: 'E-Course & Panduan', icon: 'book' }
    ];

    return json({ ok: true, products: products || [], banners: banners || [], categories });
  }

  // GET /api/digital-store/products/:slug
  const prodMatch = url.pathname.match(/^\/api\/digital-store\/products\/([^\/]+)$/);
  if (prodMatch && request.method === 'GET') {
    const slug = prodMatch[1];
    const rows = await supabase(env, `products?slug=eq.${encodeURIComponent(slug)}&limit=1`);
    if (!rows || !rows.length) return json({ error: 'Produk tidak ditemukan.' }, 404);
    return json({ ok: true, product: rows[0] });
  }

  // POST /api/digital-store/checkout
  if (url.pathname === '/api/digital-store/checkout' && request.method === 'POST') {
    const body = await readJSON(request);
    const slug = clean(body?.slug, 80);
    const qty = Math.max(1, Math.min(10, Number(body?.qty) || 1));
    const customer = body?.customer || {};
    const customerName = clean(customer?.name || 'Admin Kayla', 100);
    const customerEmail = clean(customer?.email || 'kaylafisika24@gmail.com', 254);
    const customerWa = clean(customer?.whatsapp || '', 24);

    if (!slug) return json({ error: 'Produk tidak valid.' }, 400);
    const rows = await supabase(env, `products?slug=eq.${encodeURIComponent(slug)}&limit=1`);
    if (!rows || !rows.length) return json({ error: 'Produk tidak ditemukan.' }, 404);
    const prod = rows[0];

    const basePrice = Number(prod.harga_dasar) || 0;
    const discountPercent = Math.max(0, Math.min(100, Number(prod.diskon_persen) || 0));
    const unitPrice = Math.max(1000, Math.round(basePrice * (1 - discountPercent / 100)));
    const total = unitPrice * qty;

    if (prod.stok !== null && prod.stok !== undefined && Number(prod.stok) < qty) {
      return json({ error: 'Stok produk tidak mencukupi.' }, 409);
    }

    const orderCode = generateCryptoOrderId('DIGITAL');
    const lineItem = {
      product_id: prod.id,
      slug: prod.slug,
      name: prod.nama,
      quantity: qty,
      unit_price: unitPrice,
      total_price: total
    };

    const orderData = {
      order_code: orderCode,
      tipe: 'DIGITAL',
      total,
      total_price: total,
      user_id: ADMIN_KAYLA_ID,
      nama: customerName,
      gmail: customerEmail,
      whatsapp: customerWa,
      payment_status: 'PENDING',
      status: 'pending',
      customer: { name: customerName, email: customerEmail, whatsapp: customerWa },
      items: [lineItem],
      task: { notes: `Pemesanan Produk Digital: ${prod.nama} (${qty}x)` },
      promo: ''
    };

    await supabase(env, 'payment_orders', { method: 'POST', body: JSON.stringify(orderData) });
    await supabase(env, 'order_items', {
      method: 'POST',
      body: JSON.stringify([{
        order_id: orderCode,
        produk: prod.nama,
        product_slug: prod.slug,
        qty,
        harga_satuan: unitPrice,
        subtotal: total
      }])
    }).catch(() => {});

    let paymentUrl = null;
    let transactionId = null;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    if (env.MAYAR_API_KEY && total > 0) {
      try {
        const originUrl = request.headers.get('origin') || 'https://jokiin.my.id';
        const redirectUrl = `${originUrl}/produk-digital/pesanan/${encodeURIComponent(orderCode)}`;
        const payment = await mayar(env, 'POST', 'payments/create', {
          name: customerName,
          amount: total,
          email: customerEmail,
          mobile: customerWa,
          redirectUrl,
          description: `JOKI.IN Digital Store ${orderCode} - ${prod.nama}`,
          expiredAt: expiresAt
        });
        const mData = payment.data?.data || {};
        paymentUrl = mData.link || null;
        transactionId = mData.transactionId || mData.transaction_id || mData.id || null;

        if (paymentUrl && transactionId) {
          await supabase(env, `payment_orders?order_code=eq.${encodeURIComponent(orderCode)}`, {
            method: 'PATCH',
            body: JSON.stringify({ payment_url: paymentUrl, mayar_transaction_id: transactionId, expires_at: expiresAt })
          }).catch(() => {});
        }
      } catch (err) {
        console.error('Mayar payment creation error for digital order:', err);
      }
    }

    return json({
      ok: true,
      order_code: orderCode,
      total,
      payment_url: paymentUrl,
      transaction_id: transactionId,
      expires_at: expiresAt
    }, 201);
  }

  // GET /api/digital-store/orders/:orderCode
  const orderMatch = url.pathname.match(/^\/api\/digital-store\/orders\/([^\/]+)$/);
  if (orderMatch && request.method === 'GET') {
    const code = orderMatch[1];
    const rows = await supabase(env, `payment_orders?order_code=eq.${encodeURIComponent(code)}&limit=1`);
    if (!rows || !rows.length) return json({ error: 'Pesanan tidak ditemukan.' }, 404);
    const order = await reconcilePayment(env, rows[0]);
    return json({ ok: true, order });
  }

  return json({ error: 'Endpoint tidak ditemukan.' }, 404);
}

export default { async fetch(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: JSON_HEADERS });
  const url = new URL(request.url);
  try {
    if (url.pathname === '/api/health') return json({ ok: true, worker: 'jokiin-payment-api' });

    // Digital Store API Gate (Admin Kayla only)
    if (url.pathname.startsWith('/api/digital-store/')) {
      return await handleDigitalStoreApi(request, env, url);
    }

    // Digital Store Web Route Gate (Admin Kayla only)
    if (url.pathname === '/produk-digital' || url.pathname.startsWith('/produk-digital/')) {
      const auth = await verifyAdminKayla(request, env);
      if (!auth.ok) {
        if (auth.reason === 'forbidden') {
          return new Response(DIGITAL_LOCKED_HTML, {
            status: 403,
            headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }
          });
        }
        const accept = request.headers.get('accept') || '';
        if (accept.includes('text/html') || request.method === 'GET') {
          return new Response(null, {
            status: 302,
            headers: {
              'location': `/login?redirect=${encodeURIComponent(url.pathname + url.search)}`,
              'cache-control': 'no-store'
            }
          });
        }
        return json({ error: 'Login admin diperlukan.' }, 401);
      }
      if (env.ASSETS) {
        let targetFile = '/produk-digital/home/';
        if (url.pathname === '/produk-digital/checkout' || url.pathname.startsWith('/produk-digital/checkout/')) {
          targetFile = '/produk-digital/checkout/';
        } else if (url.pathname.startsWith('/produk-digital/produk/')) {
          targetFile = '/produk-digital/produk/';
        } else if (url.pathname.startsWith('/produk-digital/pesanan/')) {
          targetFile = '/produk-digital/pesanan/';
        } else if (url.pathname.startsWith('/produk-digital/kategori/')) {
          targetFile = '/produk-digital/kategori/';
        } else if (url.pathname === '/produk-digital' || url.pathname === '/produk-digital/' || url.pathname === '/produk-digital/home') {
          targetFile = '/produk-digital/home/';
        } else {
          targetFile = url.pathname;
        }

        let assetRes = await env.ASSETS.fetch(new Request(new URL(targetFile, request.url), request));
        if (assetRes.status >= 300 && assetRes.status < 400) {
          const loc = assetRes.headers.get('location');
          if (loc) {
            const nextUrl = new URL(loc, request.url);
            assetRes = await env.ASSETS.fetch(new Request(nextUrl, request));
          }
        }
        return assetRes;
      }
    }
    if (url.pathname === '/api/checkout/spesial' && request.method === 'POST') {
      return await handleSpecialCheckoutWithMayar(request, env, url);
    }
    if (
      url.pathname === '/api/cart' ||
      url.pathname === '/api/cart/items' ||
      url.pathname === '/api/checkout/spesial' ||
      url.pathname === '/api/checkout/reguler' ||
      url.pathname.startsWith('/api/orders/') ||
      url.pathname.startsWith('/api/products') ||
      url.pathname === '/api/promo/banner'
    ) {
      return await proxyCatalogEdge(request, env, url);
    }
    if (url.pathname === '/api/create-mayar-payment' && request.method === 'POST') return await createPayment(request, env);
    if (url.pathname === '/api/upload-task-file' && request.method === 'POST') return await uploadTaskFile(request, env);
    if (url.pathname === '/api/task-folder' && ['GET', 'PUT'].includes(request.method)) return await taskFolderSetting(request, env);
    if (url.pathname === '/api/mayar-webhook' && request.method === 'POST') return await webhook(request, env);
    if (url.pathname === '/api/check-status' && request.method === 'GET') return await paymentStatus(request, env);
    if (url.pathname === '/api/promo' && request.method === 'GET') return await promo(request, env);
    if (/^\/(?:\.|src\/|supabase\/|tests\/|worker\.js|wrangler\.|package(?:-lock)?\.json|README)/i.test(url.pathname)) return json({ error: 'Not found' }, 404);
    if (/\.(?:php|sql|sqlite|env)$/i.test(url.pathname) || /^\/(?:database|storage|api)\//i.test(url.pathname)) return json({ error: 'Not found' }, 404);
    if (env.ASSETS) {
      const asset = await env.ASSETS.fetch(request);
      if (asset.status !== 404) return asset;
      return env.ASSETS.fetch(new Request(new URL('/', request.url), request));
    }
    return json({ error: 'Not found' }, 404);
  } catch (error) {
    if (error instanceof ApiError) return json({ error: error.message }, error.status);
    console.error(error instanceof Error ? error.message : 'Worker error');
    return json({ error: 'Server belum dapat memproses permintaan.' }, 500);
  }
} };
