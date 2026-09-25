"""OSM (Overpass JSON, out geom) → public/map.svg + src/data/zones.json.

Запуск: python3 tools/osm/build_map.py  (из корня проекта)
Данные: tools/osm/raw.json, запрос — tools/osm/query.overpassql.
© участники OpenStreetMap, ODbL.
"""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "tools/osm/raw.json"
OUT_SVG = ROOT / "public/map.svg"
OUT_ZONES = ROOT / "src/data/zones.json"

WIDTH = 1000  # ширина viewBox, высота по пропорции
MARGIN = 0.06

# OSM id → id зоны. Ключ: (type, id)
ZONES = {
    ("way", 176642032): ("mkr-01", "1"),
    ("way", 175142476): ("mkr-02", "2"),
    ("relation", 5956470): ("mkr-03", "3"),
    ("way", 51359578): ("mkr-04", "4"),
    ("relation", 19579598): ("mkr-05", "5"),
    ("way", 385122139): ("mkr-05a", "5а"),
    ("way", 181460163): ("mkr-06", "6"),
    ("way", 181831391): ("mkr-07", "7"),
    ("way", 184456582): ("mkr-08a", "8а"),
    ("way", 183776343): ("mkr-08b", "8б"),
    ("way", 175733946): ("mkr-09", "9"),
    ("way", 183210571): ("mkr-10", "10"),
    ("way", 182443695): ("mkr-11a", "11а"),
    ("way", 182775405): ("mkr-11b", "11б"),
    ("way", 182920682): ("mkr-11v", "11в"),
    ("way", 175743992): ("mkr-12", "12"),
    ("way", 46847059): ("mkr-14", "14"),
    ("way", 47910658): ("mkr-15", "15"),
    ("way", 51487156): ("mkr-16", "16"),
    ("relation", 13927276): ("mkr-17", "17"),
    ("way", 51359096): ("mkr-18", "18"),
    ("way", 727545688): ("mkr-19", "19"),
    ("way", 51695185): ("mkr-20", "20"),
    ("way", 1306513865): ("mkr-22", "22"),
    ("way", 318340125): ("mkr-23", "23"),
}


# Зоны, которых нет в OSM как микрорайон: выпуклая оболочка объектов из center.json (+ запас)
CUSTOM_ZONES = {
    "mkr-center": ("Ц", [43967306, 36888825], 1.35),  # Центральная площадь + КЦ «Зеленоград»
}


def custom_rings():
    """[(zid, label, [ring latlon])] для CUSTOM_ZONES"""
    data = json.loads((ROOT / "tools/osm/center.json").read_text())
    by_id = {e["id"]: e for e in data["elements"]}
    out = []
    for zid, (label, ids, grow) in CUSTOM_ZONES.items():
        pts = [(p["lat"], p["lon"]) for i in ids for p in by_id[i]["geometry"]]
        hull = convex_hull(pts)
        clat = sum(p[0] for p in hull) / len(hull)
        clon = sum(p[1] for p in hull) / len(hull)
        ring = [(clat + (a - clat) * grow, clon + (b - clon) * grow) for a, b in hull]
        out.append((zid, label, [ring + ring[:1]]))
    return out


def convex_hull(pts):
    pts = sorted(set(pts))
    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lower, upper = [], []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def rings_of(el):
    """Замкнутые кольца (outer) элемента в виде списков (lat, lon)."""
    if el["type"] == "way":
        return [[(p["lat"], p["lon"]) for p in el["geometry"]]]
    segs = [
        [(p["lat"], p["lon"]) for p in m["geometry"]]
        for m in el.get("members", [])
        if m["type"] == "way" and m.get("role", "outer") in ("outer", "") and "geometry" in m
    ]
    return join_segments(segs)


def join_segments(segs):
    rings = []
    segs = [s[:] for s in segs if len(s) > 1]
    while segs:
        ring = segs.pop(0)
        changed = True
        while ring[0] != ring[-1] and changed:
            changed = False
            for i, s in enumerate(segs):
                if s[0] == ring[-1]:
                    ring += s[1:]
                elif s[-1] == ring[-1]:
                    ring += s[::-1][1:]
                elif s[-1] == ring[0]:
                    ring = s[:-1] + ring
                elif s[0] == ring[0]:
                    ring = s[::-1][:-1] + ring
                else:
                    continue
                segs.pop(i)
                changed = True
                break
        rings.append(ring)
    return rings


def lines_of(el):
    if el["type"] == "way":
        return [[(p["lat"], p["lon"]) for p in el["geometry"]]]
    return [
        [(p["lat"], p["lon"]) for p in m["geometry"]]
        for m in el.get("members", [])
        if m["type"] == "way" and "geometry" in m
    ]


def dp(points, eps):
    """Douglas–Peucker для списка (x, y)."""
    if len(points) < 3:
        return points
    (x1, y1), (x2, y2) = points[0], points[-1]
    dx, dy = x2 - x1, y2 - y1
    norm = math.hypot(dx, dy) or 1e-12
    idx, dmax = 0, -1.0
    for i in range(1, len(points) - 1):
        x0, y0 = points[i]
        d = abs(dy * x0 - dx * y0 + x2 * y1 - y2 * x1) / norm if norm > 1e-12 else math.hypot(x0 - x1, y0 - y1)
        if d > dmax:
            idx, dmax = i, d
    if dmax > eps:
        return dp(points[: idx + 1], eps)[:-1] + dp(points[idx:], eps)
    return [points[0], points[-1]]


def area(pts):
    return abs(sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(pts, pts[1:] + pts[:1]))) / 2


def centroid(pts):
    a = cx = cy = 0.0
    for (x1, y1), (x2, y2) in zip(pts, pts[1:] + pts[:1]):
        f = x1 * y2 - x2 * y1
        a += f
        cx += (x1 + x2) * f
        cy += (y1 + y2) * f
    if abs(a) < 1e-9:
        return sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)
    return cx / (3 * a), cy / (3 * a)


def main():
    data = json.loads(RAW.read_text())
    els = {(e["type"], e["id"]): e for e in data["elements"]}

    zone_rings = {}
    for key, (zid, label) in ZONES.items():
        rs = [r for r in rings_of(els[key]) if len(r) > 3]
        rs.sort(key=len, reverse=True)
        zone_rings[zid] = (label, rs)
    for zid, label, rs in custom_rings():
        zone_rings[zid] = (label, rs)

    # Рамка = bbox зон + поля
    lats = [p[0] for _, rs in zone_rings.values() for r in rs for p in r]
    lons = [p[1] for _, rs in zone_rings.values() for r in rs for p in r]
    lat0 = (min(lats) + max(lats)) / 2
    kx = math.cos(math.radians(lat0))
    w_geo = (max(lons) - min(lons)) * kx
    h_geo = max(lats) - min(lats)
    pad = max(w_geo, h_geo) * MARGIN
    minx, maxy = min(lons) * kx - pad, max(lats) + pad
    scale = WIDTH / (w_geo + 2 * pad)
    height = round((h_geo + 2 * pad) * scale)

    def proj(p):
        lat, lon = p
        return ((lon * kx - minx) * scale, (maxy - lat) * scale)

    def in_view(pts):
        return any(-50 <= x <= WIDTH + 50 and -50 <= y <= height + 50 for x, y in pts)

    def d_attr(rings, closed=True, eps=0.8):
        parts = []
        for r in rings:
            pts = dp([proj(p) for p in r], eps)
            if len(pts) < 2:
                continue
            s = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts)
            parts.append(s + ("Z" if closed else ""))
        return " ".join(parts)

    layers = {"forest": [], "water": [], "river": [], "roads-major": [], "roads-minor": [], "rail": [], "outline": []}
    for e in data["elements"]:
        t = e.get("tags", {})
        if t.get("natural") == "wood" or t.get("landuse") == "forest":
            for r in rings_of(e):
                pts = [proj(p) for p in r]
                if len(pts) > 3 and in_view(pts) and area(pts) > 60:
                    layers["forest"].append(d_attr([r], eps=1.5))
        elif t.get("natural") == "water":
            for r in rings_of(e):
                pts = [proj(p) for p in r]
                if len(pts) > 3 and in_view(pts) and area(pts) > 8:
                    layers["water"].append(d_attr([r], eps=0.6))
        elif t.get("waterway") == "river":
            for ln in lines_of(e):
                if in_view([proj(p) for p in ln]):
                    layers["river"].append(d_attr([ln], closed=False))
        elif t.get("railway") == "rail":
            if t.get("service"):
                continue
            for ln in lines_of(e):
                if in_view([proj(p) for p in ln]):
                    layers["rail"].append(d_attr([ln], closed=False))
        elif t.get("highway") in ("motorway", "trunk", "primary", "secondary"):
            layer = "roads-major" if t["highway"] in ("motorway", "trunk") else "roads-minor"
            for ln in lines_of(e):
                if in_view([proj(p) for p in ln]):
                    layers[layer].append(d_attr([ln], closed=False))
        elif t.get("boundary") == "administrative" and e["id"] == 1320358:
            layers["outline"].append(d_attr(join_segments(lines_of(e)), eps=1.0))

    zones_json = []
    zone_paths = []
    label_texts = []
    for zid, (label, rs) in zone_rings.items():
        d = d_attr(rs, eps=0.5)
        main_ring = [proj(p) for p in rs[0]]
        cx, cy = centroid(main_ring)
        zone_paths.append(f'<path id="{zid}" class="zone" data-label="{label}" d="{d}"/>')
        label_texts.append(f'<text class="zone-label" data-for="{zid}" x="{cx:.1f}" y="{cy:.1f}">{label}</text>')
        zones_json.append({"id": zid, "label": label, "cx": round(cx, 1), "cy": round(cy, 1),
                           "area": round(area(main_ring))})

    def group(name, items, cls):
        body = "\n    ".join(f'<path d="{d}"/>' for d in items if d)
        return f'  <g id="{name}" class="{cls}">\n    {body}\n  </g>'

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {WIDTH} {height}" width="{WIDTH}" height="{height}">
  <!-- Зеленоград. © участники OpenStreetMap (ODbL). Сборка: tools/osm/build_map.py -->
  <style>
    .forest path {{ fill: #cfd8c4; stroke: none; }}
    .water path {{ fill: #b9ccd3; stroke: none; }}
    .river path {{ fill: none; stroke: #9fb8c1; stroke-width: 2; }}
    .outline path {{ fill: none; stroke: #8c877d; stroke-width: 1; stroke-dasharray: 4 3; }}
    .roads-minor path {{ fill: none; stroke: #bdb6a8; stroke-width: 1.2; }}
    .roads-major path {{ fill: none; stroke: #8c877d; stroke-width: 3; }}
    .rail path {{ fill: none; stroke: #1f1f1d; stroke-width: 2.2; stroke-dasharray: 8 4; }}
    .zone {{ fill: #f1ece2; fill-opacity: .55; stroke: #1f1f1d; stroke-width: 1.2; }}
    .zone-label {{ font: 600 14px "IBM Plex Mono", monospace; fill: #1f1f1d; text-anchor: middle; dominant-baseline: middle; }}
  </style>
  <rect id="paper" width="{WIDTH}" height="{height}" fill="#f1ece2"/>
{group("forest", layers["forest"], "forest")}
{group("water", layers["water"], "water")}
{group("river", layers["river"], "river")}
{group("outline", layers["outline"], "outline")}
{group("roads-minor", layers["roads-minor"], "roads-minor")}
{group("roads-major", layers["roads-major"], "roads-major")}
{group("rail", layers["rail"], "rail")}
  <g id="zones">
    {chr(10).join("    " + p for p in zone_paths).strip()}
  </g>
  <g id="labels">
    {chr(10).join("    " + t for t in label_texts).strip()}
  </g>
</svg>
'''
    OUT_SVG.parent.mkdir(parents=True, exist_ok=True)
    OUT_ZONES.parent.mkdir(parents=True, exist_ok=True)
    OUT_SVG.write_text(svg)
    OUT_ZONES.write_text(json.dumps({"viewBox": [0, 0, WIDTH, height],
                                     # x = (lon*kx - minx)*scale, y = (maxy - lat)*scale
                                     "projection": {"kx": kx, "minx": minx, "maxy": maxy, "scale": scale},
                                     "zones": zones_json},
                                    ensure_ascii=False, indent=2))
    print(f"svg {WIDTH}x{height}, {len(svg)//1024} KB, zones {len(zones_json)}, "
          + ", ".join(f"{k}={len(v)}" for k, v in layers.items()))


if __name__ == "__main__":
    main()
