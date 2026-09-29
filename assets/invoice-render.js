(() => {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = value => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(value)||0);
  const date = value => {
    if (!value) return '-';
    const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);
    return Number.isNaN(d.getTime()) ? '-' : new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Asia/Jakarta'}).format(d);
  };
  window.JokiinInvoice = order => {
    const items = Array.isArray(order.items) ? order.items : [];
    const subtotal = order.subtotal ?? items.reduce((sum,i)=>sum+Number(i.price||0)*Number(i.quantity||0),0);
    const row = (label,value) => `<p><span>${label}</span><strong>${money(value)}</strong></p>`;
    return `<header class="invoice-heading"><div><div class="invoice-wordmark">JOKI<span>.IN</span></div><p>Teman tugas mahasiswa</p></div><h1>INVOICE</h1></header>
      <dl class="invoice-fields"><div><dt>Nama Admin</dt><dd>${escape(order.adminName || 'Tim JOKI.IN')}</dd></div><div><dt>Nama Klien</dt><dd>${escape(order.customer?.name || '-')}</dd></div><div><dt>Nomor Invoice</dt><dd>${escape(order.orderCode || order.id)}</dd></div><div><dt>Tanggal Invoice</dt><dd>${date(order.createdAt)}</dd></div><div><dt>Tanggal Deadline</dt><dd>${date(order.task?.deadline)}</dd></div></dl>
      <div class="invoice-table-wrap"><table><thead><tr><th>Deskripsi</th><th>Jumlah</th><th>Harga Satuan</th><th>Subtotal</th></tr></thead><tbody>${items.map(i=>`<tr><td>${escape(i.name || i.title || 'Layanan')}</td><td>${escape(i.quantity)}</td><td>${money(i.price)}</td><td><strong>${money(Number(i.price||0)*Number(i.quantity||0))}</strong></td></tr>`).join('')}</tbody></table></div>
      <div class="invoice-totals">${row('Subtotal',subtotal)}${Number(order.discount) ? row('Diskon',-Number(order.discount)) : ''}${Number(order.serviceFee) ? row('Biaya Layanan',order.serviceFee) : ''}${Number(order.paymentFee) ? row('Biaya Pembayaran',order.paymentFee) : ''}${row('Nilai PPN (0%)',0)}<p class="grand"><span>Total Akhir</span><strong>${money(order.total)}</strong></p></div>
      <p class="invoice-note">Terima kasih telah mempercayakan pekerjaan Anda kepada JOKI.IN.</p>`;
  };
})();
