// JOKI.IN Digital Store - Checkout UI Module
import { API_ENDPOINTS, formatRupiah } from './config.js';
import { showToast } from './toast.js';
import { Product } from './types.js';

export interface CheckoutFormData {
  customerName: string;
  customerEmail: string;
  customerWa: string;
  quantity: number;
}

export class CheckoutManager {
  static validate(data: CheckoutFormData): { valid: boolean; message?: string } {
    if (!data.customerName.trim() || data.customerName.length < 3) {
      return { valid: false, message: 'Nama lengkap minimal 3 karakter.' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.customerEmail)) {
      return { valid: false, message: 'Format email tidak valid.' };
    }
    const waClean = data.customerWa.replace(/\D/g, '');
    if (waClean.length < 9 || waClean.length > 15) {
      return { valid: false, message: 'Nomor WhatsApp harus valid (9-15 digit).' };
    }
    if (data.quantity < 1) {
      return { valid: false, message: 'Jumlah pesanan minimal 1 unit.' };
    }
    return { valid: true };
  }

  static async submitOrder(product: Product, data: CheckoutFormData): Promise<{ success: boolean; redirectUrl?: string; error?: string }> {
    const val = this.validate(data);
    if (!val.valid) {
      return { success: false, error: val.message };
    }

    try {
      const response = await fetch(API_ENDPOINTS.CHECKOUT, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id || product.slug,
          slug: product.slug,
          quantity: data.quantity,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerWa: data.customerWa,
        }),
      });

      const resJson = await response.json() as { success?: boolean; paymentUrl?: string; orderCode?: string; error?: string };
      if (!response.ok || !resJson.success) {
        return { success: false, error: resJson.error || 'Terjadi kesalahan saat memproses checkout.' };
      }

      return {
        success: true,
        redirectUrl: resJson.paymentUrl || `/produk-digital/pesanan/${resJson.orderCode || ''}`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Koneksi ke gateway pembayaran gagal.';
      return { success: false, error: msg };
    }
  }
}
