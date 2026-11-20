export const SUPABASE_URL = 'https://xdbnwjvxqtpkoaigedsk.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_WuihnHZo0ZJbVGCMe1sWJg_QVdRKw4z';
export const GOOGLE_RETURN_KEY = 'jokiin-google-return';
const storageKey = 'sb-xdbnwjvxqtpkoaigedsk-auth-token';

function cookies() {
  return new Map(document.cookie.split('; ').map((entry) => {
    const separator = entry.indexOf('=');
    return [entry.slice(0, separator), entry.slice(separator + 1)];
  }));
}

function parseToken(value: string | undefined): string | undefined {
  if (!value) return;
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith('eyJ')) return decoded;
    const json = decoded.startsWith('base64-')
      ? new TextDecoder().decode(Uint8Array.from(atob(decoded.slice(7).replace(/-/g, '+').replace(/_/g, '/')), (byte) => byte.charCodeAt(0)))
      : decoded;
    const session = JSON.parse(json);
    const token = Array.isArray(session) ? session[0] : session?.access_token;
    if (typeof token === 'string') return token;
  } catch { /* Expired or malformed browser data can be replaced by a fresh login. */ }
}

function* accessTokens() {
  const values = cookies();
  yield parseToken(values.get('sb-access-token'));
  yield parseToken(values.get(storageKey));
  const chunks: string[] = [];
  for (let i = 0; values.has(`${storageKey}.${i}`); i++) {
    chunks.push(values.get(`${storageKey}.${i}`)!);
  }
  yield parseToken(chunks.join(''));
  try {
    yield parseToken(localStorage.getItem(storageKey) ?? undefined);
  } catch { /* Browser storage may be disabled. */ }
}

export type Account = { id: string; email?: string; user_metadata?: { full_name?: unknown; name?: unknown } };

export async function getAccount(callbackToken?: string) {
  const tokens = callbackToken ? [callbackToken] : accessTokens();
  for (const token of new Set(tokens)) {
    if (!token) continue;
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: authHeaders(token) });
    if (response.status === 401 || response.status === 403) continue;
    if (!response.ok) throw new Error('Gagal memuat akun. Silakan coba lagi.');
    const user: Account = await response.json();
    if (user.id) return { user, token };
  }
  return null;
}

function authHeaders(token: string) {
  return { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` };
}

type AuthSession = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  user?: Account;
};

export function saveAuthSession(session: AuthSession) {
  const { access_token: token, refresh_token, expires_in, user } = session;
  const now = Math.floor(Date.now() / 1000);
  const expires_at = session.expires_at ?? (typeof expires_in === 'number' ? now + expires_in : NaN);
  if (!token || !refresh_token || !user?.id || !Number.isSafeInteger(expires_at) || expires_at <= now) {
    throw new Error('Sesi tidak lengkap. Silakan masuk lagi.');
  }
  // Share the Supabase SDK session format with the restored storefront.
  const stored = JSON.stringify({ access_token: token, refresh_token, expires_at, expires_in, token_type: 'bearer', user });
  const cookieOptions = `; Path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
  localStorage.setItem(storageKey, stored);
  document.cookie = `sb-access-token=${encodeURIComponent(token)}${cookieOptions}`;
  if (parseToken(cookies().get('sb-access-token')) !== token) {
    localStorage.removeItem(storageKey);
    throw new Error('Sesi tidak tersimpan. Izinkan cookie lalu coba lagi.');
  }
}

export async function signOut(token: string) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/logout?scope=local`, { method: 'POST', headers: authHeaders(token) });
  if (!response.ok && ![401, 403, 404].includes(response.status)) {
    throw new Error('Gagal keluar. Silakan coba lagi.');
  }
  for (const key of cookies().keys()) {
    if (key !== 'sb-access-token' && key !== storageKey && !key.startsWith(storageKey + '.')) continue;
    for (const path of ['/', '/login', '/login/']) {
      document.cookie = `${key}=; Max-Age=0; Path=${path}; SameSite=Lax`;
      if (location.hostname === 'jokiin.my.id' || location.hostname === 'www.jokiin.my.id') {
        document.cookie = `${key}=; Max-Age=0; Path=${path}; Domain=jokiin.my.id; SameSite=Lax; Secure`;
      }
    }
  }
  try { localStorage.removeItem(storageKey); } catch { /* Browser storage may be disabled. */ }
}
