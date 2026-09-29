(async () => {
  const error = document.getElementById('invoiceError');
  const button = document.getElementById('printDocument');
  button.onclick = () => window.print();
  try {
    const code = new URLSearchParams(location.search).get('order') || '';
    if (!/^NUG-\d{8}-(?:[A-F0-9]{32}|[A-F0-9]{12}|\d{4})$/.test(code)) throw Error('Nomor invoice tidak valid.');
    const config = window.JOKIIN_PUBLIC_CONFIG;
    const response = await fetch(`${config.SUPABASE_URL}/functions/v1/jokiin-api`,{method:'POST',headers:{'Content-Type':'application/json',apikey:config.SUPABASE_ANON_KEY},body:JSON.stringify({action:'track',orderCode:code})});
    const result = await response.json();
    if (!response.ok) throw Error(result.error || 'Invoice belum dapat dimuat.');
    const row = result.order;
    if (!row || row.payment_status !== 'PAID') throw Error('Invoice tersedia setelah pembayaran terkonfirmasi Paid.');
    const order = {id:row.order_code,customer:row.customer,task:row.task,items:row.items,createdAt:row.created_at,subtotal:row.subtotal,discount:row.discount,serviceFee:row.service_fee,paymentFee:row.payment_fee,total:row.total_price};
    document.getElementById('invoicePaper').innerHTML = window.JokiinInvoice(order);
    document.getElementById('invoicePaper').hidden = false;
    error.hidden = true;
    button.disabled = false;
  } catch (e) { error.textContent = e.message || 'Invoice belum dapat dimuat. Silakan coba lagi.'; }
})();
