import { useCallback, useState } from 'react';
import { InstructionArt } from './InstructionArt';
import { Symbol } from './Symbol';
import { medicalSources, steps } from './steps';
import { useVoice } from './useVoice';
import './rescue.css';
export { ArGuide } from './ArGuide';

export function AedInstructions({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState(0);
  const info = steps[step]!,
    last = step === steps.length - 1;
  const next = useCallback(() => setStep((s) => Math.min(steps.length - 1, s + 1)), []);
  const voice = useVoice(step, next);
  return (
    <section
      className="rescue-module rescue-guide"
      aria-label="Instrukcja użycia AED u osoby dorosłej"
    >
      <div className="rescue-shell-head">
        <button type="button" className="rescue-round" onClick={onBack} aria-label="Wróć">
          <Symbol name="back" />
        </button>
        <span>Instrukcja AED</span>
        <a className="rescue-emergency" href="tel:112">
          <Symbol name="phone" size={15} />
          112
        </a>
      </div>
      <div className="rescue-guide-main">
        <div className="rescue-kicker">
          <span>Dla osoby dorosłej</span>
          <span>
            Krok {step + 1} z {steps.length}
          </span>
        </div>
        <div className="rescue-progress" aria-label="Wybierz krok instrukcji">
          {steps.map((s, index) => (
            <button
              key={s.title}
              type="button"
              title={s.title}
              aria-label={`Krok ${index + 1}. ${s.title}`}
              aria-current={index === step ? 'step' : undefined}
              className={index <= step ? 'is-complete' : ''}
              onClick={() => setStep(index)}
            />
          ))}
        </div>
        <InstructionArt step={step} />
        <div aria-live="polite" aria-atomic="true" className="rescue-copy">
          <h2>{info.title}</h2>
          <p>{info.text}</p>
          <p className="rescue-tip">{info.tip}</p>
        </div>
        <div className="rescue-actions">
          {step > 0 && (
            <button
              type="button"
              className="rescue-action-icon"
              aria-label="Poprzedni krok"
              onClick={() => setStep((s) => s - 1)}
            >
              <Symbol name="back" />
            </button>
          )}
          {last ? (
            <button type="button" className="rescue-primary" onClick={onBack}>
              Wróć do mapy <Symbol name="next" />
            </button>
          ) : (
            <button type="button" className="rescue-primary" onClick={next}>
              Dalej <Symbol name="next" />
            </button>
          )}
        </div>
        <div className="rescue-voice-controls">
          <button type="button" aria-pressed={voice.read} onClick={voice.toggleRead}>
            <Symbol name={voice.read ? 'volume' : 'soundOff'} size={17} />
            {voice.read ? 'Wycisz lektora' : 'Czytaj kroki'}
          </button>
          <button
            type="button"
            disabled={!voice.canListen || last}
            aria-pressed={voice.mic}
            onClick={voice.toggleMic}
          >
            <Symbol name="mic" size={16} />
            {voice.mic
              ? 'Wyłącz mikrofon'
              : voice.canListen
                ? 'Mów „dalej”'
                : 'Mikrofon niedostępny'}
          </button>
        </div>
        {voice.message && (
          <p role="status" className="rescue-note">
            {voice.message}
          </p>
        )}
        <details className="rescue-source">
          <summary>O instrukcji i obsłudze głosowej</summary>
          <p>
            W pierwszej kolejności słuchaj dyspozytora i swojego AED. Mikrofon służy do przełączania
            kroków po przeczytaniu instrukcji. Dostawca przeglądarki może przetwarzać głos online.
          </p>
          <p>
            <a href={medicalSources.erc} target="_blank" rel="noreferrer">
              Wytyczne ERC 2025
            </a>{' '}
            ·{' '}
            <a href={medicalSources.ministry} target="_blank" rel="noreferrer">
              Pierwsza pomoc MSWiA
            </a>
          </p>
        </details>
      </div>
    </section>
  );
}
