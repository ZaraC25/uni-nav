import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Badge, ErrorBanner, PageHeader, Spinner } from "../components/ui";
import type { GraphResponse } from "../types";

export default function Graph() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<number | -1>(-1);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    api.getGraph()
      .then(setGraph)
      .catch(() => setError("No se pudo cargar el grafo."))
      .finally(() => setLoading(false));
  }, []);

  // Draw graph on canvas
  useEffect(() => {
    if (!graph || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const nodes = selectedFloor === -1 ? graph.nodes : graph.nodes.filter((n) => n.floor === selectedFloor);
    const nodeMap = new Map(nodes.map((n) => [n.name, n]));

    if (nodes.length === 0) return;

    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const padding = 60;
    const scaleX = (W - padding * 2) / (maxX - minX || 1);
    const scaleY = (H - padding * 2) / (maxY - minY || 1);
    const scale = Math.min(scaleX, scaleY);
    const offsetX = padding + ((W - padding * 2) - (maxX - minX) * scale) / 2;
    const offsetY = padding + ((H - padding * 2) - (maxY - minY) * scale) / 2;

    const toPx = (x: number, y: number): [number, number] => [
      offsetX + (x - minX) * scale,
      offsetY + (y - minY) * scale,
    ];

    // Draw edges
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1.5;
    for (const edge of graph.edges) {
      const src = nodeMap.get(edge.source);
      const tgt = nodeMap.get(edge.target);
      if (!src || !tgt) continue;
      const [sx, sy] = toPx(src.x, src.y);
      const [tx, ty] = toPx(tgt.x, tgt.y);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);
      if (edge.bidirectional) {
        ctx.lineTo(sx, sy);
      }
      ctx.stroke();

      if (!edge.bidirectional) {
        // Arrow head for one-directional
        const angle = Math.atan2(ty - sy, tx - sx);
        const headLen = 8;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx - headLen * Math.cos(angle - Math.PI / 6), ty - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx - headLen * Math.cos(angle + Math.PI / 6), ty - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }
    }

    // Draw nodes
    for (const node of nodes) {
      const [px, py] = toPx(node.x, node.y);
      const isHovered = hoveredNode === node.name;

      ctx.beginPath();
      ctx.arc(px, py, isHovered ? 8 : 5, 0, Math.PI * 2);
      ctx.fillStyle = isHovered ? "#2e6ef0" : "#4e8dfb";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (isHovered) {
        ctx.fillStyle = "#1f56d6";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(node.name, px, py - 12);
      }
    }
  }, [graph, hoveredNode, selectedFloor]);

  // Mouse hover detection
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!graph || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const nodes = selectedFloor === -1 ? graph.nodes : graph.nodes.filter((n) => n.floor === selectedFloor);
    if (nodes.length === 0) return;

    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const W = canvas.width, H = canvas.height;
    const padding = 60;
    const scaleX = (W - padding * 2) / (maxX - minX || 1);
    const scaleY = (H - padding * 2) / (maxY - minY || 1);
    const scale = Math.min(scaleX, scaleY);
    const offsetX = padding + ((W - padding * 2) - (maxX - minX) * scale) / 2;
    const offsetY = padding + ((H - padding * 2) - (maxY - minY) * scale) / 2;

    let found: string | null = null;
    for (const node of nodes) {
      const [px, py] = [
        offsetX + (node.x - minX) * scale,
        offsetY + (node.y - minY) * scale,
      ];
      const dist = Math.sqrt((mx - px) ** 2 + (my - py) ** 2);
      if (dist <= 10) {
        found = node.name;
        break;
      }
    }
    setHoveredNode(found);
  };

  const handleReload = async () => {
    setError("");
    try {
      await api.reloadGraph();
      const g = await api.getGraph();
      setGraph(g);
    } catch {
      setError("No se pudo recargar el grafo.");
    }
  };

  if (loading) return <Spinner label="Cargando grafo..." />;

  return (
    <div>
      <PageHeader title="Grafo del Campus" subtitle="Visualización de nodos y conexiones del campus">
        {isAdmin && <button onClick={handleReload} className="btn-secondary">↻ Recargar grafo</button>}
      </PageHeader>

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

      {graph && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge color="brand">{graph.nodes.length} nodos</Badge>
            <Badge color="slate">{graph.edges.length} aristas</Badge>
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(Number(e.target.value))}
              className="input max-w-xs"
            >
              <option value={-1}>Todos los pisos</option>
              <option value={0}>Ground floor</option>
              <option value={1}>First floor</option>
              <option value={2}>Second floor</option>
              <option value={3}>Third floor</option>
              <option value={4}>Fourth floor</option>
              <option value={5}>Fifth floor</option>
              <option value={6}>Terraces</option>
              <option value={7}>Roof</option>
            </select>
          </div>

          <div className="card">
            <canvas
              ref={canvasRef}
              width={900}
              height={600}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoveredNode(null)}
              className="w-full rounded-lg bg-slate-50"
              style={{ aspectRatio: "3/2" }}
            />
            {hoveredNode && (
              <p className="mt-2 text-center text-sm text-brand-600 font-medium">
                Nodo: {hoveredNode}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
