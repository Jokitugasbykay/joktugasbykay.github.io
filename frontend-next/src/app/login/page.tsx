'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './login.module.css';

const SUPABASE_URL = 'https://xdbnwjvxqtpkoaigedsk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_WuihnHZo0ZJbVGCMe1sWJg_QVdRKw4z';

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

  // Validate local redirect
  const getSafeRedirect = () => {
    try {
      const target = searchParams.get('redirect') || '/';
      if (target.startsWith('/') && !target.startsWith('//') && !target.includes(':')) {
        return target;
      }
    } catch {
      // Fallback
    }
    return '/';
  };

  useEffect(() => {
    // Check if user session already exists in cookies
    const cookies = typeof document !== 'undefined' ? document.cookie : '';
    const match = cookies.match(/(?:^|;\s*)sb-access-token=([^;]+)/);
    if (match && match[1]) {
      const token = decodeURIComponent(match[1]);
      fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          authorization: `Bearer ${token}`
        }
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.id) {
            window.location.replace(getSafeRedirect());
          }
        })
        .catch(() => {});
    }
  }, []);

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

      const accessToken = data?.access_token;
      if (accessToken) {
        const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `sb-access-token=${encodeURIComponent(accessToken)}; path=/; SameSite=Lax${secureFlag}`;
      }

      setSuccessMsg('Berhasil masuk! Mengalihkan...');
      setTimeout(() => {
        window.location.replace(getSafeRedirect());
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
