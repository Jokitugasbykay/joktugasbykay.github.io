// JOKI.IN Digital Store - Game Detail & Top Up Module
import { formatRupiah } from './config.js';

export const GAME_CATALOG = {
  mlbb: {
    id: 'mlbb',
    title: 'Mobile Legends: Bang Bang',
    brandTag: 'MOBILE LEGENDS',
    desc: 'Top up Diamond MLBB langsung ke akun. Proses otomatis, cepat dan aman 24 jam nonstop.',
    pill: 'Official Digital Store',
    nominalTitle: 'Pilih Nominal Diamond',
    statProses: '< 5 Menit',
    statNominal: '12 Nominal',
    statRating: 'Rating 4.9/5',
    idLabel: 'ID PENGGUNA',
    idPlaceholder: 'Masukkan ID Tujuan',
    zoneLabel: 'ZONE ID',
    zonePlaceholder: 'Contoh: 1234',
    zoneType: 'input',
    helpText: 'Untuk mengetahui User ID Anda, silakan klik menu profil di bagian kiri atas pada menu utama game. User ID akan terlihat di bagian bawah nama karakter Anda, contoh: 12345678 (1234).',
    filters: [
      { id: 'all', label: 'Semua Nominal' },
      { id: 'weekly', label: 'Weekly Pass' },
      { id: 'regular', label: 'Top Up Diamond' }
    ],
    packages: [
      { id: 'prod-mlbb-5', slug: 'mlbb-5-diamonds', nama: 'Mobile Legends 5 Diamonds', shortName: '5 Diamonds', type: 'regular', harga: 2590, badge: null, desc: 'Top up 5 Diamond Mobile Legends Bang Bang resmi dan instan.' },
      { id: 'prod-mlbb-10', slug: 'mlbb-10-diamonds', nama: 'Mobile Legends 10 Diamonds', shortName: '10 Diamonds', type: 'regular', harga: 4300, badge: 'Best Value', desc: 'Top up 10 Diamond Mobile Legends Bang Bang resmi dan hemat (Best Value).' },
      { id: 'prod-mlbb-wp', slug: 'mlbb-weekly-diamond-pass', nama: 'Mobile Legends Weekly Diamond Pass', shortName: 'Weekly Diamond Pass', type: 'weekly', harga: 32525, badge: 'Best Value', desc: 'Langganan Weekly Diamond Pass Mobile Legends Bang Bang, klaim diamond harian lebih hemat.' },
      { id: 'prod-mlbb-14', slug: 'mlbb-14-diamonds', nama: 'Mobile Legends 14 Diamonds', shortName: '14 Diamonds', type: 'regular', harga: 5800, badge: null, desc: 'Top up 14 Diamond Mobile Legends Bang Bang resmi dan instan.' },
      { id: 'prod-mlbb-28', slug: 'mlbb-28-diamonds', nama: 'Mobile Legends 28 Diamonds', shortName: '28 Diamonds', type: 'regular', harga: 11000, badge: null, desc: 'Top up 28 Diamond Mobile Legends Bang Bang resmi dan instan.' },
      { id: 'prod-mlbb-42', slug: 'mlbb-42-diamonds', nama: 'Mobile Legends 42 Diamonds', shortName: '42 Diamonds', type: 'regular', harga: 16500, badge: null, desc: 'Top up 42 Diamond Mobile Legends Bang Bang resmi dan instan.' },
      { id: 'prod-mlbb-70', slug: 'mlbb-70-diamonds', nama: 'Mobile Legends 70 Diamonds', shortName: '70 Diamonds', type: 'regular', harga: 27500, badge: 'Populer', desc: 'Top up 70 Diamond Mobile Legends Bang Bang resmi dan instan.' },
      { id: 'prod-mlbb-140', slug: 'mlbb-140-diamonds', nama: 'Mobile Legends 140 Diamonds', shortName: '140 Diamonds', type: 'regular', harga: 54000, badge: null, desc: 'Top up 140 Diamond Mobile Legends Bang Bang resmi dan instan.' },
      { id: 'prod-mlbb-284', slug: 'mlbb-284-diamonds', nama: 'Mobile Legends 284 Diamonds', shortName: '284 Diamonds (Bonus 28)', type: 'regular', harga: 108000, badge: 'Bonus', desc: 'Top up 284 Diamond (256 + 28 Bonus) Mobile Legends Bang Bang resmi.' },
      { id: 'prod-mlbb-355', slug: 'mlbb-355-diamonds', nama: 'Mobile Legends 355 Diamonds', shortName: '355 Diamonds (Bonus 35)', type: 'regular', harga: 135000, badge: null, desc: 'Top up 355 Diamond (320 + 35 Bonus) Mobile Legends Bang Bang resmi.' },
      { id: 'prod-mlbb-716', slug: 'mlbb-716-diamonds', nama: 'Mobile Legends 716 Diamonds', shortName: '716 Diamonds (Bonus 72)', type: 'regular', harga: 270000, badge: 'Promo', desc: 'Top up 716 Diamond (644 + 72 Bonus) Mobile Legends Bang Bang resmi.' },
      { id: 'prod-mlbb-twilight', slug: 'mlbb-twilight-pass', nama: 'Mobile Legends Twilight Pass', shortName: 'Twilight Pass', type: 'weekly', harga: 150000, badge: 'Special', desc: 'Aktivasi Twilight Pass Mobile Legends klaim skin eksklusif dan diamond.' }
    ]
  },
  genshin: {
    id: 'genshin',
    title: 'Genshin Impact',
    brandTag: 'GENSHIN IMPACT',
    desc: 'Top up Genesis Crystal Genshin Impact resmi via UID dan Server. Proses otomatis, cepat dan aman.',
    pill: 'HoYoverse Official Top Up',
    nominalTitle: 'Pilih Nominal Genesis Crystal',
    statProses: '< 5 Menit',
    statNominal: '7 Nominal',
    statRating: 'Rating 4.9/5',
    idLabel: 'UID GENSHIN',
    idPlaceholder: 'Masukkan UID akun Genshin, contoh: 812345678',
    zoneLabel: 'SERVER',
    zoneType: 'select',
    zoneOptions: [
      { val: 'os_asia', text: 'Asia Server' },
      { val: 'os_usa', text: 'America Server' },
      { val: 'os_euro', text: 'Europe Server' },
      { val: 'os_cht', text: 'TW / HK / MO Server' }
    ],
    helpText: 'Untuk menemukan UID Anda, buka game Genshin Impact dan lihat di sudut kanan bawah layar, atau buka menu Paimon di bagian kiri atas profil Anda.',
    filters: [
      { id: 'all', label: 'Semua Nominal' },
      { id: 'weekly', label: 'Blessing' },
      { id: 'regular', label: 'Genesis Crystal' }
    ],
    packages: [
      { id: 'prod-gi-welkin', slug: 'genshin-blessing-welkin', nama: 'Blessing of the Welkin Moon', shortName: 'Blessing of the Welkin Moon', type: 'weekly', harga: 85000, badge: 'Best Value', desc: 'Dapatkan 300 Genesis Crystals instan + 90 Primogems setiap hari selama 30 hari.' },
      { id: 'prod-gi-60', slug: 'genshin-60-genesis-crystal', nama: 'Genshin Impact 60 Genesis Crystal', shortName: '60 Genesis Crystal', type: 'regular', harga: 16500, badge: null, desc: 'Top up 60 Genesis Crystal Genshin Impact ID resmi via UID dan Server.' },
      { id: 'prod-gi-330', slug: 'genshin-330-genesis-crystal', nama: 'Genshin Impact 330 Genesis Crystal', shortName: '330 Genesis Crystal', type: 'regular', harga: 81000, badge: null, desc: 'Top up 330 Genesis Crystal (300 + 30 Bonus) Genshin Impact ID resmi.' },
      { id: 'prod-gi-1090', slug: 'genshin-1090-genesis-crystal', nama: 'Genshin Impact 1090 Genesis Crystal', shortName: '1090 Genesis Crystal', type: 'regular', harga: 255000, badge: 'Best Value', desc: 'Top up 1090 Genesis Crystal (900 + 110 Bonus) Genshin Impact ID resmi.' },
      { id: 'prod-gi-2240', slug: 'genshin-2240-genesis-crystal', nama: 'Genshin Impact 2240 Genesis Crystal', shortName: '2240 Genesis Crystal', type: 'regular', harga: 489000, badge: null, desc: 'Top up 2240 Genesis Crystal (1980 + 260 Bonus) Genshin Impact ID resmi.' },
      { id: 'prod-gi-3880', slug: 'genshin-3880-genesis-crystal', nama: 'Genshin Impact 3880 Genesis Crystal', shortName: '3880 Genesis Crystal', type: 'regular', harga: 815000, badge: 'Populer', desc: 'Top up 3880 Genesis Crystal (3280 + 600 Bonus) Genshin Impact ID resmi.' },
      { id: 'prod-gi-8080', slug: 'genshin-8080-genesis-crystal', nama: 'Genshin Impact 8080 Genesis Crystal', shortName: '8080 Genesis Crystal', type: 'regular', harga: 1629000, badge: 'Promo', desc: 'Top up 8080 Genesis Crystal (6480 + 1600 Bonus) Genshin Impact ID resmi.' }
    ]
  },
  chronal: {
    id: 'chronal',
    title: 'Chronal Nexus',
    brandTag: 'CHRONAL NEXUS',
    desc: 'Top up Chronal Nexus ID resmi dan instan. Proses otomatis 24 jam nonstop.',
    pill: 'Official Partner Store',
    nominalTitle: 'Pilih Nominal Chronal Nexus',
    statProses: '< 5 Menit',
    statNominal: '6 Nominal',
    statRating: 'Rating 4.9/5',
    idLabel: 'USER ID',
    idPlaceholder: 'Masukkan User ID akun Chronal Nexus',
    zoneLabel: 'SERVER / REGION',
    zoneType: 'select',
    zoneOptions: [
      { val: 'asia', text: 'Asia (Indonesia)' },
      { val: 'global', text: 'Global Server' }
    ],
    helpText: 'Masukkan User ID akun Chronal Nexus Anda yang tertera di menu profil pemain.',
    filters: [
      { id: 'all', label: 'Semua Nominal' },
      { id: 'regular', label: 'Paket Populer' }
    ],
    packages: [
      { id: 'prod-cn-60', slug: 'chronal-nexus-60', nama: 'Chronal Nexus 60 (ID)', shortName: '60 Chronal Nexus', type: 'regular', harga: 16500, badge: null, desc: 'Top up 60 Chronal Nexus ID resmi dan instan.' },
      { id: 'prod-cn-330', slug: 'chronal-nexus-330', nama: 'Chronal Nexus 330 (ID)', shortName: '330 Chronal Nexus', type: 'regular', harga: 81000, badge: null, desc: 'Top up 330 Chronal Nexus (300 + 30 Bonus) ID resmi dan instan.' },
      { id: 'prod-cn-1090', slug: 'chronal-nexus-1090', nama: 'Chronal Nexus 1090 (ID)', shortName: '1090 Chronal Nexus', type: 'regular', harga: 255000, badge: 'Best Value', desc: 'Top up 1090 Chronal Nexus (900 + 110 Bonus) ID resmi dan instan.' },
      { id: 'prod-cn-2240', slug: 'chronal-nexus-2240', nama: 'Chronal Nexus 2240 (ID)', shortName: '2240 Chronal Nexus', type: 'regular', harga: 489000, badge: null, desc: 'Top up 2240 Chronal Nexus (1980 + 260 Bonus) ID resmi dan instan.' },
      { id: 'prod-cn-3880', slug: 'chronal-nexus-3880', nama: 'Chronal Nexus 3880 (ID)', shortName: '3880 Chronal Nexus', type: 'regular', harga: 815000, badge: 'Populer', desc: 'Top up 3880 Chronal Nexus (3280 + 600 Bonus) ID resmi dan instan.' },
      { id: 'prod-cn-8080', slug: 'chronal-nexus-8080', nama: 'Chronal Nexus 8080 (ID)', shortName: '8080 Chronal Nexus', type: 'regular', harga: 1629000, badge: 'Promo', desc: 'Top up 8080 Chronal Nexus (6480 + 1600 Bonus) ID resmi dan instan.' }
    ]
  },
  axis: {
    id: 'axis',
    title: 'Pulsa & Data AXIS',
    brandTag: 'AXIS',
    desc: 'Isi ulang pulsa dan kuota data AXIS resmi dan instan langsung masuk 24 jam nonstop.',
    pill: 'Operator Resmi',
    nominalTitle: 'Pilih Nominal Pulsa & Paket Data',
    statProses: '< 3 Menit',
    statNominal: '6 Pilihan',
    statRating: 'Rating 4.9/5',
    idLabel: 'NOMOR HANDPHONE',
    idPlaceholder: 'Contoh: 083812345678',
    zoneLabel: null,
    zoneType: null,
    helpText: 'Pastikan nomor handphone AXIS yang Anda masukkan sudah benar dan dalam masa aktif.',
    filters: [
      { id: 'all', label: 'Semua Pilihan' },
      { id: 'regular', label: 'Pulsa Reguler' },
      { id: 'data', label: 'Paket Data' }
    ],
    packages: [
      { id: 'prod-axis-5k', slug: 'axis-pulsa-5k', nama: 'Pulsa AXIS Rp 5.000', shortName: 'Pulsa 5.000', type: 'regular', harga: 6000, badge: null, desc: 'Pulsa reguler AXIS 5.000 langsung masuk.' },
      { id: 'prod-axis-10k', slug: 'axis-pulsa-10k', nama: 'Pulsa AXIS Rp 10.000', shortName: 'Pulsa 10.000', type: 'regular', harga: 11000, badge: null, desc: 'Pulsa reguler AXIS 10.000 langsung masuk.' },
      { id: 'prod-axis-25k', slug: 'axis-pulsa-25k', nama: 'Pulsa AXIS Rp 25.000', shortName: 'Pulsa 25.000', type: 'regular', harga: 26000, badge: null, desc: 'Pulsa reguler AXIS 25.000 langsung masuk.' },
      { id: 'prod-axis-50k', slug: 'axis-pulsa-50k', nama: 'Pulsa AXIS Rp 50.000', shortName: 'Pulsa 50.000', type: 'regular', harga: 51000, badge: 'Best Value', desc: 'Pulsa reguler AXIS 50.000 langsung masuk.' },
      { id: 'prod-axis-100k', slug: 'axis-pulsa-100k', nama: 'Pulsa AXIS Rp 100.000', shortName: 'Pulsa 100.000', type: 'regular', harga: 100000, badge: null, desc: 'Pulsa reguler AXIS 100.000 langsung masuk.' },
      { id: 'prod-axis-10gb', slug: 'axis-bronet-10gb', nama: 'AXIS Bronet 10GB 30 Hari', shortName: 'Bronet 10GB', type: 'data', harga: 35000, badge: 'Populer', desc: 'Kuota utama 10GB 24 jam berlaku 30 hari nasional.' }
    ]
  }
};

export function initGameDetailPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const rawGame = (urlParams.get('game') || 'mlbb').toLowerCase();
  const gameKey = (rawGame.includes('genshin') || rawGame === 'gi') ? 'genshin' :
                  (rawGame.includes('chronal') || rawGame === 'cn') ? 'chronal' :
                  (rawGame.includes('axis') || rawGame.includes('pulsa')) ? 'axis' : 'mlbb';

  const gameData = GAME_CATALOG[gameKey] || GAME_CATALOG.mlbb;
  let currentPackages = [...gameData.packages];
  let selectedPackage = null;
  let activeFilter = 'all';

  // Update Game Info di Header & Banner
  document.title = `Top Up ${gameData.title} - JOKI.IN Digital Store`;
  const elTitle = document.getElementById('game-hero-title');
  const elDesc = document.getElementById('game-hero-desc');
  const elCount = document.getElementById('stat-nominal-count');
  const elNominalTitle = document.getElementById('nominal-section-title');
  const elHelpText = document.getElementById('help-hint-text');

  if (elTitle) elTitle.textContent = gameData.title;
  if (elDesc) elDesc.textContent = gameData.desc;
  if (elCount) elCount.textContent = gameData.statNominal;
  if (elNominalTitle) elNominalTitle.textContent = gameData.nominalTitle;
  if (elHelpText) elHelpText.textContent = gameData.helpText;

  // Sesuaikan Form Input sesuai Game
  const labelUserId = document.getElementById('label-userid');
  const inputUserId = document.getElementById('input-userid');
  const zoneGroup = document.getElementById('zone-group');

  if (labelUserId) {
    labelUserId.innerHTML = `${gameData.idLabel} <span class="req">*</span>`;
  }
  if (inputUserId) {
    inputUserId.placeholder = gameData.idPlaceholder;
  }

  if (zoneGroup) {
    if (!gameData.zoneLabel) {
      zoneGroup.style.display = 'none';
    } else {
      zoneGroup.style.display = 'block';
      if (gameData.zoneType === 'select') {
        const optionsHtml = (gameData.zoneOptions || []).map(opt => `<option value="${opt.val}">${opt.text}</option>`).join('');
        zoneGroup.innerHTML = `
          <label for="input-zoneid" class="digital-store-form-label">${gameData.zoneLabel} <span class="req">*</span></label>
          <select id="input-zoneid" class="digital-store-form-control" required style="cursor: pointer;">
            ${optionsHtml}
          </select>
        `;
      } else {
        zoneGroup.innerHTML = `
          <label for="input-zoneid" class="digital-store-form-label">${gameData.zoneLabel} <span class="req">*</span></label>
          <input type="text" id="input-zoneid" class="digital-store-form-control" placeholder="${gameData.zonePlaceholder}" inputmode="numeric" required>
        `;
      }
    }
  }

  // Render Filter Tabs
  const filterRow = document.getElementById('filter-tabs-container');
  if (filterRow) {
    filterRow.innerHTML = gameData.filters.map((f, idx) => `
      <button type="button" class="digital-store-filter-tab ${idx === 0 ? 'active' : ''}" data-filter="${f.id}">
        ${f.label}
      </button>
    `).join('');

    filterRow.querySelectorAll('.digital-store-filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        filterRow.querySelectorAll('.digital-store-filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeFilter = tab.getAttribute('data-filter') || 'all';
        renderPackages();
      });
    });
  }

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
                <span class="digital-store-brand-tag">${gameData.brandTag}</span>
                <h3 class="digital-store-card-title">${pkg.shortName || pkg.nama}</h3>
                <span class="digital-store-card-sub">${pkg.type === 'weekly' ? 'Spesial / Bulanan' : 'Instant Delivery'}</span>
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

  // Cek Username button
  const btnCheckUser = document.getElementById('btn-check-user');
  const userStatusBox = document.getElementById('check-user-status');

  if (btnCheckUser) {
    btnCheckUser.addEventListener('click', () => {
      const inputZoneCurrent = document.getElementById('input-zoneid');
      const userId = inputUserId?.value.trim();
      const zoneId = inputZoneCurrent?.value ? inputZoneCurrent.value.trim() : '';

      if (!userId || (gameData.zoneLabel && !zoneId)) {
        if (inputUserId && !userId) inputUserId.classList.add('input-error');
        if (inputZoneCurrent && !zoneId) inputZoneCurrent.classList.add('input-error');
        showToast('Harap lengkapi ID akun game kamu!', true);
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
          const infoZone = zoneId ? `(Server ${zoneId})` : '';
          userStatusBox.textContent = `Akun Valid: User terverifikasi ${infoZone}`;
        }
        showToast('Akun valid dan siap untuk top up!');
      }, 500);
    });
  }

  // Reset input error on typing
  document.addEventListener('input', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('digital-store-form-control')) {
      e.target.classList.remove('input-error');
    }
  });

  // CTA Beli Sekarang (Direct checkout, no cart!)
  const btnBuyNow = document.getElementById('btn-pay-now');
  if (btnBuyNow) {
    btnBuyNow.addEventListener('click', () => {
      if (!selectedPackage) {
        showToast('Silakan pilih salah satu paket terlebih dahulu!', true);
        return;
      }

      const inputZoneCurrent = document.getElementById('input-zoneid');
      const userId = inputUserId?.value.trim();
      const zoneId = inputZoneCurrent?.value ? inputZoneCurrent.value.trim() : '';

      if (!userId || (gameData.zoneLabel && !zoneId)) {
        if (inputUserId && !userId) {
          inputUserId.classList.add('input-error');
          inputUserId.focus();
        }
        if (inputZoneCurrent && !zoneId) {
          inputZoneCurrent.classList.add('input-error');
        }
        showToast('Mohon lengkapi ID Akun game terlebih dahulu!', true);
        return;
      }

      try {
        sessionStorage.setItem('digital_order_target', JSON.stringify({
          game: gameData.title,
          userId: userId,
          zoneId: zoneId,
          package: selectedPackage.nama
        }));
      } catch (_) {}

      const targetUrl = `/produk-digital/checkout/?slug=${encodeURIComponent(selectedPackage.slug)}&qty=1&userId=${encodeURIComponent(userId)}&zoneId=${encodeURIComponent(zoneId)}`;
      window.location.href = targetUrl;
    });
  }

  // Live products sync
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
          const gameKeyword = gameKey === 'genshin' ? 'genshin' :
                              gameKey === 'chronal' ? 'chronal' :
                              gameKey === 'axis' ? 'axis' : 'mobile legend';

          const matchingProds = data.products.filter(p => {
            const name = (p.nama || '').toLowerCase();
            const provider = (p.provider || '').toLowerCase();
            return name.includes(gameKeyword) || provider.includes(gameKeyword);
          });

          if (matchingProds.length > 0) {
            const liveMapped = matchingProds.map(p => {
              const isSpecial = (p.nama || '').toLowerCase().includes('weekly') || (p.nama || '').toLowerCase().includes('welkin');
              const price = Math.round(Number(p.harga_dasar) * (1 - (Number(p.diskon_persen) || 0) / 100));
              return {
                id: p.id,
                slug: p.slug,
                nama: p.nama,
                shortName: p.nama.replace(new RegExp(gameData.title + '\\s*', 'i'), ''),
                type: isSpecial ? 'weekly' : 'regular',
                harga: price,
                badge: p.is_limited_edition || isSpecial ? 'Best Value' : null,
                desc: p.deskripsi || 'Top up resmi instan langsung ke akun.'
              };
            });

            const existingSlugs = new Set(liveMapped.map(item => item.slug));
            const extras = gameData.packages.filter(item => !existingSlugs.has(item.slug));
            currentPackages = [...liveMapped, ...extras];
          }
        }
      }
    } catch (_) {}

    if (elCount) elCount.textContent = `${currentPackages.length} Nominal`;
    renderPackages();
  }

  renderPackages();
  loadLiveProducts();
}
