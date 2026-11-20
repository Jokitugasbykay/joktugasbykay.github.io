'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './login.module.css';
import { getAccount, GOOGLE_RETURN_KEY, saveAccessToken, signOut, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/auth-session';

function safeRedirect(target: string | null) {
  return target?.startsWith('/') && !target.startsWith('//') && !/[\\\x00-\x20]/.test(target) ? target : '/';
}

function LoginContent() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState<Awaited<ReturnType<typeof getAccount>>>(null);
  const checked = useRef(false);
  const showProfile = searchParams.get('account') === '1';
  const redirect = safeRedirect(searchParams.get('redirect'));

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    async function checkSession() {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.slice(1));
      const code = url.searchParams.get('code');
      const oauthError = url.searchParams.has('error') || hash.has('error');
      if (code || oauthError) {
        for (const key of ['code', 'error', 'error_code', 'error_description']) url.searchParams.delete(key);
        window.history.replaceState(null, '', url.pathname + url.search);
        const pending = sessionStorage.getItem(GOOGLE_RETURN_KEY);
        sessionStorage.removeItem(GOOGLE_RETURN_KEY);
        if (oauthError || !pending || !code) {
          throw new Error('Login Google dibatalkan atau gagal. Silakan coba lagi.');
        }
        const { verifier, target } = JSON.parse(pending);
        const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=pkce`, {
          method: 'POST',
          headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
        });
        const { access_token: token } = await response.json();
        if (!response.ok || typeof token !== 'string' || !await getAccount(token)) {
          throw new Error('Sesi Google gagal dibuat. Silakan coba masuk lagi.');
        }
        saveAccessToken(token);
        window.location.replace(safeRedirect(target));
        return;
      }

      const account = await getAccount();
      if (account && !showProfile) window.location.replace(redirect);
      else setSession(account);
      setChecking(false);
    }
    checkSession().catch((error) => {
      setErrorMsg(error instanceof Error ? error.message : 'Gagal memuat sesi.');
      setChecking(false);
    });
  }, [redirect, showProfile]);

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const verifier = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, '0')).join('');
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
      const challenge = btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      sessionStorage.setItem(GOOGLE_RETURN_KEY, JSON.stringify({ verifier, target: redirect }));
      const params = new URLSearchParams({
        provider: 'google', redirect_to: location.origin + '/login/',
        code_challenge: challenge, code_challenge_method: 's256', prompt: 'select_account',
      });
      window.location.assign(`${SUPABASE_URL}/auth/v1/authorize?${params}`);
    } catch {
      setErrorMsg('Gagal membuka login Google. Silakan coba lagi.');
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!session) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      await signOut(session.token);
      window.location.replace('/');
    } catch {
      setErrorMsg('Gagal keluar. Silakan coba lagi.');
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg('Format email tidak valid.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password minimal 6 karakter.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ email: cleanEmail, password })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.error_description?.includes('Email not confirmed')) {
          throw new Error('Konfirmasi email terlebih dahulu. Silakan periksa inbox atau spam email Anda.');
        }
        throw new Error(data?.error_description || 'Email atau password salah. Silakan coba lagi.');
      }

      if (typeof data?.access_token !== 'string') throw new Error('Sesi gagal dibuat. Silakan coba lagi.');
      saveAccessToken(data.access_token);

      setSuccessMsg('Berhasil masuk! Mengalihkan...');
      setTimeout(() => {
        window.location.replace(redirect);
      }, 700);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan saat masuk.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();
    const cleanWa = whatsapp.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg('Format email tidak valid.');
      return;
    }
    if (!cleanWa || cleanWa.length < 8) {
      setErrorMsg('Nomor WhatsApp tidak valid.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password minimal 6 karakter.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Konfirmasi password tidak cocok.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          data: { phone: cleanWa, role: 'customer' }
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.msg || data?.message || 'Gagal mendaftar akun.');
      }

      setSuccessMsg('Pendaftaran berhasil! Silakan periksa email untuk konfirmasi.');
      setMode('login');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan saat mendaftar.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg('Format email tidak valid.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ email: cleanEmail })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.msg || 'Gagal mengirim instruksi reset password.');
      }

      setSuccessMsg('Link pemulihan password telah dikirim ke email Anda.');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal mengirim instruksi reset.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) return <main className={styles.loginContainer}><p role="status">Memeriksa sesi…</p></main>;

  if (session) {
    const name = session.user.user_metadata?.full_name ?? session.user.user_metadata?.name;
    return (
      <main className={styles.loginContainer}>
        <section className={styles.authCard} aria-labelledby="profile-title">
          <h1 id="profile-title" className={styles.title}>Profil Saya</h1>
          {typeof name === 'string' && <p style={{ overflowWrap: 'anywhere' }}>{name}</p>}
          <p style={{ overflowWrap: 'anywhere' }}>{session.user.email}</p>
          {errorMsg && <p role="alert" className={styles.alertError}>{errorMsg}</p>}
          <button type="button" className={styles.submitBtn} disabled={loading} onClick={handleLogout}>
            {loading ? 'Sedang keluar…' : 'Keluar'}
          </button>
          <div className={styles.bottomLink}><a href="/" className={styles.backHome}>← Kembali ke Beranda</a></div>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.loginContainer}>
      <div className={styles.authCard}>
        <div className={styles.logoHeader}>
          <img
            src="/assets/brand-light-lockup.png"
            alt="JOKI.IN"
            width="140"
            height="35"
            className={styles.brandLight}
          />
          <img
            src="/assets/brand-dark-lockup.png"
            alt="JOKI.IN"
            width="140"
            height="35"
            className={styles.brandDark}
          />
          <h1 className={styles.title}>
            {mode === 'login' && 'Masuk Akun'}
            {mode === 'signup' && 'Daftar Akun'}
            {mode === 'reset' && 'Reset Password'}
          </h1>
          <p className={styles.subtitle}>
            {mode === 'login' && 'Masuk untuk mengakses layanan dan memantau pesanan Anda.'}
            {mode === 'signup' && 'Buat akun baru untuk mulai memesan layanan JOKI.IN.'}
            {mode === 'reset' && 'Masukkan email akun Anda untuk menerima link reset.'}
          </p>
        </div>

        <div className={styles.authTabs} role="tablist">
          <button
            type="button"
            className={`${styles.tabBtn} ${mode === 'login' ? styles.tabBtnActive : ''}`}
            onClick={() => { setMode('login'); setErrorMsg(null); setSuccessMsg(null); }}
          >
            Masuk
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${mode === 'signup' ? styles.tabBtnActive : ''}`}
            onClick={() => { setMode('signup'); setErrorMsg(null); setSuccessMsg(null); }}
          >
            Daftar
          </button>
        </div>

        {errorMsg && (
          <div className={`${styles.alertBox} ${styles.alertError}`} role="alert">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className={`${styles.alertBox} ${styles.alertSuccess}`} role="status">
            {successMsg}
          </div>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="loginEmail">Email</label>
              <input
                id="loginEmail"
                type="email"
                className={styles.input}
                placeholder="nama@email.com"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="loginPassword">Password</label>
              <input
                id="loginPassword"
                type="password"
                className={styles.input}
                placeholder="Minimal 6 karakter"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Masuk...' : 'Masuk Sekarang'}
            </button>

            <button type="button" className={styles.googleBtn} disabled={loading} onClick={handleGoogleLogin}>
              Masuk dengan Google
            </button>

            <div className={styles.bottomLink}>
              <button
                type="button"
                className={styles.backHome}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => { setMode('reset'); setErrorMsg(null); setSuccessMsg(null); }}
              >
                Lupa password?
              </button>
            </div>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleRegister}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="regEmail">Email</label>
              <input
                id="regEmail"
                type="email"
                className={styles.input}
                placeholder="nama@email.com"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="regWa">Nomor WhatsApp</label>
              <input
                id="regWa"
                type="tel"
                className={styles.input}
                placeholder="08123456789"
                autoComplete="tel"
                required
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="regPass">Password</label>
              <input
                id="regPass"
                type="password"
                className={styles.input}
                placeholder="Minimal 6 karakter"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="regConfirmPass">Konfirmasi Password</label>
              <input
                id="regConfirmPass"
                type="password"
                className={styles.input}
                placeholder="Ulangi password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Mendaftar...' : 'Buat Akun Baru'}
            </button>
          </form>
        )}

        {mode === 'reset' && (
          <form onSubmit={handleReset}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="resetEmail">Email Terdaftar</label>
              <input
                id="resetEmail"
                type="email"
                className={styles.input}
                placeholder="nama@email.com"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Mengirim...' : 'Kirim Link Reset'}
            </button>

            <div className={styles.bottomLink}>
              <button
                type="button"
                className={styles.backHome}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => { setMode('login'); setErrorMsg(null); setSuccessMsg(null); }}
              >
                Kembali ke Masuk
              </button>
            </div>
          </form>
        )}

        <div className={styles.bottomLink}>
          <a href="/" className={styles.backHome}>← Kembali ke Beranda</a>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p style={{ textAlign: 'center', padding: '40px' }}>Memuat halaman...</p>}>
      <LoginContent />
    </Suspense>
  );
}
