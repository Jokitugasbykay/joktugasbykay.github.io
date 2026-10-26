// JOKI.IN Digital Store - Order Status Module
import { API_ENDPOINTS, formatRupiah } from './config.js';

export interface OrderDetails {
  order_code: string;
  payment_status: string;
  total_amount: number;
  customer_name: string;
  items: Array<{
    product_name?: string;
    nama?: string;
    quantity: number;
    subtotal: number;
  }>;
  created_at: string;
}

export async function fetchOrderDetails(orderCode: string): Promise<OrderDetails | null> {
  try {
    const res = await fetch(`${API_ENDPOINTS.ORDER_STATUS}/${encodeURIComponent(orderCode)}`);
    if (!res.ok) return null;
    const data = await res.json() as { order?: OrderDetails };
    return data.order || null;
  } catch {
    return null;
  }
}
