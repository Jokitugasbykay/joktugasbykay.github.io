// Konfigurasi klien publik. Menggunakan reverse proxy same-origin.
// Kredensial upstream disuntikkan secara server-side oleh Cloudflare Worker.
window.JOKIIN_PUBLIC_CONFIG = Object.freeze({
  SUPABASE_URL: '/api/supabase',
  SUPABASE_ANON_KEY: ''
});
