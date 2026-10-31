// JOKI.IN Digital Store - State Management
import { DEFAULT_CATEGORIES, SAMPLE_PRODUCTS } from './config.js';
class StateStore {
    state = {
        filter: 'all',
        query: '',
        categories: [...DEFAULT_CATEGORIES],
        products: [...SAMPLE_PRODUCTS],
        cart: [],
        isAdmin: false,
    };
    listeners = new Set();
    getState() {
        return this.state;
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    notify() {
        for (const listener of this.listeners) {
            listener(this.state);
        }
    }
    setFilter(filter) {
        if (this.state.filter === filter)
            return;
        this.state.filter = filter;
        this.notify();
    }
    setQuery(query) {
        this.state.query = query;
        this.notify();
    }
    setProducts(products) {
        this.state.products = products;
        this.notify();
    }
    setCategories(categories) {
        this.state.categories = categories;
        this.notify();
    }
    setAdmin(isAdmin) {
        this.state.isAdmin = isAdmin;
        this.notify();
    }
    addToCart(item) {
        const existingIndex = this.state.cart.findIndex((c) => c.productId === item.productId);
        if (existingIndex >= 0) {
            this.state.cart[existingIndex].quantity += item.quantity;
        }
        else {
            this.state.cart.push(item);
        }
        this.notify();
    }
    clearCart() {
        this.state.cart = [];
        this.notify();
    }
}
export const store = new StateStore();
