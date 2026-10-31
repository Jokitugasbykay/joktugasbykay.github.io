// JOKI.IN Digital Store - Order Status Module
import { API_ENDPOINTS } from './config.js';
export async function fetchOrderDetails(orderCode) {
    try {
        const res = await fetch(`${API_ENDPOINTS.ORDER_STATUS}/${encodeURIComponent(orderCode)}`);
        if (!res.ok)
            return null;
        const data = await res.json();
        return data.order || null;
    }
    catch {
        return null;
    }
}
