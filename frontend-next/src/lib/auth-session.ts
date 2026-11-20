export function getAccessToken(): string | null {
  const cookie = document.cookie.match(/(?:^|;\s*)(?:sb-access-token|sb-[a-z0-9-]+-auth-token)=([^;]+)/i)?.[1];
  if (cookie) {
    try {
      const value = decodeURIComponent(cookie);
      const parsed = value.startsWith('base64-')
        ? JSON.parse(atob(value.slice(7)))
        : value.startsWith('{') || value.startsWith('[') ? JSON.parse(value) : null;
      const token = Array.isArray(parsed) ? parsed[0] : parsed?.access_token;
      if (token) return token;
      if (!parsed) return value;
    } catch { /* Try localStorage session below. */ }
  }

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i) || '';
    if (!key.includes('auth-token')) continue;
    try {
      const raw = localStorage.getItem(key) || '';
      const session = raw.startsWith('base64-') ? JSON.parse(atob(raw.slice(7))) : JSON.parse(raw);
      if (session?.access_token) return session.access_token;
    } catch { /* Ignore invalid/stale session entries. */ }
  }
  return null;
}
