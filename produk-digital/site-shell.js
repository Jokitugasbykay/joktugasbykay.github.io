(() => {
  const footer = document.createElement('footer');
  footer.className = 'pd-site-footer';
  footer.innerHTML = `<div class="pd-footer-inner"><div class="pd-footer-about"><a class="pd-site-brand" href="/produk-digital/" aria-label="JOKI.IN"><img src="/assets/produk-digital/jokiin-logo-white.png" alt="JOKI.IN"></a><p>Produk digital untuk kebutuhanmu, dalam satu tempat.</p><a class="pd-footer-home" href="/">Kunjungi web utama JOKI.IN <span aria-hidden="true">↗</span></a></div><div><h2>PRODUK DIGITAL</h2><a href="/produk-digital/">Semua produk</a><a href="/produk-digital/produk/?game=mlbb">Mobile Legends</a><a href="/produk-digital/produk/?game=genshin">Genshin Impact</a><a href="/produk-digital/produk/?game=axis">Pulsa AXIS</a></div><div><h2>BANTUAN</h2><a href="/produk-digital/pesanan/">Status pesanan</a><a href="/">Hubungi JOKI.IN</a></div><div><h2>TENTANG JOKI.IN</h2><a href="/">Web utama JOKI.IN</a><a href="/">Tentang JOKI.IN</a></div></div><div class="pd-footer-bottom"><span>© ${new Date().getFullYear()} JOKI.IN. All rights reserved.</span><a href="/">JOKI.IN</a></div>`;
  const mount = () => { if (!document.querySelector('.pd-site-footer')) document.body.append(footer); };
  if (document.readyState === 'complete') mount(); else window.addEventListener('load', mount, { once: true });
})();
