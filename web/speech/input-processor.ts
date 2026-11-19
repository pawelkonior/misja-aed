declare abstract class AudioWorkletProcessor {
  readonly port: MessagePort;
}
declare function registerProcessor(name: string, processor: typeof CommandInput): void;
class CommandInput extends AudioWorkletProcessor {
  private chunk: Float32Array<ArrayBuffer>;
  private offset: number;
  constructor() {
    super();
    this.chunk = new Float32Array(2048);
    this.offset = 0;
  }
  process(inputs: Float32Array[][]) {
    const samples = inputs[0]?.[0];
    if (samples) {
      for (const sample of samples) {
        this.chunk[this.offset++] = sample;
        if (this.offset === this.chunk.length) {
          this.port.postMessage(this.chunk, [this.chunk.buffer]);
          this.chunk = new Float32Array(2048);
          this.offset = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor('aed-voice-input', CommandInput);
