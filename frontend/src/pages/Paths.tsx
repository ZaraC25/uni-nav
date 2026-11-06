import { useCallback, useEffect, useState } from "react";
import { api, PATH_KINDS } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Badge, ErrorBanner, PageHeader, Spinner, EmptyState } from "../components/ui";
import type { Building, CampusPath, PathCreate, PathKind, PathUpdate } from "../types";

export default function Paths() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [paths, setPaths] = useState<CampusPath[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterBuilding, setFilterBuilding] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CampusPath | null>(null);

  const loadPaths = useCallback(() => {
    const buildingId = filterBuilding ? parseInt(filterBuilding) : undefined;
    api.listPaths(buildingId)
      .then(setPaths)
      .catch(() => setError("No se pudieron cargar los senderos."))
      .finally(() => setLoading(false));
  }, [filterBuilding]);

  useEffect(() => {
    api.listBuildings().then(setBuildings).catch(() => {});
  }, []);

  useEffect(() => {
    loadPaths();
  }, [loadPaths]);

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este sendero?")) return;
    try {
      await api.deletePath(id);
      loadPaths();
    } catch {
      setError("No se pudo eliminar.");
    }
  };

  if (loading) return <Spinner label="Cargando senderos..." />;

  return (
    <div>
      <PageHeader title="Senderos" subtitle="Conexiones entre edificios del campus">
        {isAdmin && (
          <button onClick={() => { setShowForm(true); setEditing(null); }} className="btn-primary">
            + Nuevo Sendero
          </button>
        )}
      </PageHeader>

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

      <div className="mb-4">
        <select
          value={filterBuilding}
          onChange={(e) => setFilterBuilding(e.target.value)}
          className="input max-w-xs"
        >
          <option value="">Todos los edificios</option>
          {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Paths list */}
        <div className="lg:col-span-2">
          {paths.length === 0 ? (
            <EmptyState icon="" title="No hay senderos" subtitle="Crea una conexión entre edificios." />
          ) : (
            <div className="space-y-2">
              {paths.map((path) => (
                <div
                  key={path.id}
                  className="card flex items-center justify-between !py-3"
                  onClick={() => isAdmin && setEditing(path)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-700">{path.source_name}</span>
                    {path.bidirectional ? (
                      <span className="text-slate-300">⇄</span>
                    ) : (
                      <span className="text-slate-300">→</span>
                    )}
                    <span className="text-sm font-medium text-slate-700">{path.target_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge color="amber">{path.kind}</Badge>
                    <span className="text-xs text-slate-400">{path.weight.toFixed(1)} m</span>
                    {isAdmin && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(path.id); }}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Form / Detail panel */}
        <div>
          {showForm || editing ? (
            <PathForm
              editing={editing}
              buildings={buildings}
              onSubmit={async (data) => {
                if (editing) {
                  const update: PathUpdate = {
                    weight: data.weight,
                    bidirectional: data.bidirectional,
                    kind: data.kind,
                  };
                  await api.updatePath(editing.id, update);
                } else {
                  await api.createPath(data);
                }
                setShowForm(false);
                setEditing(null);
                loadPaths();
              }}
              onCancel={() => { setShowForm(false); setEditing(null); }}
            />
          ) : (
            <div className="card text-center text-slate-400">
              <p className="py-8 text-sm">Selecciona un sendero para editarlo</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PathForm({
  editing,
  buildings,
  onSubmit,
  onCancel,
}: {
  editing: CampusPath | null;
  buildings: Building[];
  onSubmit: (data: PathCreate) => Promise<void>;
  onCancel: () => void;
}) {
  const [sourceId, setSourceId] = useState(editing?.source_id ?? 0);
  const [targetId, setTargetId] = useState(editing?.target_id ?? 0);
  const [weight, setWeight] = useState(editing?.weight.toString() ?? "");
  const [bidirectional, setBidirectional] = useState(editing?.bidirectional ?? true);
  const [kind, setKind] = useState<PathKind>(editing?.kind ?? "corridor");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing && (!sourceId || !targetId)) {
      setError("Selecciona origen y destino.");
      return;
    }
    if (!editing && sourceId === targetId) {
      setError("El origen y destino deben ser diferentes.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSubmit({
        source_id: sourceId,
        target_id: targetId,
        weight: weight ? parseFloat(weight) : null,
        bidirectional,
        kind,
      });
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <h3 className="mb-4 text-lg font-bold text-slate-800">{editing ? "Editar sendero" : "Nuevo sendero"}</h3>
      {error && <div className="mb-3"><ErrorBanner message={error} /></div>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="label">Origen</label>
          <select
            className="input"
            value={sourceId}
            onChange={(e) => setSourceId(Number(e.target.value))}
            disabled={!!editing}
          >
            <option value="">Selecciona...</option>
            {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Destino</label>
          <select
            className="input"
            value={targetId}
            onChange={(e) => setTargetId(Number(e.target.value))}
            disabled={!!editing}
          >
            <option value="">Selecciona...</option>
            {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Peso (opcional, costo de recorrido)</label>
          <input
            type="number"
            step="0.1"
            className="input"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="Automático"
          />
        </div>
        <div>
          <label className="label">Tipo de camino</label>
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value as PathKind)}>
            {PATH_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={bidirectional}
              onChange={(e) => setBidirectional(e.target.checked)}
            />
            Bidireccional
          </label>
        </div>
        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "Guardando..." : "Guardar"}</button>
          <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
        </div>
      </form>
    </div>
  );
}
