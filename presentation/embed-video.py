#!/usr/bin/env python3
"""Attach native, on-click playback to a poster in a PPTX copy.

See Microsoft's Open XML SDK guide for the paired media/video relationships,
the PowerPoint 2010 media extension, and the video node targeting a picture:
https://learn.microsoft.com/en-us/office/open-xml/presentation/how-to-add-a-video-to-a-slide-in-a-presentation
"""

import argparse
from copy import deepcopy
import posixpath
from pathlib import Path
from tempfile import NamedTemporaryFile
from uuid import uuid4
from zipfile import ZIP_DEFLATED, ZipFile

from lxml import etree


P = "http://schemas.openxmlformats.org/presentationml/2006/main"
A = "http://schemas.openxmlformats.org/drawingml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
REL = "http://schemas.openxmlformats.org/package/2006/relationships"
TYPES = "http://schemas.openxmlformats.org/package/2006/content-types"
P14 = "http://schemas.microsoft.com/office/powerpoint/2010/main"
A16 = "http://schemas.microsoft.com/office/drawing/2014/main"
MEDIA_RELATION = "http://schemas.microsoft.com/office/2007/relationships/media"
MEDIA_EXTENSION = "{DAA4B4D4-6D71-4841-9C94-3DE7FCFB9230}"
MEDIA_PART = "ppt/media/misja-aed-demo.mp4"
PRESENTATION = "ppt/presentation.xml"
CONTENT_TYPES = "[Content_Types].xml"


def tag(namespace, name):
    return f"{{{namespace}}}{name}"


def rels_path(part):
    directory, filename = posixpath.split(part)
    return posixpath.join(directory, "_rels", f"{filename}.rels")


def resolve_target(part, target):
    if target.startswith("/"):
        return target.lstrip("/")
    return posixpath.normpath(posixpath.join(posixpath.dirname(part), target))


def parse(archive, part):
    return etree.fromstring(archive.read(part), parser=etree.XMLParser(resolve_entities=False, no_network=True))


def xml(root):
    return etree.tostring(root, encoding="UTF-8", xml_declaration=True, standalone=True)


def relations(root):
    return {node.get("Id"): node for node in root.findall(tag(REL, "Relationship"))}


def find_slide(archive, number):
    root = parse(archive, PRESENTATION)
    slides = root.findall(f"{tag(P, 'sldIdLst')}/{tag(P, 'sldId')}")
    if not 1 <= number <= len(slides):
        raise ValueError(f"Slide {number} is outside this deck's {len(slides)} slides")
    slide_id = slides[number - 1].get(tag(R, "id"))
    relationship = relations(parse(archive, rels_path(PRESENTATION)))[slide_id]
    return resolve_target(PRESENTATION, relationship.attrib["Target"])


def find_poster(archive, slide, slide_part, slide_rels, label, poster):
    candidates = []
    matches = []
    for picture in slide.iter(tag(P, "pic")):
        props = picture.find(f"{tag(P, 'nvPicPr')}/{tag(P, 'cNvPr')}")
        blip = picture.find(f"{tag(P, 'blipFill')}/{tag(A, 'blip')}")
        if props is None or blip is None:
            continue
        reference = slide_rels.get(blip.get(tag(R, "embed")))
        if reference is None or reference.get("TargetMode") == "External":
            continue
        candidates.append(picture)
        if poster is not None:
            part = resolve_target(slide_part, reference.attrib["Target"])
            matches_name = archive.read(part) == poster
        else:
            matches_name = label in (props.get("name"), props.get("descr"), props.get("title"))
        if matches_name:
            matches.append(picture)
    if not matches and poster is None and len(candidates) == 1:
        return candidates[0]
    if len(matches) != 1:
        raise ValueError(f"Expected one matching poster; got {len(matches)} matches among {len(candidates)} pictures. Check --poster or --label.")
    return matches[0]


def add_relation(root, relation_id, relation_type, target):
    if relation_id in relations(root):
        raise ValueError(f"Slide already has {relation_id}")
    etree.SubElement(root, tag(REL, "Relationship"), Id=relation_id, Type=relation_type, Target=target)


def playback_picture(slide, poster):
    """Keep the original image below the movie for static/PDF renderers."""
    movie = deepcopy(poster)
    props = movie.find(f"{tag(P, 'nvPicPr')}/{tag(P, 'cNvPr')}")
    shape_id = 1 + max(int(node.attrib["id"]) for node in slide.iter(tag(P, "cNvPr")))
    props.set("id", str(shape_id))
    for node in props.iter(tag(A16, "creationId")):
        node.set("id", f"{{{str(uuid4()).upper()}}}")
    poster.addnext(movie)
    return movie


def link_picture(picture, video_id, media_id, label):
    nonvisual = picture.find(tag(P, "nvPicPr"))
    props = nonvisual.find(tag(P, "cNvPr"))
    media_props = nonvisual.find(tag(P, "nvPr"))
    if props.find(tag(A, "hlinkClick")) is not None or media_props.find(tag(A, "videoFile")) is not None:
        raise ValueError("Poster already has a click action or video")
    if not props.get("name"):
        props.set("name", label)
    if not props.get("descr"):
        props.set("descr", label)
    action = etree.Element(tag(A, "hlinkClick"), nsmap={"a": A}, action="ppaction://media")
    props.insert(0, action)

    video = etree.Element(tag(A, "videoFile"), nsmap={"a": A, "r": R})
    video.set(tag(R, "link"), video_id)
    extensions = media_props.find(tag(P, "extLst"))
    if extensions is None:
        extensions = etree.SubElement(media_props, tag(P, "extLst"))
    media_props.insert(media_props.index(extensions), video)
    extension = etree.SubElement(extensions, tag(P, "ext"), uri=MEDIA_EXTENSION)
    embedded = etree.SubElement(extension, tag(P14, "media"), nsmap={"p14": P14, "r": R})
    embedded.set(tag(R, "embed"), media_id)
    return props.attrib["id"]


def add_timing(slide, shape_id):
    timing = slide.find(tag(P, "timing"))
    if timing is None:
        timing = etree.Element(tag(P, "timing"))
        extensions = slide.find(tag(P, "extLst"))
        slide.insert(len(slide) if extensions is None else slide.index(extensions), timing)
        time_list = etree.SubElement(timing, tag(P, "tnLst"))
        parallel = etree.SubElement(time_list, tag(P, "par"))
        root_node = etree.SubElement(parallel, tag(P, "cTn"), id="1", dur="indefinite", restart="never", nodeType="tmRoot")
        child_list = etree.SubElement(root_node, tag(P, "childTnLst"))
    else:
        child_list = timing.find("/".join(tag(P, name) for name in ("tnLst", "par", "cTn", "childTnLst")))
        if child_list is None:
            raise ValueError("Slide has an unsupported animation structure; its timing was left intact")

    next_id = 1 + max(int(node.attrib["id"]) for node in timing.iter(tag(P, "cTn")))
    video = etree.SubElement(child_list, tag(P, "video"))
    media_node = etree.SubElement(video, tag(P, "cMediaNode"), vol="80000")
    time_node = etree.SubElement(media_node, tag(P, "cTn"), id=str(next_id), fill="hold", display="0")
    start = etree.SubElement(time_node, tag(P, "stCondLst"))
    etree.SubElement(start, tag(P, "cond"), delay="indefinite")
    target = etree.SubElement(media_node, tag(P, "tgtEl"))
    etree.SubElement(target, tag(P, "spTgt"), spid=shape_id)


def update_package(archive, number, label, poster):
    if MEDIA_PART in archive.namelist():
        raise ValueError(f"Package already contains {MEDIA_PART}")
    slide_part = find_slide(archive, number)
    rels_part = rels_path(slide_part)
    slide = parse(archive, slide_part)
    links = parse(archive, rels_part)
    picture = find_poster(archive, slide, slide_part, relations(links), label, poster)
    target = posixpath.relpath(MEDIA_PART, posixpath.dirname(slide_part))
    video_id, media_id = "rIdAedDemoVideo", "rIdAedDemoMedia"
    add_relation(links, video_id, f"{R}/video", target)
    add_relation(links, media_id, MEDIA_RELATION, target)
    shape_id = link_picture(playback_picture(slide, picture), video_id, media_id, label)
    add_timing(slide, shape_id)
    types = parse(archive, CONTENT_TYPES)
    etree.SubElement(types, tag(TYPES, "Override"), PartName=f"/{MEDIA_PART}", ContentType="video/mp4")
    return {slide_part: xml(slide), rels_part: xml(links), CONTENT_TYPES: xml(types)}


def embed(source, output, video, number, label, poster):
    if output.resolve() in {source.resolve(), video.resolve()}:
        raise ValueError("Output must differ from the input deck and video")
    payload = video.read_bytes()
    if payload[4:8] != b"ftyp":
        raise ValueError("Input does not have a recognized MP4 file signature")
    with ZipFile(source) as original:
        changes = update_package(original, number, label, poster)
        with NamedTemporaryFile(dir=output.parent, suffix=".pptx", delete=False) as temporary:
            temp_path = Path(temporary.name)
        try:
            with ZipFile(temp_path, mode="w", compression=ZIP_DEFLATED) as result:
                for member in original.infolist():
                    data = changes[member.filename] if member.filename in changes else original.read(member)
                    result.writestr(member, data)
                result.writestr(MEDIA_PART, payload)
            with ZipFile(temp_path) as result:
                failed = result.testzip()
                if failed is not None:
                    raise ValueError(f"Invalid result member {failed}")
            temp_path.replace(output)
        finally:
            temp_path.unlink(missing_ok=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("video", type=Path)
    parser.add_argument("--slide", type=int, default=6)
    parser.add_argument("--label", default="Film demonstracyjny Misja AED")
    parser.add_argument("--poster", type=Path)
    args = parser.parse_args()
    poster = args.poster.read_bytes() if args.poster else None
    embed(args.source, args.output, args.video, args.slide, args.label, poster)
