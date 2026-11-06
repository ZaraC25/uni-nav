import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import { Badge, ErrorBanner, PageHeader, Spinner, EmptyState } from "../components/ui";
import type { RouteVisit } from "../types";

export default function History() {
  const [visits, setVisits] = useState<RouteVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api.routeHistory(200)
      .then(setVisits)
      .catch(() => setError("No se pudo cargar el historial."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleClear = async () => {
    if (!confirm("¿Eliminar todo el historial de rutas?")) return;
    setError("");
    try {
      await api.deleteHistory();
      setVisits([]);
    } catch {
      setError("No se pudo eliminar el historial.");
    }
  };

  const handleDelete = async (id: number) => {
    setError("");
    try {
      await api.deleteHistoryItem(id);
      setVisits((prev) => prev.filter((v) => v.id !== id));
    } catch {
      setError("No se pudo eliminar la entrada.");
    }
  };

  if (loading) return <Spinner label="Cargando historial..." />;

  return (
    <div>
      <PageHeader title="Historial de Rutas" subtitle="Rutas que has calculado anteriormente">
        {visits.length > 0 && (
          <button onClick={handleClear} className="btn-danger">Limpiar todo</button>
        )}
      </PageHeader>

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

      {visits.length === 0 ? (
        <EmptyState icon="" title="Sin historial" subtitle="Calcula una ruta para verla aquí." />
      ) : (
        <div className="space-y-2">
          {visits.map((visit) => (
            <div key={visit.id} className="card flex items-center justify-between !py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                  #{visit.id}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    {visit.origin_name} → {visit.destination_name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(visit.visited_at).toLocaleString("es-ES")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge color="brand">{visit.distance.toFixed(2)} m</Badge>
                <button
                  onClick={() => handleDelete(visit.id)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
