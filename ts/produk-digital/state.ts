// JOKI.IN Digital Store - State Management
import { DEFAULT_CATEGORIES, SAMPLE_PRODUCTS } from './config.js';
import { CartItem, Category, Product, StoreState } from './types.js';

type StateListener = (state: StoreState) => void;

class StateStore {
  private state: StoreState = {
    filter: 'all',
    query: '',
    categories: [...DEFAULT_CATEGORIES],
    products: [...SAMPLE_PRODUCTS],
    cart: [],
    isAdmin: false,
  };

  private listeners: Set<StateListener> = new Set();

  getState(): Readonly<StoreState> {
    return this.state;
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  setFilter(filter: string): void {
    if (this.state.filter === filter) return;
    this.state.filter = filter;
    this.notify();
  }

  setQuery(query: string): void {
    this.state.query = query;
    this.notify();
  }

  setProducts(products: Product[]): void {
    this.state.products = products;
    this.notify();
  }

  setCategories(categories: Category[]): void {
    this.state.categories = categories;
    this.notify();
  }

  setAdmin(isAdmin: boolean): void {
    this.state.isAdmin = isAdmin;
    this.notify();
  }

  addToCart(item: CartItem): void {
    const existingIndex = this.state.cart.findIndex((c) => c.productId === item.productId);
    if (existingIndex >= 0) {
      this.state.cart[existingIndex].quantity += item.quantity;
    } else {
      this.state.cart.push(item);
    }
    this.notify();
  }

  clearCart(): void {
    this.state.cart = [];
    this.notify();
  }
}

export const store = new StateStore();
