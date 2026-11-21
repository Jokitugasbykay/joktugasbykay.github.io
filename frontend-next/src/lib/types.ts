export interface Product {
  id: string;
  nama: string;
  slug: string;
  kategori: string;
  deskripsi?: string;
  harga_dasar: number;
  diskon_persen: number;
  stok: number;
  batas_beli_per_orang?: number;
  is_active: boolean;
  is_limited_edition: boolean;
  gambar_url?: string | null;
  sold_count?: number;
}

export interface PromoBanner {
  id: string;
  judul: string;
  gambar_url: string;
  is_active: boolean;
  tampil_di_atas: boolean;
  urutan: number;
}

export interface PromoResponse {
  banners: PromoBanner[];
  penawaran_spesial_aktif: boolean;
  promo_judul: string;
  promo_deadline: string | null;
  server_time: string;
}

export interface CartItem {
  id: string;
  nama: string;
  harga: number;
  hargaAsli: number;
  quantity: number;
  isSpecial: boolean;
}

export type OrderStep = 1 | 2 | 3 | 4 | 5;

export interface CustomerData {
  name: string;
  nim: string;
  whatsapp: string;
  waCountry: string;
  email: string;
}

export interface TaskData {
  title: string;
  deadline: string;
  notes: string;
  googleDriveUrl: string;
}

export interface CheckoutOrder {
  id: string;
  orderCode?: string;
  tipe?: string;
  gateway: string;
  total: number;
  paymentStatus: string;
  paymentMethod?: string;
  paymentUrl?: string;
  expiryTime?: string;
  customer: {
    name: string;
    nim?: string;
    whatsapp: string;
    email: string;
  };
  task: {
    title: string;
    deadline: string;
    notes: string;
    googleDriveUrl?: string;
  };
  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
  }>;
}

export interface CheckoutValidationErrors {
  title?: string;
  deadline?: string;
  notes?: string;
  googleDriveUrl?: string;
  name?: string;
  whatsapp?: string;
  email?: string;
}
