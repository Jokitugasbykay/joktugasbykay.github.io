(() => {
  'use strict';
  const assetBase = new URL('.',document.currentScript.src);
  const images = ['document','writing','presentation','book','keyboard','palette','chart','chat','folder','user','revision','receipt'];
  const fallback = ['file-text','file-pen-line','chart-no-axes-column','book-open','keyboard','palette','chart-line','message-circle','folder','user','refresh-cw','receipt'];
  const art = (index) => {
    const element = document.createElement('img'); element.className = 'ui-art-icon';
    element.src = new URL(`ui-art/${images[index]}.png`,assetBase).href;
    element.width=128; element.height=128; element.alt=''; element.setAttribute('aria-hidden','true');
    element.onerror = () => {element.onerror=null; element.src=new URL(`ui-icons/${fallback[index]}.svg`,assetBase).href;};
    return element;
  };
  const indexFor = value => {
    const text = String(value || '').toLowerCase();
    if(/ppt|presentasi/.test(text)) return 2;
    if(/edit|revisi karya ilmiah/.test(text)) return 1;
    if(/desain|poster|palette/.test(text)) return 5;
    if(/data|statistik|riset|chart/.test(text)) return 6;
    if(/konsultasi|bantuan|whatsapp|message/.test(text)) return 7;
    if(/revisi|refresh/.test(text)) return 10;
    if(/akun|user|profil/.test(text)) return 9;
    if(/file|folder/.test(text)) return 8;
    if(/pembayaran|pesanan|invoice|receipt/.test(text)) return 11;
    if(/pengetikan|keyboard/.test(text)) return 4;
    if(/laporan|skripsi|tesis|jurnal|book/.test(text)) return 3;
    if(/makalah|artikel|parafrase|penulisan|pen/.test(text)) return 1;
    return 0;
  };
  function decorate(root) {
    root.querySelectorAll?.('.home-category,.help-cat-card,.testimonial-product-card').forEach(card => {
      const holder = card.querySelector('.home-category > span:first-child,.help-cat-icon,.testimonial-product-card__icon');
      if (!holder || holder.querySelector('.ui-art-icon')) return;
      const title = card.querySelector('h3,h4')?.textContent || card.textContent;
      holder.replaceChildren(art(indexFor(title)));
    });
    root.querySelectorAll?.('img[src*="sparkles.svg"]').forEach(image => image.remove());
  }
  window.updateServicePresentation = (product, price) => {
    document.getElementById('detailSvcIcon').replaceChildren(art(indexFor(product.title)));
    document.getElementById('detailSvcPrice').textContent = price || product.price || '';
    const excluded = document.getElementById('detailSvcNotIncluded');
    const hasExcluded = Array.isArray(product.notIncluded) && product.notIncluded.length > 0;
    excluded.hidden = !hasExcluded;
    excluded.previousElementSibling.hidden = !hasExcluded;
    document.getElementById('serviceDetailModal').setAttribute('aria-labelledby','detailSvcTitle');
  };
  decorate(document);
  const observer = new MutationObserver(records => {
    for(const record of records) {
      for(const node of record.addedNodes) {
        if(node.nodeType !== 1 || node.classList.contains('ui-art-icon')) continue;
        decorate(node.parentElement || node);
      }
    }
  });
  observer.observe(document.body,{childList:true,subtree:true});
})();
