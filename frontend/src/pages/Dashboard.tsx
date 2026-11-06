import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { PageHeader, Spinner, Badge } from "../components/ui";
import type { HealthStatus, PopularPlace, PopularRoute, UserStatsResponse } from "../types";

export default function Dashboard() {
  const { user } = useAuth();
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [stats, setStats] = useState<UserStatsResponse | null>(null);
  const [popularPlaces, setPopularPlaces] = useState<PopularPlace[]>([]);
  const [popularRoutes, setPopularRoutes] = useState<PopularRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    Promise.all([
      api.health().catch(() => null),
      api.myStats().catch(() => null),
      api.popularPlaces(5).catch(() => []),
      api.popularRoutes().catch(() => []),
    ]).then(([h, s, pp, pr]) => {
      if (!h) setOffline(true);
      setHealth(h as HealthStatus | null);
      setStats(s as UserStatsResponse | null);
      setPopularPlaces(pp as PopularPlace[]);
      setPopularRoutes(pr as PopularRoute[]);
      setLoading(false);
    });
  }, []);

  if (loading) return <Spinner label="Cargando dashboard..." />;

  return (
    <div>
      <PageHeader title={`Hola, ${user?.username}`} subtitle="Resumen del campus y tu actividad" />

      {/* Offline banner */}
      {offline && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          No se pudo conectar con el servidor backend en{" "}
          <code className="rounded bg-amber-100 px-1">http://127.0.0.1:8000</code>. Asegúrate
          de que el backend esté corriendo ({" "}
          <code className="rounded bg-amber-100 px-1">python main.py</code> ).
        </div>
      )}

      {/* Health status cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Estado del servidor</span>
            <Badge color={health?.status === "ok" ? "green" : "red"}>
              {health?.status === "ok" ? "En línea" : "Sin conexión"}
            </Badge>
          </div>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-slate-500">Edificios</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{health?.buildings ?? "—"}</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-slate-500">Conexiones (aristas)</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{health?.edges ?? "—"}</p>
        </div>
      </div>

      {/* User stats */}
      {stats && (
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-slate-700">Mis estadísticas</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="card">
              <p className="text-xs text-slate-500">Rutas calculadas</p>
              <p className="mt-1 text-xl font-bold text-brand-600">{stats.total_routes}</p>
            </div>
            <div className="card">
              <p className="text-xs text-slate-500">Distancia total</p>
              <p className="mt-1 text-xl font-bold text-brand-600">{stats.total_distance.toFixed(1)} m</p>
            </div>
            <div className="card">
              <p className="text-xs text-slate-500">Distancia promedio</p>
              <p className="mt-1 text-xl font-bold text-brand-600">{stats.average_distance.toFixed(1)} m</p>
            </div>
            <div className="card">
              <p className="text-xs text-slate-500">Destino más visitado</p>
              <p className="mt-1 truncate text-sm font-bold text-brand-600">
                {stats.most_visited_destination || "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Popular places & routes */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-slate-700">Lugares más visitados</h2>
          {popularPlaces.length === 0 ? (
            <p className="text-sm text-slate-400">Sin datos todavía.</p>
          ) : (
            <ol className="space-y-2">
              {popularPlaces.map((place) => (
                <li key={place.building_id} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2">
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                      {place.rank}
                    </span>
                    {place.building_name}
                  </span>
                  <Badge color="brand">{place.visits} visitas</Badge>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-slate-700">Rutas populares</h2>
          {popularRoutes.length === 0 ? (
            <p className="text-sm text-slate-400">Sin datos todavía.</p>
          ) : (
            <ul className="space-y-2">
              {popularRoutes.map((route, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2 text-sm">
                  <span className="text-slate-700">
                    {route.origin_name} → {route.destination_name}
                  </span>
                  <Badge color="purple">{route.frequency}×</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <QuickLink to="/routes" label="Calcular Ruta" />
        <QuickLink to="/tours" label="Iniciar Tour" />
        <QuickLink to="/buildings" label="Ver Edificios" />
        <QuickLink to="/navigation" label="Navegar" />
      </div>
    </div>
  );
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="card flex flex-col items-center gap-2 text-center transition-transform hover:scale-105"
    >
      <span className="text-sm font-medium text-slate-600">{label}</span>
    </Link>
  );
}
