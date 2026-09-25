// Цветное проявление: город на этапе чёрно-белый (CSS-фильтр на WebGL-канвасе),
// а поверх — 2D-слой с цветной копией кадра, обрезанной по «цветным» зонам и по стёртому туману.
// Итог: стёр в правильном месте — проступает цвет; мимо — серо. Найденные зоны остаются цветными.

export class ColorReveal {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private src: HTMLCanvasElement; // WebGL-канвас города (preserveDrawingBuffer)
  private fog: HTMLCanvasElement;
  private paths = new Map<string, Path2D>();
  private open = new Set<string>(); // найденные: цветные целиком
  private target: string[] = []; // цель: цветная только под стёртым туманом
  private raf = 0;
  private tmp = document.createElement("canvas");
  active = false;

  constructor(src: HTMLCanvasElement, fog: HTMLCanvasElement) {
    this.src = src;
    this.fog = fog;
    this.canvas = document.createElement("canvas");
    this.canvas.className = "color-layer";
    this.ctx = this.canvas.getContext("2d")!;
  }

  setPaths(zonePaths: Map<string, string>) {
    this.paths = new Map([...zonePaths].map(([id, d]) => [id, new Path2D(d)]));
  }

  set(open: Iterable<string>, target: string[]) {
    this.open = new Set(open);
    this.target = target;
  }

  start() {
    this.active = true;
    if (!this.raf) this.raf = requestAnimationFrame(this.tick);
  }

  stop() {
    this.active = false;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private tick = () => {
    this.raf = 0;
    if (!this.active) return;
    this.draw();
    this.raf = requestAnimationFrame(this.tick);
  };

  private union(ids: string[]): Path2D | null {
    const all = new Path2D();
    let any = false;
    for (const id of ids) {
      const p = this.paths.get(id);
      if (p) {
        all.addPath(p);
        any = true;
      }
    }
    return any ? all : null;
  }

  private draw() {
    const { ctx, canvas, src } = this;
    if (canvas.width !== src.width || canvas.height !== src.height) {
      canvas.width = src.width;
      canvas.height = src.height;
    }
    const k = src.width / (src.clientWidth || 1); // CSS px → px буфера
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "copy";
    ctx.drawImage(src, 0, 0);

    // 1) цель: цвет только там, где туман стёрт (туман вычитаем трижды — полупрозрачная калька гасит цвет почти полностью)
    const tgt = this.tmp;
    if (tgt.width !== canvas.width || tgt.height !== canvas.height) {
      tgt.width = canvas.width;
      tgt.height = canvas.height;
    }
    const t = tgt.getContext("2d")!;
    t.setTransform(1, 0, 0, 1, 0, 0);
    t.globalCompositeOperation = "source-over";
    t.clearRect(0, 0, tgt.width, tgt.height);
    const targetPath = this.union(this.target);
    if (targetPath) {
      t.drawImage(src, 0, 0);
      t.globalCompositeOperation = "destination-in";
      t.setTransform(k, 0, 0, k, 0, 0);
      t.fill(targetPath); // одна общая фигура: destination-in по очереди дал бы пересечение
      t.setTransform(1, 0, 0, 1, 0, 0);
      t.globalCompositeOperation = "destination-out";
      for (let i = 0; i < 3; i++) t.drawImage(this.fog, 0, 0, canvas.width, canvas.height);
    }

    // 2) найденные зоны — цветные целиком
    const openPath = this.union([...this.open]);
    if (openPath) {
      ctx.globalCompositeOperation = "destination-in";
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.fill(openPath);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(tgt, 0, 0);
    ctx.restore();
  }
}
