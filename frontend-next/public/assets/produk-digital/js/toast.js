// JOKI.IN Digital Store - Accessible Toast Notification Component
let toastTimer = null;
export function showToast(message, duration = 2400) {
    const toastEl = document.getElementById('toast');
    if (!toastEl)
        return;
    toastEl.textContent = message;
    toastEl.classList.add('on');
    if (toastTimer) {
        clearTimeout(toastTimer);
    }
    toastTimer = setTimeout(() => {
        toastEl.classList.remove('on');
        toastTimer = null;
    }, duration);
}
