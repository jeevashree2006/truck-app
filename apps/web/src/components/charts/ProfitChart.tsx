import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyProfitPoint } from "@/types";
import { useTheme } from "@/context/ThemeContext";
import { compactMoney, money } from "@/lib/format";

export function ProfitChart({ data, type = "area" }: { data: MonthlyProfitPoint[]; type?: "area" | "bar" }) {
  const { isDark } = useTheme();
  const grid = isDark ? "#1f2a40" : "#eef2f7";
  const axis = isDark ? "#64748b" : "#94a3b8";

  const tooltip = {
    contentStyle: {
      background: isDark ? "#111a2e" : "#fff",
      border: "none",
      borderRadius: 14,
      color: isDark ? "#e2e8f0" : "#0f172a",
    },
    formatter: (v: number, name: string) => [money(v), name],
  };

  if (type === "bar") {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: axis, fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: axis, fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={compactMoney} />
          <Tooltip {...tooltip} cursor={{ fill: isDark ? "#1e293b55" : "#f1f5f955" }} />
          <Bar dataKey="profit" name="Profit" radius={[6, 6, 0, 0]} maxBarSize={36}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.profit >= 0 ? "#16a34a" : "#ef4444"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="rentG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="profitG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16a34a" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
        <XAxis dataKey="label" tick={{ fill: axis, fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: axis, fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={compactMoney} />
        <Tooltip {...tooltip} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="rent" name="Rent" stroke="#2563eb" strokeWidth={2.5} fill="url(#rentG)" />
        <Area type="monotone" dataKey="profit" name="Profit" stroke="#16a34a" strokeWidth={2.5} fill="url(#profitG)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
