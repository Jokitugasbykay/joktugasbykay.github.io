export interface InvoiceItem {
  name?: string;
  produk?: string;
  title?: string;
  quantity?: number;
  qty?: number;
  price?: number;
  harga_satuan?: number;
}

export interface InvoiceCustomer {
  name?: string;
  nama?: string;
  email?: string;
  whatsapp?: string;
  nim?: string;
}

export interface InvoiceTask {
  title?: string;
  deadline?: string;
  notes?: string;
}

export interface InvoiceOrder {
  id?: string;
  orderCode?: string;
  order_code?: string;
  tipe?: 'SPESIAL' | 'REGULER' | string;
  payment_status?: string;
  customer?: InvoiceCustomer;
  nama?: string;
  task?: InvoiceTask;
  deadline?: string;
  items?: InvoiceItem[];
  createdAt?: string;
  created_at?: string;
  subtotal?: number;
  discount?: number;
  serviceFee?: number;
  service_fee?: number;
  paymentFee?: number;
  payment_fee?: number;
  total?: number;
  total_price?: number;
  adminName?: string;
}
