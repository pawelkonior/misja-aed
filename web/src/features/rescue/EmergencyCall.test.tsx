import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { EmergencyCall, openEmergencyPhone } from './EmergencyCall';

const openPhone = vi.fn<() => void>();
const dismiss = vi.fn<() => void>();
const request = () => ({
  deadline: Date.now() + 10000,
  position: { lat: 52.23123, lon: 21.01416 },
});
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
it('hands off the call exactly once after ten seconds using a mock telephone handler', () => {
  render(
    <StrictMode>
      <EmergencyCall request={request()} onDismiss={dismiss} openPhone={openPhone} />
    </StrictMode>,
  );
  expect(screen.getByRole('timer')).toHaveTextContent('10 s');
  expect(screen.getByText(/52.23123, 21.01416/)).toBeVisible();
  act(() => {
    vi.advanceTimersByTime(9000);
  });
  expect(screen.getByRole('timer')).toHaveTextContent('1 s');
  expect(openPhone).not.toHaveBeenCalled();
  act(() => {
    vi.advanceTimersByTime(1000);
  });
  expect(openPhone).toHaveBeenCalledOnce();
  expect(screen.getByRole('link', { name: 'Zadzwoń' })).toHaveAttribute('href', 'tel:112');
  act(() => {
    vi.advanceTimersByTime(10000);
  });
  expect(openPhone).toHaveBeenCalledOnce();
});
it('cancels the pending call at the last second', () => {
  render(<EmergencyCall request={request()} onDismiss={dismiss} openPhone={openPhone} />);
  act(() => {
    vi.advanceTimersByTime(9000);
  });
  fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }));
  act(() => {
    vi.advanceTimersByTime(11000);
  });
  expect(dismiss).toHaveBeenCalledOnce();
  expect(openPhone).not.toHaveBeenCalled();
});
it('clears a timer when the route is abandoned', () => {
  const view = render(
    <EmergencyCall request={request()} onDismiss={dismiss} openPhone={openPhone} />,
  );
  view.unmount();
  act(() => {
    vi.advanceTimersByTime(11000);
  });
  expect(openPhone).not.toHaveBeenCalled();
});
it('offers a direct manual fallback when the phone has been locked or the page hidden', () => {
  render(
    <EmergencyCall
      request={{ ...request(), position: null }}
      onDismiss={dismiss}
      openPhone={openPhone}
    />,
  );
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
  fireEvent(document, new Event('visibilitychange'));
  act(() => {
    vi.advanceTimersByTime(11000);
  });
  expect(openPhone).not.toHaveBeenCalled();
  expect(screen.queryByText(/Pozycja do/)).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Zadzwoń' })).toHaveAttribute('href', 'tel:112');
});

it('passes the emergency number to the operating system without sending coordinates to a web endpoint', () => {
  const assign = vi.fn<(uri: string) => void>();
  vi.stubGlobal('window', { location: { assign } });
  try {
    openEmergencyPhone();
    expect(assign).toHaveBeenCalledExactlyOnceWith('tel:112');
  } finally {
    vi.unstubAllGlobals();
  }
});
