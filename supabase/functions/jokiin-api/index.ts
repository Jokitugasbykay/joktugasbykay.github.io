// JOKIIN public API. Service credentials remain exclusively in the Edge runtime.
// Guest checkout/tracking are intentional. Every supplied user JWT is verified with Auth.
const API = Deno.env.get('SUPABASE_URL')!;
const SECRET = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store','Content-Type':'application/json'};
class ApiError extends Error { constructor(public status:number,message:string) { super(message); } }
async function db(path:string,method='GET',body?:unknown,prefer?:string) {
 const response=await fetch(`${API}/rest/v1/${path}`,{method,headers:{apikey:SECRET,Authorization:`Bearer ${SECRET}`,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 const text=await response.text(); let result:any=null;
 try { result=text?JSON.parse(text):null; } catch { throw new ApiError(503,'Server belum dapat dihubungi. Coba lagi.'); }
 if(!response.ok) {
  const message=String(result?.message||'');
  if(message.includes('PRICE_CHANGED')) throw new ApiError(409,'Harga layanan berubah. Muat ulang ringkasan lalu checkout kembali.');
  if(message.includes('PROMO_EXPIRED')) throw new ApiError(409,'Kode promo tidak berlaku atau sudah berakhir.');
  if(message.includes('SERVICE_UNAVAILABLE')) throw new ApiError(409,'Salah satu layanan sedang tidak tersedia.');
  if(message.includes('CHECKOUT_CONFLICT')) throw new ApiError(409,'Data checkout berubah. Silakan buat permintaan checkout baru.');
  if(result?.code==='23505') throw new ApiError(409,'Permintaan sudah diproses. Silakan muat ulang data.');
  console.error('Database request failed',response.status,result?.code);
  throw new ApiError(503,'Data belum berhasil diproses. Silakan coba lagi.');
 }
 return result;
}
async function hash(text:string) {
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
 return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
async function readJSON(req:Request) {
 const reader=req.body?.getReader(); if(!reader) throw new ApiError(400,'Permintaan kosong.');
 let size=0; const chunks:Uint8Array[]=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>48000){await reader.cancel();throw new ApiError(413,'Detail tugas terlalu panjang.');}chunks.push(value);}
 const data=new Uint8Array(size);let offset=0;for(const part of chunks){data.set(part,offset);offset+=part.length;}
 try{return JSON.parse(new TextDecoder().decode(data));}catch{throw new ApiError(400,'Format permintaan tidak valid.');}
}
function str(value:unknown,label:string,max:number,required=true) {
 if(typeof value!=='string') {if(!required && value==null)return '';throw new ApiError(400,`${label} tidak valid.`);}
 const result=value.trim();if((required&&!result)||result.length>max)throw new ApiError(400,`${label} tidak valid atau terlalu panjang.`);return result;
}
function uuid(value:unknown) {const s=str(value,'ID permintaan',36);if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s))throw new ApiError(400,'ID permintaan tidak valid.');return s;}
async function getUser(req:Request) {
 const auth=req.headers.get('Authorization');if(!auth)return null;
 if(!/^Bearer [^\s]+$/.test(auth))throw new ApiError(401,'Sesi tidak valid. Silakan login kembali.');
 const res=await fetch(`${API}/auth/v1/user`,{headers:{apikey:SECRET,Authorization:auth}});
 if(!res.ok)throw new ApiError(401,'Sesi berakhir. Silakan login kembali.');
 const user=await res.json();if(!user.id)throw new ApiError(401,'Sesi tidak valid.');return user;
}
async function ensureProfile(user:any) {
 const rows=await db(`profiles?id=eq.${user.id}&select=id,name,photo_url`);if(rows.length)return rows[0];
 const profile={id:user.id,name:String(user.user_metadata?.full_name||user.email?.split('@')[0]||'Pengguna').slice(0,120),email:user.email||null,photo_url:null,role:'user'};
 await db('profiles?on_conflict=id','POST',profile,'resolution=ignore-duplicates');return profile;
}
const ORDER_FIELDS='id,order_code,user_id,service_id,items,customer,task,notes,status,total_price,subtotal,discount,service_fee,payment_fee,payment_method,payment_status,estimated_completion,created_at';
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 try{
  if(req.method!=='POST')throw new ApiError(405,'Gunakan POST.');
  if(!SECRET||!API)throw new ApiError(503,'Konfigurasi server belum lengkap.');
  const input=await readJSON(req);
  if(!input||!['checkout','track','review'].includes(input.action))throw new ApiError(400,'Aksi tidak tersedia.');
  // Platform-forwarded IP only used as an abuse-control signal, never authorization.
  const ip=req.headers.get('cf-connecting-ip')||req.headers.get('x-forwarded-for')?.split(',').pop()?.trim()||'unknown';
  const ipKey=await hash(`${SECRET}:${input.action}:${ip}`);
  const allowed=await db('rpc/jokiin_rate_limit','POST',{p_key:ipKey,p_limit:input.action==='checkout'?20:60,p_seconds:input.action==='checkout'?600:60});
  if(!allowed)throw new ApiError(429,'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.');
  const user=await getUser(req);
  if(user){const ok=await db('rpc/jokiin_rate_limit','POST',{p_key:`${input.action}:${user.id}`,p_limit:input.action==='checkout'?20:60,p_seconds:input.action==='checkout'?600:60});if(!ok)throw new ApiError(429,'Terlalu banyak percobaan. Silakan tunggu.');}
  if(input.action==='checkout'){
   const requestKey=uuid(input.requestKey);
   if(!input.customer||!input.task)throw new ApiError(400,'Data pemesan dan tugas wajib diisi.');
   const customer={name:str(input.customer.name,'Nama',120),whatsapp:str(input.customer.whatsapp,'WhatsApp',20),email:str(input.customer.email,'Email',254).toLowerCase()};
   if(!/^\d{8,18}$/.test(customer.whatsapp)||!/^[^\s@]+@gmail\.com$/.test(customer.email))throw new ApiError(400,'Periksa nomor WhatsApp dan alamat Gmail.');
   const task={title:str(input.task.title,'Judul tugas',250),deadline:str(input.task.deadline,'Deadline',40),notes:str(input.task.notes,'Catatan tugas',10000),googleDriveUrl:str(input.task.googleDriveUrl,'Link Drive',2000,false)};
   if(!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?)?$/.test(task.deadline)||!Number.isFinite(Date.parse(task.deadline)))throw new ApiError(400,'Deadline tidak valid.');
   if(task.googleDriveUrl){let url:URL;try{url=new URL(task.googleDriveUrl);}catch{throw new ApiError(400,'Link Drive tidak valid.');}if(url.protocol!=='https:'||!['drive.google.com','docs.google.com'].includes(url.hostname)||url.username||url.password)throw new ApiError(400,'Gunakan link HTTPS Google Drive atau Google Docs.');}
   if(!Array.isArray(input.items)||input.items.length<1||input.items.length>20)throw new ApiError(400,'Keranjang tidak valid.');
   const items=input.items.map((item:any)=>{if(!item||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>100)throw new ApiError(400,'Jumlah layanan harus 1–100.');const productId=str(item.productId,'Layanan',80);if(!/^[a-z0-9-]+$/.test(productId))throw new ApiError(400,'Layanan tidak valid.');return {productId,quantity:item.quantity};});
   const paymentMethod=str(input.paymentMethod,'Pembayaran',30);
   const promo=str(input.promo,'Promo',30,false).toUpperCase();
   const expectedTotal=input.expectedTotal;if(typeof expectedTotal!=='number'||!Number.isFinite(expectedTotal)||expectedTotal<0)throw new ApiError(400,'Total tidak valid.');
   if(user)await ensureProfile(user);
   const digest=await hash(JSON.stringify({user:user?.id||null,customer,task,items,paymentMethod,promo,expectedTotal}));
   const order=await db('rpc/jokiin_create_order','POST',{p_user_id:user?.id||null,p_request_key:requestKey,p_digest:digest,p_customer:customer,p_task:task,p_items:items,p_payment_method:paymentMethod,p_promo:promo,p_expected_total:expectedTotal});
   return new Response(JSON.stringify({order}),{headers:cors});
  }
  if(input.action==='track'){
   const code=str(input.orderCode,'Nomor order',80).toUpperCase().replace(/^#/,'');
   if(!/^NUG-\d{8}-(?:[A-F0-9]{32}|[A-F0-9]{12}|\d{4})$/.test(code))throw new ApiError(404,'Pesanan tidak ditemukan. Gunakan nomor order lengkap.');
   const secure=/^NUG-\d{8}-(?:[A-F0-9]{32}|[A-F0-9]{12})$/.test(code);
   // Old short references are not credentials. They require ownership or an admin session.
   let ownerFilter='';
   if(!secure){
    if(!user)throw new ApiError(404,'Nomor order lama perlu dicek melalui akun pemilik atau Admin Salsa.');
    const profiles=await db(`profiles?id=eq.${user.id}&select=role`);
    if(profiles[0]?.role!=='admin')ownerFilter=`&user_id=eq.${user.id}`;
   }
   const rows=await db(`orders?order_code=eq.${encodeURIComponent(code)}${ownerFilter}&select=${ORDER_FIELDS}&limit=1`);
   if(!rows.length)throw new ApiError(404,'Pesanan tidak ditemukan. Periksa nomor order lengkap.');
   return new Response(JSON.stringify({order:rows[0]}),{headers:cors});
  }
  if(!user)throw new ApiError(401,'Silakan login untuk menulis ulasan.');
  const requestKey=uuid(input.requestKey);
  const rating=input.rating;if(!Number.isInteger(rating)||rating<1||rating>5)throw new ApiError(400,'Pilih rating 1–5.');
  const comment=str(input.comment,'Ulasan',3000);const slug=str(input.productId,'Layanan',80);
  if(!/^[a-z0-9-]+$/.test(slug))throw new ApiError(400,'Layanan tidak valid.');
  const services=await db(`services?slug=eq.${slug}&select=id&limit=1`);if(!services.length)throw new ApiError(400,'Layanan tidak ditemukan.');
  const existing=await db(`reviews?request_key=eq.${requestKey}&select=id,user_id,rating,comment,service_id&limit=1`);
  if(existing.length){if(existing[0].user_id!==user.id||existing[0].rating!==rating||existing[0].comment!==comment||String(existing[0].service_id)!==String(services[0].id))throw new ApiError(409,'Permintaan ulasan berbeda.');return new Response(JSON.stringify({success:true}),{headers:cors});}
  const profile=await ensureProfile(user);
  const orders=await db(`orders?user_id=eq.${user.id}&status=eq.completed&payment_status=eq.PAID&select=id,items&order=created_at.desc&limit=1000`);
  const purchase=orders.find((o:any)=>Array.isArray(o.items)&&o.items.some((i:any)=>i.productId===slug||String(i.serviceId)===String(services[0].id)));
  const name=Array.from(String(profile.name||'Pengguna')).slice(0,3).join('')+'**';
  await db('reviews','POST',{user_id:user.id,service_id:services[0].id,order_id:purchase?.id||null,rating,comment,customer_name:name,user_photo:null,verified:Boolean(purchase),request_key:requestKey});
  return new Response(JSON.stringify({success:true}),{headers:cors});
 }catch(error){
  const known=error instanceof ApiError;
  if(!known)console.error('JOKIIN request failed',error instanceof Error?error.name:'UnknownError');
  return new Response(JSON.stringify({error:known?error.message:'Server belum dapat dihubungi. Silakan coba lagi.'}),{status:known?error.status:500,headers:cors});
 }
});
