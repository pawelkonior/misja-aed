import { useEffect, useRef } from 'react';
import { steps } from './steps';

// A pure, time-addressable Canvas 2D scene, shared with the deterministic film workflow.
type Pen = CanvasRenderingContext2D;
const ink = '#164c49',
  teal = '#168977',
  dark = '#085b50',
  mint = '#a5d9c8',
  skin = '#f7d4b4',
  edge = '#ae7967';
function path(c: Pen, d: string, fill: string | null, stroke: string | null = null, width = 2) {
  const p = new Path2D(d);
  if (fill) {
    c.fillStyle = fill;
    // Canvas fill() paints a Path2D.
    // oxlint-disable-next-line unicorn/no-array-fill-with-reference-type
    c.fill(p);
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = width;
    c.stroke(p);
  }
}
function rect(
  c: Pen,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  stroke?: string,
) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.lineWidth = 2;
    c.strokeStyle = stroke;
    c.stroke();
  }
}
function circle(c: Pen, x: number, y: number, r: number, color: string) {
  c.fillStyle = color;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
}
function ring(c: Pen, x: number, y: number, r: number, t: number) {
  c.save();
  c.globalAlpha = 0.42 * (1 - t);
  c.lineWidth = 2;
  c.strokeStyle = teal;
  c.beginPath();
  c.arc(x, y, r + 14 * t, 0, 2 * Math.PI);
  c.stroke();
  c.restore();
}
function text(c: Pen, s: string, x: number, y: number, size: number, color: string) {
  c.fillStyle = color;
  c.font = '700 ' + size + 'px system-ui, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(s, x, y);
}
function phone(c: Pen, t: number) {
  c.save();
  c.translate(250, 110);
  c.rotate(-0.065);
  rect(c, -51, -90, 102, 180, 17, ink);
  rect(c, -46, -85, 92, 170, 13, '#fbfffc');
  rect(c, -17, -82, 34, 5, 3, ink);
  text(c, '112', 0, -21, 42, ink);
  const phase = (t / 1.7) % 1;
  ring(c, 0, 39, 18, phase);
  circle(c, 0, 39, 18, teal);
  path(c, 'M-7 30 Q-10 32 -8 37 Q-4 47 5 49 Q9 49 10 45 L5 41 L1 43 Q-3 41 -4 37 L-2 34 Z', '#fff');
  c.restore();
}
function device(c: Pen, t: number) {
  const phase = (t / 1.8) % 1;
  c.save();
  c.translate(250, 114);
  c.rotate(-0.045);
  rect(c, -70, -79, 140, 148, 19, '#bedbd0', dark);
  rect(c, -65, -83, 130, 137, 15, '#fafffc', dark);
  rect(c, -27, -92, 54, 14, 6, ink);
  rect(c, -17, -87, 34, 6, 3, '#e5f3eb');
  rect(c, -48, -62, 96, 45, 6, '#d7ebe1', '#9fbfb1');
  path(c, 'M-37 -38 L-20 -38 L-14 -49 L-5 -25 L4 -43 L10 -38 L36 -38', null, teal, 2.5);
  circle(c, -30, 15, 15, teal);
  ring(c, -30, 15, 16, phase);
  path(c, 'M-34 10 A7 7 0 1 0 -26 10 M-30 7 L-30 15', null, '#fff', 2.6);
  text(c, 'AED', 21, 15, 21, ink);
  [-18, -10, -2, 6, 14, 22].forEach((x) => rect(c, x, 36, 3, 6, 1.5, '#a0beb3'));
  c.restore();
}
function pad(c: Pen, x: number, y: number, angle: number, show: number) {
  c.save();
  c.globalAlpha = 0.38 + 0.62 * show;
  c.translate(x + (1 - show) * 18, y - (1 - show) * 16);
  c.rotate(angle);
  rect(c, -13, -18, 26, 36, 6, '#fffdf1', dark);
  rect(c, -8, -12, 16, 23, 3, mint);
  path(c, 'M-3 1 L0 -5 L0 -1 L4 -2 L0 6 L0 2 Z', teal);
  c.restore();
}
function pads(c: Pen, t: number) {
  c.save();
  c.translate(250, 4);
  // Front view. Patient's right is on the viewer's left. The second pad sits on the lateral wall.
  path(
    c,
    'M-18 -14 L-18 21 Q-24 31 -49 34 Q-75 36 -80 60 L-102 132 L-91 135 L-65 87 Q-57 122 -61 176 L-65 218 L64 218 L60 171 Q57 121 64 87 L95 135 L104 131 L82 59 Q76 37 49 34 Q24 30 18 20 L18 -14 Z',
    skin,
    edge,
    2.1,
  );
  path(
    c,
    'M-18 22 Q-9 34 0 38 Q9 34 18 22 M-55 44 Q-27 41 -6 48 M6 48 Q27 41 55 44 M-58 81 Q-66 88 -64 100 M63 82 Q70 89 66 100 M0 49 L0 68',
    null,
    '#c19178',
    1.7,
  );
  path(c, 'M-39 58 Q-75 115 -130 145 M58 110 Q74 155 124 158', null, dark, 2);
  const phase = t % 3.8;
  pad(c, -39, 57, -0.12, Math.min(1, phase * 2));
  pad(c, 60, 111, -0.24, Math.max(0, Math.min(1, (phase - 0.75) * 2)));
  c.restore();
}
function wait(c: Pen, t: number) {
  const phase = (t / 2.1) % 1;
  c.save();
  c.translate(250, 112);
  ring(c, 0, -2, 67, phase);
  circle(c, 0, -2, 64, '#d7e9d9');
  path(
    c,
    'M-27 9 L-38 -8 Q-44 -20 -36 -23 Q-30 -25 -24 -16 L-14 -3 L-18 -43 Q-19 -50 -13 -51 Q-7 -52 -6 -44 L-2 -19 L-4 -53 Q-5 -61 2 -61 Q8 -60 8 -53 L10 -20 L12 -50 Q13 -57 19 -56 Q25 -55 24 -48 L23 -17 L27 -39 Q29 -45 34 -43 Q40 -41 38 -34 L32 6 Q31 25 19 35 L18 50 L-15 50 L-16 34 Q-20 23 -27 9 Z',
    skin,
    edge,
    2.4,
  );
  path(c, 'M-10 9 Q0 -2 12 -1 M-8 17 Q1 12 9 14', null, edge, 1.8);
  rect(c, -18, 45, 40, 15, 4, teal, dark);
  c.restore();
}
function compress(c: Pen, t: number) {
  const down = ((1 - Math.cos((t * 2 * Math.PI * 110) / 60)) / 2) * 7;
  c.save();
  c.translate(250, 95);
  path(
    c,
    'M-157 79 Q-169 70 -162 55 Q-155 41 -138 42 Q-125 40 -122 32 L-117 35 L-114 44 Q-109 50 -98 52 Q-84 55 -75 52 L-68 47 L-61 80 L-93 86 L-150 86 Z',
    skin,
    edge,
    2,
  );
  path(
    c,
    'M-70 49 Q-50 25 -4 ' +
      (28 + down) +
      ' Q27 28 53 43 Q80 53 118 52 L139 86 L-80 86 Q-78 65 -70 49 Z',
    '#d7e5de',
    ink,
    2.5,
  );
  c.save();
  c.translate(0, down);
  path(
    c,
    'M-7 -96 L12 -96 L9 2 Q13 8 22 11 L38 14 Q42 16 39 19 L4 22 Q-10 22 -11 10 Z',
    skin,
    edge,
    2,
  );
  path(
    c,
    'M-25 -98 L-7 -98 L-11 8 Q-10 14 -3 17 L26 20 Q30 22 27 25 L-10 26 Q-22 26 -23 16 Z',
    skin,
    edge,
    2,
  );
  path(c, 'M-20 21 Q-5 22 7 22', null, edge, 1.3);
  c.restore();
  path(c, 'M57 -30 L57 4 M47 -5 L57 5 L67 -5', null, teal, 4);
  c.restore();
}

const scenes = [phone, device, pads, wait, compress] as const;
export function drawInstruction(
  c: Pen,
  width: number,
  height: number,
  step: number,
  seconds: number,
) {
  c.save();
  c.clearRect(0, 0, width, height);
  c.scale(width / 500, height / 205);
  c.fillStyle = '#eaf5ee';
  c.fillRect(0, 0, 500, 205);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.strokeStyle = '#dceee1';
  c.lineWidth = 0.7;
  for (let x = 10; x < 500; x += 20) {
    for (let y = 10; y < 205; y += 20) {
      circle(c, x, y, 0.85, '#c1dacb');
    }
  }
  c.fillStyle = '#e2f0e6';
  c.beginPath();
  c.ellipse(250, 102, 107, 100, 0, 0, 2 * Math.PI);
  c.fill();
  scenes[step]?.(c, seconds);
  c.restore();
}

export function InstructionArt({ step }: { step: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect((): undefined | (() => void) => {
    const canvas = ref.current,
      c = canvas?.getContext('2d');
    if (!canvas || !c) return undefined;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0,
      start = performance.now();
    function paint(now: number) {
      if (!canvas || !c) return;
      drawInstruction(
        c,
        canvas.width,
        canvas.height,
        step,
        motion.matches ? 2 : (now - start) / 1000,
      );
      if (!motion.matches) frame = requestAnimationFrame(paint);
    }
    function restart() {
      cancelAnimationFrame(frame);
      start = performance.now();
      paint(start);
    }
    restart();
    motion.addEventListener('change', restart);
    return () => {
      cancelAnimationFrame(frame);
      motion.removeEventListener('change', restart);
    };
  }, [step]);
  return (
    <canvas
      className="rescue-art"
      width={1000}
      height={410}
      ref={ref}
      role="img"
      aria-label={steps[step]?.illustration}
    />
  );
}
