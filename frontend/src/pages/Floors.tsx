import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Badge, PageHeader, Spinner, EmptyState } from "../components/ui";
import type { FloorResponse } from "../types";

export default function Floors() {
  const [floors, setFloors] = useState<FloorResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listFloors()
      .then(setFloors)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="Cargando pisos..." />;

  return (
    <div>
      <PageHeader title="Pisos del Campus" subtitle="Distribución de edificios por nivel" />

      {floors.length === 0 ? (
        <EmptyState icon="" title="Sin datos" subtitle="No hay pisos registrados." />
      ) : (
        <div className="space-y-3">
          {[...floors].reverse().map((floor) => (
            <div key={floor.level} className="card flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">
                  {floor.level}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{floor.name}</h3>
                  <p className="text-xs text-slate-400">Nivel {floor.level}</p>
                </div>
              </div>
              <Badge color={floor.building_count > 0 ? "brand" : "slate"}>
                {floor.building_count} edificio{floor.building_count !== 1 ? "s" : ""}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
