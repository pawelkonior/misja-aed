"""Record the Polish narration with the system voice used by the demo film (macOS)."""
import json
from pathlib import Path
import subprocess as sp
root = Path(__file__).resolve().parent
work = root / 'work' / 'voice'
work.mkdir(parents=True, exist_ok=True)
clips = []
for scene in json.loads((root / 'scenes.json').read_text()):
    path = work / (scene['key'] + '.aiff')
    sp.run(['say', '-v', 'Zosia', '-r', '176', '-o', str(path), scene['voice']], check=True)
    duration = float(sp.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(path)]))
    slot = scene['end'] - scene['start']
    tempo = max(1, duration / (slot - .68))
    wav = work / (scene['key'] + '.wav')
    filters = f'atempo={tempo:.4f},adelay=240,apad,atrim=duration={slot},aresample=48000'
    sp.run(['ffmpeg','-loglevel','error','-y','-i',str(path),'-af',filters,'-ac','1',str(wav)],check=True)
    clips.append("file '" + wav.name + "'")
(work / 'list.txt').write_text('\n'.join(clips))
sp.run(['ffmpeg','-loglevel','error','-y','-f','concat','-safe','0','-i',str(work/'list.txt'),'-c:a','aac','-b:a','160k',str(root/'assets'/'narracja.m4a')],check=True)
