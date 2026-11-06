import { useCallback, useEffect, useState } from "react";
import { api, FLOOR_NAMES } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Badge, ErrorBanner, PageHeader, Spinner, EmptyState } from "../components/ui";
import type { Building, TourResponse, TourSession, TourSummary } from "../types";

export default function Tours() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [tours, setTours] = useState<TourSummary[]>([]);
  const [session, setSession] = useState<TourSession | null>(null);
  const [selected, setSelected] = useState<TourResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const loadTours = useCallback(() => {
    api.listTours().then(setTours).catch(() => setError("No se pudieron cargar los tours."));
  }, []);

  const loadSession = useCallback(() => {
    api.getTourSession().then(setSession).catch(() => setSession(null));
  }, []);

  useEffect(() => {
    Promise.all([api.listTours(), api.getTourSession().catch(() => null)])
      .then(([t, s]) => {
        setTours(t);
        setSession(s as TourSession | null);
        setLoading(false);
      });
    api.listBuildings().then(setBuildings).catch(() => {});
  }, []);

  const selectTour = async (id: number) => {
    try {
      const tour = await api.getTour(id);
      setSelected(tour);
    } catch {
      setError("No se pudo cargar el tour.");
    }
  };

  const startTour = async (id: number) => {
    setSubmitting(true);
    setError("");
    try {
      const s = await api.startTour(id);
      setSession(s);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || "No se pudo iniciar el tour.");
    } finally {
      setSubmitting(false);
    }
  };

  const nextStop = async () => {
    setError("");
    try {
      const s = await api.tourNext();
      setSession(s);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || "No se pudo avanzar.");
    }
  };

  const prevStop = async () => {
    setError("");
    try {
      const s = await api.tourPrevious();
      setSession(s);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || "No se pudo retroceder.");
    }
  };

  const endTour = async () => {
    if (!confirm("¿Terinar el tour actual?")) return;
    await api.endTour();
    setSession(null);
  };

  const handleDeleteTour = async (id: number) => {
    if (!confirm("¿Eliminar este tour?")) return;
    try {
      await api.deleteTour(id);
      loadTours();
      setSelected(null);
    } catch {
      setError("No se pudo eliminar el tour.");
    }
  };

  if (loading) return <Spinner label="Cargando tours..." />;

  return (
    <div>
      <PageHeader title="Tours Guiados" subtitle="Recorridos predefinidos por el campus">
        {isAdmin && <button onClick={() => setShowCreate(true)} className="btn-primary">+ Crear Tour</button>}
      </PageHeader>

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

      {/* Active session */}
      {session && (
        <div className="card mb-6 border-brand-300 bg-brand-50/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-brand-700">Tour en curso: {session.tour_name}</h3>
              <p className="mt-1 text-sm text-slate-600">
                Parada {session.current_stop.position} de {session.total_stops}
              </p>
            </div>
            <Badge color="brand">Activo</Badge>
          </div>
          <div className="mt-4 rounded-lg bg-white p-4">
            <p className="text-sm text-slate-500">Lugar actual:</p>
            <p className="text-lg font-semibold text-slate-800">{session.current_stop.building_name}</p>
            <p className="text-xs text-slate-400">{FLOOR_NAMES[session.current_stop.floor] || `Piso ${session.current_stop.floor}`}</p>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={prevStop} disabled={submitting} className="btn-secondary flex-1">← Anterior</button>
            <button onClick={nextStop} disabled={submitting} className="btn-primary flex-1">Siguiente →</button>
            <button onClick={endTour} className="btn-danger">Terminar</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Tour list */}
        <div className="lg:col-span-2">
          {tours.length === 0 ? (
            <EmptyState icon="" title="No hay tours disponibles" subtitle="Crea un tour para empezar." />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {tours.map((tour) => (
                <button
                  key={tour.id}
                  onClick={() => selectTour(tour.id)}
                  className={`card text-left transition-transform hover:scale-[1.02] ${
                    selected?.id === tour.id ? "border-brand-400 ring-2 ring-brand-200" : ""
                  }`}
                >
                  <h3 className="font-semibold text-slate-800">{tour.name}</h3>
                  {tour.description && <p className="mt-1 text-sm text-slate-500">{tour.description}</p>}
                  <div className="mt-3 flex items-center gap-2">
                    <Badge color="brand">{tour.stop_count} paradas</Badge>
                    {!session && <span className="text-xs text-brand-500" onClick={(e) => { e.stopPropagation(); startTour(tour.id); }}>Iniciar →</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail / Create panel */}
        <div>
          {showCreate ? (
            <CreateTourForm
              buildings={buildings}
              onSubmit={async (data) => {
                await api.createTour(data);
                setShowCreate(false);
                loadTours();
              }}
              onCancel={() => setShowCreate(false)}
            />
          ) : selected ? (
            <div className="card">
              <h3 className="text-lg font-bold text-slate-800">{selected.name}</h3>
              {selected.description && <p className="mt-1 text-sm text-slate-500">{selected.description}</p>}
              <h4 className="mt-4 mb-2 text-sm font-semibold text-slate-600">Paradas del tour</h4>
              <ol className="space-y-1">
                {selected.stops.map((stop) => (
                  <li key={stop.position} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                      {stop.position}
                    </span>
                    <span className="flex-1 text-slate-700">{stop.building_name}</span>
                    <Badge>{FLOOR_NAMES[stop.floor] || `Piso ${stop.floor}`}</Badge>
                  </li>
                ))}
              </ol>
              <div className="mt-4 flex gap-2">
                {!session && (
                  <button onClick={() => startTour(selected.id)} disabled={submitting} className="btn-primary flex-1">
                    Iniciar Tour
                  </button>
                )}
                {isAdmin && (
                  <button onClick={() => handleDeleteTour(selected.id)} className="btn-danger flex-1">
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="card text-center text-slate-400">
              <p className="py-8 text-sm">Selecciona un tour para ver sus paradas</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateTourForm({
  buildings,
  onSubmit,
  onCancel,
}: {
  buildings: Building[];
  onSubmit: (data: { name: string; description?: string; building_ids: number[] }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const toggle = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length < 2) {
      setError("Selecciona al menos 2 edificios.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSubmit({ name, description: description || undefined, building_ids: selectedIds });
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || "Error al crear el tour.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <h3 className="mb-4 text-lg font-bold text-slate-800">Crear tour</h3>
      {error && <div className="mb-3"><ErrorBanner message={error} /></div>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="label">Nombre</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
        </div>
        <div>
          <label className="label">Descripción (opcional)</label>
          <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={2} />
        </div>
        <div>
          <label className="label">Edificios a visitar ({selectedIds.length} seleccionados)</label>
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {buildings.map((b) => {
              const idx = selectedIds.indexOf(b.id);
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => toggle(b.id)}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors ${
                    idx >= 0 ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span>{idx >= 0 ? `${idx + 1}. ` : ""}{b.name}</span>
                  <span className={idx >= 0 ? "text-brand-600" : "text-slate-300"}>{idx >= 0 ? "OK" : "+"}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "Creando..." : "Crear"}</button>
          <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
        </div>
      </form>
    </div>
  );
}
