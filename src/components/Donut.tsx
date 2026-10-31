export default function Donut({
  segments,
  size = 140,
  label,
  sub,
}: {
  segments: { value: number; cls: string }[];
  size?: number;
  label: string;
  sub?: string;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  const r = 42;
  const C = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="donut" role="img" aria-label={`${label} ${sub || ""}`}>
      <circle cx="50" cy="50" r={r} className="donut-track" strokeWidth="11" fill="none" />
      {total > 0 &&
        segments.map((s, i) => {
          if (!s.value) return null;
          const len = (s.value / total) * C;
          const gap = segments.filter((x) => x.value).length > 1 ? 0.8 : 0;
          const el = (
            <circle
              key={i}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              strokeWidth="11"
              className={s.cls}
              strokeDasharray={`${Math.max(0, len - gap)} ${C}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 50 50)"
            />
          );
          offset += len;
          return el;
        })}
      <text x="50" y={sub ? 50 : 54} textAnchor="middle" className="donut-label">{label}</text>
      {sub && <text x="50" y="63" textAnchor="middle" className="donut-sub">{sub}</text>}
    </svg>
  );
}
