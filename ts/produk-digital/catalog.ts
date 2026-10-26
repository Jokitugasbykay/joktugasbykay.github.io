// JOKI.IN Digital Store - Catalog Module
import { formatRupiah } from './config.js';
import { Category, Product } from './types.js';

export function getThumbColor(p: Product, i: number): string {
  const hue = 230 + ((i * 17) % 70);
  const lightness = p.st > 0 ? 46 : 60;
  return `hsl(${hue} 70% ${lightness}%)`;
}

export function renderProductCard(p: Product, index: number): string {
  const isOutOfStock = p.st <= 0;
  const initial = p.n.replace(/^Contoh\s+/, '').charAt(0) || 'P';
  const discountPercent = p.old && !isOutOfStock ? Math.round((1 - p.pr / p.old) * 100) : 0;
  const stockText = isOutOfStock ? 'Stok habis' : p.st < 10 ? 'Sisa sedikit' : 'Tersedia';

  return `
    <article class="card ${isOutOfStock ? 'na' : ''}">
      <div class="thumb" style="background:linear-gradient(135deg, ${getThumbColor(p, index)}, hsl(${250 + ((index * 13) % 50)} 65% 38%))" aria-hidden="true">
        ${initial}
        ${discountPercent > 0 ? `<span class="disc">-${discountPercent}%</span>` : ''}
      </div>
      <div class="prov">${p.pv}</div>
      <h3>${p.n}</h3>
      <p>${p.ds}</p>
      <div class="price-row">
        <span class="price">${formatRupiah(p.pr)}</span>
        ${p.old ? `<span class="old">${formatRupiah(p.old)}</span>` : ''}
      </div>
      <div class="stk ${isOutOfStock ? 'out' : ''}">${stockText}</div>
      <button type="button" class="btn" ${isOutOfStock ? 'disabled' : ''} data-buy="${p.slug || p.n}">
        ${isOutOfStock ? 'Tidak tersedia' : 'Lihat Produk'}
      </button>
    </article>
  `;
}

export function renderCategorySection(cat: Category, products: Product[]): string {
  const cardsHtml = products.length > 0
    ? `<div class="row" tabindex="0">${products.map((p, idx) => renderProductCard(p, idx)).join('')}</div>`
    : `<div class="empty">Belum ada produk di kategori ini. Produk akan muncul setelah katalog terhubung.</div>`;

  return `
    <section class="cat" id="s-${cat.id}" aria-labelledby="h-${cat.id}">
      <div class="sh">
        <div class="sp">
          <h2 id="h-${cat.id}">${cat.t}</h2>
          <p>${cat.d}</p>
        </div>
        <a href="#/kategori/${cat.id}" data-all="${cat.id}">Lihat Semua</a>
        <div class="cn">
          <button type="button" data-d="-1" aria-label="Geser kiri ${cat.t}">‹</button>
          <button type="button" data-d="1" aria-label="Geser kanan ${cat.t}">›</button>
        </div>
      </div>
      ${cardsHtml}
    </section>
  `;
}

export function setupRowScrollObserver(rowEl: HTMLElement): void {
  const section = rowEl.closest('section');
  if (!section) return;

  const prevBtn = section.querySelector<HTMLButtonElement>('.cn button[data-d="-1"]');
  const nextBtn = section.querySelector<HTMLButtonElement>('.cn button[data-d="1"]');
  if (!prevBtn || !nextBtn) return;

  const update = (): void => {
    prevBtn.disabled = rowEl.scrollLeft < 4;
    nextBtn.disabled = rowEl.scrollLeft + rowEl.clientWidth >= rowEl.scrollWidth - 4;
  };

  update();
  rowEl.addEventListener('scroll', update, { passive: true });
}
