import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Badge, ErrorBanner, PageHeader, Spinner } from "../components/ui";

function sendMsg(iframe: HTMLIFrameElement | null, msg: object) {
  try { iframe?.contentWindow?.postMessage(msg, "*"); } catch { /* ok */ }
}

export default function Graph() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [nodeCount, setNodeCount] = useState<number | null>(null);
  const [edgeCount, setEdgeCount] = useState<number | null>(null);

  useEffect(() => {
    api.getGraph()
      .then((g) => { setNodeCount(g.nodes.length); setEdgeCount(g.edges.length); })
      .catch(() => setError("No se pudo cargar los datos del grafo."));
  }, []);

  const handleReload = async () => {
    setError("");
    try {
      await api.reloadGraph();
      const g = await api.getGraph();
      setNodeCount(g.nodes.length);
      setEdgeCount(g.edges.length);
      // refresh iframe
      if (iframeRef.current) {
        iframeRef.current.src = iframeRef.current.src;
      }
    } catch {
      setError("No se pudo recargar el grafo.");
    }
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col">
      <PageHeader title="Grafo 3D del Campus" subtitle="Espacios y conexiones del Bloque UCC Pasto">
        {isAdmin && (
          <button onClick={handleReload} className="btn-secondary">↻ Recargar grafo</button>
        )}
      </PageHeader>

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

      {/* stats bar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {nodeCount !== null && <Badge color="brand">{nodeCount} nodos (API)</Badge>}
        {edgeCount !== null && <Badge color="slate">{edgeCount} aristas (API)</Badge>}
        <span className="text-xs text-slate-400">
          Arrastra para girar · Shift+arrastra para mover · Rueda para zoom · Clic en nodo para ver conexiones
        </span>
      </div>

      {/* 3D graph iframe */}
      <div className="relative flex-1 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
            <Spinner label="Cargando grafo 3D..." />
          </div>
        )}
        <iframe
          ref={iframeRef}
          src="/grafo_3d_edificio.html"
          title="Grafo 3D UCC Pasto"
          className="h-full w-full border-0"
          onLoad={() => setReady(true)}
          allowFullScreen
        />
      </div>

      {/* controls */}
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => sendMsg(iframeRef.current, { type: "SHOW_ALL" })}        className="btn-secondary text-xs">Todos los pisos</button>
        <button onClick={() => sendMsg(iframeRef.current, { type: "CLEAR_HIGHLIGHT" })} className="btn-secondary text-xs">Limpiar resaltado</button>
        {[0,1,2,3,4,5].map((f) => (
          <button key={f} onClick={() => sendMsg(iframeRef.current, { type: "SHOW_FLOOR", floor: f })} className="btn-secondary text-xs">
            P{f}
          </button>
        ))}
      </div>
    </div>
  );
}
