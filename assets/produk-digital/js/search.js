// JOKI.IN Digital Store - Search Module
export class SearchController {
    inputEl;
    formEl;
    clearBtn;
    onSearch;
    debounceTimer = null;
    constructor(inputEl, formEl, clearBtn, onSearch) {
        this.inputEl = inputEl;
        this.formEl = formEl;
        this.clearBtn = clearBtn;
        this.onSearch = onSearch;
        this.bindEvents();
    }
    bindEvents() {
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
    clear() {
        this.inputEl.value = '';
        this.formEl.classList.remove('has');
        this.onSearch('');
        this.inputEl.focus();
    }
    setValue(val) {
        this.inputEl.value = val;
        this.formEl.classList.toggle('has', Boolean(val));
        this.onSearch(val);
    }
}
