import { motion } from "framer-motion";
import { useMemo } from "react";

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

/** Animated SVG donut chart with a center total and an optional legend. */
export function DonutChart({
  data,
  size = 188,
  thickness = 22,
  centerLabel,
  centerValue,
}: {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = useMemo(() => data.reduce((a, s) => a + s.value, 0), [data]);

  let offset = 0;
  const segments = data
    .filter((s) => s.value > 0)
    .map((s) => {
      const fraction = total > 0 ? s.value / total : 0;
      const seg = { ...s, fraction, dash: fraction * circumference, offset };
      offset += fraction * circumference;
      return seg;
    });

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={thickness}
            className="stroke-slate-100 dark:stroke-ink-600"
          />
          {segments.map((s, i) => (
            <motion.circle
              key={s.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeLinecap="round"
              strokeDasharray={`${s.dash} ${circumference - s.dash}`}
              initial={{ strokeDashoffset: -circumference }}
              animate={{ strokeDashoffset: -s.offset }}
              transition={{ duration: 0.9, delay: 0.1 + i * 0.08, ease: "easeOut" }}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && <span className="text-xl font-extrabold text-slate-900 dark:text-white">{centerValue}</span>}
          {centerLabel && <span className="text-xs font-medium text-slate-400">{centerLabel}</span>}
        </div>
      </div>
      <ul className="grid w-full flex-1 grid-cols-1 gap-2 sm:grid-cols-1">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {Math.round(s.fraction * 100)}%
            </span>
          </li>
        ))}
        {segments.length === 0 && <li className="text-sm text-slate-400">No data for this period.</li>}
      </ul>
    </div>
  );
}
