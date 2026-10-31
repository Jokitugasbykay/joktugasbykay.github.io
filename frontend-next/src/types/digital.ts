// JOKI.IN Digital Store - Types & Interfaces

export interface DigitalProduct {
  id?: string;
  c: string; // category id
  n: string; // name
  pv: string; // provider / brand
  ds: string; // description
  pr: number; // final price
  st: number; // stock count
  old?: number; // original price before discount
  slug?: string;
  gambar_url?: string;
  is_active?: boolean;
  is_limited_edition?: boolean;
}

export interface DigitalCategory {
  id: string;
  t: string; // title / display name
  d: string; // description
  hue: number;
}

export interface DigitalHeroSlide {
  c: string;
  l: string; // label tag
  h: string; // heading
  p: string; // paragraph
  a: string; // primary action text
  b?: string; // secondary action text
  art: string[]; // decorative tokens
}

export interface DigitalCartItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  slug?: string;
}

export interface DigitalOrderDetails {
  order_code: string;
  payment_status: string;
  total: number;
  total_price?: number;
  nama?: string;
  customer_name?: string;
  items?: Array<{
    product_id?: string;
    product_slug?: string;
    name?: string;
    produk?: string;
    quantity?: number;
    qty?: number;
    unit_price?: number;
    harga_satuan?: number;
    total_price?: number;
    subtotal?: number;
  }>;
  created_at?: string;
  payment_url?: string | null;
}
