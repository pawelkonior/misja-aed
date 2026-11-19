"""Build the self-contained Canvas work for the original seek-based rendering harness."""
import base64
import io
import json
import mimetypes
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parent
web = root.parent / 'web'
scenes = json.loads((root / 'scenes.json').read_text())
def dataurl(blob, mime):
    return 'data:'+mime+';base64,'+base64.b64encode(blob).decode()
def asset(path):
    return dataurl(path.read_bytes(),mimetypes.guess_type(path)[0] or 'application/octet-stream')
assets = {'hero':asset(web/'public/media/hero.webp'), 'entrance':asset(web/'public/map-assets/chmielna-wejscie.jpg')}
for scene in scenes:
    if scene['key'] in ('open', 'data'):
        continue
    files = sorted((root/'work'/scene['key']).glob('*.jpg'))
    assert len(files) == 6 * (scene['end'] - scene['start']), f"Capture incomplete for {scene['key']}"
    for start in range(0,len(files),12):
        sheet = Image.new('RGB',(420*4,820*3),'white')
        for idx,file in enumerate(files[start:start+12]):
            with Image.open(file) as im:
                sheet.paste(im, ((idx%4)*420,(idx//4)*820))
        out = io.BytesIO()
        sheet.save(out,'webp',quality=86,method=3)
        assets[scene['key']+str(start//12)] = dataurl(out.getvalue(),'image/webp')
html=(root/'canvas.html').read_text().replace('@@SCENES@@',json.dumps(scenes,ensure_ascii=False)).replace('@@ASSETS@@',json.dumps(assets))
(root/'output.html').write_text(html)
