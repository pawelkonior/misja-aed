"""Mac Polish narration, word cue alignment and the actual app reader and microphone recordings."""
import array
import json
import subprocess as sp
from pathlib import Path
root = Path(__file__).resolve().parent
work = root / 'work' / 'voice'
work.mkdir(parents=True, exist_ok=True)
timeline = json.loads((root/'scenes.json').read_text())
clips, timings = [], []
def run(*args):
    sp.run(args, check=True, stdout=sp.DEVNULL)
def sound_length(path):
    pcm=sp.check_output(['ffmpeg','-loglevel','error','-i',str(path),'-ar','12000','-ac','1','-f','s16le','-'])
    values=array.array('h'); values.frombytes(pcm)
    end=next((i+1 for i in range(len(values)-1,-1,-1) if abs(values[i])>135),len(values))
    return max(.08,end/12000)
def pronounce(word):
    return (word.replace('dane.gov.pl','dane kropka gow kropka pe el')
                .replace('mObywatelu','em Obywatelu').replace('AED','a e de').replace('RKO','er ka o')
                .replace('18 272','osiemnaście tysięcy dwieście siedemdziesiąt dwie')
                .replace('291','dwieście dziewięćdziesiąt jeden'))
for i,cue in enumerate(timeline['cues']):
    words=cue.get('words') or cue['line'].split()
    pad=.13
    cut_in=0
    if cue.get('mic'):
        path=root/'assets'/'komenda-dalej.wav'
        cut_in=1.205
        duration=.57
        pad=0
        marks=[.004]
    elif 'audio' in cue:
        path=root.parent/'web'/'public'/'rescue-audio'/(cue['audio']+'.mp3')
        cut_in=cue.get('cutIn',0)
        duration=cue['trim']-cut_in
        marks=cue['specific']
        pad=.035
    else:
        path=work/f'{i:02}.aiff'
        utterance=[pronounce(w) for w in words]
        run('say','-v','Zosia','-r','174','-o',str(path),' '.join(utterance))
        duration=sound_length(path)+.065
        marks=[.02]
        # Prefix lengths account for the Polish voice's actual pronunciation and word lengths.
        for j in range(1,len(words)):
            prefix=work/'prefix.aiff'
            run('say','-v','Zosia','-r','174','-o',str(prefix),' '.join(utterance[:j]))
            marks.append(min(duration-.06,max(marks[-1]+.025,sound_length(prefix))))
    slot=cue['b']-cue['a']
    tempo=max(.98,duration/(slot-pad-.08))
    wav=work/f'{i:02}.wav'
    af=f'atrim=start={cut_in:.5f}:duration={duration:.5f},asetpts=N/SR/TB,atempo={tempo:.5f},aresample=48000,asetpts=N/SR/TB,adelay={round(pad*1000)},apad,atrim=end_sample={round(slot*48000)}'
    run('ffmpeg','-loglevel','error','-y','-i',str(path),'-af',af,'-ac','1',str(wav))
    clips.append("file '"+wav.name+"'")
    timings.append({'a':cue['a'],'b':cue['b'],'words':[{'w':w,'t':round(cue['a']+pad+v/tempo,3)} for w,v in zip(words,marks)]})
(work/'list.txt').write_text('\n'.join(clips))
run('ffmpeg','-loglevel','error','-y','-f','concat','-safe','0','-i',str(work/'list.txt'),'-c:a','aac','-b:a','160k',str(root/'assets'/'narracja.m4a'))
(root/'assets'/'word-cues.json').write_text(json.dumps(timings,ensure_ascii=False,indent=2)+'\n')
