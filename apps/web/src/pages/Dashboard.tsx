import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, FileWarning, Layers, Navigation, Phone, TrendingUp, Truck, Users } from "lucide-react";
import { api } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { KpiCard } from "@/components/ui/KpiCard";
import { SectionCard } from "@/components/ui/Card";
import { ReminderCard } from "@/components/cards/ReminderCard";
import { CardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { compactMoney, initials, money, spendMeta, vehicleStatusMeta } from "@/lib/format";

// Charts pull in recharts (~heavy) — load them lazily so the dashboard paints first.
const ProfitChart = lazy(() => import("@/components/charts/ProfitChart").then((m) => ({ default: m.ProfitChart })));
const DonutChart = lazy(() => import("@/components/ui/DonutChart").then((m) => ({ default: m.DonutChart })));

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useI18n();
  const dash = useAsync(() => api.dashboard(6), []);
  const reminders = useAsync(() => api.reminders(), []);
  const drivers = useAsync(() => api.listDrivers(), []);
  const liveDrivers = (drivers.data ?? []).filter((d) => d.status === "active");

  const k = dash.data?.kpis;
  const donutData = (dash.data?.spend_breakdown ?? []).map((s) => ({
    label: s.label,
    value: s.amount,
    color: spendMeta[s.category]?.color ?? "#94a3b8",
  }));
  const totalSpend = donutData.reduce((a, s) => a + s.value, 0);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-brand-gradient p-6 text-white sm:p-8"
      >
        <div className="absolute inset-0 opacity-30 [background:radial-gradient(400px_180px_at_90%_-20%,#fff,transparent),radial-gradient(300px_200px_at_-5%_120%,#a78bfa,transparent)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-white/80">
              {t("dashboard.greeting")}, {user?.name?.split(" ")[0] ?? "Owner"} 👋
            </p>
            <h2 className="mt-1 text-2xl font-extrabold sm:text-3xl">{t("dashboard.subtitle")}</h2>
            <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
              <HeroStat label="Profit (this month)" value={money(k?.profit_this_month)} loading={dash.loading} />
              <HeroStat label="Rent (this month)" value={money(k?.rent_this_month)} loading={dash.loading} />
              <HeroStat label="Spend (this month)" value={money(k?.spend_this_month)} loading={dash.loading} />
              <HeroStat label="All-time profit" value={money(k?.profit_all_time)} loading={dash.loading} />
            </div>
          </div>
          <Link to="/profit" className="inline-flex w-fit items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold backdrop-blur transition hover:bg-white/25">
            <TrendingUp size={16} /> View profit
          </Link>
        </div>
      </motion.div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {dash.loading || !k ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <KpiCard index={0} label={t("kpi.vehicles")} value={k.total_vehicles} icon={<Truck size={20} />} accent="#2563eb" />
            <KpiCard index={1} label={t("kpi.onWay")} value={k.vehicles_on_way} icon={<Navigation size={20} />} accent="#7c3aed" />
            <KpiCard index={2} label={t("kpi.activeLoads")} value={k.active_loads} icon={<Layers size={20} />} accent="#16a34a" />
            <KpiCard index={3} label={t("kpi.docsExpiring")} value={k.documents_expiring} icon={<FileWarning size={20} />} accent="#f59e0b" />
          </>
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SectionCard
          className="xl:col-span-2"
          title="Rent vs Profit"
          subtitle="Last 6 months"
          action={<span className="pill bg-status-valid/12 text-status-valid">{compactMoney(k?.profit_this_month)} this month</span>}
        >
          {dash.loading ? <Skeleton className="h-[280px] w-full" /> : (
            <Suspense fallback={<Skeleton className="h-[280px] w-full" />}><ProfitChart data={dash.data!.monthly} type="area" /></Suspense>
          )}
        </SectionCard>

        <SectionCard title="Spend Breakdown" subtitle="Completed trips">
          {dash.loading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : (
            <Suspense fallback={<Skeleton className="h-[200px] w-full" />}>
              <DonutChart data={donutData} centerValue={compactMoney(totalSpend)} centerLabel="Spend" />
            </Suspense>
          )}
        </SectionCard>
      </div>

      {/* Live drivers */}
      <SectionCard
        title="Live drivers"
        subtitle="On a trip right now"
        action={<Link to="/drivers" className="text-sm font-semibold text-brand-600 hover:underline">View all</Link>}
      >
        {drivers.loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : liveDrivers.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-5 text-slate-500 dark:bg-ink-800">
            <Users size={22} />
            <p className="text-sm font-medium">No drivers on a trip. Assign a driver to a vehicle on the Drivers page.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {liveDrivers.map((d) => (
              <div key={d.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3 dark:border-ink-600">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-sm font-bold text-white">{initials(d.name)}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{d.name}</p>
                  <p className="truncate text-xs text-slate-400">{d.assigned_vehicle_registration ?? "On trip"}</p>
                </div>
                {d.primary_mobile && (
                  <a href={`tel:${d.primary_mobile}`} className="flex h-9 w-9 items-center justify-center rounded-xl bg-status-valid/12 text-status-valid transition hover:bg-status-valid/20" aria-label={`Call ${d.name}`} title={`Call ${d.primary_mobile}`}>
                    <Phone size={16} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Reminders */}
        <SectionCard
          className="xl:col-span-2"
          title={t("dashboard.alerts")}
          action={reminders.data && reminders.data.length > 0 ? <span className="pill bg-status-expired/12 text-status-expired">{reminders.data.length}</span> : null}
        >
          {reminders.loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : reminders.data && reminders.data.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {reminders.data.slice(0, 6).map((r, i) => <ReminderCard key={i} reminder={r} index={i} />)}
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl bg-status-valid/8 p-5 text-status-valid">
              <CheckCircle2 size={22} />
              <p className="text-sm font-medium">{t("dashboard.noAlerts")}</p>
            </div>
          )}
        </SectionCard>

        {/* Fleet status */}
        <SectionCard title="Fleet Status">
          {dash.loading ? (
            <Skeleton className="h-[180px] w-full" />
          ) : (
            <div className="space-y-3">
              {dash.data!.status_breakdown.map((s) => {
                const meta = vehicleStatusMeta[s.status as keyof typeof vehicleStatusMeta] ?? vehicleStatusMeta.empty;
                const pct = k && k.total_vehicles ? (s.count / k.total_vehicles) * 100 : 0;
                return (
                  <div key={s.status}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.dot }} />
                        {s.label}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{s.count}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-ink-600">
                      <motion.div className="h-full rounded-full" style={{ backgroundColor: meta.dot }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function HeroStat({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-white/70">{label}</p>
      {loading ? <div className="mt-1 h-7 w-24 animate-pulse rounded bg-white/20" /> : <p className="mt-0.5 text-xl font-extrabold sm:text-2xl">{value}</p>}
    </div>
  );
}
