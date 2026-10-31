export class HeroCarousel {
    slides;
    trackEl;
    dotsContainerEl;
    prevBtn;
    nextBtn;
    onSlideAction;
    currentIndex = 0;
    autoTimer = null;
    startTouchX = 0;
    constructor(slides, trackEl, dotsContainerEl, prevBtn, nextBtn, onSlideAction) {
        this.slides = slides;
        this.trackEl = trackEl;
        this.dotsContainerEl = dotsContainerEl;
        this.prevBtn = prevBtn;
        this.nextBtn = nextBtn;
        this.onSlideAction = onSlideAction;
        this.render();
        this.bindEvents();
        this.goTo(0);
    }
    render() {
        this.trackEl.innerHTML = this.slides
            .map((slide, i) => `
        <div class="slide ${slide.c}" role="group" aria-label="Slide ${i + 1} dari ${this.slides.length}">
          <div>
            <span class="tag">${slide.l}</span>
            <h2>${slide.h}</h2>
            <p>${slide.p}</p>
            <button type="button" class="btn b1" data-go="${i}">${slide.a}</button>
            ${slide.b ? `<button type="button" class="btn b2" data-go="all">${slide.b}</button>` : ''}
          </div>
          <div class="art" aria-hidden="true">
            ${slide.art.map((token) => `<span>${token}</span>`).join('')}
          </div>
        </div>
      `)
            .join('');
        this.dotsContainerEl.innerHTML = this.slides
            .map((_, i) => `<button type="button" class="dot" aria-label="Ke slide ${i + 1}" data-i="${i}"></button>`)
            .join('');
    }
    bindEvents() {
        this.dotsContainerEl.addEventListener('click', (e) => {
            const target = e.target.closest('[data-i]');
            if (target && target.dataset.i !== undefined) {
                this.goTo(parseInt(target.dataset.i, 10));
            }
        });
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', () => this.goTo(this.currentIndex - 1));
        }
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.goTo(this.currentIndex + 1));
        }
        this.trackEl.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-go]');
            if (!btn || !btn.dataset.go)
                return;
            if (this.onSlideAction) {
                this.onSlideAction(btn.dataset.go);
            }
        });
        // Touch Swipe Gestures
        this.trackEl.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) {
                this.startTouchX = e.touches[0].clientX;
            }
        }, { passive: true });
        this.trackEl.addEventListener('touchend', (e) => {
            if (e.changedTouches.length > 0) {
                const delta = e.changedTouches[0].clientX - this.startTouchX;
                if (Math.abs(delta) > 40) {
                    this.goTo(this.currentIndex + (delta < 0 ? 1 : -1));
                }
            }
        }, { passive: true });
    }
    goTo(index) {
        const total = this.slides.length;
        this.currentIndex = (index + total) % total;
        this.trackEl.style.transform = `translateX(-${this.currentIndex * 100}%)`;
        const dots = this.dotsContainerEl.querySelectorAll('.dot');
        dots.forEach((dot, idx) => {
            dot.setAttribute('aria-current', idx === this.currentIndex ? 'true' : 'false');
        });
        this.scheduleAutoNext();
    }
    scheduleAutoNext() {
        if (this.autoTimer) {
            clearTimeout(this.autoTimer);
            this.autoTimer = null;
        }
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.autoTimer = setTimeout(() => {
                this.goTo(this.currentIndex + 1);
            }, 6500);
        }
    }
    destroy() {
        if (this.autoTimer) {
            clearTimeout(this.autoTimer);
            this.autoTimer = null;
        }
    }
}
