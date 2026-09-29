(() => {
  'use strict';
  const assetsBase = new URL('.',document.currentScript.src);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const money = value => new Intl.NumberFormat('id-ID', {style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(value) || 0);
  const date = value => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric'}) : '-';
  let invoiceOrder = null;
  const invoice = document.createElement('div');
  invoice.id = 'invoiceModal'; invoice.className = 'modal-overlay'; invoice.style.display = 'none';
  invoice.setAttribute('role','dialog'); invoice.setAttribute('aria-modal','true'); invoice.setAttribute('aria-label','Invoice pesanan');
  invoice.innerHTML = '<div class="modal-content"><div id="invoicePaper" class="invoice-paper"></div><div class="modal-footer"><button type="button" class="btn-modal-primary" id="printInvoicePreview">Cetak Invoice</button><button type="button" class="btn-outline" id="closeInvoicePreview">Tutup</button></div></div>';
  document.body.append(invoice);
  const actions = document.createElement('div'); actions.className = 'invoice-actions'; actions.hidden = true;
  actions.innerHTML = '<button type="button" class="btn-outline" id="viewInvoice">Invoice</button><button type="button" class="btn-modal-primary" id="printInvoice">Cetak Invoice</button>';
  document.querySelector('#orderDetailModal .modal-footer').prepend(actions);
  window.setInvoiceOrder = order => {
    invoiceOrder = order;
    const paid = String(order.paymentStatus).toUpperCase() === 'PAID';
    actions.hidden = !paid; actions.style.display = paid ? 'flex' : 'none';
  };
  function markup(order) {
    const items = Array.isArray(order.items) ? order.items : [];
    const subtotal = order.subtotal ?? items.reduce((sum,item) => sum + Number(item.price || 0) * Number(item.quantity || 0),0);
    return `<header><div><strong>JOKI.IN</strong><p>Teman tugas mahasiswa</p></div><div><h2>INVOICE</h2><strong>LUNAS / PAID</strong></div></header>
      <dl class="invoice-fields"><div><dt>Nama Admin</dt><dd>Tim JOKI.IN</dd></div><div><dt>Nama Klien</dt><dd>${escape(order.customer?.name || '-')}</dd></div><div><dt>Nomor Invoice / Pesanan</dt><dd>${escape(order.orderCode || order.id)}</dd></div><div><dt>Tanggal Pesanan</dt><dd>${date(order.createdAt)}</dd></div><div><dt>Tanggal Deadline</dt><dd>${escape(order.task?.deadline || '-')}</dd></div><div><dt>Metode Pembayaran</dt><dd>${escape(order.paymentMethod || 'Pembayaran terverifikasi')}</dd></div></dl>
      <div class="invoice-table-wrap"><table><thead><tr><th>Deskripsi</th><th>Jumlah</th><th>Harga Satuan</th><th>Subtotal</th></tr></thead><tbody>${items.map(item => `<tr><td>${escape(item.name || item.title || 'Layanan')}</td><td>${escape(item.quantity)}</td><td>${money(item.price)}</td><td>${money(Number(item.price || 0)*Number(item.quantity || 0))}</td></tr>`).join('')}</tbody></table></div>
      <div class="invoice-totals"><p><span>Subtotal</span><strong>${money(subtotal)}</strong></p><p><span>Diskon</span><strong>-${money(order.discount)}</strong></p><p><span>Biaya Layanan</span><strong>${money(order.serviceFee)}</strong></p><p><span>Biaya Pembayaran</span><strong>${money(order.paymentFee)}</strong></p><p class="grand"><span>Total Dibayar</span><strong>${money(order.total)}</strong></p></div><p class="invoice-note">Terima kasih telah mempercayakan pekerjaan Anda kepada JOKI.IN.</p>`;
  }
  function eligible() {
    if (!invoiceOrder || String(invoiceOrder.paymentStatus).toUpperCase() !== 'PAID') { window.showToast('Invoice tersedia setelah pembayaran terkonfirmasi Paid.'); return false; }
    return true;
  }
  document.getElementById('viewInvoice').onclick = () => {
    if (!eligible()) return;
    document.getElementById('invoicePaper').innerHTML = markup(invoiceOrder);
    invoice.style.display = 'flex';
    document.body.classList.add('modal-open');
    document.getElementById('closeInvoicePreview').focus();
  };
  function printInvoice() {
    if (!eligible()) return;
    const popup = window.open('', '_blank');
    if (!popup) { window.showToast('Izinkan popup untuk mencetak invoice.'); return; }
    popup.opener = null;
    popup.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Invoice ${escape(invoiceOrder.orderCode || invoiceOrder.id)}</title><link rel="stylesheet" href="${new URL('order-improvements.css',assetsBase).href}"><style>body{margin:0;font:14px/1.5 system-ui;background:white}.invoice-paper{max-width:960px;margin:auto}@page{size:A4;margin:16mm}@media print{.invoice-paper{padding:0}tr,.invoice-totals{break-inside:avoid}*{print-color-adjust:exact}}</style></head><body><main class="invoice-paper">${markup(invoiceOrder)}</main></body></html>`);
    popup.document.close();
    popup.onload = () => { popup.focus(); popup.print(); };
  }
  document.getElementById('printInvoice').onclick = printInvoice;
  document.getElementById('printInvoicePreview').onclick = printInvoice;
  document.getElementById('closeInvoicePreview').onclick = () => window.closeModal('invoiceModal');
  invoice.onclick = event => { if (event.target === invoice) window.closeModal('invoiceModal'); };
  window.addEventListener('keydown',event => { if(event.key === 'Escape' && invoice.style.display !== 'none') { event.stopImmediatePropagation(); window.closeModal('invoiceModal'); } },true);

  let locked = false, scrollY = 0;
  function syncScroll() {
    const open = [...document.querySelectorAll('.modal-overlay')].some(modal => getComputedStyle(modal).display !== 'none');
    if (open === locked) return;
    locked = open;
    document.documentElement.classList.toggle('jokiin-scroll-locked',open);
    if (open) {
      scrollY = window.scrollY;
      document.body.style.position = 'fixed'; document.body.style.top = `-${scrollY}px`; document.body.style.width = '100%';
    } else {
      document.body.style.position = ''; document.body.style.top = ''; document.body.style.width = '';
      window.scrollTo({top:scrollY,behavior:'instant'});
    }
  }
  const modalObserver = new MutationObserver(syncScroll);
  document.querySelectorAll('.modal-overlay').forEach(modal => modalObserver.observe(modal,{attributes:true,attributeFilter:['style','class']}));
  syncScroll();

  const iconNames = {'📄':'file-text','📝':'file-pen-line','📊':'chart-no-axes-column','📚':'book-open','⌨️':'keyboard','🎨':'palette','📈':'chart-line','💬':'message-circle','🛒':'shopping-cart','💳':'credit-card','📋':'clipboard-list','📁':'folder','👤':'user','🔄':'refresh-cw','⚠️':'triangle-alert','⏳':'hourglass','🔗':'link','🧾':'receipt','📎':'paperclip','🟢':'circle-check','🟡':'clock','🔵':'circle','❌':'circle-x','✅':'check','💰':'wallet','🚀':'arrow-up-right','🎓':'graduation-cap'};
  const emojiPattern = /(?:\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}])(?:\uFE0F|\u200D\p{Extended_Pictographic})*/gu;
  function replaceEmoji(root) {
    const walker = document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes = [];
    while(walker.nextNode()) {
      const node = walker.currentNode;
      if(node.parentElement.closest('script,style,textarea,input,[contenteditable],.invoice-paper')) continue;
      emojiPattern.lastIndex = 0;
      if(emojiPattern.test(node.textContent)) nodes.push(node);
    }
    nodes.forEach(node => {
      const fragment = document.createDocumentFragment(); let start = 0;
      emojiPattern.lastIndex = 0;
      for(const match of node.textContent.matchAll(emojiPattern)) {
        fragment.append(document.createTextNode(node.textContent.slice(start,match.index)));
        if (iconNames[match[0]]) {
          const icon = document.createElement('img'); icon.className = 'jokiin-vector';
          icon.src = `assets/ui-icons/${iconNames[match[0]]}.svg`; icon.alt = ''; icon.setAttribute('aria-hidden','true');
          fragment.append(icon);
        }
        start = match.index + match[0].length;
      }
      fragment.append(document.createTextNode(node.textContent.slice(start))); node.replaceWith(fragment);
    });
  }
  replaceEmoji(document.body);
  new MutationObserver(records => {
    records.forEach(record => {
      if(record.type === 'characterData') replaceEmoji(record.target.parentElement);
      else record.addedNodes.forEach(node => { if(node.nodeType === 1) replaceEmoji(node); else if(node.nodeType === 3 && node.parentElement) replaceEmoji(node.parentElement); });
    });
  }).observe(document.body,{subtree:true,childList:true,characterData:true});

  const guide = document.createElement('section'); guide.className = 'order-guide';
  guide.innerHTML = '<h3>Sebelum Memesan</h3><p>Siapkan judul tugas, instruksi dosen, format hasil, dan deadline. Pilih layanan sesuai kebutuhan, lalu lengkapi detail di halaman pembayaran.</p><details><summary>Bagaimana mengirim file tugas?</summary><p>Unggah maksimal 10 file dengan total 50 MB saat checkout. Format yang didukung: PDF, DOC, DOCX, ZIP, JPG, dan PNG. Kamu juga dapat mencantumkan tautan Google Drive yang dapat diakses admin.</p></details><details><summary>Kapan invoice tersedia?</summary><p>Setelah pembayaran terkonfirmasi Paid, buka Pesanan Saya lalu Detail Pesanan. Pilih Invoice untuk melihat rincian atau Cetak Invoice untuk mencetak dan menyimpan PDF.</p></details><details><summary>Bagaimana memantau hasil dan revisi?</summary><p>Simpan nomor pesanan untuk melacak status. Periksa estimasi, lampiran, dan ketentuan revisi di detail pesanan. Hubungi admin dengan nomor pesanan jika memerlukan bantuan.</p></details>';
  document.getElementById('full-carapesan').after(guide);
})();
