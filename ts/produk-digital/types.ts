// JOKI.IN Digital Store - TypeScript Definitions

export interface Product {
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

export interface Category {
  id: string;
  t: string; // title / display name
  d: string; // description
  hue: number;
}

export interface HeroSlide {
  c: string;
  l: string; // label tag
  h: string; // heading
  p: string; // paragraph
  a: string; // primary action text
  b?: string; // secondary action text
  art: string[]; // decorative tokens
}

export interface CartItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  slug?: string;
}

export interface StoreState {
  filter: string;
  query: string;
  categories: Category[];
  products: Product[];
  cart: CartItem[];
  isAdmin: boolean;
}
