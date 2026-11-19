const shapes = {
  back: 'm14 6-6 6 6 6',
  next: 'm9 6 6 6-6 6',
  volume: 'M11 5 6 9H3v6h3l5 4z M15 8q5 4 0 8 M18 5q8 7 0 14',
  mic: 'M9 5a3 3 0 0 1 6 0v6a3 3 0 1 1-6 0z M5 11a7 7 0 0 0 14 0 M12 18v4 M8 22h8',
  aim: 'M9 3H3v6 M15 3h6v6 M21 15v6h-6 M9 21H3v-6 M9 12h6 M12 9v6',
  heart:
    'M20.5 4.7c-2-2-5.7-1.6-8.5 1.6C9.2 3.1 5.5 2.7 3.5 4.7c-3 3-1.2 6.7.8 9L12 21l7.7-7.3c2-2.3 3.8-6 .8-9z M13.5 8l-3.8 5H13l-2.3 4.5',
  direction: 'M12 3 3 20l9-4 9 4z',
  phone:
    'M6 3l4 5-2.7 2.6a15 15 0 0 0 6.9 6.5l2.5-2.7 4.3 3.6c0 2.2-1.4 4-3.5 3.5C10.4 20.2 4 13.6 2.7 6.9 2.4 4.8 3.7 3 6 3z',
  soundOff: 'M11 5 6 9H3v6h3l5 4z M16 9l5 6 M21 9l-5 6',
  play: 'm7 4 13 8-13 8z',
  pause: 'M8 5v14 M16 5v14',
  camera: 'M3 7h4l2-3h6l2 3h4v13H3z M16 13a4 4 0 1 1-8 0 4 4 0 1 1 8 0z',
} as const;
export function Symbol({ name, size = 20 }: { name: keyof typeof shapes; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={shapes[name]} />
    </svg>
  );
}
