"""Pack real, full-width interface recordings into the deterministic Canvas 2D work."""
import base64
import json
from pathlib import Path
root = Path(__file__).resolve().parent
web = root.parent / 'web'
timeline = json.loads((root / 'scenes.json').read_text())
def uri(path,mime):
    return f'data:{mime};base64,' + base64.b64encode(path.read_bytes()).decode()
clips={s[0]:uri(root/'work'/'live'/(s[0]+'.mp4'),'video/mp4') for s in timeline['shots'] if s[0] not in ('open','turn','close')}
assets={'map':uri(web/'public/map-assets/srodmiescie.svg','image/svg+xml'),'qr':uri(web/'public/media/demo-qr.png','image/png')}
html=(root/'canvas.html').read_text()
for tag,payload in [('SHOTS',timeline['shots']),('WORDS',json.loads((root/'assets'/'word-cues.json').read_text())),('MIC',json.loads((root/'work'/'live'/'voice-cues.json').read_text())),('CLIPS',clips),('IMAGES',assets),('ROUTE',json.loads((web/'map'/'demo-route.json').read_text())['coordinates'])]:
    html=html.replace('@@'+tag+'@@',json.dumps(payload,ensure_ascii=False))
(root/'output.html').write_text(html)
