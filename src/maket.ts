// Этап 4 «Двигаем коробки»: доска макета поверх карты, 4 пары башен из лотка ставятся в слоты вдоль проспекта.
// Геометрия — в px макета карты 884×800 (docs/design-handoff.md §1.11), на экран — процентами.

const W = 884;
const H = 800;
const SLOT_X = [90, 290, 490, 690];
const SLOT_Y = 300;
const TRAY_Y = 668;
const BOX_W = 130;
const BOX_H = 84;
const SNAP = 160; // px макета

const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(3)}%`;

export class Maket {
  private el: HTMLElement;
  private occupied: (HTMLElement | null)[] = [null, null, null, null];
  private onChange: (placed: number) => void;

  constructor(area: HTMLElement, onChange: (placed: number) => void) {
    this.onChange = onChange;
    this.el = document.createElement("div");
    this.el.className = "maket";
    this.el.innerHTML = `
      ${blob(40, 40, 220, 130)}${blob(690, 60, 170, 120)}${blob(30, 470, 180, 90)}${blob(760, 470, 110, 90)}
      <div class="mk-pond" style="${box(560, 480, 170, 70)}"></div>
      ${[150, 300, 450].map((x) => `<div class="mk-block" style="${box(x, 150, 110, 44)}"></div>`).join("")}
      <p class="mk-label" style="left:${pct(150, W)};top:${pct(210, H)}">Девятиэтажки — в глубине 4-го мкр</p>
      <div class="mk-avenue" style="${box(0, 398, W, 56)}"><span>Центральный проспект</span></div>
      ${SLOT_X.map((x) => `<div class="mk-slot" style="${box(x, SLOT_Y, BOX_W, BOX_H)}"></div>`).join("")}
      <div class="mk-tray" style="${box(0, 600, W, H - 600)}"><span>Лоток · парные 17-этажные башни</span></div>`;
    SLOT_X.forEach((x, i) => {
      const b = document.createElement("div");
      b.className = "mk-box";
      b.dataset.home = String(i);
      b.innerHTML = "<i></i><i></i>";
      this.place(b, x, TRAY_Y);
      this.drag(b);
      this.el.append(b);
    });
    area.append(this.el);
  }

  destroy() {
    this.el.remove();
  }

  private place(b: HTMLElement, x: number, y: number) {
    b.style.left = pct(x, W);
    b.style.top = pct(y, H);
    b.style.width = pct(BOX_W, W);
    b.style.height = pct(BOX_H, H);
  }

  private drag(b: HTMLElement) {
    let sx = 0;
    let sy = 0;
    b.addEventListener("pointerdown", (e) => {
      b.setPointerCapture(e.pointerId);
      sx = e.clientX;
      sy = e.clientY;
      b.classList.add("grab");
      const slot = this.occupied.indexOf(b);
      if (slot >= 0) this.occupied[slot] = null;
    });
    b.addEventListener("pointermove", (e) => {
      if (!b.hasPointerCapture(e.pointerId)) return;
      b.style.transform = `translate(${e.clientX - sx}px, ${e.clientY - sy}px) scale(1.08)`;
    });
    const drop = (e: PointerEvent) => {
      if (!b.hasPointerCapture(e.pointerId)) return;
      b.releasePointerCapture(e.pointerId);
      b.classList.remove("grab");
      const r = this.el.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      const k = W / r.width; // экранные px → px макета
      const cx = (br.left + br.width / 2 - r.left) * k;
      const cy = (br.top + br.height / 2 - r.top) * k;
      b.style.transform = "";
      let best = -1;
      let bestD = SNAP;
      SLOT_X.forEach((x, i) => {
        if (this.occupied[i]) return;
        const d = Math.hypot(cx - (x + BOX_W / 2), cy - (SLOT_Y + BOX_H / 2));
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      if (best >= 0) {
        this.occupied[best] = b;
        this.place(b, SLOT_X[best], SLOT_Y);
        b.classList.add("placed");
      } else {
        this.place(b, SLOT_X[+b.dataset.home!], TRAY_Y);
        b.classList.remove("placed");
      }
      this.el.querySelectorAll<HTMLElement>(".mk-slot").forEach((s, i) => s.classList.toggle("full", !!this.occupied[i]));
      this.onChange(this.occupied.filter(Boolean).length);
    };
    b.addEventListener("pointerup", drop);
    b.addEventListener("pointercancel", drop);
  }
}

function box(x: number, y: number, w: number, h: number) {
  return `left:${pct(x, W)};top:${pct(y, H)};width:${pct(w, W)};height:${pct(h, H)}`;
}

function blob(x: number, y: number, w: number, h: number) {
  return `<div class="mk-felt" style="${box(x, y, w, h)}"></div>`;
}
