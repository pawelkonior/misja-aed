"""Build the common catalogue from two independently published GeoJSON feeds."""
import argparse
import csv
import datetime
import json
import math
import os
import subprocess
from pathlib import Path
import tempfile

from harvester import write_feed

OSM = "https://openaedmap.org/api/v1/countries/PL.geojson"
CITY = "https://dane.przemysl.eu/wp-json/sod/v1/resources/15/data?format=geojson"
CITY_PAGE = "https://dane.przemysl.eu/zasoby-danych/defibrylatory-aed-na-terenie-miasta-przemysla/"
OSM_LICENSE = "https://opendatacommons.org/licenses/odbl/1-0/"
CITY_LICENSE = "https://creativecommons.org/licenses/by/4.0/"
OUT = Path(__file__).resolve().parents[2] / "public" / "data"
# Reviewed matches by venue/address and source identity. Never collapse nearby
# devices or different floors just because the coordinates are close.
REVIEWED_PAIRS = {
    744: 4024070186, 747: 9425151918, 748: 9425258320, 749: 9425171719,
    753: 9425202018, 755: 9425198517, 756: 9425578618, 758: 9425607018,
    759: 9425609718, 760: 9425578619, 762: 9425116520, 763: 9425607017,
    764: 9425785617, 765: 9425616918,
}


def read_json(path, url):
    if path:
        return json.loads(path.read_text())
    response = subprocess.run(
        ["curl", "--fail", "--silent", "--show-error", "--location", "--proto", "=https",
         "--retry", "2", "--max-time", "60", "--user-agent", "MisjaAED-Dataset/1.0", url],
        check=True, capture_output=True,
    )
    return json.loads(response.stdout)


def points(collection):
    if collection.get("type") != "FeatureCollection" or not collection["features"]:
        raise ValueError("Empty or malformed source")
    for f in collection["features"]:
        lon, lat = f["geometry"]["coordinates"]
        if f["geometry"]["type"] != "Point" or not (14 <= lon <= 25 and 48 <= lat <= 56):
            raise ValueError("Unexpected coordinates")
        yield f, lon, lat


def compact(data):
    return {k: v for k, v in data.items() if v not in ("", None)}


def create_catalogue(osm, city):
    records = {}
    merged = 0
    for f, lon, lat in points(osm):
        p = f["properties"]
        oid = f"{p['@osm_type']}/{p['@osm_id']}"
        addr = " ".join(v for v in (p.get("addr:street"), p.get("addr:housenumber")) if v)
        props = compact({
            "source": "osm", "name": p.get("name") or p.get("operator"),
            "description": p.get("defibrillator:location") or p.get("defibrillator:location:pl") or p.get("description"),
            "address": addr, "city": p.get("addr:city"), "access": p.get("access"), "access_note": p.get("note:access"),
            "hours": p.get("opening_hours"), "indoor": p.get("indoor"), "level": p.get("level"), "photo": p.get("image"),
            "photo_license": p.get("image:license"), "verified": p.get("check_date"),
            "upstream_source": p.get("source"), "upstream_note": p.get("note"),
            "source_url": "https://www.openstreetmap.org/" + oid,
        })
        if oid in records:
            raise ValueError(f"Duplicate OSM identity {oid}")
        records[oid] = {"type": "Feature", "id": oid, "geometry": f["geometry"], "properties": props}

    seen = set()
    for f, lon, lat in points(city):
        p = f["properties"]
        cid = int(p["id"])
        if cid in seen:
            raise ValueError(f"Duplicate municipal identity {cid}")
        seen.add(cid)
        oid = f"node/{REVIEWED_PAIRS.get(cid)}"
        match = records.get(oid)
        if match:
            x, y = match["geometry"]["coordinates"]
            # A moved point invalidates a previous manual match.
            if math.hypot((x-lon)*111200*math.cos(math.radians(lat)), (y-lat)*111200) > 65:
                match = None
        if match:
            props = match["properties"]
            props["source"] = "osm+przemysl"
            merged += 1
        else:
            oid = f"przemysl/{cid}"
            props = {"source": "przemysl", "source_url": CITY_PAGE}
            records[oid] = {"type": "Feature", "id": oid, "geometry": f["geometry"], "properties": props}
        props.update(compact({
            "municipal_id": cid, "municipal_name": p["name"], "municipal_source": CITY_PAGE,
            "address": " ".join(str(v) for v in (p.get("street"), p.get("home_number")) if v), "city": "Przemyśl",
        }))
        props.setdefault("name", p["name"])
    return list(records.values()), merged


def write_exports(records, merged, n_osm, n_city, imported):
    meta = {
        "title": "Misja AED – lokalizacje defibrylatorów w Polsce",
        "description": "Zbiór demonstracyjny. Współrzędne WGS84 (EPSG:4326). Godziny i zasady dostępu podano, gdy określił je wydawca. Data pobrania nie jest datą kontroli urządzeń.",
        "imported": imported, "records": len(records), "matched": merged,
        "sources": [
            {"id": "osm", "publisher": "© OpenStreetMap contributors, OpenAEDMap", "url": OSM, "license": OSM_LICENSE, "records": n_osm},
            {"id": "przemysl", "publisher": "Straż Miejska w Przemyślu, Otwarte Dane Przemyśl", "url": CITY_PAGE, "license": CITY_LICENSE, "records": n_city},
        ],
        "transformations": "Normalizacja do punktów WGS84 i wspólnych pól, wybór pól oryginalnych, scalenie ręcznie zestawionych identyfikatorów. Geometria scalonego punktu pochodzi z OSM. Pozostawiono odrębne rekordy w przypadku wątpliwości.",
        "license": OSM_LICENSE,
        "attribution": "© OpenStreetMap contributors (ODbL 1.0), Straż Miejska w Przemyślu (CC BY 4.0). Nazwy dostawców i odnośniki zachowano w katalogu. Zdjęcia podlegają warunkom poszczególnych autorów.",
        "resources": [{"format": "GeoJSON", "path": "aed-polska.geojson"}, {"format": "CSV", "path": "aed-polska.csv"}],
    }
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=OUT) as staging:
        folder = Path(staging)
        (folder/"catalog.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n")
        with (folder/"aed-polska.geojson").open("w") as fh:
            fh.write('{"type":"FeatureCollection","features":[\n')
            for i, f in enumerate(records):
                if i:
                    fh.write(",\n")
                fh.write(json.dumps(f, ensure_ascii=False, separators=(",", ":")))
            fh.write("]}\n")
        with (folder/"aed-polska.csv").open("w", newline="") as fh:
            fields = sorted({key for r in records for key in r["properties"]})
            writer = csv.DictWriter(fh, fieldnames=["id", "latitude", "longitude", *fields])
            writer.writeheader()
            for f in records:
                lon, lat = f["geometry"]["coordinates"]
                writer.writerow({"id": f["id"], "latitude": lat, "longitude": lon, **f["properties"]})
        write_feed(folder, meta)
        for file in ("aed-polska.csv", "aed-polska.geojson", "catalog.json", "harvester.xml", "harvester.md5"):
            os.replace(folder/file, OUT/file)
    return meta


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--osm-file", type=Path)
    ap.add_argument("--city-file", type=Path)
    ap.add_argument("--imported", default=datetime.datetime.now(datetime.timezone.utc).date().isoformat())
    args = ap.parse_args()
    osm = read_json(args.osm_file, OSM)
    if args.city_file:
        city = read_json(args.city_file, CITY)
    else:
        # Feed supports paging. A publisher can add more devices at any time.
        batch = 100
        city = {"type": "FeatureCollection", "features": []}
        while True:
            page = read_json(None, f"{CITY}&limit={batch}&offset={len(city['features'])}")
            city["features"].extend(page["features"])
            if len(page["features"]) < batch:
                break
    rows, num_merged = create_catalogue(osm, city)
    print(write_exports(rows, num_merged, len(osm["features"]), len(city["features"]), args.imported)["records"])
