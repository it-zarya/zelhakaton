// Слой тумана: canvas поверх карты. Стирание пальцем, подсчёт очистки зон.
// Координаты зон — в единицах viewBox карты; canvas масштабируется под размер рамки.

const CLEARED_ALPHA = 70; // пиксель тумана с alpha ниже — считается стёртым
const SAMPLE_W = 240; // ширина маски для подсчёта (дёшево, достаточно точно)

export interface Coverage {
  target: number; // доля очищенных целевых зон (вместе), 0..1
  each: number[]; // доля по каждой целевой зоне, в порядке setTarget
  wrong: number; // доля карты, стёртая вне цели и вне уже открытых зон, 0..1
}

export class Fog {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private vbW: number;
  private vbH: number;
  private scale = 1; // px буфера на единицу viewBox
  private dpr = 1;
  private paths: Map<string, Path2D>;
  private open = new Set<string>();
  private grain: CanvasPattern | null = null;
  private brushCss = 34; // радиус кисти в CSS px
  private last: { x: number; y: number } | null = null;
  private sample = document.createElement("canvas");
  private sctx: CanvasRenderingContext2D;
  private sampleH: number;
  private targetMask: Uint8Array | null = null;
  private targetIds: string[] = [];
  private openMask: Uint8Array | null = null;

  private glow: CanvasRenderingContext2D | null = null;
  private glowRaf = 0;
  private regrowing = false;
  private demoTimer = 0;
  /** Последняя точка касания в CSS px рамки */
  lastPoint: { x: number; y: number } | null = null;

  enabled = false;
  onChange: (() => void) | null = null; // во время стирания (троттлинг снаружи)
  onStrokeEnd: (() => void) | null = null;
  onPointerDown: (() => void) | null = null;
  /** Точка штриха в CSS px — для «тепло/холодно» */
  onPoint: ((x: number, y: number) => void) | null = null;

  constructor(canvas: HTMLCanvasElement, viewBox: [number, number, number, number], zonePaths: Map<string, string>) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.vbW = viewBox[2];
    this.vbH = viewBox[3];
    this.paths = new Map([...zonePaths].map(([id, d]) => [id, new Path2D(d)]));
    this.sampleH = Math.round((SAMPLE_W * this.vbH) / this.vbW);
    this.sample.width = SAMPLE_W;
    this.sample.height = this.sampleH;
    this.sctx = this.sample.getContext("2d", { willReadFrequently: true })!;
    this.bindPointer();
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(r.width * this.dpr);
    this.canvas.height = Math.round(r.height * this.dpr);
    this.scale = this.canvas.width / this.vbW;
    this.brushCss = 64 * Math.min(2, Math.max(0.5, Math.min(window.innerWidth / 1280, window.innerHeight / 800))); // 64 px макета 1280×800
    this.grain = this.makeGrain();
    if (this.glow) {
      this.glow.canvas.width = this.canvas.width;
      this.glow.canvas.height = this.canvas.height;
    }
    this.reset();
  }

  /** Canvas тёплого следа (mix-blend-mode: multiply, поверх тумана) */
  attachGlow(c: HTMLCanvasElement) {
    this.glow = c.getContext("2d");
  }

  /** Тёплый след под пальцем: heat 0..1. Гаснет сам за ~600 мс */
  glowAt(xCss: number, yCss: number, heat: number) {
    const g = this.glow;
    if (!g || heat <= 0.02) return;
    const x = xCss * this.dpr;
    const y = yCss * this.dpr;
    const r = 70 * (this.brushCss / 64) * this.dpr;
    const grad = g.createRadialGradient(x, y, r * 0.28, x, y, r);
    grad.addColorStop(0, "rgba(255,217,138,0)");
    grad.addColorStop(0.75, `rgba(255,190,110,${(0.5 * heat).toFixed(3)})`);
    grad.addColorStop(1, "rgba(228,87,46,0)");
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    if (!this.glowRaf) this.glowRaf = requestAnimationFrame(this.fadeGlow);
  }

  private fadeGlow = () => {
    const g = this.glow!;
    g.save();
    g.globalCompositeOperation = "destination-out";
    g.fillStyle = "rgba(0,0,0,0.07)";
    g.fillRect(0, 0, g.canvas.width, g.canvas.height);
    g.restore();
    // гасим, пока что-то видно: проверяем раз в кадр дёшево — по центру не проверить, просто 60 кадров после последнего мазка
    this.glowFrames = (this.glowFrames ?? 0) + 1;
    if (this.glowFrames < 60) this.glowRaf = requestAnimationFrame(this.fadeGlow);
    else {
      g.clearRect(0, 0, g.canvas.width, g.canvas.height);
      this.glowRaf = 0;
      this.glowFrames = 0;
    }
  };
  private glowFrames = 0;

  /** Полностью затянуть туманом, оставив открытыми уже найденные зоны */
  reset() {
    const { ctx, canvas } = this;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(246, 243, 236, 0.68)"; // design/city-materials.json → fog: ориентиры просвечивают
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (this.grain) {
      ctx.fillStyle = this.grain;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.restore();
    this.cut([...this.open], 1);
  }

  setOpen(ids: Iterable<string>) {
    this.open = new Set(ids);
    this.openMask = this.rasterize([...this.open]);
  }

  setTarget(ids: string[]) {
    this.targetIds = ids;
    this.targetMask = ids.length ? this.rasterizeIndexed(ids) : null;
  }

  /** Новые контуры зон (после смены размера экрана / камеры) */
  setShapes(viewBox: [number, number, number, number], zonePaths: Map<string, string>) {
    this.vbW = viewBox[2];
    this.vbH = viewBox[3];
    this.paths = new Map([...zonePaths].map(([id, d]) => [id, new Path2D(d)]));
    this.sampleH = Math.round((SAMPLE_W * this.vbH) / this.vbW);
    this.sample.height = this.sampleH;
    this.openMask = this.rasterize([...this.open]);
    this.setTarget(this.targetIds);
  }

  /** Анимированно открыть зоны и добавить их к открытым. Штрихи мимо при этом затягиваются */
  async reveal(ids: string[], ms = 700): Promise<void> {
    await this.animate(ms, (k) => {
      this.reset();
      this.cut(ids, k);
    });
    ids.forEach((id) => this.open.add(id));
    this.openMask = this.rasterize([...this.open]);
    this.reset();
  }

  /** Находка: круг дочистки растёт из точки касания, обрезан по контуру зон (design-handoff §1.8) */
  async revealFrom(ids: string[], pt: { x: number; y: number }, reach: number, ms = 700): Promise<void> {
    const cx = pt.x * this.dpr;
    const cy = pt.y * this.dpr;
    const R = reach * this.dpr;
    const clip = new Path2D();
    const m = new DOMMatrix([this.scale, 0, 0, this.scale, 0, 0]);
    for (const id of ids) {
      const p = this.paths.get(id);
      if (p) clip.addPath(p, m);
    }
    const snap = document.createElement("canvas");
    snap.width = this.canvas.width;
    snap.height = this.canvas.height;
    snap.getContext("2d")!.drawImage(this.canvas, 0, 0);
    await this.animate(ms, (k) => {
      const { ctx, canvas } = this;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "copy";
      ctx.drawImage(snap, 0, 0);
      ctx.globalCompositeOperation = "destination-out";
      ctx.clip(clip);
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(1, R * k), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      void canvas;
    });
    ids.forEach((id) => this.open.add(id));
    this.openMask = this.rasterize([...this.open]);
    this.reset();
  }

  /** Авто-демо жеста на заставке: штрих по траектории (CSS px) за ms */
  demoStroke(points: { x: number; y: number }[], ms = 1300): Promise<void> {
    this.last = null;
    return this.animate(ms, (k) => {
      const i = Math.min(points.length - 1, Math.floor(k * (points.length - 1)));
      const p = points[i];
      this.eraseTo(p.x * this.dpr, p.y * this.dpr);
    }, false).then(() => void (this.last = null));
  }

  /** Периодическое авто-демо: штрих, затем калька возвращается. Интервал — случайный в [minMs, maxMs] */
  startDemo(minMs = 5000, maxMs = 10000) {
    this.stopDemo();
    this.demoOn = true;
    const run = async () => {
      try {
        await this.demoOnce();
      } finally {
        // следующее — даже если это демо упало, но только пока демо не выключили
        if (this.demoOn) this.demoTimer = window.setTimeout(run, minMs + Math.random() * (maxMs - minMs));
      }
    };
    this.demoTimer = window.setTimeout(run, 1500);
  }

  stopDemo() {
    this.demoOn = false;
    clearTimeout(this.demoTimer);
  }

  private demoOn = false;

  private async demoOnce() {
    if (this.drawing || !this.demoOn) return;
    const r = this.canvas.getBoundingClientRect();
    const pts = Array.from({ length: 40 }, (_, i) => {
      const k = i / 39;
      return { x: r.width * (0.22 + k * 0.5), y: r.height * (0.65 - k * 0.15) + Math.sin(7 * k) * r.height * 0.05 };
    });
    await this.demoStroke(pts);
    window.setTimeout(() => this.demoOn && !this.drawing && this.regrow(), 1400);
  }

  /** Открыть зону сразу, не трогая остальные штрихи (часть многоместного этапа найдена) */
  openZone(id: string) {
    this.open.add(id);
    this.openMask = this.rasterize([...this.open]);
    this.cut([id], 1);
  }

  /** Снять туман целиком */
  clearAll(ms = 900): Promise<void> {
    return this.animate(ms, (k) => {
      this.reset();
      const { ctx, canvas } = this;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "destination-out";
      ctx.globalAlpha = k;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    });
  }

  /** «Не здесь»: калька затягивается за 900 мс, стёртое внутри цели остаётся. Касание прерывает анимацию */
  async regrow(ms = 900): Promise<void> {
    const holes = holesOf(this.canvas);
    // дырки внутри цели сохраняем
    const keep = document.createElement("canvas");
    keep.width = holes.width;
    keep.height = holes.height;
    const kx = keep.getContext("2d")!;
    const target = new Path2D();
    let hasTarget = false;
    for (const id of this.targetIds) {
      const p = this.paths.get(id);
      if (p) {
        target.addPath(p);
        hasTarget = true;
      }
    }
    // без цели (заставка) ничего не сохраняем; с целью — только дырки внутри неё (одной фигурой, иначе destination-in даст пересечение)
    if (hasTarget) {
      kx.drawImage(holes, 0, 0);
      kx.globalCompositeOperation = "destination-in";
      kx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
      kx.fillStyle = "#000";
      kx.fill(target);
    }
    this.regrowing = true;
    await this.animate(ms, (k) => {
      if (!this.regrowing) return;
      this.reset();
      const { ctx } = this;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "destination-out";
      ctx.globalAlpha = 1 - k;
      ctx.drawImage(holes, 0, 0);
      ctx.globalAlpha = 1;
      ctx.drawImage(keep, 0, 0);
      ctx.restore();
    }, true);
    this.regrowing = false;
  }

  measure(): Coverage {
    const { sctx } = this;
    sctx.clearRect(0, 0, SAMPLE_W, this.sampleH);
    sctx.drawImage(this.canvas, 0, 0, SAMPLE_W, this.sampleH);
    const px = sctx.getImageData(0, 0, SAMPLE_W, this.sampleH).data;
    let tTotal = 0;
    let tClear = 0;
    let wrong = 0;
    const zTotal = new Array(this.targetIds.length).fill(0);
    const zClear = new Array(this.targetIds.length).fill(0);
    const n = SAMPLE_W * this.sampleH;
    for (let i = 0; i < n; i++) {
      const cleared = px[i * 4 + 3] < CLEARED_ALPHA;
      const zi = this.targetMask ? this.targetMask[i] : 0;
      if (zi) {
        tTotal++;
        zTotal[zi - 1]++;
        if (cleared) {
          tClear++;
          zClear[zi - 1]++;
        }
      } else if (cleared && !(this.openMask && this.openMask[i])) {
        wrong++;
      }
    }
    return {
      target: tTotal ? tClear / tTotal : 0,
      each: zTotal.map((t, k) => (t ? zClear[k] / t : 1)),
      wrong: wrong / n,
    };
  }

  // ——— внутреннее ———

  private cut(ids: string[], alpha: number) {
    const { ctx } = this;
    ctx.save();
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.globalCompositeOperation = "destination-out";
    ctx.globalAlpha = alpha;
    for (const id of ids) {
      const p = this.paths.get(id);
      if (p) ctx.fill(p);
    }
    ctx.restore();
  }

  /** Маска целей: в пикселе — номер зоны (1..n), 0 — не цель */
  private rasterizeIndexed(ids: string[]): Uint8Array {
    const m = new Uint8Array(SAMPLE_W * this.sampleH);
    ids.forEach((id, k) => {
      const one = this.rasterize([id]);
      for (let i = 0; i < m.length; i++) if (one[i] && !m[i]) m[i] = k + 1;
    });
    return m;
  }

  private rasterize(ids: string[]): Uint8Array {
    const c = document.createElement("canvas");
    c.width = SAMPLE_W;
    c.height = this.sampleH;
    const x = c.getContext("2d", { willReadFrequently: true })!;
    const k = SAMPLE_W / this.vbW;
    x.setTransform(k, 0, 0, k, 0, 0);
    x.fillStyle = "#000";
    for (const id of ids) {
      const p = this.paths.get(id);
      if (p) x.fill(p);
    }
    const d = x.getImageData(0, 0, SAMPLE_W, this.sampleH).data;
    const m = new Uint8Array(SAMPLE_W * this.sampleH);
    for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 127 ? 1 : 0;
    return m;
  }

  private stamp(x: number, y: number) {
    const { ctx } = this;
    const r = this.brushCss * this.dpr;
    const g = ctx.createRadialGradient(x, y, r * 0.55, x, y, r); // жёсткость 0.55
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  private eraseTo(x: number, y: number) {
    const { ctx } = this;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "destination-out";
    const from = this.last ?? { x, y };
    const dist = Math.hypot(x - from.x, y - from.y);
    const step = Math.max(2, this.brushCss * this.dpr * 0.25);
    const n = Math.max(1, Math.ceil(dist / step));
    for (let i = 1; i <= n; i++) {
      this.stamp(from.x + ((x - from.x) * i) / n, from.y + ((y - from.y) * i) / n);
    }
    ctx.restore();
    this.last = { x, y };
  }

  private bindPointer() {
    const c = this.canvas;
    const pos = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      return { x: (e.clientX - r.left) * this.dpr, y: (e.clientY - r.top) * this.dpr };
    };
    c.addEventListener("pointerdown", (e) => {
      this.onPointerDown?.();
      if (!this.enabled) return;
      this.regrowing = false; // касание обрывает затягивание
      this.drawing = true;
      c.setPointerCapture(e.pointerId);
      this.last = null;
      const p = pos(e);
      this.eraseTo(p.x, p.y);
      this.point(p);
      this.onChange?.();
    });
    c.addEventListener("pointermove", (e) => {
      if (!this.enabled || !c.hasPointerCapture(e.pointerId)) return;
      let p = pos(e);
      for (const ev of e.getCoalescedEvents?.() ?? [e]) {
        p = pos(ev);
        this.eraseTo(p.x, p.y);
      }
      this.point(p);
      this.onChange?.();
    });
    const end = (e: PointerEvent) => {
      if (!c.hasPointerCapture(e.pointerId)) return;
      c.releasePointerCapture(e.pointerId);
      this.last = null;
      this.drawing = false;
      if (this.enabled) this.onStrokeEnd?.();
    };
    c.addEventListener("pointerup", end);
    c.addEventListener("pointercancel", end);
  }

  private drawing = false;

  private point(p: { x: number; y: number }) {
    this.lastPoint = { x: p.x / this.dpr, y: p.y / this.dpr };
    this.onPoint?.(this.lastPoint.x, this.lastPoint.y);
  }

  private makeGrain(): CanvasPattern | null {
    const s = 160;
    const g = document.createElement("canvas");
    g.width = g.height = s;
    const x = g.getContext("2d")!;
    const img = x.createImageData(s, s);
    for (let i = 0; i < s * s; i++) {
      const v = 200 + Math.random() * 55;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = Math.random() * 28;
    }
    x.putImageData(img, 0, 0);
    return this.ctx.createPattern(g, "repeat");
  }

  /** frame(k) получает абсолютный прогресс 0..1 с easing (inout — для затягивания, false — линейно) */
  private animate(ms: number, frame: (k: number) => void, inout: boolean | "out" = "out"): Promise<void> {
    return new Promise((resolve) => {
      const t0 = performance.now();
      const tick = (t: number) => {
        // метка rAF бывает чуть раньше t0 — прогресс не должен уходить в минус
        const k = Math.min(1, Math.max(0, (t - t0) / ms));
        frame(inout === "out" ? easeOut(k) : inout ? easeInOut(k) : k);
        if (k < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
  }
}

function easeInOut(k: number) {
  return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
}

function easeOut(k: number) {
  return 1 - Math.pow(1 - k, 3);
}

/** Маска «где тумана нет»: непрозрачно там, где туман стёрт */
function holesOf(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  const x = c.getContext("2d")!;
  x.fillStyle = "#000";
  x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = "destination-out";
  x.drawImage(src, 0, 0);
  return c;
}
