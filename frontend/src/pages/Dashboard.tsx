import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Badge, Spinner } from "../components/ui";
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
    <div className="space-y-6">

      {/* ── Hero banner ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl shadow-md" style={{ minHeight: 220 }}>
        <img
          src="/ucc_pasto.jpg"
          alt="Campus UCC Pasto"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/60 to-transparent" />
        <div className="relative px-8 py-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-300">
            Universidad Cooperativa de Colombia
          </p>
          <h1 className="mt-1 text-3xl font-extrabold text-white drop-shadow-sm">
            Bienvenido, {user?.username}
          </h1>
          <p className="mt-2 max-w-md text-sm text-slate-300">
            Navega el campus, calcula rutas, únete a tours guiados y consulta el modelo 3D del edificio.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/building-3d" className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-700 transition-colors">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0v10l-8 4m-8-4V7m16 10l-8-4m-8 4l8-4" />
              </svg>
              Abrir Modelo 3D
            </Link>
            <Link to="/graph" className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/30 transition-colors">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.1-1.1m-.758-4.9a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Ver Grafo 3D
            </Link>
          </div>
        </div>

        {/* Server status pill */}
        <div className="absolute top-4 right-4">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow ${health?.status === "ok" ? "bg-green-500/90 text-white" : "bg-red-500/90 text-white"}`}>
            <span className={`h-2 w-2 rounded-full ${health?.status === "ok" ? "bg-white animate-pulse" : "bg-white"}`} />
            {health?.status === "ok" ? "Servidor en línea" : "Sin conexión"}
          </span>
        </div>
      </div>

      {/* ── Offline warning ───────────────────────────────────────────────── */}
      {offline && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Backend no disponible en <code className="rounded bg-amber-100 px-1">http://127.0.0.1:8000</code>. Ejecuta <code className="rounded bg-amber-100 px-1">python main.py</code>.
        </div>
      )}

      {/* ── Quick actions ─────────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Acciones rápidas</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { to: "/building-3d", icon: "🗺️", label: "Calcular Ruta", sub: "Grafo 3D interactivo", color: "from-brand-500 to-brand-700" },
            { to: "/building-3d", icon: "🏛️", label: "Modelo 3D", sub: "Vista arquitectónica", color: "from-slate-600 to-slate-800" },
            { to: "/building-3d", icon: "🎯", label: "Iniciar Tour", sub: "Recorrido guiado", color: "from-emerald-500 to-emerald-700" },
            { to: "/history",     icon: "📋", label: "Mi Historial", sub: "Rutas guardadas",    color: "from-purple-500 to-purple-700" },
          ].map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${item.color} p-4 text-white shadow-sm hover:shadow-md hover:scale-[1.02] transition-all`}
            >
              <div className="text-2xl">{item.icon}</div>
              <p className="mt-2 font-semibold text-sm leading-tight">{item.label}</p>
              <p className="text-[11px] text-white/70 mt-0.5">{item.sub}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Stats + info ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Building & edge counts */}
        <div className="card flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-slate-700">Estado del campus</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-brand-50 p-4 text-center">
              <p className="text-3xl font-extrabold text-brand-600">{health?.buildings ?? "—"}</p>
              <p className="mt-1 text-xs text-slate-500">Edificios</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 text-center">
              <p className="text-3xl font-extrabold text-slate-700">{health?.edges ?? "—"}</p>
              <p className="mt-1 text-xs text-slate-500">Conexiones</p>
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 leading-relaxed">
            <span className="font-semibold">Edificio en T</span> · 6 pisos · ~16 400 m²<br/>
            Pasto, Colombia · Nov. 2018
          </div>
        </div>

        {/* My stats */}
        {stats ? (
          <div className="card flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-slate-700">Mis estadísticas</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Rutas calculadas", value: stats.total_routes, color: "text-brand-600" },
                { label: "Distancia total", value: `${stats.total_distance.toFixed(0)} m`, color: "text-emerald-600" },
                { label: "Distancia media", value: `${stats.average_distance.toFixed(0)} m`, color: "text-purple-600" },
                { label: "Destino favorito", value: stats.most_visited_destination || "—", color: "text-amber-600" },
              ].map((s) => (
                <div key={s.label} className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-400">{s.label}</p>
                  <p className={`mt-0.5 truncate text-sm font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card flex items-center justify-center text-sm text-slate-400">
            Sin estadísticas disponibles
          </div>
        )}

        {/* Popular places */}
        <div className="card flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-slate-700">Lugares más visitados</h3>
          {popularPlaces.length === 0 ? (
            <p className="text-sm text-slate-400">Sin datos todavía.</p>
          ) : (
            <ol className="space-y-2">
              {popularPlaces.map((place) => (
                <li key={place.building_id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    place.rank === 1 ? "bg-amber-100 text-amber-700" :
                    place.rank === 2 ? "bg-slate-200 text-slate-600" :
                    place.rank === 3 ? "bg-orange-100 text-orange-700" :
                    "bg-slate-100 text-slate-500"
                  }`}>{place.rank}</span>
                  <span className="flex-1 truncate text-sm text-slate-700">{place.building_name}</span>
                  <Badge color="brand">{place.visits}</Badge>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* ── Popular routes ────────────────────────────────────────────────── */}
      {popularRoutes.length > 0 && (
        <div className="card">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Rutas más frecuentadas</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {popularRoutes.map((route, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="flex items-center gap-1.5 truncate text-slate-700">
                  <span className="shrink-0 font-semibold text-brand-600">{route.origin_name}</span>
                  <span className="text-slate-300">→</span>
                  <span className="truncate">{route.destination_name}</span>
                </span>
                <Badge color="purple">{route.frequency}×</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Info cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            icon: "🗓️",
            title: "Planos originales",
            body: "Basado en los planos del edificio UCC Pasto de noviembre de 2018 a escala 1:125.",
          },
          {
            icon: "📐",
            title: "6 niveles",
            body: "Piso cero hasta quinto piso más azotea. Altura entre pisos ~2.94 m. ~17.6 m total.",
          },
          {
            icon: "🔬",
            title: "158 espacios",
            body: "Aulas, laboratorios, salas, oficinas, cafeterías y más, todos navegables en el grafo 3D.",
          },
        ].map((card) => (
          <div key={card.title} className="card flex gap-3">
            <span className="text-2xl">{card.icon}</span>
            <div>
              <p className="font-semibold text-slate-700 text-sm">{card.title}</p>
              <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{card.body}</p>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
