// JOKI.IN Digital Store - Product Detail UI Module
import { formatRupiah } from './config.js';
import { showToast } from './toast.js';
import { Product } from './types.js';

export class ProductDetailModal {
  private containerEl: HTMLElement | null = null;

  constructor() {
    this.createModalContainer();
  }

  private createModalContainer(): void {
    let el = document.getElementById('product-detail-modal');
    if (!el) {
      el = document.createElement('div');
      el.id = 'product-detail-modal';
      el.className = 'product-detail-overlay';
      el.style.display = 'none';
      document.body.appendChild(el);
    }
    this.containerEl = el;
  }

  show(product: Product): void {
    if (!this.containerEl) return;

    const isOutOfStock = product.st <= 0;
    const discount = product.old ? Math.round((1 - product.pr / product.old) * 100) : 0;

    this.containerEl.innerHTML = `
      <div class="product-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="p-modal-title">
        <button type="button" class="product-detail-close" aria-label="Tutup">x</button>
        <div class="product-detail-body">
          <div class="product-detail-tag">${product.pv}</div>
          <h2 id="p-modal-title">${product.n}</h2>
          <p class="product-detail-desc">${product.ds}</p>
          <div class="product-detail-pricing">
            <span class="price">${formatRupiah(product.pr)}</span>
            ${product.old ? `<span class="old">${formatRupiah(product.old)}</span>` : ''}
            ${discount > 0 ? `<span class="disc">-${discount}%</span>` : ''}
          </div>
          <div class="stk ${isOutOfStock ? 'out' : ''}">
            ${isOutOfStock ? 'Stok produk ini sedang habis' : `Tersedia (${product.st} unit tersisa)`}
          </div>
          <div class="product-detail-actions">
            <button type="button" class="btn b1" id="btn-buy-instant" ${isOutOfStock ? 'disabled' : ''}>
              Lanjut ke Checkout
            </button>
          </div>
        </div>
      </div>
    `;

    this.containerEl.style.display = 'grid';

    const closeBtn = this.containerEl.querySelector('.product-detail-close');
    closeBtn?.addEventListener('click', () => this.hide());

    this.containerEl.addEventListener('click', (e) => {
      if (e.target === this.containerEl) {
        this.hide();
      }
    });

    const buyBtn = this.containerEl.querySelector('#btn-buy-instant');
    buyBtn?.addEventListener('click', () => {
      this.hide();
      window.location.href = `/produk-digital/checkout?slug=${encodeURIComponent(product.slug || product.n)}`;
    });
  }

  hide(): void {
    if (this.containerEl) {
      this.containerEl.style.display = 'none';
    }
  }
}
