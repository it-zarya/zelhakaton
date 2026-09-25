// Варианты девятиэтажек для этапа 4 в стиле Claude Design.
// Использует генератор из design/tools (iso-gen.js + stage4v3.js). Запуск: node tools/stage4/nine-variants.cjs
// Все варианты — тот же участок 5×2 клетки (38×13 ед.) и 9 этажей, различаются фасадом, цветом и объёмом.
const fs = require("fs");
const vm = require("vm");
const path = require("path");
const D = path.resolve(__dirname, "../../design/tools");
const OUT = path.resolve(__dirname, "../../public/svg/stage4v3");

const variants = `
function nineVar(along, v) {
  reset(M4);
  const W = 38, Dp = 13, H = 27;
  // координаты задаём «вдоль», для поворота меняем оси местами
  const bx = (x, y, z, w, d, h, col) => along ? box(x, y, z, w, d, h, col) : box(y, x, z, d, w, h, col);
  const fl = (x, y, z, w, d, h, st, col) => along ? floors(x, y, z, w, d, h, st, col) : floors(y, x, z, d, w, h, st, col);
  const rb = (x, y, z, w, d, h, st, col) => along ? ribs(x, y, z, w, d, h, st, col) : ribs(y, x, z, d, w, h, st, col);
  const sh = (x, y, w, d, h) => along ? shadow(rect(x, y, w, d), h) : shadow(rect(y, x, d, w), h);
  const x0 = -W / 2, y0 = -Dp / 2;
  sh(x0, y0, W, Dp, H);
  begin(3);
  if (v === "a") { // панельная 1605-АМ: рёбра панелей
    bx(x0, y0, 0, W, Dp, H, P.slab70); fl(x0, y0, 0, W, Dp, H, 2.8, dk(P.slab70, .84)); rb(x0, y0, 0, W, Dp, H, 5, dk(P.slab70, .9));
    bx(-6, -3, H, 12, 6, 2.2, P.slab70);
  }
  if (v === "b") { // белая с колоннами лоджий
    const c = P.white;
    bx(x0, y0, 0, W, Dp - 1, H, c); fl(x0, y0, 0, W, Dp - 1, H, 2.8, dk(c, .84));
    for (let k = 0; k < 5; k++) bx(x0 + 2.5 + k * 7.5, y0 + Dp - 1, 0.6, 3.6, 1, H - 1, dk(c, .93));
    bx(-5, -3, H, 10, 5, 2, c);
  }
  if (v === "c") { // двухсекционная со сдвигом
    const c = P.panel;
    bx(x0, y0, 0, W / 2, Dp - 2, H, c); fl(x0, y0, 0, W / 2, Dp - 2, H, 2.8, dk(c, .84)); rb(x0, y0, 0, W / 2, Dp - 2, H, 4.75, dk(c, .9));
    bx(0, y0 + 2, 0, W / 2, Dp - 2, H, c); fl(0, y0 + 2, 0, W / 2, Dp - 2, H, 2.8, dk(c, .84)); rb(0, y0 + 2, 0, W / 2, Dp - 2, H, 4.75, dk(c, .9));
    bx(x0 + 6, y0 + 3, H, 6, 5, 2, c); bx(7, y0 + 5, H, 6, 5, 2, c);
  }
  if (v === "d") { // серо-голубая, полосы окон лестничных клеток
    const c = "#E2E6E8";
    bx(x0, y0, 0, W, Dp, H, c); fl(x0, y0, 0, W, Dp, H, 2.8, dk(c, .85));
    for (const t of [-11, 0, 11]) bx(t - 1, y0 + Dp, 1, 2, 0.35, H - 2, P.glass);
    bx(-4, -2.5, H, 8, 5, 2.4, dk(c, .95));
  }
  if (v === "e") { // тёплая, две машинные на крыше, карниз
    const c = "#EFE7D8";
    bx(x0, y0, 0, W, Dp, H, c); fl(x0, y0, 0, W, Dp, H, 2.8, dk(c, .84)); rb(x0, y0, 0, W, Dp, H, 9.5, dk(c, .88));
    bx(x0 - 0.3, y0 - 0.3, H, W + 0.6, Dp + 0.6, 0.6, dk(c, .9));
    bx(-14, -2.5, H + 0.6, 6, 5, 2.4, c); bx(8, -2.5, H + 0.6, 6, 5, 2.4, c);
  }
  return render(pw, 0.9, 0, PVB);
}
const res = {};
for (const v of ["a", "b", "c", "d", "e"]) { res["nine-" + v + "-along.svg"] = nineVar(true, v); res["nine-" + v + "-across.svg"] = nineVar(false, v); }
res
`;
const code = fs.readFileSync(path.join(D, "iso-gen.js"), "utf8") + "\n" + fs.readFileSync(path.join(D, "stage4v3.js"), "utf8") + "\n" + variants;
const files = vm.runInNewContext(code, { Math, console });
for (const [name, svg] of Object.entries(files)) fs.writeFileSync(path.join(OUT, name), svg);
console.log("written:", Object.keys(files).join(", "));
