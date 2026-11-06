import { useEffect, useState } from "react";
import { api, FLOOR_NAMES, PATH_KINDS } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Badge, ErrorBanner, PageHeader, Spinner } from "../components/ui";
import type {
  Building,
  MultiStopResponse,
  PathAlgorithm,
  PathKind,
  RouteComparisonResponse,
  RouteResponse,
} from "../types";

type Tab = "calculate" | "compare" | "multi-stop";

export default function Routes() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("calculate");
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // shared form state
  const [originId, setOriginId] = useState<number | "">("");
  const [destinationId, setDestinationId] = useState<number | "">("");
  const [algorithm, setAlgorithm] = useState<PathAlgorithm>("a_star");
  const [avoid, setAvoid] = useState<PathKind[]>([]);

  // results
  const [routeResult, setRouteResult] = useState<RouteResponse | null>(null);
  const [compareResult, setCompareResult] = useState<RouteComparisonResponse | null>(null);
  const [multiResult, setMultiResult] = useState<MultiStopResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // multi-stop state
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    api.listBuildings().then((b) => {
      setBuildings(b);
      setLoading(false);
    });
  }, []);

  const toggleAvoid = (kind: PathKind) => {
    setAvoid((prev) => (prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind]));
  };

  const toggleMultiStop = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCalculate = async () => {
    if (!originId || !destinationId) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await api.calculateRoute({
        origin_id: originId,
        destination_id: destinationId,
        algorithm,
        avoid,
      });
      setRouteResult(result);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || "No se pudo calcular la ruta.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompare = async () => {
    if (!originId || !destinationId) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await api.compareRoutes({
        origin_id: originId,
        destination_id: destinationId,
        algorithm,
        avoid,
      });
      setCompareResult(result);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || "No se pudieron comparar las rutas.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMultiStop = async () => {
    if (selectedIds.length < 2) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await api.multiStopRoute({
        building_ids: selectedIds,
        algorithm,
        avoid,
      });
      setMultiResult(result);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || "No se pudo calcular la ruta multi-parada.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner label="Cargando edificios..." />;

  return (
    <div>
      <PageHeader title="Calcular Ruta" subtitle="Encuentra el camino más corto entre dos puntos del campus" />

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

      {/* Tabs */}
      <div className="mb-6 flex gap-2 rounded-lg bg-slate-100 p-1">
        <TabButton active={tab === "calculate"} onClick={() => setTab("calculate")}>Ruta simple</TabButton>
        <TabButton active={tab === "compare"} onClick={() => setTab("compare")}>Comparar algoritmos</TabButton>
        <TabButton active={tab === "multi-stop"} onClick={() => setTab("multi-stop")}>Multi-parada</TabButton>
      </div>

      {/* Common filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {tab !== "multi-stop" ? (
            <>
              <div>
                <label className="label">Origen</label>
                <select className="input" value={originId} onChange={(e) => setOriginId(Number(e.target.value))}>
                  <option value="">Selecciona origen...</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Destino</label>
                <select className="input" value={destinationId} onChange={(e) => setDestinationId(Number(e.target.value))}>
                  <option value="">Selecciona destino...</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div className="sm:col-span-2">
              <label className="label">Selecciona los edificios a visitar (mínimo 2, en orden)</label>
              <div className="flex flex-wrap gap-2">
                {buildings.map((b) => {
                  const idx = selectedIds.indexOf(b.id);
                  return (
                    <button
                      key={b.id}
                      onClick={() => toggleMultiStop(b.id)}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                        idx >= 0
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {idx >= 0 && <span className="mr-1 font-bold">{idx + 1}.</span>}
                      {b.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Algoritmo</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={algorithm === "a_star"} onChange={() => setAlgorithm("a_star")} />
                A* (heurística)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={algorithm === "dijkstra"} onChange={() => setAlgorithm("dijkstra")} />
                Dijkstra
              </label>
            </div>
          </div>
          <div>
            <label className="label">Evitar tipos de camino</label>
            <div className="flex flex-wrap gap-2">
              {PATH_KINDS.map((kind) => (
                <label key={kind} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm">
                  <input type="checkbox" checked={avoid.includes(kind)} onChange={() => toggleAvoid(kind)} />
                  {kind}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4">
          {tab === "calculate" && (
            <button onClick={handleCalculate} disabled={submitting || !originId || !destinationId} className="btn-primary">
              {submitting ? "Calculando..." : user ? "Calcular y guardar" : "Calcular"}
            </button>
          )}
          {tab === "compare" && (
            <button onClick={handleCompare} disabled={submitting || !originId || !destinationId} className="btn-primary">
              {submitting ? "Comparando..." : "Comparar algoritmos"}
            </button>
          )}
          {tab === "multi-stop" && (
            <button onClick={handleMultiStop} disabled={submitting || selectedIds.length < 2} className="btn-primary">
              {submitting ? "Calculando..." : `Calcular ruta (${selectedIds.length} paradas)`}
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {tab === "calculate" && routeResult && <RouteResult result={routeResult} />}
      {tab === "compare" && compareResult && <CompareResult result={compareResult} />}
      {tab === "multi-stop" && multiResult && <MultiStopResult result={multiResult} />}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
        active ? "bg-white text-brand-600 shadow-sm" : "text-slate-500"
      }`}
    >
      {children}
    </button>
  );
}

function RouteResult({ result }: { result: RouteResponse }) {
  return (
    <div className="card">
      <h3 className="text-lg font-bold text-slate-800">Resultado de la ruta</h3>
      <p className="mt-1 text-sm text-slate-500">
        De <span className="font-semibold text-brand-600">{result.origin_name}</span> a{" "}
        <span className="font-semibold text-brand-600">{result.destination_name}</span>
      </p>
      <div className="mt-4 flex items-center gap-2">
        <Badge color="brand">Distancia: {result.distance.toFixed(2)} m</Badge>
        <Badge color="slate">{result.path.length} nodos</Badge>
      </div>
      <div className="mt-4">
        <p className="mb-2 text-sm font-medium text-slate-600">Camino:</p>
        <div className="flex flex-wrap items-center gap-1">
          {result.path.map((node, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="rounded-md bg-slate-100 px-2 py-1 text-sm text-slate-700">{node}</span>
              {i < result.path.length - 1 && <span className="text-slate-300">→</span>}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-6">
        <p className="mb-2 text-sm font-medium text-slate-600">Pasos detallados:</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="pb-2">Desde</th>
              <th className="pb-2">Hasta</th>
              <th className="pb-2">Tipo</th>
              <th className="pb-2 text-right">Distancia</th>
            </tr>
          </thead>
          <tbody>
            {result.steps.map((step, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-2">{step.origin_name}</td>
                <td className="py-2">{step.destination_name}</td>
                <td className="py-2"><Badge color="amber">{step.kind}</Badge></td>
                <td className="py-2 text-right text-slate-500">{step.distance.toFixed(2)} m</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CompareResult({ result }: { result: RouteComparisonResponse }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {result.results.map((r) => (
        <div key={r.algorithm} className="card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">{r.algorithm === "a_star" ? "A*" : "Dijkstra"}</h3>
            <Badge color="brand">{r.distance.toFixed(2)} m</Badge>
          </div>
          <p className="text-sm text-slate-500">{r.path.length} nodos</p>
          <div className="mt-3 flex flex-wrap items-center gap-1">
            {r.path.map((node, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{node}</span>
                {i < r.path.length - 1 && <span className="text-slate-300">→</span>}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MultiStopResult({ result }: { result: MultiStopResponse }) {
  return (
    <div>
      <div className="card mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-slate-800">Distancia total</h3>
          <Badge color="brand">{result.total_distance.toFixed(2)} m</Badge>
        </div>
      </div>
      {result.legs.map((leg, i) => (
        <div key={i} className="card mb-3">
          <h4 className="font-semibold text-slate-700">
            {i + 1}. {leg.origin_name} → {leg.destination_name}
          </h4>
          <Badge color="brand">{leg.distance.toFixed(2)} m</Badge>
          <div className="mt-3 flex flex-wrap items-center gap-1">
            {leg.path.map((node, j) => (
              <span key={j} className="flex items-center gap-1">
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{node}</span>
                {j < leg.path.length - 1 && <span className="text-slate-300">→</span>}
              </span>
            ))}
          </div>
          <div className="mt-3 space-y-1">
            {leg.steps.map((step, j) => (
              <div key={j} className="flex justify-between text-xs text-slate-500">
                <span>{step.origin_name} → {step.destination_name} ({step.kind})</span>
                <span>{step.distance.toFixed(2)} m</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
