"""Emit dane.gov.pl harvester 1.13 metadata and matching MD5 sidecar."""
from hashlib import md5
from xml.etree import ElementTree as ET

NAMESPACE = "urn:otwarte-dane:harvester:1.13"
SCHEMA = "https://dane.gov.pl/static/xml/xml_import_otwarte_dane_1_13.xsd"
PUBLIC = "https://pawelkonior.github.io/misja-aed/data/"


def write_feed(folder, meta):
    ET.register_namespace("od", NAMESPACE)
    xsi = "http://www.w3.org/2001/XMLSchema-instance"
    ET.register_namespace("xsi", xsi)
    root = ET.Element(f"{{{NAMESPACE}}}datasets", {f"{{{xsi}}}schemaLocation": f"{NAMESPACE} {SCHEMA}"})
    dataset = ET.SubElement(root, "dataset")
    def field(parent, key, value):
        ET.SubElement(parent, key).text = value
    def polish(parent, key, value):
        field(ET.SubElement(parent, key), "polish", value)

    field(dataset, "extIdent", "misja-aed-polska")
    polish(dataset, "title", meta["title"])
    polish(dataset, "description", meta["description"] + " " + meta["transformations"])
    field(dataset, "url", PUBLIC+"catalog.json")
    field(dataset, "updateFrequency", "irregular")
    field(ET.SubElement(dataset, "categories"), "category", "HEAL")
    conditions = ET.SubElement(dataset, "conditions")
    field(conditions, "source", "true")
    field(conditions, "modification", "true")
    field(conditions, "dbOrCopyrighted", meta["attribution"] + " " + meta["license"])
    resources = ET.SubElement(dataset, "resources")
    for entry in meta["resources"]:
        resource = ET.SubElement(resources, "resource")
        fmt = entry["format"]
        field(resource, "extIdent", "misja-aed-pl-"+fmt.lower())
        field(resource, "url", PUBLIC+entry["path"])
        polish(resource, "title", "Lokalizacje AED w Polsce (" + fmt + ")")
        polish(resource, "description", f"{meta['records']} rekordów. Współrzędne WGS84, opis lokalizacji, warunki dostępu i źródło. Stan eksportu na {meta['imported']}.")
        field(resource, "availability", "remote")
        field(resource, "dataDate", meta["imported"])
    tags = ET.SubElement(dataset, "tags")
    for tag in ("AED", "defibrylator", "pierwsza pomoc", "Polska"):
        ET.SubElement(tags, "tag", {"lang":"pl"}).text=tag
    ET.indent(root, space="  ")
    data = ET.tostring(root, encoding="utf-8", xml_declaration=True) + b"\n"
    (folder/"harvester.xml").write_bytes(data)
    (folder/"harvester.md5").write_text(md5(data, usedforsecurity=False).hexdigest()+"\n")
