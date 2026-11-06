import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Badge, ErrorBanner, PageHeader, Spinner, EmptyState } from "../components/ui";
import type { Building, QueuePosition, QueueStatus, ServedResponse } from "../types";

export default function Queues() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [queueStatuses, setQueueStatuses] = useState<Record<number, QueueStatus>>({});
  const [myPositions, setMyPositions] = useState<Record<number, QueuePosition>>({});
  const [search, setSearch] = useState("");
  const [served, setServed] = useState<ServedResponse | null>(null);

  useEffect(() => {
    api.listBuildings().then(async (b) => {
      setBuildings(b);
      // Load queue status for all buildings
      const statuses: Record<number, QueueStatus> = {};
      await Promise.all(
        b.map(async (building) => {
          try {
            statuses[building.id] = await api.getQueue(building.id);
          } catch { /* ignore */ }
        })
      );
      setQueueStatuses(statuses);
      setLoading(false);
    });
  }, []);

  const refreshQueue = async (buildingId: number) => {
    try {
      const status = await api.getQueue(buildingId);
      setQueueStatuses((prev) => ({ ...prev, [buildingId]: status }));
    } catch { /* ignore */ }
  };

  const joinQueue = async (buildingId: number) => {
    setError("");
    try {
      const pos = await api.joinQueue(buildingId);
      setMyPositions((prev) => ({ ...prev, [buildingId]: pos }));
      refreshQueue(buildingId);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || "No se pudo unir a la cola.");
    }
  };

  const leaveQueue = async (buildingId: number) => {
    setError("");
    try {
      await api.leaveQueue(buildingId);
      setMyPositions((prev) => {
        const copy = { ...prev };
        delete copy[buildingId];
        return copy;
      });
      refreshQueue(buildingId);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || "No se pudo salir de la cola.");
    }
  };

  const serveNext = async (buildingId: number) => {
    setError("");
    try {
      const result = await api.serveQueue(buildingId);
      setServed(result);
      refreshQueue(buildingId);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || "No se pudo atender al siguiente.");
    }
  };

  if (loading) return <Spinner label="Cargando..." />;

  const filtered = buildings.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="Colas de Espera" subtitle="Únete a filas virtuales en puntos del campus" />

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

      {served && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Se atendio a <strong>{served.served_username}</strong> en {served.building_name}. Quedan {served.length} en cola.
        </div>
      )}

      <input
        type="text"
        placeholder="Buscar edificio..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input mb-4 max-w-sm"
      />

      {filtered.length === 0 ? (
        <EmptyState icon="" title="Sin resultados" subtitle="No hay edificios que coincidan." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((b) => {
            const status = queueStatuses[b.id];
            const myPos = myPositions[b.id];
            return (
              <div key={b.id} className="card">
                <h3 className="font-semibold text-slate-800">{b.name}</h3>
                <p className="mt-1 text-xs text-slate-400">Piso {b.floor}</p>

                <div className="mt-3 flex items-center gap-2">
                  <Badge color={status && status.length > 0 ? "amber" : "green"}>
                    {status ? `${status.length} en fila` : "—"}
                  </Badge>
                  {myPos && <Badge color="brand">Tu puesto: #{myPos.position}</Badge>}
                </div>

                <div className="mt-4 flex gap-2">
                  {!myPos ? (
                    <button onClick={() => joinQueue(b.id)} className="btn-primary flex-1 text-xs">
                      Unirse
                    </button>
                  ) : (
                    <button onClick={() => leaveQueue(b.id)} className="btn-secondary flex-1 text-xs">
                      Salir
                    </button>
                  )}
                  {isAdmin && (
                    <button onClick={() => serveNext(b.id)} className="btn-secondary text-xs">
                      Atender siguiente
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
