import { useCallback, useEffect, useRef, useState } from 'react';
import { steps } from './steps';
import { playNarration } from './narration';

interface ResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
  resultIndex: number;
}
interface RecognitionEvents {
  result: ResultEvent;
  error: { error: string };
  end: Event;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  addEventListener<K extends keyof RecognitionEvents>(
    type: K,
    listener: (event: RecognitionEvents[K]) => void,
  ): void;
  removeEventListener<K extends keyof RecognitionEvents>(
    type: K,
    listener: (event: RecognitionEvents[K]) => void,
  ): void;
  start(): void;
  abort(): void;
}

function recognizer() {
  const host = window as Window & {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  return host.SpeechRecognition ?? host.webkitSpeechRecognition;
}

export function useVoice(step: number, next: () => void) {
  const [read, setRead] = useState(false),
    [mic, setMic] = useState(false),
    [message, setMessage] = useState('');
  const reading = useRef(false),
    active = useRef<Recognition | null>(null),
    latestNext = useRef(next);
  const wake = useRef<() => void>(() => {});
  const listening = mic && step < steps.length - 1;
  useEffect(() => {
    latestNext.current = next;
  }, [next]);
  useEffect((): undefined | (() => void) => {
    if (!listening) return undefined;
    const RecognitionClass = recognizer();
    if (!RecognitionClass) return undefined;
    const instance = new RecognitionClass();
    let disposed = false,
      running = false,
      restartTimer: ReturnType<typeof setTimeout> | undefined;
    instance.lang = 'pl-PL';
    instance.continuous = false;
    instance.interimResults = false;
    active.current = instance;
    const start = () => {
      if (disposed || reading.current || running) return;
      try {
        instance.start();
        running = true;
      } catch {
        setMessage('Nie udało się uruchomić mikrofonu. Możesz użyć przycisku Dalej.');
        setMic(false);
      }
    };
    function schedule() {
      clearTimeout(restartTimer);
      if (!disposed) restartTimer = setTimeout(start, 350);
    }
    wake.current = schedule;
    const onResult = (event: ResultEvent) => {
      const words = event.results[event.resultIndex]?.[0]?.transcript
        ?.toLocaleLowerCase('pl-PL')
        .replace(/[.,!?]/g, '')
        .trim();
      if (!reading.current && words && /^(dalej|następny|następny krok|przejdź dalej)$/.test(words))
        latestNext.current();
    };
    const onError = (event: { error: string }) => {
      if (disposed || event.error === 'aborted' || event.error === 'no-speech') return;
      disposed = true;
      setMessage(
        event.error === 'not-allowed'
          ? 'Brak dostępu do mikrofonu. Możesz użyć przycisku Dalej.'
          : 'Rozpoznawanie mowy jest niedostępne. Możesz użyć przycisku Dalej.',
      );
      setMic(false);
    };
    const onEnd = () => {
      running = false;
      schedule();
    };
    instance.addEventListener('result', onResult);
    instance.addEventListener('error', onError);
    instance.addEventListener('end', onEnd);
    start();
    return () => {
      disposed = true;
      clearTimeout(restartTimer);
      wake.current = () => {};
      active.current = null;
      instance.removeEventListener('end', onEnd);
      instance.removeEventListener('result', onResult);
      instance.removeEventListener('error', onError);
      instance.abort();
    };
  }, [listening]);
  useEffect((): undefined | (() => void) => {
    if (!read) return undefined;
    reading.current = true;
    active.current?.abort();
    const finished = () => {
      reading.current = false;
      wake.current();
    };
    const failed = () => {
      finished();
      setRead(false);
      setMessage(
        'Nie udało się odtworzyć nagrania. Możesz ponowić odczyt lub przeczytać instrukcję.',
      );
    };
    const stop = playNarration(step, finished, failed);
    return () => {
      stop();
      finished();
    };
  }, [step, read]);
  return {
    read,
    mic: listening,
    message,
    canListen: Boolean(recognizer()),
    toggleRead: useCallback(() => {
      setMessage('');
      setRead((v) => !v);
    }, []),
    toggleMic: useCallback(() => {
      setMessage('');
      setMic((v) => !v);
    }, []),
  };
}
