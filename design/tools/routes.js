// Генератор SVG-карт маршрутов. run_script: eval(readFile('tools/routes.js')) → {files}
const MX = 62250, MY = 111320; // м на градус (cos 56°)
const S = {
  k118: [56.006443, 37.204761, 'КОРП. 118'], s842: [56.006007, 37.211670, 'ШКОЛА № 842'], p152: [56.000897, 37.204406, 'ПОЛИКЛИНИКА № 152'],
  el: [56.002695, 37.209740, '«ЭЛЕКТРОН»'], tw: [56.00064, 37.21138, 'БАШНИ ПРОСПЕКТА'], kc: [55.989741, 37.220079, 'КЦ «ЗЕЛЕНОГРАД»'],
  fl: [55.992166, 37.219454, '«ФЛЕЙТА»'], vu: [55.996991, 37.229564, 'БАШНИ ВУЛЫХА'], ko: [55.987845, 37.189315, 'ДВОРЕЦ ПИОНЕРОВ'],
  hr: [55.976860, 37.154769, 'ХРАМ СЕРГИЯ РАДОНЕЖСКОГО'], sh: [56.014318, 37.208771, '«ШТЫКИ»'],
};
// base (lat, lon)
const BASE = {
  shosse: [[55.975, 37.320], [56.0143, 37.2092], [56.031, 37.162], [56.048, 37.120]],
  rail: [[56.022, 37.105], [55.9920, 37.1560], [55.9797, 37.1741], [55.970, 37.205], [55.958, 37.250], [55.948, 37.300]],
  central: [[56.0075, 37.2052], [56.002695, 37.20974], [55.9897, 37.2201], [55.9830, 37.2255]],
  main: [
    [[56.0130, 37.2150], [56.0064, 37.2030], [55.9980, 37.1950], [55.9878, 37.1860], [55.9797, 37.1741], [55.9769, 37.1570], [55.9710, 37.1380]],
    [[56.0040, 37.1880], [56.002695, 37.20974], [55.9990, 37.2300], [55.9960, 37.2480]],
    [[55.9905, 37.1750], [55.9893, 37.2000], [55.9897, 37.2201], [55.9870, 37.2450]],
  ],
  minor: [
    [[56.0090, 37.1990], [56.0070, 37.2140], [56.0010, 37.2150]], [[56.0000, 37.1980], [56.0012, 37.2065], [56.0030, 37.2110]],
    [[55.9990, 37.2140], [55.9940, 37.2300], [55.9930, 37.2420]], [[56.0060, 37.2320], [55.9960, 37.2330], [55.9850, 37.2360]],
    [[55.9950, 37.1880], [55.9930, 37.2120]], [[55.9840, 37.2000], [55.9800, 37.2120], [55.9760, 37.2250]],
    [[55.9820, 37.1500], [55.9760, 37.1650], [55.9700, 37.1600]], [[55.9790, 37.1420], [55.9720, 37.1520]],
  ],
  forest: [
    [[56.0130, 37.185], [56.0180, 37.200], [56.0165, 37.225], [56.0110, 37.232], [56.0098, 37.2165], [56.0115, 37.197]],
    [[55.9860, 37.195], [55.9868, 37.212], [55.9835, 37.2215], [55.9765, 37.2230], [55.9735, 37.206], [55.9775, 37.192]],
    [[56.0010, 37.168], [56.0055, 37.184], [55.9985, 37.191], [55.9920, 37.184], [55.9940, 37.170]],
    [[56.0035, 37.243], [55.9990, 37.2555], [55.9880, 37.2520], [55.9905, 37.2400]],
    [[55.9690, 37.160], [55.9660, 37.185], [55.9600, 37.175], [55.9620, 37.150]],
  ],
  pond: { c: [55.9937, 37.2035], rx: 330, ry: 120, rot: -35 },
};
const ROUTES = [
  { n: 1, stops: ['k118', 's842', 'p152'], path: [['k118', [56.0067, 37.2082], 's842'], ['s842', [56.0036, 37.2106], [56.0012, 37.2065], 'p152']], sides: { k118: 'l', s842: 'r', p152: 'l' }, min: 1500 },
  { n: 2, stops: ['el', 'tw', 'kc', 'fl'], path: [['el', 'tw'], ['tw', 'kc'], ['kc', [55.9898, 37.2222], [55.9921, 37.2214], 'fl']], sides: { el: 'l', tw: 'l', kc: 'l', fl: 'r' }, band: [0.158, 0.8], min: 1800 },
  { n: 3, stops: ['vu', 'fl', 'kc', 'ko'], path: [['vu', [55.9950, 37.2285], [55.9928, 37.2215], 'fl'], ['fl', 'kc'], ['kc', [55.9893, 37.2100], [55.9885, 37.1990], [55.9880, 37.1920], 'ko']], sides: { vu: 't', fl: 'l', kc: 'b', ko: 'b' }, min: 1800 },
  { n: 4, stops: ['k118', 'el', 'fl', 'kc', 'hr'], path: [['k118', [56.0046, 37.2073], 'el'], ['el', [55.9922, 37.2181], 'fl'], ['fl', 'kc'], ['kc', [55.9880, 37.2150], [55.9832, 37.1900], [55.9797, 37.1741], [55.9778, 37.1640], 'hr', 'bus']], sides: { k118: 'r', el: 'r', fl: 'r', kc: 'b', hr: 't' }, busLabel: 0.55, min: 1800 },
  { n: 5, stops: ['sh', 'k118', 'el'], path: [['sh', [56.0120, 37.2077], [56.0085, 37.2052], 'k118'], ['k118', [56.0046, 37.2073], 'el']], sides: { sh: 'r', k118: 'l', el: 'r' }, min: 1500 },
];
const V = 760, INK = '#1E1D1A', RED = '#D9472B';
const ll = x => typeof x === 'string' ? S[x] : x;
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
function build(R) {
  const pts = []; R.path.forEach(seg => seg.forEach(p => { if (p !== 'bus') pts.push(ll(p)); }));
  const xs = pts.map(p => p[1] * MX), ys = pts.map(p => -p[0] * MY);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const ext = Math.max(R.min, (Math.max(...xs) - Math.min(...xs)) * 1.55, (Math.max(...ys) - Math.min(...ys)) * 1.55);
  const u = V / ext;
  const P = p => [+(V / 2 + (p[1] * MX - cx) * u).toFixed(1), +(V / 2 + (-p[0] * MY - cy) * u).toFixed(1)];
  const line = arr => 'M' + arr.map(p => P(p).join(' ')).join('L');
  const o = [];
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${V} ${V}" width="${V}" height="${V}" font-family="IBM Plex Mono, monospace" id="route-${R.n}">`);
  o.push(`<style>
.lbl{font-size:18px;font-weight:500;letter-spacing:.06em;fill:${INK};paint-order:stroke;stroke:#F7F4ED;stroke-width:5px;stroke-linejoin:round}
.base{font-size:15px;font-weight:500;letter-spacing:.1em;fill:#57524A;paint-order:stroke;stroke:#F7F4ED;stroke-width:4px}
.num{font-size:15px;font-weight:600;fill:#fff;font-family:"IBM Plex Mono",monospace}
.rt{stroke-width:4px}.ui{}
@media (max-width:520px){.mk{transform:scale(1.75)}.base{font-size:25px;stroke-width:6px}.rt{stroke-width:7.5px}.ui{transform:scale(1.7)}}
svg.phone .mk{transform:scale(1.75)}svg.phone .base{font-size:25px}svg.phone .rt{stroke-width:7.5px}svg.phone .ui{transform:scale(1.7)}
</style>`);
  o.push(`<rect width="${V}" height="${V}" fill="#F7F4ED"/>`);
  const gstep = 250 * u; let g = ''; for (let i = ((V / 2) % gstep); i < V; i += gstep) g += `M${i.toFixed(1)} 0V${V}M0 ${i.toFixed(1)}H${V}`;
  o.push(`<path d="${g}" stroke="#CFC7B7" stroke-width="1" opacity=".45" fill="none"/>`);
  o.push('<g id="base">');
  BASE.forest.forEach(f => o.push(`<path d="${line(f)}Z" fill="#9DB080" opacity=".42"/>`));
  { const c = P(BASE.pond.c); o.push(`<ellipse cx="${c[0]}" cy="${c[1]}" rx="${(BASE.pond.rx * u).toFixed(1)}" ry="${(BASE.pond.ry * u).toFixed(1)}" transform="rotate(${BASE.pond.rot} ${c[0]} ${c[1]})" fill="#C9D6D3"/>`); }
  BASE.minor.forEach(m => o.push(`<path d="${line(m)}" stroke="#CFC7B7" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`));
  BASE.main.forEach(m => o.push(`<path d="${line(m)}" stroke="#57524A" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`));
  o.push(`<path d="${line(BASE.central)}" stroke="#57524A" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
  o.push(`<path d="${line(BASE.shosse)}" stroke="#57524A" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${line(BASE.shosse)}" stroke="#F7F4ED" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
  o.push(`<path d="${line(BASE.rail)}" stroke="${INK}" stroke-width="2.5" fill="none" stroke-dasharray="16 6 3 6"/>`);
  o.push('</g>');
  // base labels
  const lab = (arr, text, pref = 0.5) => {
    const q = arr.map(P); let best = null, bd = 1e9;
    for (let i = 0; i < q.length - 1; i++) for (let t = 0.1; t <= 0.9; t += 0.1) {
      const x = q[i][0] + (q[i + 1][0] - q[i][0]) * t, y = q[i][1] + (q[i + 1][1] - q[i][1]) * t;
      if (x < 90 || x > V - 90 || y < 70 || y > V - 90) continue;
      const d = Math.abs(i + t - (q.length - 1) * pref); if (d < bd) { bd = d; best = { x, y, a: Math.atan2(q[i + 1][1] - q[i][1], q[i + 1][0] - q[i][0]) * 180 / Math.PI }; }
    }
    if (!best) return; let a = best.a; if (a > 90) a -= 180; if (a < -90) a += 180;
    o.push(`<text class="base" x="${best.x.toFixed(1)}" y="${best.y.toFixed(1)}" dy="-9" text-anchor="middle" transform="rotate(${a.toFixed(1)} ${best.x.toFixed(1)} ${best.y.toFixed(1)})">${text}</text>`);
  };
  lab(BASE.shosse, 'ЛЕНИНГРАДСКОЕ Ш.', 0.45); lab(BASE.central, 'ЦЕНТРАЛЬНЫЙ ПР-Т', 0.62); lab(BASE.rail, 'Ж/Д · КРЮКОВО', 0.3);
  { const c = P(BASE.pond.c); if (c[0] > 80 && c[0] < V - 80 && c[1] > 60 && c[1] < V - 60) o.push(`<text class="base" x="${c[0]}" y="${c[1] + 5}" text-anchor="middle">ПРУД</text>`); }
  // towers band (route 2)
  if (R.band) { const a = BASE.central[1], b = BASE.central[2]; const f = t => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    o.push(`<path d="${line([f(R.band[0]), f(R.band[1])])}" stroke="#FFD98A" stroke-width="18" stroke-linecap="round" fill="none"/>`); }
  // route
  o.push('<g id="route">');
  R.path.forEach(seg => { const bus = seg.includes('bus'); const arr = seg.filter(p => p !== 'bus').map(ll);
    o.push(`<path class="rt" d="${line(arr)}" stroke="${RED}" fill="none" stroke-linecap="round" stroke-linejoin="round"${bus ? ' stroke-dasharray="2 12"' : ''}/>`);
    if (bus) { const q = arr.map(P); const m = q[Math.floor(q.length * R.busLabel)]; o.push(`<g transform="translate(${m[0]} ${m[1] + 34})"><g class="ui"><rect x="-128" y="-16" width="256" height="32" rx="6" fill="#F7F4ED" stroke="${RED}" stroke-width="2"/><text x="0" y="6" text-anchor="middle" style="font-size:15px;font-weight:500;letter-spacing:.06em" fill="${RED}">МОЖНО НА АВТОБУСЕ</text></g></g>`); }
  });
  o.push('</g>');
  // stops
  const N = R.stops.length;
  R.stops.forEach((k, i) => {
    const p = P(S[k]); const side = R.sides[k] || 'r'; const txt = S[k][2];
    const pos = { r: [24, 6, 'start'], l: [-24, 6, 'end'], t: [0, -26, 'middle'], b: [0, 38, 'middle'] }[side];
    let extra = '';
    if (i === 0) extra = `<path d="M9 -9V-34" stroke="${INK}" stroke-width="2.5"/><path d="M9 -34H25L21 -28L25 -22H9Z" fill="${INK}"/>`;
    if (i === N - 1) extra = `<rect x="7" y="-27" width="16" height="16" fill="${INK}" stroke="#F7F4ED" stroke-width="2"/>`;
    o.push(`<g id="stop-${i + 1}" transform="translate(${p[0]} ${p[1]})"><g class="mk">${extra}<circle r="14" fill="${RED}" stroke="#F7F4ED" stroke-width="3"/><text class="num" y="5.2" text-anchor="middle">${i + 1}</text><text class="lbl" x="${pos[0]}" y="${pos[1]}" text-anchor="${pos[2]}">${esc(txt)}</text></g></g>`);
  });
  // ui: north, scale, credit
  const bar = 500 * u;
  o.push(`<g transform="translate(${V - 40} 44)"><g class="ui"><circle r="20" fill="#F7F4ED" stroke="${INK}" stroke-width="2"/><path d="M0 -13L6 7L0 3L-6 7Z" fill="${INK}"/><text y="-26" text-anchor="middle" style="font-size:14px;font-weight:600" fill="${INK}">С</text></g></g>`);
  o.push(`<g transform="translate(24 ${V - 44})"><g class="ui"><path d="M0 0V8H${bar.toFixed(1)}V0" stroke="${INK}" stroke-width="2" fill="none"/><text x="${(bar / 2).toFixed(1)}" y="-6" text-anchor="middle" style="font-size:13px;font-weight:500;letter-spacing:.06em" fill="${INK}">500 М</text></g></g>`);
  o.push(`<g transform="translate(${V - 12} ${V - 12})"><g class="ui"><text text-anchor="end" style="font-size:11px;letter-spacing:.04em" fill="#57524A">Карта © участники OpenStreetMap</text></g></g>`);
  o.push('</svg>\n');
  return o.join('\n');
}
const files = {}; ROUTES.forEach(R => files[`svg/routes/route-${R.n}.svg`] = build(R));
({ files })
