import { useEffect, useState } from "react";
import { api } from "../api/client";
import { PageHeader, Spinner, Badge } from "../components/ui";
import type { HierarchyNode, HierarchyResponse } from "../types";

export default function Campus() {
  const [data, setData] = useState<HierarchyResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.campusHierarchy()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="Cargando jerarquía..." />;

  return (
    <div>
      <PageHeader title="Jerarquía del Campus" subtitle="Organización del campus en árbol" />

      {data && (
        <div className="mb-6 flex gap-3">
          <Badge color="brand">Altura: {data.height}</Badge>
          <Badge color="slate">Nodos totales: {data.total_nodes}</Badge>
        </div>
      )}

      <div className="card">
        {data && <NodeTree node={data.root} depth={0} />}
      </div>
    </div>
  );
}

function NodeTree({ node, depth }: { node: HierarchyNode; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 2);

  const hasChildren = node.children.length > 0;

  return (
    <div className={depth > 0 ? "ml-4 border-l border-slate-200 pl-4" : ""}>
      <div
        className={`flex items-center gap-2 rounded-lg px-3 py-2 ${depth === 0 ? "bg-brand-50" : "hover:bg-slate-50"}`}
      >
        {hasChildren && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-slate-400 hover:text-slate-600"
          >
            {expanded ? "▼" : "▶"}
          </button>
        )}
        <span className={`text-sm ${depth === 0 ? "font-bold text-brand-700" : "font-medium text-slate-700"}`}>
          {node.name}
        </span>
        {Object.keys(node.data).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {Object.entries(node.data).slice(0, 3).map(([key, value]) => (
              <span key={key} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                {key}: {String(value)}
              </span>
            ))}
          </div>
        )}
      </div>
      {expanded && hasChildren && (
        <div className="mt-1 space-y-1">
          {node.children.map((child, i) => (
            <NodeTree key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
