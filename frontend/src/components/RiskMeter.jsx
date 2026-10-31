import { useEffect, useState } from 'react';
import { LEVEL_COLOR, LEVEL_LABEL } from '../services/format.js';

const CX = 110;
const CY = 108;
const R = 86;
const BANDS = [
  { from: 0, to: 25, level: 'LOW' },
  { from: 25, to: 50, level: 'MEDIUM' },
  { from: 50, to: 75, level: 'HIGH' },
  { from: 75, to: 100, level: 'CRITICAL' },
];

const point = (score, r) => {
  const a = ((180 + score * 1.8) * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
};

const arc = (from, to, r) => {
  const [x1, y1] = point(from, r);
  const [x2, y2] = point(to, r);
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
};

/** Half-circle dial. The four coloured bands match the risk categories (0-24, 25-49, 50-74, 75-100). */
export default function RiskMeter({ score, level }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setShown(score), 60);
    return () => clearTimeout(t);
  }, [score]);

  const color = LEVEL_COLOR[level];
  return (
    <figure className="meter" aria-label={`Risk score ${score} out of 100, level ${LEVEL_LABEL[level]}`}>
      <svg viewBox="0 0 220 128" role="img" aria-hidden="true">
        {BANDS.map((b) => (
          <path key={b.level} d={arc(b.from + 0.6, b.to - 0.6, R)} stroke={LEVEL_COLOR[b.level]}
                strokeOpacity={b.level === level ? 0.95 : 0.28} strokeWidth="12" fill="none" />
        ))}
        {[0, 25, 50, 75, 100].map((t) => {
          const [x1, y1] = point(t, R - 12);
          const [x2, y2] = point(t, R - 20);
          const [lx, ly] = point(t, R - 30);
          return (
            <g key={t}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--muted)" strokeWidth="1.5" />
              <text x={lx} y={ly + 3} textAnchor="middle" className="meter-tick">{t}</text>
            </g>
          );
        })}
        <g className="meter-needle" style={{ transform: `rotate(${shown * 1.8}deg)`, transformOrigin: `${CX}px ${CY}px` }}>
          <line x1={CX} y1={CY} x2={CX - (R - 40)} y2={CY} stroke={color} strokeWidth="3" strokeLinecap="round" />
        </g>
        <circle cx={CX} cy={CY} r="6" fill={color} />
      </svg>
      <figcaption>
        <span className="meter-score" style={{ color }}>{score}</span>
        <span className="meter-of">out of 100</span>
        <span className="meter-level" style={{ color }}>{LEVEL_LABEL[level]} risk</span>
      </figcaption>
    </figure>
  );
}
