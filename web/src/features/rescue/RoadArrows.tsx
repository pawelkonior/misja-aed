import { memo, useId } from 'react';

export type Direction = 'straight' | 'left' | 'right' | 'arrived';
type Point = readonly [number, number];
const chevron: readonly Point[] = [
  [-0.62, -0.28],
  [0, 0.49],
  [0.62, -0.28],
  [0.57, -0.56],
  [0, -0.04],
  [-0.57, -0.56],
];
// The camera is 1.55 m above the ground. Each tile is projected individually,
// including its thickness and contact shadow, onto the same street plane.
function project(x: number, z: number, elevation: number) {
  return (200 + (300 * x) / z).toFixed(2) + ',' + (18 + (265 * (1.55 - elevation)) / z).toFixed(2);
}
function pathAt(travel: number, curve: number) {
  const rate = (curve * Math.PI) / 180 / 7.1;
  const angle = travel * rate;
  return {
    x: rate ? (1 - Math.cos(angle)) / rate : 0,
    z: 2.45 + (rate ? Math.sin(angle) / rate : travel),
    angle,
  };
}
const placements = [0, 1.45, 2.9, 4.6, 6.7];
interface RoadProps {
  direction: Direction;
  offset?: number;
  tilt?: number;
  bend?: number;
  paused?: boolean;
}
export const RoadArrows = memo(function RoadArrows({
  direction,
  offset = 50,
  tilt = 0,
  bend = 1,
  paused = false,
}: RoadProps) {
  const identifier = useId();
  const top = identifier + '-top',
    side = identifier + '-side';
  const curve = (direction === 'left' ? -1 : direction === 'right' ? 1 : 0) * bend * 76;
  const projected = placements.map((travel, index) => {
    const center = pathAt(travel, curve);
    const cos = Math.cos(center.angle),
      sin = Math.sin(center.angle);
    const face = (elevation: number, sideOffset = 0, depthOffset = 0) =>
      chevron.map(([x, z]) =>
        project(
          center.x + x * 0.9 * cos + z * sin + sideOffset,
          center.z - x * 0.9 * sin + z * cos + depthOffset,
          elevation,
        ),
      );
    return { index, face: face(0.105), base: face(0.025), shadow: face(0, 0.025, -0.055) };
  });
  return (
    <svg
      className="ar-guideline"
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 400 216"
      preserveAspectRatio="none"
      data-paused={paused}
      style={{ left: offset - 50 + '%', top: 56 + Math.max(-13, Math.min(13, tilt * 0.65)) + '%' }}
    >
      <defs>
        <linearGradient id={top} x1="0" y1="0" x2=".2" y2="1" gradientUnits="objectBoundingBox">
          <stop stopColor="#ebfff4" stopOpacity=".86" />
          <stop offset=".5" stopColor="#9cffe0" stopOpacity=".68" />
          <stop offset="1" stopColor="#5ee9bd" stopOpacity=".58" />
        </linearGradient>
        <linearGradient id={side} x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
          <stop stopColor="#5ddab6" stopOpacity=".76" />
          <stop offset="1" stopColor="#157965" stopOpacity=".78" />
        </linearGradient>
      </defs>
      {projected.toReversed().map(({ index, face, base, shadow }) => (
        <g
          key={index}
          className="ar-road-tile"
          style={{ animationDelay: index * 0.17 - 1.55 + 's' }}
        >
          <polygon className="ar-road-shadow" points={shadow.join(' ')} />
          <polygon fill={'url(#' + side + ')'} points={base.join(' ')} />
          {face.map((point, i) => {
            const j = (i + 1) % face.length;
            return (
              <polygon
                key={point}
                fill={'url(#' + side + ')'}
                points={[point, face[j], base[j], base[i]].join(' ')}
              />
            );
          })}
          <polygon className="ar-road-face" fill={'url(#' + top + ')'} points={face.join(' ')} />
          <polyline className="ar-road-rim" points={face.slice(0, 3).join(' ')} />
        </g>
      ))}
    </svg>
  );
});
