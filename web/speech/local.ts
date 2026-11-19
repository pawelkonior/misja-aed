import workletUrl from './input-processor.ts?worker&url';
import type { KaldiRecognizer, Model } from 'vosk-browser';

const media = (path: string) =>
  new URL(import.meta.env.BASE_URL + 'voice/' + path, document.baseURI).href;
interface Callbacks {
  reading: () => boolean;
  ready: () => void;
  command: (text: string) => void;
  error: () => void;
}

export function localSpeech(callbacks: Callbacks) {
  let closed = false,
    model: Model | undefined,
    recognizer: KaldiRecognizer | undefined,
    stream: MediaStream | undefined;
  let ctx: AudioContext | undefined,
    source: MediaStreamAudioSourceNode | undefined,
    node: AudioWorkletNode | undefined;
  // Suppress delayed final results from an utterance during TTS or just after mute.
  let lastReading = -Infinity;
  function close() {
    if (closed) return;
    closed = true;
    stream?.getTracks().forEach((track) => track.stop());
    if (node) {
      node.port.close();
      node.disconnect();
    }
    source?.disconnect();
    recognizer?.remove();
    model?.terminate();
    if (ctx && ctx.state !== 'closed') void ctx.close().catch(() => {});
  }
  function fail() {
    if (!closed) {
      close();
      callbacks.error();
    }
  }
  async function connect() {
    // Resume Web Audio immediately from the initiating user interaction.
    ctx = new AudioContext({ sampleRate: 16000 });
    await ctx.resume();
    const { Model: VoskModel } = await import('vosk-browser');
    if (closed) return;
    model = new VoskModel(media('vosk-small-pl-0.22.tar.gz'), -1);
    model.on('error', fail);
    model.on('load', (result) => {
      if (closed) return;
      if (result.event !== 'load' || !result.result) {
        fail();
        return;
      }
      void startInput().catch(fail);
    });
  }
  async function startInput() {
    if (!ctx || !model || closed) return;
    const context = ctx,
      loaded = model;
    await context.audioWorklet.addModule(workletUrl);
    if (closed) return;
    const audio = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    if (closed) {
      audio.getTracks().forEach((track) => track.stop());
      return;
    }
    stream = audio;
    for (const t of stream.getAudioTracks()) t.addEventListener('ended', fail, { once: true });
    const rec = new loaded.KaldiRecognizer(
      context.sampleRate,
      JSON.stringify(['dalej', 'następny', 'następny krok', 'przejdź dalej', '[unk]']),
    );
    recognizer = rec;
    rec.setWords(true);
    rec.on('error', fail);
    rec.on('result', (response) => {
      if (
        closed ||
        callbacks.reading() ||
        performance.now() - lastReading < 650 ||
        response.event !== 'result'
      )
        return;
      const result = response.result;
      if (
        result.text &&
        result.result?.length &&
        result.result.every((word) => word.conf >= 0.72)
      ) {
        callbacks.command(result.text);
      }
    });
    node = new AudioWorkletNode(context, 'aed-voice-input');
    node.port.addEventListener('message', (event: MessageEvent<unknown>) => {
      if (closed || !(event.data instanceof Float32Array)) return;
      const speaking = callbacks.reading();
      if (speaking) lastReading = performance.now();
      // Keep Vosk's endpoint detector clock running while narration is suppressed.
      const chunk = event.data;
      if (speaking) chunk.fill(0);
      rec.acceptWaveformFloat(chunk, context.sampleRate);
    });
    node.port.start();
    source = context.createMediaStreamSource(audio);
    source.connect(node);
    node.connect(context.destination);
    callbacks.ready();
  }
  void connect().catch(fail);
  return close;
}
