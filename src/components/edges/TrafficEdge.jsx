import { getBezierPath } from '@xyflow/react';
import { useRef } from 'react';

export default function TrafficEdge({
  data,
  selected,
  markerEnd,
  sourcePosition,
  sourceX,
  sourceY,
  targetPosition,
  targetX,
  targetY,
}) {
  const pathRef = useRef(null);
  const pulses = data?.pulses ?? [];
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  let pulsePoints = [];

  if (pathRef.current && pulses.length > 0) {
    try {
      const pathLength = pathRef.current.getTotalLength();
      pulsePoints = pulses.map((pulse) => ({
        ...pulse,
        point: pathRef.current.getPointAtLength(pathLength * pulse.progress),
      }));
    } catch {
      pulsePoints = [];
    }
  }

  const intensity = data?.trafficIntensity ?? 0;
  const active = intensity > 0 || pulses.length > 0;
  const strokeWidth = 2 + intensity * 4;
  const strokeColor = selected
    ? '#ffb44f'
    : active
      ? '#5de2e7'
      : 'rgba(186, 219, 213, 0.18)';

  return (
    <g>
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={24}
      />
      <path
        d={edgePath}
        fill="none"
        stroke="rgba(93, 226, 231, 0.14)"
        strokeWidth={strokeWidth + 7}
        opacity={active ? 1 : 0}
      />
      <path
        ref={pathRef}
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={selected ? strokeWidth + 1.5 : strokeWidth}
        strokeLinecap="round"
        strokeDasharray={active ? '16 11' : '8 11'}
        markerEnd={markerEnd}
      />
      {pulsePoints.map((pulse) => (
        <g key={pulse.id}>
          <circle cx={pulse.point.x} cy={pulse.point.y} r="8.5" fill={pulse.accent} opacity="0.16" />
          <circle cx={pulse.point.x} cy={pulse.point.y} r="4.2" fill={pulse.accent} />
        </g>
      ))}
    </g>
  );
}
