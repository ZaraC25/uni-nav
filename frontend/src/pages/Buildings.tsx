import { useCallback, useEffect, useState } from "react";
import { api, FLOOR_NAMES } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Badge, ErrorBanner, PageHeader, Spinner, EmptyState } from "../components/ui";
import type { Building, BuildingCreate, NearbyBuilding } from "../types";

export default function Buildings() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [faculty, setFaculty] = useState("");
  const [buildingType, setBuildingType] = useState("");
  const [floor, setFloor] = useState("");
  const [faculties, setFaculties] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [selected, setSelected] = useState<Building | null>(null);
  const [neighbors, setNeighbors] = useState<NearbyBuilding[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const loadBuildings = useCallback(() => {
    const params: Record<string, unknown> = {};
    if (search) params.search = search;
    if (faculty) params.faculty = faculty;
    if (buildingType) params.building_type = buildingType;
    if (floor) params.floor = parseInt(floor);
    api
      .listBuildings(params)
      .then(setBuildings)
      .catch(() => setError("No se pudieron cargar los edificios."))
      .finally(() => setLoading(false));
  }, [search, faculty, buildingType, floor]);

  useEffect(() => {
    api.listFaculties().then(setFaculties).catch(() => {});
    api.listBuildingTypes().then(setTypes).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(loadBuildings, 300);
    return () => clearTimeout(t);
  }, [loadBuildings]);

  const selectBuilding = async (b: Building) => {
    setSelected(b);
    setEditMode(false);
    try {
      const n = await api.buildingNeighbors(b.id);
      setNeighbors(n);
    } catch {
      setNeighbors([]);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este edificio? Esta acción no se puede deshacer.")) return;
    try {
      await api.deleteBuilding(id);
      setBuildings((prev) => prev.filter((b) => b.id !== id));
      setSelected(null);
    } catch {
      setError("No se pudo eliminar el edificio.");
    }
  };

  if (loading) return <Spinner label="Cargando edificios..." />;

  return (
    <div>
      <PageHeader title="Edificios" subtitle="Explora los lugares del campus">
        {isAdmin && (
          <button onClick={() => { setShowForm(true); setEditMode(false); setSelected(null); }} className="btn-primary">
            + Nuevo Edificio
          </button>
        )}
      </PageHeader>

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input max-w-xs"
        />
        <select value={faculty} onChange={(e) => setFaculty(e.target.value)} className="input max-w-xs">
          <option value="">Todas las facultades</option>
          {faculties.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <select value={buildingType} onChange={(e) => setBuildingType(e.target.value)} className="input max-w-xs">
          <option value="">Todos los tipos</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={floor} onChange={(e) => setFloor(e.target.value)} className="input max-w-xs">
          <option value="">Todos los pisos</option>
          {Object.entries(FLOOR_NAMES).map(([lvl, name]) => (
            <option key={lvl} value={lvl}>{name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* List */}
        <div className="lg:col-span-2">
          {buildings.length === 0 ? (
            <EmptyState icon="" title="No hay edificios" subtitle="Ajusta los filtros o crea uno nuevo." />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {buildings.map((b) => (
                <button
                  key={b.id}
                  onClick={() => selectBuilding(b)}
                  className={`card text-left transition-transform hover:scale-[1.02] ${
                    selected?.id === b.id ? "border-brand-400 ring-2 ring-brand-200" : ""
                  }`}
                >
                  <h3 className="font-semibold text-slate-800">{b.name}</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {b.faculty && <Badge color="blue">{b.faculty}</Badge>}
                    {b.building_type && <Badge color="amber">{b.building_type}</Badge>}
                    <Badge>{FLOOR_NAMES[b.floor] || `Piso ${b.floor}`}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Coordenadas: ({b.x.toFixed(1)}, {b.y.toFixed(1)})
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div>
          {showForm ? (
            <BuildingForm
              editing={editMode ? selected : null}
              onSubmit={async (data) => {
                if (editMode && selected) {
                  await api.updateBuilding(selected.id, data);
                } else {
                  await api.createBuilding(data);
                }
                setShowForm(false);
                loadBuildings();
              }}
              onCancel={() => setShowForm(false)}
            />
          ) : selected ? (
            <div className="card">
              <h3 className="text-lg font-bold text-slate-800">{selected.name}</h3>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">ID</dt><dd className="font-medium">{selected.id}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">X</dt><dd>{selected.x.toFixed(2)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Y</dt><dd>{selected.y.toFixed(2)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Piso</dt><dd>{FLOOR_NAMES[selected.floor] || selected.floor}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Facultad</dt><dd>{selected.faculty || "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Tipo</dt><dd>{selected.building_type || "—"}</dd></div>
              </dl>

              <h4 className="mt-6 mb-2 text-sm font-semibold text-slate-600">Vecinos más cercanos</h4>
              {neighbors.length === 0 ? (
                <p className="text-xs text-slate-400">Sin conexiones registradas.</p>
              ) : (
                <ul className="space-y-1">
                  {neighbors.map((n) => (
                    <li key={n.building.id} className="flex justify-between rounded bg-slate-50 px-3 py-1.5 text-sm">
                      <span>{n.building.name}</span>
                      <span className="text-slate-400">{n.distance.toFixed(1)} m</span>
                    </li>
                  ))}
                </ul>
              )}

              {isAdmin && (
                <div className="mt-6 flex gap-2">
                  <button
                    onClick={() => { setEditMode(true); setShowForm(true); }}
                    className="btn-secondary flex-1"
                  >
                    Editar
                  </button>
                  <button onClick={() => handleDelete(selected.id)} className="btn-danger flex-1">
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="card text-center text-slate-400">
              <p className="py-8 text-sm">Selecciona un edificio para ver sus detalles</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BuildingForm({
  editing,
  onSubmit,
  onCancel,
}: {
  editing: Building | null;
  onSubmit: (data: BuildingCreate) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(editing?.name || "");
  const [x, setX] = useState(editing?.x.toString() || "0");
  const [y, setY] = useState(editing?.y.toString() || "0");
  const [flr, setFlr] = useState(editing?.floor ?? 0);
  const [fac, setFac] = useState(editing?.faculty || "");
  const [btype, setBtype] = useState(editing?.building_type || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSubmit({
        name,
        x: parseFloat(x),
        y: parseFloat(y),
        floor: flr,
        faculty: fac || null,
        building_type: btype || null,
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
      <h3 className="mb-4 text-lg font-bold text-slate-800">{editing ? "Editar edificio" : "Nuevo edificio"}</h3>
      {error && <div className="mb-3"><ErrorBanner message={error} /></div>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="label">Nombre</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Coordenada X</label>
            <input type="number" step="0.1" className="input" value={x} onChange={(e) => setX(e.target.value)} required />
          </div>
          <div>
            <label className="label">Coordenada Y</label>
            <input type="number" step="0.1" className="input" value={y} onChange={(e) => setY(e.target.value)} required />
          </div>
        </div>
        <div>
          <label className="label">Piso</label>
          <select className="input" value={flr} onChange={(e) => setFlr(parseInt(e.target.value))}>
            {Object.entries(FLOOR_NAMES).map(([lvl, name]) => (
              <option key={lvl} value={lvl}>{name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Facultad (opcional)</label>
          <input className="input" value={fac} onChange={(e) => setFac(e.target.value)} maxLength={100} />
        </div>
        <div>
          <label className="label">Tipo (opcional)</label>
          <input className="input" value={btype} onChange={(e) => setBtype(e.target.value)} maxLength={50} />
        </div>
        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "Guardando..." : "Guardar"}</button>
          <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
        </div>
      </form>
    </div>
  );
}
