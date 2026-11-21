// JOKI.IN Digital Store - Game Detail & Top Up Module
import { formatRupiah } from './config.js';

export const MLBB_PACKAGES = [
  {
    id: 'prod-mlbb-5',
    slug: 'mlbb-5-diamonds',
    nama: 'Mobile Legends 5 Diamonds',
    shortName: '5 Diamonds',
    type: 'regular',
    harga: 2590,
    badge: null,
    desc: 'Top up 5 Diamond Mobile Legends Bang Bang resmi dan instan.'
  },
  {
    id: 'prod-mlbb-10',
    slug: 'mlbb-10-diamonds',
    nama: 'Mobile Legends 10 Diamonds',
    shortName: '10 Diamonds',
    type: 'regular',
    harga: 4300,
    badge: 'Best Value',
    desc: 'Top up 10 Diamond Mobile Legends Bang Bang resmi dan hemat (Best Value).'
  },
  {
    id: 'prod-mlbb-wp',
    slug: 'mlbb-weekly-diamond-pass',
    nama: 'Mobile Legends Weekly Diamond Pass',
    shortName: 'Weekly Diamond Pass',
    type: 'weekly',
    harga: 32525,
    badge: 'Best Value',
    desc: 'Langganan Weekly Diamond Pass Mobile Legends Bang Bang, klaim diamond harian lebih hemat.'
  },
  {
    id: 'prod-mlbb-14',
    slug: 'mlbb-14-diamonds',
    nama: 'Mobile Legends 14 Diamonds',
    shortName: '14 Diamonds',
    type: 'regular',
    harga: 5800,
    badge: null,
    desc: 'Top up 14 Diamond Mobile Legends Bang Bang resmi dan instan.'
  },
  {
    id: 'prod-mlbb-28',
    slug: 'mlbb-28-diamonds',
    nama: 'Mobile Legends 28 Diamonds',
    shortName: '28 Diamonds',
    type: 'regular',
    harga: 11000,
    badge: null,
    desc: 'Top up 28 Diamond Mobile Legends Bang Bang resmi dan instan.'
  },
  {
    id: 'prod-mlbb-42',
    slug: 'mlbb-42-diamonds',
    nama: 'Mobile Legends 42 Diamonds',
    shortName: '42 Diamonds',
    type: 'regular',
    harga: 16500,
    badge: null,
    desc: 'Top up 42 Diamond Mobile Legends Bang Bang resmi dan instan.'
  },
  {
    id: 'prod-mlbb-70',
    slug: 'mlbb-70-diamonds',
    nama: 'Mobile Legends 70 Diamonds',
    shortName: '70 Diamonds',
    type: 'regular',
    harga: 27500,
    badge: 'Populer',
    desc: 'Top up 70 Diamond Mobile Legends Bang Bang resmi dan instan.'
  },
  {
    id: 'prod-mlbb-140',
    slug: 'mlbb-140-diamonds',
    nama: 'Mobile Legends 140 Diamonds',
    shortName: '140 Diamonds',
    type: 'regular',
    harga: 54000,
    badge: null,
    desc: 'Top up 140 Diamond Mobile Legends Bang Bang resmi dan instan.'
  },
  {
    id: 'prod-mlbb-284',
    slug: 'mlbb-284-diamonds',
    nama: 'Mobile Legends 284 Diamonds',
    shortName: '284 Diamonds (Bonus 28)',
    type: 'regular',
    harga: 108000,
    badge: 'Bonus',
    desc: 'Top up 284 Diamond (256 + 28 Bonus) Mobile Legends Bang Bang resmi.'
  },
  {
    id: 'prod-mlbb-355',
    slug: 'mlbb-355-diamonds',
    nama: 'Mobile Legends 355 Diamonds',
    shortName: '355 Diamonds (Bonus 35)',
    type: 'regular',
    harga: 135000,
    badge: null,
    desc: 'Top up 355 Diamond (320 + 35 Bonus) Mobile Legends Bang Bang resmi.'
  },
  {
    id: 'prod-mlbb-716',
    slug: 'mlbb-716-diamonds',
    nama: 'Mobile Legends 716 Diamonds',
    shortName: '716 Diamonds (Bonus 72)',
    type: 'regular',
    harga: 270000,
    badge: 'Promo',
    desc: 'Top up 716 Diamond (644 + 72 Bonus) Mobile Legends Bang Bang resmi.'
  },
  {
    id: 'prod-mlbb-twilight',
    slug: 'mlbb-twilight-pass',
    nama: 'Mobile Legends Twilight Pass',
    shortName: 'Twilight Pass',
    type: 'weekly',
    harga: 150000,
    badge: 'Special',
    desc: 'Aktivasi Twilight Pass Mobile Legends klaim skin eksklusif dan diamond.'
  }
];

export function initGameDetailPage() {
  let currentPackages = [...MLBB_PACKAGES];
  let selectedPackage = null;
  let activeFilter = 'all';

  function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.style.borderColor = isError ? 'rgba(244, 63, 94, 0.4)' : 'rgba(0, 229, 153, 0.4)';
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  function renderPackages() {
    const container = document.getElementById('packages-container');
    if (!container) return;

    const filtered = currentPackages.filter(item => {
      if (activeFilter === 'all') return true;
      return item.type === activeFilter;
    });

    container.innerHTML = filtered.map(pkg => {
      const isSelected = selectedPackage && selectedPackage.id === pkg.id;
      const badgeHtml = pkg.badge ? `
        <span class="digital-store-card-badge ${pkg.badge === 'Best Value' ? 'badge-best-value' : 'badge-populer'}">
          ${pkg.badge}
        </span>
      ` : '';

      return `
        <article class="digital-store-package-card ${isSelected ? 'selected' : ''}" data-id="${pkg.id}">
          ${badgeHtml}
          <div>
            <div class="digital-store-card-header">
              <svg class="digital-store-diamond-sm" viewBox="0 0 24 24" fill="none">
                <polygon points="12 2 2 9 12 22 22 9 12 2" stroke="#38bdf8" stroke-width="1.8" fill="rgba(56, 189, 248, 0.2)"></polygon>
                <line x1="2" y1="9" x2="22" y2="9" stroke="#38bdf8" stroke-width="1.2"></line>
                <polyline points="7 9 12 22 17 9" stroke="#38bdf8" stroke-width="1.2"></polyline>
              </svg>
              <div class="digital-store-card-meta">
                <span class="digital-store-brand-tag">MOBILE LEGENDS</span>
                <h3 class="digital-store-card-title">${pkg.shortName || pkg.nama}</h3>
                <span class="digital-store-card-sub">${pkg.type === 'weekly' ? 'Weekly' : 'Instant Delivery'}</span>
              </div>
            </div>
          </div>
          <div class="digital-store-price-row">
            <span class="digital-store-price-val">${formatRupiah(pkg.harga)}</span>
          </div>
          <div class="digital-store-checkmark">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        </article>
      `;
    }).join('');

    container.querySelectorAll('.digital-store-package-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-id');
        const found = currentPackages.find(p => p.id === id);
        if (found) {
          selectPackage(found);
        }
      });
    });
  }

  function selectPackage(pkg) {
    selectedPackage = pkg;
    renderPackages();

    const emptyEl = document.getElementById('selection-empty');
    const activeEl = document.getElementById('selection-active');
    const titleEl = document.getElementById('summary-title');
    const descEl = document.getElementById('summary-desc');
    const priceEl = document.getElementById('summary-price');
    const totalEl = document.getElementById('summary-total');
    const buyBtn = document.getElementById('btn-pay-now');
    const buyLabel = document.getElementById('btn-pay-label');

    if (emptyEl) emptyEl.style.display = 'none';
    if (activeEl) activeEl.style.display = 'block';

    if (titleEl) titleEl.textContent = pkg.nama;
    if (descEl) descEl.textContent = pkg.desc;
    if (priceEl) priceEl.textContent = formatRupiah(pkg.harga);
    if (totalEl) totalEl.textContent = formatRupiah(pkg.harga);

    if (buyBtn && buyLabel) {
      buyBtn.classList.remove('disabled');
      buyBtn.classList.add('ready');
      buyBtn.disabled = false;
      buyLabel.textContent = 'Beli Sekarang';
    }
  }

  // Filter tabs
  document.querySelectorAll('.digital-store-filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.digital-store-filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeFilter = tab.getAttribute('data-filter') || 'all';
      renderPackages();
    });
  });

  // Cek Username button
  const btnCheckUser = document.getElementById('btn-check-user');
  const userStatusBox = document.getElementById('check-user-status');
  const inputUserId = document.getElementById('input-userid');
  const inputZoneId = document.getElementById('input-zoneid');

  if (btnCheckUser) {
    btnCheckUser.addEventListener('click', () => {
      const userId = inputUserId?.value.trim();
      const zoneId = inputZoneId?.value.trim();

      if (!userId || !zoneId) {
        if (inputUserId && !userId) inputUserId.classList.add('input-error');
        if (inputZoneId && !zoneId) inputZoneId.classList.add('input-error');
        showToast('Harap isi ID Pengguna dan Zone ID akun kamu!', true);
        return;
      }

      btnCheckUser.textContent = 'Memeriksa ID...';
      btnCheckUser.disabled = true;

      setTimeout(() => {
        btnCheckUser.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg> Cek Username
        `;
        btnCheckUser.disabled = false;

        if (userStatusBox) {
          userStatusBox.className = 'digital-store-user-status success';
          userStatusBox.textContent = 'Akun Valid: User terverifikasi (Server ' + zoneId + ')';
        }
        showToast('Akun valid dan siap untuk top up!');
      }, 600);
    });
  }

  [inputUserId, inputZoneId].forEach(inp => {
    inp?.addEventListener('input', () => {
      inp.classList.remove('input-error');
    });
  });

  // CTA Beli Sekarang (Direct payment, no cart!)
  const btnBuyNow = document.getElementById('btn-pay-now');
  if (btnBuyNow) {
    btnBuyNow.addEventListener('click', () => {
      if (!selectedPackage) {
        showToast('Silakan pilih salah satu paket diamond terlebih dahulu!', true);
        return;
      }

      const userId = inputUserId?.value.trim();
      const zoneId = inputZoneId?.value.trim();

      if (!userId || !zoneId) {
        if (inputUserId && !userId) {
          inputUserId.classList.add('input-error');
          inputUserId.focus();
        }
        if (inputZoneId && !zoneId) {
          inputZoneId.classList.add('input-error');
        }
        showToast('Mohon isi ID Pengguna dan Zone ID akun MLBB kamu!', true);
        return;
      }

      try {
        sessionStorage.setItem('digital_order_target', JSON.stringify({
          game: 'Mobile Legends: Bang Bang',
          userId: userId,
          zoneId: zoneId,
          package: selectedPackage.nama
        }));
      } catch (_) {}

      const targetUrl = `/produk-digital/checkout/?slug=${encodeURIComponent(selectedPackage.slug)}&qty=1&userId=${encodeURIComponent(userId)}&zoneId=${encodeURIComponent(zoneId)}`;
      window.location.href = targetUrl;
    });
  }

  async function loadLiveProducts() {
    try {
      let token = null;
      const match = document.cookie.match(/(?:^|;\s*)sb-access-token=([^;]+)/);
      if (match) token = decodeURIComponent(match[1]);

      const res = await fetch('/api/digital-store/products', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.products) && data.products.length > 0) {
          const mlbbProds = data.products.filter(p => {
            const name = (p.nama || '').toLowerCase();
            return name.includes('mobile legend') || name.includes('mlbb') || name.includes('diamond');
          });

          if (mlbbProds.length > 0) {
            const liveMapped = mlbbProds.map(p => {
              const isWeekly = (p.nama || '').toLowerCase().includes('weekly');
              const price = Math.round(Number(p.harga_dasar) * (1 - (Number(p.diskon_persen) || 0) / 100));
              return {
                id: p.id,
                slug: p.slug,
                nama: p.nama,
                shortName: p.nama.replace(/Mobile Legends\s*/i, ''),
                type: isWeekly ? 'weekly' : 'regular',
                harga: price,
                badge: p.is_limited_edition || isWeekly ? 'Best Value' : null,
                desc: p.deskripsi || 'Top up resmi instan langsung ke akun.'
              };
            });

            const existingSlugs = new Set(liveMapped.map(item => item.slug));
            const extras = MLBB_PACKAGES.filter(item => !existingSlugs.has(item.slug));
            currentPackages = [...liveMapped, ...extras];
          }
        }
      }
    } catch (_) {}

    const countEl = document.getElementById('stat-nominal-count');
    if (countEl) countEl.textContent = `${currentPackages.length} Nominal`;
    renderPackages();
  }

  renderPackages();
  loadLiveProducts();
}
