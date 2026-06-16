import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Login from "@/pages/Login";

// Route pages are code-split so the initial bundle stays small — heavy deps
// (recharts, the load editor, etc.) only download when that page is visited.
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Vehicles = lazy(() => import("@/pages/Vehicles"));
const VehicleDetail = lazy(() => import("@/pages/VehicleDetail"));
const LoadEditor = lazy(() => import("@/pages/LoadEditor"));
const Drivers = lazy(() => import("@/pages/Drivers"));
const Profit = lazy(() => import("@/pages/Profit"));
const Settings = lazy(() => import("@/pages/Settings"));

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-ink-900">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
    </div>
  );
}

export default function App() {
  const { isAuthed, loading } = useAuth();

  if (loading) return <FullScreenLoader />;

  if (!isAuthed) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Suspense fallback={<FullScreenLoader />}>
      <Routes>
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/vehicles" element={<Vehicles />} />
          <Route path="/vehicles/:id" element={<VehicleDetail />} />
          <Route path="/loads/:loadId" element={<LoadEditor />} />
          <Route path="/drivers" element={<Drivers />} />
          <Route path="/profit" element={<Profit />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
