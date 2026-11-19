"""Render a small original basemap from an OpenStreetMap API 0.6 map extract."""
from collections import defaultdict
from html import escape
import json
import math
from pathlib import Path
import sys

WEST, SOUTH, EAST, NORTH = 21.0055, 52.2275, 21.022, 52.236
WIDTH = 1900
merc = lambda lat: math.degrees(math.asinh(math.tan(math.radians(lat))))
scale = WIDTH / (EAST - WEST)
height = (merc(NORTH) - merc(SOUTH)) * scale
colors = {"park": "#cbe4c4", "grass": "#d3e7ca", "garden": "#cce3cd", "square": "#e9e6d7"}
sizes = {"primary": 23, "secondary": 17, "tertiary": 15, "residential": 13, "living_street": 12,
         "unclassified": 11, "pedestrian": 14, "service": 7, "footway": 3.5, "path": 3,
         "steps": 3, "cycleway": 3.6, "trunk": 23, "primary_link": 10, "secondary_link": 9}
raw = json.loads(Path(sys.argv[1]).read_text())["elements"]
nodes = {e["id"]: ((e["lon"]-WEST)*scale, (merc(NORTH)-merc(e["lat"]))*scale) for e in raw if e["type"] == "node"}
layers = defaultdict(list)
labels = defaultdict(list)
for way in raw:
    if way["type"] != "way":
        continue
    tags = way.get("tags", {})
    if tags.get("indoor") or tags.get("tunnel") in ("yes", "building_passage") or tags.get("location") == "underground":
        continue
    pts = [nodes[n] for n in way["nodes"] if n in nodes]
    if len(pts) < 2:
        continue
    closed = way["nodes"][0] == way["nodes"][-1]
    coords = " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
    el = lambda shape, style: f'<{shape} points="{coords}" {style}/>'
    green = tags.get("leisure") or tags.get("landuse") or tags.get("place")
    if closed and green in colors:
        layers[0].append(el("polygon", f'fill="{colors[green]}"'))
    if tags.get("building") and closed:
        layers[1].append(el("polygon", 'fill="#deded6" stroke="#cdcec5" stroke-width="1.2"'))
    street = tags.get("highway")
    if street not in sizes or int(tags.get("layer", "0")) < 0:
        continue
    w = sizes[street]
    if tags.get("area") == "yes":
        layers[2].append(el("polygon", 'fill="#f7f6ed"'))
    else:
        fill = "#fffef9" if w < 16 else "#fdf9de"
        layers[2 if w < 7 else 4].append(el("polyline", f'fill="none" stroke="#d0d0c7" stroke-width="{w+2}"'))
        layers[3 if w < 7 else 5].append(el("polyline", f'fill="none" stroke="{fill}" stroke-width="{w}"'))
    name = tags.get("name", "")
    if not name or w < 10:
        continue
    for i in range(len(pts)-1):
        a,b=pts[i:i+2]
        x,y=(a[0]+b[0])/2,(a[1]+b[1])/2
        if 0<x<WIDTH and 0<y<height:
            length=math.dist(a,b)
            angle=(math.degrees(math.atan2(b[1]-a[1],b[0]-a[0]))+90)%180-90
            score=length + (40 if abs(angle)<55 else 0)
            labels[name].append((score,x,y,angle))
used=[]
for name, candidates in sorted(labels.items(), key=lambda pair: max(pair[1])[0], reverse=True):
    for _,x,y,ang in sorted(candidates,reverse=True):
        if all(math.hypot(x-xx,y-yy)>99 for xx,yy in used):
            layers[6].append(f'<text transform="translate({x:.1f} {y:.1f}) rotate({ang:.1f})">{escape(name)}</text>')
            used.append((x,y))
            break
svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{height:.1f}" viewBox="0 0 {WIDTH} {height:.1f}">',
       '<title>Warszawa, Śródmieście. Kartografia na podstawie danych © OpenStreetMap contributors, ODbL 1.0.</title>',
       '<style>polyline{stroke-linecap:round;stroke-linejoin:round}text{font:500 20px Arial,sans-serif;fill:#626a61;paint-order:stroke;stroke:#f7f6ef;stroke-width:3px;text-anchor:middle;dominant-baseline:central}</style>',
       '<rect width="100%" height="100%" fill="#efeee5"/>']
for key in sorted(layers):
    svg.extend(layers[key])
svg.append("</svg>")
(Path(__file__).resolve().parents[2]/"public"/"map-assets"/"srodmiescie.svg").write_text("\n".join(svg))
