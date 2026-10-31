export interface CatalogProduct {
  id: string;
  title: string;
  category: string;
  price: string;
  priceNum: number;
  image?: string;
  icon?: string;
  desc: string;
  benefits: string[];
  features?: string[];
  estimatedTime?: string;
  revisionTerms?: string;
  popularity?: number;
  requiresDriveLink?: boolean;
  target?: string;
  notIncluded?: string[];
  reviewImage?: string;
  originalPrice?: number;
  hasSale?: boolean;
  salePercent?: number;
  batasBeli?: number;
  batas_beli_per_orang?: number;
  isLimitedEdition?: boolean;
  _isBannerOnly?: boolean;
}

export interface CatalogCategory {
  id: string;
  name: string;
  icon?: string;
}

export interface OrderStep {
  num: string;
  title: string;
  desc: string;
}

export interface TestimonialReview {
  id: string;
  name: string;
  university?: string;
  service: string;
  rating: number;
  date: string;
  review: string;
  avatar?: string;
}
