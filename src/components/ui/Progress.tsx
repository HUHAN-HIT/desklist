interface RingProps {
  value: number; // 0~1
  size?: number;
  stroke?: number;
  className?: string;
}

export function ProgressRing({ value, size = 20, stroke = 2.5, className }: RingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.min(1, Math.max(0, value));
  return (
    <svg width={size} height={size} className={className} aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - v)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.3s ease' }}
      />
    </svg>
  );
}

interface BarProps {
  value: number; // 0~1
  className?: string;
}

export function ProgressBar({ value, className }: BarProps) {
  const v = Math.min(1, Math.max(0, value));
  return (
    <div className={`h-1 w-full overflow-hidden rounded-full bg-white/[0.1] ${className ?? ''}`}>
      <div
        className="h-full rounded-full bg-[var(--accent)]"
        style={{ width: `${v * 100}%`, transition: 'width 0.3s ease' }}
      />
    </div>
  );
}
