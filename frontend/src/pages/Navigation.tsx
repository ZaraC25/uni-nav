import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import { Badge, ErrorBanner, PageHeader, Spinner, EmptyState } from "../components/ui";
import type { Building, NavigationTrail, NavigationStop } from "../types";

export default function Navigation() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [trail, setTrail] = useState<NavigationTrail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadTrail = useCallback(() => {
    api.getNavigation().then(setTrail).catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([api.listBuildings(), api.getNavigation().catch(() => null)])
      .then(([b, t]) => {
        setBuildings(b);
        setTrail(t as NavigationTrail | null);
        setLoading(false);
      });
  }, []);

  const filtered = buildings.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  const visit = async (buildingId: number) => {
    setSubmitting(true);
    setError("");
    try {
      await api.visitPlace(buildingId);
      loadTrail();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || "No se pudo visitar el lugar.");
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = async () => {
    setError("");
    try {
      await api.goBack();
      loadTrail();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || "No hay a dónde regresar.");
    }
  };

  const goForward = async () => {
    setError("");
    try {
      await api.goForward();
      loadTrail();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || "No hay adelante.");
    }
  };

  const clearTrail = async () => {
    if (!confirm("¿Limpiar todo el historial de navegación?")) return;
    await api.clearNavigation();
    loadTrail();
  };

  if (loading) return <Spinner label="Cargando..." />;

  return (
    <div>
      <PageHeader title="Navegación" subtitle="Explora el campus y mantén un rastro de los lugares que visitas">
        <button onClick={clearTrail} className="btn-secondary">Limpiar rastro</button>
      </PageHeader>

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Trail */}
        <div className="lg:col-span-1">
          <div className="card">
            <h3 className="mb-4 text-lg font-semibold text-slate-700">Mi rastro de navegación</h3>

            {/* Navigation buttons */}
            <div className="mb-4 flex gap-2">
              <button
                onClick={goBack}
                disabled={!trail?.can_go_back || submitting}
                className="btn-secondary flex-1"
              >
                ← Atrás
              </button>
              <button
                onClick={goForward}
                disabled={!trail?.can_go_forward || submitting}
                className="btn-secondary flex-1"
              >
                Adelante →
              </button>
            </div>

            {trail && trail.trail.length > 0 ? (
              <ol className="space-y-1">
                {trail.trail.map((entry, i) => (
                  <li
                    key={i}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                      entry.is_current ? "bg-brand-50 ring-1 ring-brand-200" : "bg-slate-50"
                    }`}
                  >
                    <span className="text-slate-400">#{i + 1}</span>
                    <span className={`flex-1 ${entry.is_current ? "font-semibold text-brand-700" : "text-slate-600"}`}>
                      {entry.building_name}
                    </span>
                    {entry.is_current && <Badge color="brand">Actual</Badge>}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-slate-400">Tu rastro está vacío. Visita un lugar para empezar.</p>
            )}
          </div>
        </div>

        {/* Building picker */}
        <div className="lg:col-span-2">
          <div className="card">
            <h3 className="mb-4 text-lg font-semibold text-slate-700">Visitar un lugar</h3>
            <input
              type="text"
              placeholder="Buscar edificio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input mb-4"
            />
            {filtered.length === 0 ? (
              <EmptyState icon="" title="Sin resultados" subtitle="Prueba con otro término de búsqueda." />
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {filtered.slice(0, 20).map((b) => (
                  <button
                    key={b.id}
                    onClick={() => visit(b.id)}
                    disabled={submitting}
                    className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-left transition-colors hover:bg-brand-50"
                  >
                    <div>
                      <p className="font-medium text-slate-700">{b.name}</p>
                      <p className="text-xs text-slate-400">Piso {b.floor}</p>
                    </div>
                    <span className="text-brand-400">→</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
