export interface CatalogProduct {
  id: string;
  title: string;
  category: string;
  price: string;
  priceNum: number;
  image: string;
  desc: string;
  benefits: string[];
  features?: string[];
  estimatedTime?: string;
  revisionTerms?: string;
  popularity?: number;
}

export interface CatalogCategory {
  id: string;
  name: string;
  icon?: string;
}

export interface OrderStep {
  num: number;
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
}
