import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Badge, PageHeader, Spinner, EmptyState } from "../components/ui";
import type { PopularPlace, PopularRoute } from "../types";

export default function Rankings() {
  const [places, setPlaces] = useState<PopularPlace[]>([]);
  const [routes, setRoutes] = useState<PopularRoute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.popularPlaces(20), api.popularRoutes()])
      .then(([p, r]) => {
        setPlaces(p);
        setRoutes(r);
        setLoading(false);
      });
  }, []);

  if (loading) return <Spinner label="Cargando rankings..." />;

  return (
    <div>
      <PageHeader title="Rankings" subtitle="Los lugares y rutas más populares del campus" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Popular Places */}
        <div className="card">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-700">
            Lugares más visitados
          </h2>
          {places.length === 0 ? (
            <EmptyState icon="" title="Sin datos" subtitle="Aún no hay suficientes visitas." />
          ) : (
            <div className="space-y-2">
              {places.map((place) => (
                <div
                  key={place.building_id}
                  className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3"
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                      place.rank === 1
                        ? "bg-amber-100 text-amber-700"
                        : place.rank === 2
                        ? "bg-slate-200 text-slate-600"
                        : place.rank === 3
                        ? "bg-orange-100 text-orange-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {place.rank}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-slate-700">{place.building_name}</p>
                    <p className="text-xs text-slate-400">Piso {place.floor}</p>
                  </div>
                  <Badge color="brand">{place.visits} visitas</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Popular Routes */}
        <div className="card">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-700">
            Rutas más frecuentadas
          </h2>
          {routes.length === 0 ? (
            <EmptyState icon="" title="Sin datos" subtitle="Aún no hay rutas registradas." />
          ) : (
            <div className="space-y-2">
              {routes.map((route, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">#{i + 1}</span>
                    <span className="text-sm text-slate-700">
                      <span className="font-medium">{route.origin_name}</span>
                      <span className="mx-1 text-slate-300">→</span>
                      <span className="font-medium">{route.destination_name}</span>
                    </span>
                  </div>
                  <Badge color="purple">{route.frequency}×</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
