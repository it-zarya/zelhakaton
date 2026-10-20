// Режим ожидания: заставка без касаний → поверх карты по очереди проступают эскизы.
// Любое касание прячет показ и заново запускает отсчёт.

const SLIDE_MS = 8000; // сколько держится один эскиз (включая наплыв)

type Slide = { src: string; caption: string; credit: string };

export class Slideshow {
  private el: HTMLElement | null = null;
  private idle = 0;
  private tick = 0;
  private i = 0;
  private readonly kick = () => this.wait();
  private host: HTMLElement;
  private slides: Slide[];
  private idleMs: number;

  constructor(host: HTMLElement, slides: Slide[], idleMs: number) {
    this.host = host;
    this.slides = slides;
    this.idleMs = idleMs;
    document.addEventListener("pointerdown", this.kick, { capture: true });
    this.wait();
  }

  destroy() {
    document.removeEventListener("pointerdown", this.kick, { capture: true });
    clearTimeout(this.idle);
    this.hide();
  }

  private wait() {
    clearTimeout(this.idle);
    this.hide();
    this.idle = window.setTimeout(() => this.show(), this.idleMs);
  }

  private show() {
    this.el = document.createElement("div");
    this.el.className = "slideshow";
    this.el.innerHTML = `<div class="slides"></div><div class="slide-cap"><b></b><span></span></div>`;
    this.host.append(this.el);
    this.next();
  }

  private hide() {
    clearTimeout(this.tick);
    this.el?.remove();
    this.el = null;
  }

  private next() {
    if (!this.el) return;
    const s = this.slides[this.i % this.slides.length];
    this.i++;
    const img = new Image();
    img.className = "slide";
    img.alt = "";
    img.src = `${import.meta.env.BASE_URL}${s.src}`;
    const box = this.el.querySelector(".slides")!;
    img.decode().catch(() => {}).finally(() => {
      if (!this.el) return;
      box.append(img);
      requestAnimationFrame(() => img.classList.add("on")); // наплыв поверх предыдущего
      this.el.querySelector(".slide-cap b")!.textContent = s.caption;
      this.el.querySelector(".slide-cap span")!.textContent = s.credit;
      const old = box.querySelectorAll(".slide");
      if (old.length > 2) old[0].remove();
      this.tick = window.setTimeout(() => this.next(), SLIDE_MS);
    });
  }
}
