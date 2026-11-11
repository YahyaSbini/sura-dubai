#!/usr/bin/env python3
"""Build public/data/szr.json: real Sheikh Zayed Road buildings from OpenStreetMap.

Usage: python3 scripts/build_city_data.py <osm_ways.json> <osm_relations.json>

Inputs are Overpass API responses for bbox (25.193,55.252,25.234,55.294):
  ways:      (way[building]; way["building:part"]; way[highway~"motorway|trunk|primary"];
              way[railway=subway];) out tags geom;
  relations: (relation[building]; relation["building:part"];) out geom;

Output coordinates are metres in scene space: the road runs along Z (south-west is -Z),
+X is the right-hand side when travelling south-west, heights are metres.
"""
import json
import math
import sys

from shapely.geometry import LineString, Polygon
from shapely.strtree import STRtree

LAT0, LON0 = 25.2135, 55.2775
NEAR = 430        # keep every building this close to the road axis
FAR = 1250        # beyond NEAR keep only towers (skyline backdrop)
FAR_MIN_H = 70
HEX_R = 75        # sky cell circumradius
LEVEL_H = 3.6
DEFAULT_H = 9
LANDMARKS = {
    "Burj Khalifa", "Emirates Office Tower", "Jumeirah Emirates Towers Hotel", "Gevora Hotel",
    "Index Tower", "Al Yaqoub Tower", "Rose Rayhaan by Rotana", "The A-Tower",
    "Museum of the Future", "Sheikh Rashid Tower", "One Za'abeel Tower 2", "Al Wasl Tower",
    "Millennium Tower", "ICD Brookfield Place", "21st Century Tower",
}


def enu(lat, lon):
    return ((lon - LON0) * math.cos(math.radians(LAT0)) * 111320.0, (lat - LAT0) * 110574.0)


def num(v):
    if v is None:
        return None
    try:
        return float(str(v).replace("m", "").replace(",", ".").split()[0])
    except (ValueError, IndexError):
        return None


def main(ways_path, rel_path):
    els = json.load(open(ways_path))["elements"]
    rels = json.load(open(rel_path))["elements"]

    # Road axis from the E11 motorway carriageways.
    szr = [e for e in els if e["type"] == "way" and e.get("tags", {}).get("ref") == "E11"
           and e["tags"].get("highway") == "motorway"]
    pts = [enu(g["lat"], g["lon"]) for e in szr for g in e["geometry"]]
    mx = sum(p[0] for p in pts) / len(pts)
    my = sum(p[1] for p in pts) / len(pts)
    sxx = sum((p[0] - mx) ** 2 for p in pts)
    syy = sum((p[1] - my) ** 2 for p in pts)
    sxy = sum((p[0] - mx) * (p[1] - my) for p in pts)
    ang = 0.5 * math.atan2(2 * sxy, sxx - syy)
    de, dn = math.cos(ang), math.sin(ang)
    if de + dn > 0:  # point the axis south-west
        de, dn = -de, -dn

    def raw(lat, lon):
        e, n = enu(lat, lon)
        e -= mx
        n -= my
        return (e * dn - n * de, -(e * de + n * dn))

    zs = [raw(g["lat"], g["lon"])[1] for e in szr for g in e["geometry"]]
    zmid = (min(zs) + max(zs)) / 2
    zhalf = (max(zs) - min(zs)) / 2 - 150

    def scene(lat, lon):
        x, z = raw(lat, lon)
        return (x, z - zmid)

    def ring(geom, min_area=12):
        r = [scene(g["lat"], g["lon"]) for g in geom]
        if len(r) < 4 or r[0] != r[-1]:
            return None
        p = Polygon(r)
        if not p.is_valid:
            p = p.buffer(0)
        if p.is_empty or p.geom_type != "Polygon" or p.area < min_area:
            return None
        return p

    def heights(t):
        h = num(t.get("height")) or num(t.get("building:height"))
        if h is None:
            lv = num(t.get("building:levels"))
            h = lv * LEVEL_H if lv else None
        mh = num(t.get("min_height"))
        if mh is None:
            ml = num(t.get("building:min_level"))
            mh = ml * LEVEL_H if ml else 0
        return h, mh

    outlines, parts = [], []
    for e in els:
        t = e.get("tags", {})
        if e["type"] != "way" or "geometry" not in e:
            continue
        is_part = t.get("building:part", "no") != "no"
        if not is_part and "building" not in t:
            continue
        p = ring(e["geometry"], 0.2 if is_part else 12)
        if p is None:
            continue
        (parts if is_part else outlines).append((p, t))
    for e in rels:
        t = e.get("tags", {})
        is_part = t.get("building:part", "no") != "no"
        for m in e.get("members", []):
            if m["type"] == "way" and m.get("role") in ("outer", "outline", "") and "geometry" in m:
                p = ring(m["geometry"])
                if p is not None:
                    (parts if is_part else outlines).append((p, t))

    part_pts = [p.representative_point() for p, _ in parts]
    tree = STRtree(part_pts)
    buildings = []
    labels = []
    for p, t in outlines:
        idx = [i for i in tree.query(p) if p.contains(part_pts[i])]
        h, mh = heights(t)
        name = t.get("name:en") or t.get("name")
        if idx:
            top = max([heights(parts[i][1])[0] or 0 for i in idx] + [h or 0])
        else:
            top = h if h is not None else DEFAULT_H
            buildings.append((p, top, mh))
        if name in LANDMARKS:
            c = p.centroid
            labels.append([name, round(c.x), round(c.y), round(top)])
    for p, t in parts:
        h, mh = heights(t)
        if h is None or h <= mh:
            continue
        buildings.append((p, h, mh))

    out = []
    kept = []
    for p, h, mh in buildings:
        c = p.centroid
        ax = abs(c.x)
        if abs(c.y) > zhalf or ax > FAR or (ax > NEAR and h < FAR_MIN_H):
            continue
        s = p.simplify(0.7)
        if s.is_empty or s.geom_type != "Polygon":
            s = p
        coords = list(s.exterior.coords)[:-1]
        flat = [round(v, 1) for xy in coords for v in xy]
        out.append([round(h, 1), round(mh, 1)] + flat)
        kept.append((s, h))

    # Hexagonal sky cells: per cell, the height of the tallest building inside it.
    polys = [k[0] for k in kept]
    ptree = STRtree(polys)
    cells = []
    dx = HEX_R * math.sqrt(3)
    dz = HEX_R * 1.5
    rows = int(zhalf // dz)
    cols = int(NEAR * 1.5 // dx)
    for r in range(-rows, rows + 1):
        for q in range(-cols, cols + 1):
            cx = q * dx + (dx / 2 if r % 2 else 0)
            cz = r * dz
            hexp = Polygon([(cx + HEX_R * math.sin(math.radians(60 * k)),
                             cz + HEX_R * math.cos(math.radians(60 * k))) for k in range(6)])
            top = 0
            for i in ptree.query(hexp):
                if polys[i].intersects(hexp):
                    top = max(top, kept[i][1])
            cells.append([round(cx, 1), round(cz, 1), round(top)])

    roads = []
    for e in els:
        t = e.get("tags", {})
        if e["type"] != "way" or "geometry" not in e:
            continue
        kind = None
        if t.get("railway") == "subway":
            kind = 2
        elif t.get("highway") == "motorway":
            kind = 0
        elif t.get("highway") in ("primary", "trunk"):
            kind = 1
        if kind is None:
            continue
        line = LineString([scene(g["lat"], g["lon"]) for g in e["geometry"]])
        clip = line.intersection(Polygon([(-FAR, -zhalf), (FAR, -zhalf), (FAR, zhalf), (-FAR, zhalf)]))
        for g in getattr(clip, "geoms", [clip]):
            if g.geom_type == "LineString" and g.length > 20:
                s = g.simplify(1.5)
                roads.append([kind] + [round(v, 1) for xy in s.coords for v in xy])

    # Road centreline: mean X of the motorway carriageways every 100 m along Z.
    motorways = [LineString([scene(g["lat"], g["lon"]) for g in e["geometry"]]) for e in szr]
    axis = []
    z = -math.floor(zhalf / 100) * 100
    while z <= zhalf:
        cut = LineString([(-FAR, z), (FAR, z)])
        xs = []
        for m in motorways:
            hit = m.intersection(cut)
            for g in getattr(hit, "geoms", [hit]):
                if g.geom_type == "Point":
                    xs.append(g.x)
        if xs:
            axis.append([z, round(sum(xs) / len(xs), 1), round(max(xs) - min(xs), 1)])
        z += 100

    labels = [l for l in labels if abs(l[1]) <= FAR and abs(l[2]) <= zhalf]
    labels.sort(key=lambda l: -l[3])
    seen, uniq = set(), []
    for l in labels:
        if l[0] not in seen:
            seen.add(l[0])
            uniq.append(l)

    data = {
        "source": "© OpenStreetMap contributors (ODbL)",
        "halfLength": round(zhalf),
        "hexRadius": HEX_R,
        "hexCols": cols,
        "hexRows": rows,
        "buildings": out,
        "cells": cells,
        "roads": roads,
        "axis": axis,
        "labels": uniq[:24],
    }
    with open("public/data/szr.json", "w") as f:
        json.dump(data, f, separators=(",", ":"))
    print(f"axis bearing vector east={de:.3f} north={dn:.3f}, half length {zhalf:.0f} m")
    print(f"buildings {len(out)}  cells {len(cells)}  roads {len(roads)}  labels {len(uniq[:24])}")
    for l in uniq[:24]:
        print("  ", l)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
