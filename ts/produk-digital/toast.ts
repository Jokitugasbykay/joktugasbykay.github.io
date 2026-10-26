// JOKI.IN Digital Store - Accessible Toast Notification Component

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export function showToast(message: string, duration = 2400): void {
  const toastEl = document.getElementById('toast');
  if (!toastEl) return;

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
