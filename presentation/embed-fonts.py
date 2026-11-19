#!/usr/bin/env python3
"""Embed the presentation fonts in a copy of a PowerPoint file."""

import argparse
import struct
from pathlib import Path
from tempfile import NamedTemporaryFile
from xml.dom import Node, minidom
from zipfile import ZIP_DEFLATED, ZipFile


PRESENTATION_NS = "http://schemas.openxmlformats.org/presentationml/2006/main"
RELATIONSHIP_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PACKAGE_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
TYPES_NS = "http://schemas.openxmlformats.org/package/2006/content-types"
XMLNS_NS = "http://www.w3.org/2000/xmlns/"
FONT_CONTENT_TYPE = "application/x-fontdata"
PRESENTATION_PATH = "ppt/presentation.xml"
RELATIONSHIPS_PATH = "ppt/_rels/presentation.xml.rels"
TYPES_PATH = "[Content_Types].xml"
FONT_DIRECTORY = Path(__file__).resolve().parent / "fonts"
FONTS = {
    "Bebas Neue": {"regular": "BebasNeue-Regular.ttf"},
    "Montserrat": {"regular": "Montserrat-Regular.ttf", "bold": "Montserrat-Bold.ttf"},
    "JetBrains Mono": {"regular": "JetBrainsMono-Regular.ttf"},
}
EARLY_PRESENTATION_ELEMENTS = {
    "sldMasterIdLst", "notesMasterIdLst", "handoutMasterIdLst", "sldIdLst", "sldSz", "notesSz",
}


def ttf_tables(font):
    if not font.startswith(b"\x00\x01\x00\x00"):
        raise ValueError("Expected a static TrueType font")
    count, = struct.unpack_from(">H", font, 4)
    tables = {}
    for index in range(count):
        tag, _, offset, length = struct.unpack_from(">4sIII", font, 12 + 16 * index)
        if offset + length > len(font):
            raise ValueError(f"Corrupt TrueType table {tag!r}")
        tables[tag] = font[offset:offset + length]
    return tables


def english_names(table):
    _, count, storage_start = struct.unpack_from(">HHH", table)
    names = {}
    for index in range(count):
        platform, encoding, language, name_id, length, start = struct.unpack_from(
            ">6H", table, 6 + 12 * index
        )
        if platform == 3 and encoding in {1, 10} and language == 0x0409:
            offset = storage_start + start
            names[name_id] = table[offset:offset + length].decode("utf-16-be")
    return names


def as_eot(font, typeface):
    # Microsoft EOT v0x00020002, using the uncompressed representation also
    # written by LibreOffice. The entire original sfnt follows the header.
    tables = ttf_tables(font)
    os2, head = tables[b"OS/2"], tables[b"head"]
    weight, = struct.unpack_from(">H", os2, 4)
    embedding_flags, = struct.unpack_from(">H", os2, 8)
    selection, = struct.unpack_from(">H", os2, 62)
    checksum, = struct.unpack_from(">I", head, 8)
    if embedding_flags != 0:
        raise ValueError(f"Expected unrestricted full embedding rights for {typeface}")

    names = english_names(tables[b"name"])
    if names[1] != typeface:
        raise ValueError(f"Font family mismatch for {typeface}: {names[1]}")
    strings = b""
    for name_id in (1, 2, 5, 4):
        encoded = names[name_id].encode("utf-16-le") + b"\0\0"
        strings += struct.pack("<HH", 0, len(encoded)) + encoded

    # Empty root strings, signature, and EUDC data. The empty root string
    # checksum is the EOT constant 0x50475342.
    trailing_header = struct.pack("<HHIIHHII", 0, 0, 0x50475342, 1252, 0, 0, 0, 0)
    prefix = struct.pack(
        "<IIII10sBBIHH4I2II4I",
        80 + len(strings) + len(trailing_header) + len(font), len(font), 0x00020002, 0,
        os2[32:42], 0, selection & 1, weight, embedding_flags, 0x504C,
        *struct.unpack_from(">4I", os2, 42), *struct.unpack_from(">2I", os2, 78),
        checksum, 0, 0, 0, 0,
    )
    return prefix + strings + trailing_header + font


def add_element(parent, namespace, tag, **attributes):
    element = parent.ownerDocument.createElementNS(namespace, tag)
    for name, value in attributes.items():
        element.setAttribute(name, value)
    parent.appendChild(element)
    return element


def embedded_parts(source):
    presentation = minidom.parseString(source.read(PRESENTATION_PATH))
    relationships = minidom.parseString(source.read(RELATIONSHIPS_PATH))
    content_types = minidom.parseString(source.read(TYPES_PATH))
    presentation_root = presentation.documentElement
    rels_root = relationships.documentElement
    types_root = content_types.documentElement

    if presentation_root.getElementsByTagNameNS(PRESENTATION_NS, "embeddedFontLst"):
        raise ValueError("The candidate already has an embedded font list")
    presentation_root.setAttribute("embedTrueTypeFonts", "1")
    presentation_root.setAttribute("saveSubsetFonts", "0")

    prefix = f"{presentation_root.prefix}:" if presentation_root.prefix else ""
    entries = presentation.createElementNS(PRESENTATION_NS, f"{prefix}embeddedFontLst")
    entries.setAttributeNS(XMLNS_NS, "xmlns:embedRel", RELATIONSHIP_NS)
    next_element = next((
        node for node in presentation_root.childNodes
        if node.nodeType == Node.ELEMENT_NODE and node.localName not in EARLY_PRESENTATION_ELEMENTS
    ), None)
    presentation_root.insertBefore(entries, next_element)

    existing_ids = {node.getAttribute("Id") for node in rels_root.getElementsByTagNameNS(PACKAGE_NS, "Relationship")}
    existing_parts = set(source.namelist())
    parts = {}
    index = 0
    for family, variants in FONTS.items():
        entry = add_element(entries, PRESENTATION_NS, f"{prefix}embeddedFont")
        add_element(entry, PRESENTATION_NS, f"{prefix}font", typeface=family)
        for style, filename in variants.items():
            index += 1
            target = f"fonts/font{index}.fntdata"
            archive_path = f"ppt/{target}"
            rel_id = f"rIdRiskFont{index}"
            if archive_path in existing_parts or rel_id in existing_ids:
                raise ValueError(f"Font part collision: {archive_path} ({rel_id})")
            add_element(rels_root, PACKAGE_NS, "Relationship", Id=rel_id, Target=target,
                        Type=f"{RELATIONSHIP_NS}/font")
            add_element(types_root, TYPES_NS, "Override", PartName=f"/{archive_path}",
                        ContentType=FONT_CONTENT_TYPE)
            variant = add_element(entry, PRESENTATION_NS, f"{prefix}{style}")
            variant.setAttributeNS(RELATIONSHIP_NS, "embedRel:id", rel_id)
            parts[archive_path] = as_eot((FONT_DIRECTORY / filename).read_bytes(), family)

    for path, document in (
        (PRESENTATION_PATH, presentation), (RELATIONSHIPS_PATH, relationships), (TYPES_PATH, content_types)
    ):
        parts[path] = document.toxml(encoding="utf-8")
    return parts


def embed(candidate, output):
    if candidate.resolve() == output.resolve():
        raise ValueError("The input and output files must be different")
    with ZipFile(candidate) as source:
        additions = embedded_parts(source)
        with NamedTemporaryFile(dir=output.parent, suffix=".pptx", delete=False) as temporary:
            temporary_path = Path(temporary.name)
        try:
            with ZipFile(temporary_path, mode="w", compression=ZIP_DEFLATED) as target:
                for item in source.infolist():
                    data = additions.pop(item.filename, None)
                    target.writestr(item, source.read(item) if data is None else data)
                for path, data in additions.items():
                    target.writestr(path, data)
            with ZipFile(temporary_path) as result:
                malformed = result.testzip()
                if malformed is not None:
                    raise ValueError(f"Invalid embedded package member: {malformed}")
            temporary_path.replace(output)
        finally:
            temporary_path.unlink(missing_ok=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("candidate", type=Path)
    parser.add_argument("output", type=Path)
    arguments = parser.parse_args()
    embed(arguments.candidate, arguments.output)
