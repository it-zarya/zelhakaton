// Изометрический город (Three.js) из OSM: public/city.json (tools/osm/build_city.py).
// Координаты карты (x — восток, y — юг) → мир: X = x, Z = y, Y — вверх.
// Снаружи класс выглядит как 2D-карта: zonePaths/viewBox в CSS-пикселях экрана — для тумана и оверлея.

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { MapObject, ZonesFile } from "./types";

const NS = "http://www.w3.org/2000/svg";
const ELEVATION = THREE.MathUtils.degToRad(32); // SimCity-подобный наклон
const GROW_MS = 1400;
const WARM_HOLD_MS = 2400; // «только что выросло»: тёплый цвет держится…
const WARM_FADE_MS = 1600; // …и уходит к цвету типа
const LOCKED_SCALE = 0.06; // неоткрытые кварталы — низкие контуры

// Материалы направления «Макет»: design/city-materials.json
const C = {
  board: 0xe6dfd0, // земля/подложка
  boardEdge: 0xd4cbb8, // срез картона
  plate: 0xefe9dc, // площадки микрорайонов
  forest: 0x9db080,
  water: 0xa9c6cc,
  roadMain: 0xf8f5ee,
  roadStreet: 0xf1ede4,
  rail: 0x5b574f,
  panel60: 0xf4f0e8,
  b70: 0xe9e5dc,
  brick: 0xcf8c6b,
  industry: 0xd5d0c6,
  private: 0xe3d3b5,
  other: 0xede9e1,
  landmark: 0xe4572e,
  locked: 0xdad2c1,
  grown: 0xffd98a,
  edges: 0x5e5242,
};

interface CityFile {
  viewBox: [number, number, number, number];
  extent: [number, number, number, number]; // подложка: [x0, y0, x1, y1] в координатах карты
  unitsPerMeter: number;
  zones: { id: string; rings: number[][] }[];
  buildings: { z: number; h: number; p: number[]; k?: "i" | "p" | "b" | "t" | "o"; l?: string }[];
  forest: number[][];
  water: number[][];
  roads: { w: number; p: number[] }[];
  rail: number[][];
}

export class City3D {
  readonly frame: HTMLElement;
  readonly zonePaths = new Map<string, string>(); // в CSS px экрана
  /** Зоны в CSS px: центр, эквивалентный радиус, максимальный охват от центра */
  readonly zoneInfo = new Map<string, { x: number; y: number; r: number; reach: number }>();
  viewBox: [number, number, number, number] = [0, 0, 1, 1];
  onMarkerTap: ((id: string) => void) | null = null;

  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -5000, 5000);
  private city!: CityFile;
  private zonesFile: ZonesFile;
  private zoneMeshes = new Map<string, THREE.Mesh>(); // здания зоны
  private zoneGround = new Map<string, THREE.Mesh>(); // «асфальт» зоны
  private others: THREE.Mesh | null = null;
  private open = new Set<string>();
  private othersOpen = false;
  private buildMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  private lockedMat = new THREE.MeshLambertMaterial({ color: C.locked, transparent: true, opacity: 0.9 });
  private sun = new THREE.DirectionalLight(0xfff4e2, 2.2);
  private focus: [number, number][] = []; // точки объектов (координаты карты): должны попасть в кадр
  private overlay: SVGSVGElement;
  private pulseLayer: SVGGElement;
  private planLayer: SVGGElement;
  private foundLayer: SVGGElement;
  private pinLayer: HTMLDivElement;
  private markers: { o: MapObject; pin: string; tappable: boolean }[] = [];
  private animating = 0;
  private dirty = true;

  constructor(frame: HTMLElement, zones: ZonesFile, objects: MapObject[] = []) {
    this.frame = frame;
    this.zonesFile = zones;
    this.focus = objects.map((o) => this.mapPoint(o));
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); // кадр копирует ColorReveal
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x000000, 0); // фон «стол» — в CSS .map-area
    this.renderer.domElement.classList.add("city-canvas");
    this.overlay = document.createElementNS(NS, "svg");
    this.overlay.classList.add("map-overlay");
    this.planLayer = svgG("plan");
    this.pulseLayer = svgG("pulse");
    this.foundLayer = svgG("found");
    this.overlay.append(this.planLayer, this.foundLayer, this.pulseLayer);
    this.pinLayer = document.createElement("div");
    this.pinLayer.className = "pin-layer";
  }

  async load(): Promise<void> {
    const res = await fetch(`${import.meta.env.BASE_URL}city.json`);
    this.city = (await res.json()) as CityFile;
    this.build();
    this.frame.prepend(this.renderer.domElement);
    this.frame.append(this.overlay, this.pinLayer);
    const loop = () => {
      if (this.dirty || this.animating > 0) {
        this.renderer.render(this.scene, this.camera);
        this.dirty = false;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  get canvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  /** Подогнать камеру под контейнер и пересчитать экранные контуры зон */
  fit(container: HTMLElement) {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    this.renderer.setSize(w, h, false); // CSS-размер канваса задаёт style.css (100%)
    this.placeCamera(w / h);
    this.viewBox = [0, 0, w, h];
    this.overlay.setAttribute("viewBox", this.viewBox.join(" "));
    this.zonePaths.clear();
    this.zoneInfo.clear();
    for (const z of this.city.zones) {
      this.zonePaths.set(z.id, z.rings.map((ring) => this.ringPath(ring, w, h)).join(" "));
      const pts = pairs(z.rings[0]).map(([x, y]) => this.toScreen(x, 0, y, w, h));
      const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
      const cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
      let area = 0;
      pts.forEach(([x1, y1], i) => {
        const [x2, y2] = pts[(i + 1) % pts.length];
        area += x1 * y2 - x2 * y1;
      });
      const reach = Math.max(...pts.map(([x, y]) => Math.hypot(x - cx, y - cy)));
      this.zoneInfo.set(z.id, { x: cx, y: cy, r: Math.sqrt(Math.abs(area) / 2 / Math.PI), reach });
    }
    this.renderMarkers(false);
    this.dirty = true;
  }

  setOpenZones(ids: Iterable<string>) {
    const next = new Set(ids);
    for (const [id, mesh] of this.zoneMeshes) {
      const was = this.open.has(id);
      const now = next.has(id);
      this.zoneGround.get(id)!.visible = now;
      if (now && !was) this.grow(mesh);
      if (!now) this.lock(mesh);
    }
    this.open = next;
    this.dirty = true;
  }

  /** Здания вне микрорайонов: деревни, промзоны, новые ЖК */
  setOthers(on: boolean) {
    if (!this.others) return;
    if (on && !this.othersOpen) this.grow(this.others);
    if (!on) this.lock(this.others);
    this.othersOpen = on;
    this.dirty = true;
  }

  pulse(ids: string[]) {
    this.pulseLayer.replaceChildren(...ids.map((id) => svgPath(this.zonePaths.get(id) ?? "", "pulse")));
  }

  clearPulse() {
    this.pulseLayer.replaceChildren();
  }

  showPlan(on: boolean) {
    if (!on) return void this.planLayer.replaceChildren();
    this.planLayer.replaceChildren(
      ...[...this.zonePaths.values()].map((d, i) => {
        const p = svgPath(d, "plan-line");
        p.setAttribute("pathLength", "1");
        p.style.animationDelay = `${i * 60}ms`;
        return p;
      }),
    );
  }

  /** Пины из design/svg/markers. pin: landmark | found | locked | secret */
  setMarkers(objects: MapObject[], tappable: boolean, pin: (o: MapObject) => string = () => "landmark", stagger = true) {
    this.markers = objects.map((o) => ({ o, pin: pin(o), tappable }));
    this.renderMarkers(stagger);
  }

  /** Подсветить пин объекта (карточка которого открыта) */
  highlight(id: string | null) {
    this.pinLayer.classList.toggle("focus", id !== null); // остальные пины приглушаются
    this.pinLayer.querySelectorAll<HTMLElement>(".pin").forEach((p) => p.classList.toggle("active", p.dataset.id === id));
  }

  /** Контур найденной зоны: тёплая вспышка, контур остаётся до сброса */
  markFound(ids: string[]) {
    this.foundLayer.append(...ids.map((id) => svgPath(this.zonePaths.get(id) ?? "", "zone-found")));
  }

  clearFound() {
    this.foundLayer.replaceChildren();
  }

  /** Сдвиг карты влево (под лист-карточку), px; 0 — вернуть */
  pan(dx: number) {
    this.frame.style.transform = dx ? `translateX(${-dx}px)` : "";
  }

  /** Экранная точка объекта (CSS px) */
  screenOf(o: MapObject): [number, number] {
    const [, , w, h] = this.viewBox;
    const [mx, my] = this.mapPoint(o);
    return this.toScreen(mx, 6, my, w, h);
  }

  // ——— построение сцены ———

  private build() {
    const { city, scene } = this;
    const [, , W, H] = city.viewBox;
    const [ex0, ey0, ex1, ey1] = city.extent ?? [0, 0, W, H];
    const m = city.unitsPerMeter;

    // Свет: мягкое небо + утреннее солнце (позиция — в placeCamera, относительно камеры)
    scene.add(new THREE.HemisphereLight(0xfff8ec, 0xcfc6b2, 0.9 * Math.PI * 0.55));
    const sun = this.sun;
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.radius = 4;
    sun.shadow.bias = -0.0005;
    const sc = sun.shadow.camera;
    const r = Math.hypot(W, H) * 0.6;
    sc.left = -r;
    sc.right = r;
    sc.top = r;
    sc.bottom = -r;
    sc.near = 1;
    sc.far = 4000;
    sc.updateProjectionMatrix();
    sun.target.position.set(W / 2, 0, H / 2);
    scene.add(sun, sun.target);

    // Всё, что вылезает за край макета, срезаем
    const eps = 0.01;
    this.renderer.clippingPlanes = [
      new THREE.Plane(new THREE.Vector3(1, 0, 0), -ex0 + eps),
      new THREE.Plane(new THREE.Vector3(-1, 0, 0), ex1 + eps),
      new THREE.Plane(new THREE.Vector3(0, 0, 1), -ey0 + eps),
      new THREE.Plane(new THREE.Vector3(0, 0, -1), ey1 + eps),
    ];

    // Подложка-макет: картон толщиной ~8 м со срезом по краю
    const thick = 8 * m;
    const edge = new THREE.MeshLambertMaterial({ color: C.boardEdge });
    const top = new THREE.MeshLambertMaterial({ color: C.board });
    const board = new THREE.Mesh(new THREE.BoxGeometry(ex1 - ex0, thick, ey1 - ey0), [edge, edge, top, edge, edge, edge]);
    board.position.set((ex0 + ex1) / 2, -thick / 2, (ey0 + ey1) / 2);
    board.receiveShadow = true;
    scene.add(board);

    // Лес — войлочные пятна 1,2 м
    if (city.forest?.length) {
      const geos = city.forest.map((r) => extrude(r, 1.2 * m)).filter((g): g is THREE.BufferGeometry => !!g);
      const forest = new THREE.Mesh(mergeGeometries(geos)!, new THREE.MeshLambertMaterial({ color: C.forest }));
      forest.receiveShadow = true;
      scene.add(forest);
    }

    // Площадки микрорайонов 0,3 м (видны, когда зона открыта)
    const plateMat = new THREE.MeshLambertMaterial({ color: C.plate });
    for (const z of city.zones) {
      const geos = z.rings.map((r) => extrude(r, 0.3 * m)).filter((g): g is THREE.BufferGeometry => !!g);
      const p = new THREE.Mesh(mergeGeometries(geos)!, plateMat);
      p.receiveShadow = true;
      p.visible = false;
      this.zoneGround.set(z.id, p);
      scene.add(p);
    }

    // Вода, дороги, ж/д — поверх площадок
    if (city.water.length) {
      const water = new THREE.Mesh(
        mergeGeometries(city.water.map((r) => flatShape(r, 1.4 * m)))!,
        new THREE.MeshLambertMaterial({ color: C.water }),
      );
      water.receiveShadow = true;
      scene.add(water);
    }
    const street = city.roads.filter((r) => r.w < 1.5);
    const main = city.roads.filter((r) => r.w >= 1.5).map((r) => ({ ...r, w: r.w * 1.3 }));
    for (const [list, color, y] of [
      [street, C.roadStreet, 1.5 * m],
      [main, C.roadMain, 1.6 * m],
    ] as const) {
      const g = ribbons(list, y);
      if (g) scene.add(receive(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color }))));
    }
    const rail = ribbons(city.rail.map((p) => ({ w: 1.2, p })), 1.7 * m);
    if (rail) scene.add(receive(new THREE.Mesh(rail, new THREE.MeshLambertMaterial({ color: C.rail }))));

    // Здания: меш на зону + «прочие»; цвет вершин по типу
    const color = { i: C.industry, p: C.private, b: C.brick, t: C.b70, o: C.other } as const;
    const byZone = new Map<number, THREE.BufferGeometry[]>();
    for (const b of city.buildings) {
      const geo = extrude(b.p, Math.max(b.h, 0.4));
      if (!geo) continue;
      paint(geo, b.l ? C.landmark : b.k ? color[b.k] : C.panel60);
      const list = byZone.get(b.z) ?? [];
      list.push(geo);
      byZone.set(b.z, list);
    }
    const edgeMat = new THREE.LineBasicMaterial({ color: C.edges, transparent: true, opacity: 0.35 });
    for (const [zi, geos] of byZone) {
      const merged = mergeGeometries(geos);
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, this.buildMat);
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(merged, 30), edgeMat));
      scene.add(mesh);
      if (zi < 0) this.others = mesh;
      else this.zoneMeshes.set(city.zones[zi].id, mesh);
    }
    for (const z of city.zones) {
      if (!this.zoneMeshes.has(z.id)) this.zoneMeshes.set(z.id, new THREE.Mesh(new THREE.BufferGeometry(), this.buildMat));
    }
    // по умолчанию всё «не открыто»
    for (const mesh of this.zoneMeshes.values()) this.lock(mesh);
    if (this.others) this.lock(this.others);
  }

  /** Выбрать азимут, при котором город крупнее всего вписывается в экран, и выставить фрустум */
  private placeCamera(aspect: number) {
    const [, , W, H] = this.city.viewBox;
    const target = new THREE.Vector3(W / 2, 0, H / 2);
    const pts = [...this.city.zones.flatMap((z) => z.rings.flatMap((r) => pairs(r))), ...this.focus];
    let best = { az: 0, size: Infinity, box: [0, 0, 0, 0] };
    for (let deg = -60; deg <= 60; deg += 5) {
      const box = this.viewBoxFor(THREE.MathUtils.degToRad(deg), target, pts);
      const bw = box[2] - box[0];
      const bh = box[3] - box[1];
      const size = Math.max(bw / aspect, bh); // высота фрустума, нужная чтобы влезло
      if (size < best.size) best = { az: deg, size, box };
    }
    const az = THREE.MathUtils.degToRad(best.az);
    this.viewBoxFor(az, target, pts); // оставить камеру в лучшей позиции
    // Солнце слева-сзади камеры, 38° над горизонтом: тени уходят вправо-вверх, фасады к зрителю светлые
    const sunAz = az + THREE.MathUtils.degToRad(35);
    const sunEl = THREE.MathUtils.degToRad(38);
    this.sun.position.set(
      target.x + Math.sin(sunAz) * Math.cos(sunEl) * 1200,
      Math.sin(sunEl) * 1200,
      target.z + Math.cos(sunAz) * Math.cos(sunEl) * 1200,
    );
    const [x0, y0, x1, y1] = best.box;
    // сверху — запас под высоту пинов (~92 px макета из 800)
    const topPad = (y1 - y0) * 0.12;
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1 + topPad) / 2;
    let hh = (Math.max((x1 - x0) / aspect, y1 - y0 + topPad) * 1.06) / 2;
    const cam = this.camera;
    const apply = () => {
      cam.left = cx - hh * aspect;
      cam.right = cx + hh * aspect;
      cam.top = cy + hh;
      cam.bottom = cy - hh;
      cam.updateProjectionMatrix();
    };
    apply();
    // край макета не должен попадать в кадр: если угол кадра «смотрит» за подложку — приближаем
    const [ex0, ey0, ex1, ey1] = this.city.extent ?? [0, 0, this.city.viewBox[2], this.city.viewBox[3]];
    for (let i = 0; i < 30 && !this.frustumInside(ex0, ey0, ex1, ey1); i++) {
      hh *= 0.96;
      apply();
    }
  }

  /** Все 4 угла кадра, спроецированные на землю, лежат внутри подложки */
  private frustumInside(x0: number, y0: number, x1: number, y1: number): boolean {
    const cam = this.camera;
    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    for (const [nx, ny] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const o = new THREE.Vector3(nx, ny, -1).unproject(cam);
      const t = -o.y / dir.y; // пересечение луча с землёй y = 0
      const gx = o.x + dir.x * t;
      const gz = o.z + dir.z * t;
      if (gx < x0 || gx > x1 || gz < y0 || gz > y1) return false;
    }
    return true;
  }

  /** Поставить камеру на азимут и вернуть bbox точек в её координатах [xmin,ymin,xmax,ymax] */
  private viewBoxFor(az: number, target: THREE.Vector3, pts: [number, number][]) {
    const cam = this.camera;
    const dist = 1500;
    cam.position.set(
      target.x + Math.sin(az) * Math.cos(ELEVATION) * dist,
      Math.sin(ELEVATION) * dist,
      target.z + Math.cos(az) * Math.cos(ELEVATION) * dist,
    );
    cam.up.set(0, 1, 0);
    cam.lookAt(target);
    cam.updateMatrixWorld(true);
    const inv = cam.matrixWorldInverse;
    const v = new THREE.Vector3();
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, z] of pts) {
      v.set(x, 0, z).applyMatrix4(inv);
      x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x);
      y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y);
    }
    return [x0, y0, x1, y1] as [number, number, number, number];
  }

  private toScreen(x: number, y: number, z: number, w: number, h: number): [number, number] {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    return [(v.x * 0.5 + 0.5) * w, (-v.y * 0.5 + 0.5) * h];
  }

  private ringPath(ring: number[], w: number, h: number): string {
    const out: string[] = [];
    for (let i = 0; i < ring.length; i += 2) {
      const [sx, sy] = this.toScreen(ring[i], 0, ring[i + 1], w, h);
      out.push(`${sx.toFixed(1)},${sy.toFixed(1)}`);
    }
    return `M${out.join(" L")}Z`;
  }

  private mapPoint(o: MapObject): [number, number] {
    if (o.lat != null && o.lon != null) {
      const { kx, minx, maxy, scale } = this.zonesFile.projection;
      return [(o.lon * kx - minx) * scale, (maxy - o.lat) * scale];
    }
    const z = this.zonesFile.zones.find((z) => z.id === o.zone);
    return z ? [z.cx, z.cy] : [0, 0];
  }

  private renderMarkers(stagger: boolean) {
    const base = import.meta.env.BASE_URL;
    this.pinLayer.replaceChildren(
      ...this.markers.map(({ o, pin, tappable }, i) => {
        const [sx, sy] = this.screenOf(o);
        const b = document.createElement("button");
        b.className = `pin${tappable ? " tappable" : ""}`;
        b.dataset.id = o.id;
        b.style.left = `${sx.toFixed(1)}px`;
        b.style.top = `${sy.toFixed(1)}px`;
        b.style.transitionDelay = stagger ? `${80 + i * 120}ms` : "0ms";
        const short = o.name.split(" — ")[0]; // «Корпус 118 — первый жилой дом» → «Корпус 118»
        b.innerHTML = `<i class="pin-ring"></i><img src="${base}svg/markers/pin-${pin}.svg" alt=""><span class="pin-label">${short.replace(/[&<>"]/g, "")}</span>`;
        b.addEventListener("click", () => tappable && this.onMarkerTap?.(o.id));
        return b;
      }),
    );
    // следующий кадр — запустить «падение»
    requestAnimationFrame(() => requestAnimationFrame(() => this.pinLayer.querySelectorAll(".pin").forEach((p) => p.classList.add("in"))));
  }

  /** Неоткрытый квартал: низкие контуры одним цветом, без рёбер */
  private lock(mesh: THREE.Mesh) {
    mesh.userData.locked = true;
    mesh.material = this.lockedMat;
    mesh.scale.y = LOCKED_SCALE;
    mesh.children.forEach((c) => (c.visible = false));
    mesh.castShadow = false;
  }

  /** Рост квартала: из контуров в полную высоту, тёплая подсветка и остывание к цвету типа */
  private grow(mesh: THREE.Mesh) {
    mesh.userData.locked = false;
    const mat = this.buildMat.clone();
    mat.emissive = new THREE.Color(C.grown);
    mat.emissiveIntensity = 0.55;
    mesh.material = mat;
    mesh.castShadow = true;
    mesh.scale.y = LOCKED_SCALE;
    this.animating++;
    const t0 = performance.now();
    const total = GROW_MS + WARM_HOLD_MS + WARM_FADE_MS;
    const tick = (t: number) => {
      if (mesh.userData.locked) return void this.animating--; // успели снова «закрыть»
      const e = t - t0;
      const k = Math.min(1, e / GROW_MS);
      mesh.scale.y = LOCKED_SCALE + (1 - LOCKED_SCALE) * easeOutBack(k);
      if (k === 1) mesh.children.forEach((c) => (c.visible = true));
      const fade = Math.min(1, Math.max(0, (e - GROW_MS - WARM_HOLD_MS) / WARM_FADE_MS));
      mat.emissiveIntensity = 0.55 * (1 - fade);
      if (e < total) requestAnimationFrame(tick);
      else {
        mesh.scale.y = 1;
        mesh.material = this.buildMat;
        mat.dispose();
        this.animating--;
        this.dirty = true;
      }
    };
    requestAnimationFrame(tick);
  }
}

// ——— геометрия ———

function pairs(flat: number[]): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < flat.length; i += 2) out.push([flat[i], flat[i + 1]]);
  return out;
}

function shapeOf(flat: number[]): THREE.Shape {
  // Shape в плоскости XY, после rotateX(-π/2): shape.y → -Z, поэтому y берём со знаком минус
  const s = new THREE.Shape();
  s.moveTo(flat[0], -flat[1]);
  for (let i = 2; i < flat.length; i += 2) s.lineTo(flat[i], -flat[i + 1]);
  s.closePath();
  return s;
}

function extrude(flat: number[], height: number): THREE.BufferGeometry | null {
  if (flat.length < 6) return null;
  const g = new THREE.ExtrudeGeometry(shapeOf(flat), { depth: height, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  g.deleteAttribute("uv");
  return g;
}

function flatShape(flat: number[], y: number): THREE.BufferGeometry {
  const g = new THREE.ShapeGeometry(shapeOf(flat));
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  g.deleteAttribute("uv");
  return g.index ? g.toNonIndexed() : g;
}

function paint(g: THREE.BufferGeometry, hex: number) {
  const c = new THREE.Color(hex);
  const n = g.getAttribute("position").count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
  g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
}

/** Полилинии → плоские ленты заданной ширины */
function ribbons(lines: { w: number; p: number[] }[], y: number): THREE.BufferGeometry | null {
  const pos: number[] = [];
  for (const { w, p } of lines) {
    for (let i = 0; i + 3 < p.length; i += 2) {
      const x1 = p[i], z1 = p[i + 1], x2 = p[i + 2], z2 = p[i + 3];
      const len = Math.hypot(x2 - x1, z2 - z1) || 1;
      const nx = (-(z2 - z1) / len) * (w / 2);
      const nz = ((x2 - x1) / len) * (w / 2);
      // два треугольника; порядок вершин — лицом вверх
      pos.push(x1 - nx, y, z1 - nz, x2 - nx, y, z2 - nz, x1 + nx, y, z1 + nz);
      pos.push(x1 + nx, y, z1 + nz, x2 - nx, y, z2 - nz, x2 + nx, y, z2 + nz);
    }
  }
  if (!pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

function receive(m: THREE.Mesh) {
  m.receiveShadow = true;
  (m.material as THREE.Material).side = THREE.DoubleSide;
  return m;
}

function easeOutBack(k: number) {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
}

function svgG(cls: string): SVGGElement {
  const el = document.createElementNS(NS, "g");
  el.classList.add(cls);
  return el;
}

function svgPath(d: string, cls: string): SVGPathElement {
  const p = document.createElementNS(NS, "path");
  p.setAttribute("d", d);
  p.classList.add(cls);
  return p;
}
