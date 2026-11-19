import { steps } from './steps';

export function playNarration(step: number, onEnd: () => void, onFailure: () => void) {
  const current = steps[step]!;
  const synth = window.speechSynthesis;
  let spoken: SpeechSynthesisUtterance | undefined,
    audio: HTMLAudioElement | undefined,
    stopped = false;
  const end = () => {
    if (!stopped) onEnd();
  };
  const fail = () => {
    if (!stopped) onFailure();
  };
  function recorded() {
    if (stopped || audio) return;
    audio = new Audio(import.meta.env.BASE_URL + 'rescue-audio/krok-' + (step + 1) + '.mp3');
    audio.addEventListener('ended', end);
    audio.addEventListener('error', fail);
    void audio.play().catch(fail);
  }
  function nativeError(e: SpeechSynthesisErrorEvent) {
    if (e.error === 'interrupted' || e.error === 'canceled') end();
    else recorded();
  }
  const polish = synth
    ?.getVoices()
    .find((v) => v.lang.replace('_', '-').toLowerCase().startsWith('pl'));
  if (polish && 'SpeechSynthesisUtterance' in window) {
    spoken = new SpeechSynthesisUtterance([current.title, current.text, current.tip].join(' '));
    spoken.lang = 'pl-PL';
    spoken.rate = 0.97;
    spoken.voice = polish;
    spoken.addEventListener('end', end);
    spoken.addEventListener('error', nativeError);
    synth.speak(spoken);
  } else recorded();
  return () => {
    stopped = true;
    if (spoken) {
      spoken.removeEventListener('end', end);
      spoken.removeEventListener('error', nativeError);
      synth.cancel();
    }
    if (audio) {
      audio.removeEventListener('ended', end);
      audio.removeEventListener('error', fail);
      audio.pause();
    }
  };
}
