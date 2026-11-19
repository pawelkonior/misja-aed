import { useEffect, useRef, useState } from 'react';
import { Phone } from 'lucide-react';
import type { GeoPoint } from '../../../map/types';

export type CallRequest = { deadline: number; position: GeoPoint | null };
export function openEmergencyPhone() {
  window.location.assign('tel:112');
}

export function EmergencyCall({
  request,
  onDismiss,
  openPhone = openEmergencyPhone,
}: {
  request: CallRequest;
  onDismiss: () => void;
  openPhone?: () => void;
}) {
  const [seconds, setSeconds] = useState(10);
  const [interrupted, setInterrupted] = useState(false);
  const finished = useRef(false);
  useEffect(() => {
    function stopWhileHidden() {
      if (document.hidden && !finished.current) {
        finished.current = true;
        setInterrupted(true);
      }
    }
    function tick() {
      if (finished.current) return;
      const timeLeft = Math.ceil((request.deadline - Date.now()) / 1000);
      setSeconds(Math.max(0, timeLeft));
      if (timeLeft > 0) return;
      finished.current = true;
      if (document.hidden || timeLeft < -2) setInterrupted(true);
      else openPhone();
    }
    stopWhileHidden();
    tick();
    const ticker = window.setInterval(tick, 200);
    document.addEventListener('visibilitychange', stopWhileHidden);
    return () => {
      window.clearInterval(ticker);
      document.removeEventListener('visibilitychange', stopWhileHidden);
    };
  }, [request.deadline, openPhone]);
  const counting = seconds > 0 && !interrupted;
  const pos = request.position;
  return (
    <aside className="call-toast" aria-label="Wezwanie pomocy">
      <div className="call-toast-message" role="status">
        <Phone size={19} aria-hidden="true" />
        <div>
          <strong>
            {counting
              ? 'Połączenie alarmowe'
              : interrupted
                ? 'Otwórz połączenie alarmowe'
                : 'Potwierdź połączenie w telefonie'}
          </strong>
          <p>
            {counting
              ? 'Za chwilę otworzy się telefon.'
              : 'Jeśli telefon się nie otworzył, wybierz „Zadzwoń”.'}
          </p>
        </div>
        {counting && (
          <span className="call-timer" role="timer" aria-label={'Pozostało sekund: ' + seconds}>
            {seconds} s
          </span>
        )}
      </div>
      {pos && (
        <p className="call-coordinates">
          Pozycja do podania operatorowi · {pos.lat.toFixed(5)}, {pos.lon.toFixed(5)}
        </p>
      )}
      <div className="call-toast-actions">
        <button
          type="button"
          onClick={() => {
            finished.current = true;
            onDismiss();
          }}
        >
          {counting ? 'Anuluj' : 'Zamknij'}
        </button>
        <a
          href="tel:112"
          onClick={() => {
            finished.current = true;
            onDismiss();
          }}
        >
          {counting ? 'Zadzwoń teraz' : 'Zadzwoń'}
        </a>
      </div>
    </aside>
  );
}
