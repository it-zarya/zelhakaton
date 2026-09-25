"""OSM → public/city.json для 3D-изометрии (Three.js).

Координаты — те же, что у зон (src/data/zones.json → projection), чтобы туман и зоны совпадали.
Запуск: python3 tools/osm/build_city.py (после build_map.py). © участники OpenStreetMap, ODbL.
"""
import json
import math
import random
import re
from pathlib import Path

import build_map as bm

ROOT = bm.ROOT
OUT = ROOT / "public/city.json"
M_PER_LEVEL = 3.0
TREE_STEP = 5.5  # шаг сетки деревьев, в единицах карты
EXT_MARGIN = 450  # подложка шире карты зон на столько единиц (~3,5 км) — край макета не виден на широких экранах

# Ориентиры: OSM way id → ключ (для подсветки и маркеров)
LANDMARKS = {
    36861449: "fleyta",  # корп. 360
    36888825: "kc",  # КЦ «Зеленоград»
    37007933: "dvorets",  # Дворец творчества
    175918635: "elektron",
}


def main():
    zones_file = json.loads(bm.OUT_ZONES.read_text())
    pr = zones_file["projection"]
    W, H = zones_file["viewBox"][2], zones_file["viewBox"][3]
    kx, minx, maxy, scale = pr["kx"], pr["minx"], pr["maxy"], pr["scale"]
    units_per_m = scale / 111_320  # 1° широты ≈ 111,32 км

    def proj(p):
        lat, lon = p
        return ((lon * kx - minx) * scale, (maxy - lat) * scale)

    ext = (-EXT_MARGIN, -EXT_MARGIN, W + EXT_MARGIN, H + EXT_MARGIN)

    def inside(x, y):
        return ext[0] <= x <= ext[2] and ext[1] <= y <= ext[3]

    raw = json.loads((ROOT / "tools/osm/raw.json").read_text())
    els = {(e["type"], e["id"]): e for e in raw["elements"]}

    # Зоны: полигоны в координатах карты
    zone_polys = []
    for key, (zid, _) in bm.ZONES.items():
        rings = [[proj(p) for p in r] for r in bm.rings_of(els[key]) if len(r) > 3]
        zone_polys.append((zid, rings))
    for zid, _, rs in bm.custom_rings():
        zone_polys.append((zid, [[proj(p) for p in r] for r in rs]))

    def zone_of(x, y):
        for i, (_, rings) in enumerate(zone_polys):
            if any(pip(x, y, r) for r in rings):
                return i
        return -1

    # Здания
    bdata = json.loads((ROOT / "tools/osm/buildings.json").read_text())
    buildings = []
    for e in bdata["elements"]:
        t = e.get("tags", {})
        rings = bm.rings_of(e)
        if not rings or len(rings[0]) < 4:
            continue
        pts = bm.dp([proj(p) for p in rings[0]], 0.12)
        if len(pts) < 4:
            continue
        if pts[0] == pts[-1]:
            pts = pts[:-1]
        cx, cy = bm.centroid(pts)
        if not inside(cx, cy):
            continue
        area_m2 = bm.area(pts) / units_per_m**2
        if area_m2 < 25:
            continue
        levels = height_levels(t, area_m2)
        h = levels * M_PER_LEVEL * units_per_m
        b = {
            "z": zone_of(cx, cy),
            "h": round(h, 2),
            "p": [round(v, 1) for xy in pts for v in xy],
        }
        # тип для материала (design/city-materials.json): i промзона, p частный, b кирпичные башни, t 9+ эт., o прочее; нет k — панельки 4–8 эт.
        kind = t.get("building")
        zi = b["z"]
        if kind in ("industrial", "warehouse", "garages", "garage", "service", "roof", "shed"):
            b["k"] = "i"
        elif kind in ("house", "detached", "semidetached_house", "cabin", "bungalow", "hut"):
            b["k"] = "p"
        elif zi >= 0 and zone_polys[zi][0] == "mkr-05" and levels >= 12:
            b["k"] = "b"  # башни Вулыха
        elif levels >= 9:
            b["k"] = "t"
        elif levels < 4:
            b["k"] = "o"
        if e["id"] in LANDMARKS:
            b["l"] = LANDMARKS[e["id"]]
        buildings.append(b)

    # Лес, вода, дороги, ж/д — из расширенной выгрузки (context.json), если есть
    ctx_path = ROOT / "tools/osm/context.json"
    ctx = json.loads(ctx_path.read_text())["elements"] if ctx_path.exists() else raw["elements"]
    random.seed(7)
    trees, water, roads, rail = [], [], [], []
    forest_rings = []
    for e in ctx:
        t = e.get("tags", {})
        if t.get("natural") == "wood" or t.get("landuse") == "forest":
            for r in bm.rings_of(e):
                pts = [proj(p) for p in r]
                if len(pts) > 3 and any(inside(x, y) for x, y in pts):
                    forest_rings.append(pts)
        elif t.get("natural") == "water":
            for r in bm.rings_of(e):
                pts = bm.dp([proj(p) for p in r], 0.5)
                if len(pts) > 3 and any(inside(x, y) for x, y in pts) and bm.area(pts) > 4:
                    water.append([round(v, 1) for xy in pts for v in xy])
        elif t.get("railway") == "rail" and not t.get("service"):
            for ln in bm.lines_of(e):
                pts = bm.dp([proj(p) for p in ln], 0.4)
                if any(inside(x, y) for x, y in pts):
                    rail.append([round(v, 1) for xy in pts for v in xy])
        elif t.get("highway") in ("motorway", "trunk", "primary", "secondary", "tertiary"):
            w = {"motorway": 3.2, "trunk": 2.6, "primary": 1.8, "secondary": 1.3, "tertiary": 1.0}[t["highway"]]
            for ln in bm.lines_of(e):
                pts = bm.dp([proj(p) for p in ln], 0.4)
                if any(inside(x, y) for x, y in pts):
                    roads.append({"w": w, "p": [round(v, 1) for xy in pts for v in xy]})

    out = {
        "viewBox": [0, 0, W, H],
        "extent": list(ext),
        "unitsPerMeter": units_per_m,
        "zones": [{"id": zid, "rings": [[round(v, 1) for xy in r for v in xy] for r in rings]} for zid, rings in zone_polys],
        "buildings": buildings,
        "forest": [[round(v, 1) for xy in bm.dp(r, 1.2) for v in xy] for r in forest_rings if bm.area(r) > 40],
        "water": water,
        "roads": roads,
        "rail": rail,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
    inz = sum(1 for b in buildings if b["z"] >= 0)
    print(f"city.json {OUT.stat().st_size // 1024} KB: buildings {len(buildings)} (в зонах {inz}), "
          f"forest {len(forest_rings)}, water {len(water)}, roads {len(roads)}, rail {len(rail)}, "
          f"1 м = {units_per_m:.4f} ед.")


def height_levels(t, area_m2):
    lv = t.get("building:levels")
    if lv:
        m = re.match(r"\d+", lv)
        if m:
            return max(1, min(int(m.group()), 30))
    if t.get("height"):
        m = re.match(r"[\d.]+", t["height"])
        if m:
            return max(1, round(float(m.group()) / M_PER_LEVEL))
    kind = t.get("building")
    if kind in ("house", "detached", "semidetached_house", "cabin", "bungalow"):
        return 2
    if kind in ("garage", "garages", "shed", "roof", "service", "hut"):
        return 1
    if kind == "apartments":
        return 9
    if kind in ("school", "kindergarten", "hospital", "commercial", "retail", "industrial", "warehouse"):
        return 3
    if area_m2 < 150:
        return 1
    if area_m2 < 600:
        return 2
    return 5


def pip(x, y, ring):
    inside = False
    n = len(ring)
    j = n - 1
    for i in range(n):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-12) + xi:
            inside = not inside
        j = i
    return inside


if __name__ == "__main__":
    main()
