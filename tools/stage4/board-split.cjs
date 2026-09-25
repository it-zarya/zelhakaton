// Этап 4: подложка без существующих домов 4-го мкр + отдельные спрайты этих домов,
// чтобы они сортировались по глубине вместе с домами игрока. Генератор — design/tools (Claude Design).
// Запуск: node tools/stage4/board-split.cjs
const fs = require("fs");
const vm = require("vm");
const path = require("path");
const D = path.resolve(__dirname, "../../design/tools");
const OUT = path.resolve(__dirname, "../../public/svg/stage4v3");
const layout = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../design/svg/stage4v3/layout.json"), "utf8"));

let src = fs.readFileSync(path.join(D, "stage4v3.js"), "utf8");
const houseLine = "OBS.forEach(([t,c0,r0,w,h])=>{if(t==='H')B(c0*G+1.5,r0*G+1.5,0,w*G-3,h*G-3,14,P.slab70,{fl:2.8,lk:.88})});";
if (!src.includes(houseLine)) throw new Error("не нашёл строку с домами в stage4v3.js");
src = src.replace(houseLine, "");
// пересобираем подложку с фиксированной рамкой: вызываем render повторно с FIX
const code = fs.readFileSync(path.join(D, "iso-gen.js"), "utf8") + "\n" + src + `
const boardFixed = (function(){ return out.files['board.svg']; })();
const houses = OBS.filter(o => o[0] === 'H').map(([t, c0, r0, w, h]) => {
  reset(M4);
  const W = w * G - 3, Dd = h * G - 3;
  B(-W / 2, -Dd / 2, 0, W, Dd, 14, P.slab70, { fl: 2.8, lk: .88 });
  return { c: c0, r: r0, w, h, svg: render(pw, 0.9, 0, PVB) };
});
({ board: boardFixed, houses, layout: out.layout })
`;
const res = vm.runInNewContext(code, { Math, console });
if (Math.abs(res.layout.k - layout.k) > 1e-3 || Math.abs(res.layout.vbX - layout.vbX) > 1e-2 || Math.abs(res.layout.vbY - layout.vbY) > 1e-2)
  throw new Error("рамка подложки изменилась: " + JSON.stringify(res.layout));
fs.writeFileSync(path.join(OUT, "board-empty.svg"), res.board);
res.houses.forEach((h, i) => fs.writeFileSync(path.join(OUT, `existing-${i + 1}.svg`), h.svg));
console.log("board-empty.svg + existing:", JSON.stringify(res.houses.map(({ c, r, w, h }) => [c, r, w, h])));
