// JOKI.IN Digital Store - Search Module

export class SearchController {
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private inputEl: HTMLInputElement,
    private formEl: HTMLElement,
    private clearBtn: HTMLElement,
    private onSearch: (query: string) => void
  ) {
    this.bindEvents();
  }

  private bindEvents(): void {
    this.inputEl.addEventListener('input', () => {
      const val = this.inputEl.value;
      this.formEl.classList.toggle('has', Boolean(val));

      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      this.debounceTimer = setTimeout(() => {
        this.onSearch(val);
      }, 150);
    });

    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.clear();
      }
    });

    this.clearBtn.addEventListener('click', () => {
      this.clear();
    });
  }

  clear(): void {
    this.inputEl.value = '';
    this.formEl.classList.remove('has');
    this.onSearch('');
    this.inputEl.focus();
  }

  setValue(val: string): void {
    this.inputEl.value = val;
    this.formEl.classList.toggle('has', Boolean(val));
    this.onSearch(val);
  }
}
