"""Plot the individual AED positions supplied by the frozen public GeoJSON."""
import json
from math import cos, radians
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

root = Path(__file__).resolve().parents[1]
features = json.loads((root / "web/public/data/aed-polska.geojson").read_text())["features"]
coordinates = [f["geometry"]["coordinates"] for f in features]
longitude, latitude = zip(*coordinates)
fig, ax = plt.subplots(figsize=(6.7, 5.55), dpi=170, facecolor="#F5F5F7")
fig.subplots_adjust(left=.02, right=.98, top=.985, bottom=.015)
ax.set_facecolor("#F5F5F7")
ax.scatter(longitude, latitude, s=2.2, c="#335966", alpha=.83, linewidths=0)
ax.set_aspect(1 / cos(radians(52)))
ax.set_xlim(13.86, 24.27)
ax.set_ylim(48.93, 55.07)
ax.axis("off")
fig.savefig(root / "presentation/assets/lokalizacje-polska.png", facecolor=fig.get_facecolor())
