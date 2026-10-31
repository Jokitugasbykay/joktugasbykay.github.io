export interface OrderCustomer {
  name: string;
  whatsapp?: string;
  email: string;
  nim?: string;
}

export interface OrderTaskAttachment {
  name: string;
  drive_url: string;
}

export interface OrderTask {
  title: string;
  deadline?: string;
  notes?: string;
  drive_url?: string;
  attachments?: OrderTaskAttachment[];
}

export interface OrderItem {
  slug?: string;
  name?: string;
  produk?: string;
  title?: string;
  quantity?: number;
  qty?: number;
  price?: number;
  harga_satuan?: number;
}

export interface AdminOrder {
  order_id: string;
  payment_status: 'PAID' | 'PENDING' | 'CANCELED' | string;
  amount: number;
  promo?: string | null;
  paid_at?: string | null;
  created_at: string;
  items: OrderItem[];
  customer: OrderCustomer;
  task: OrderTask;
}
