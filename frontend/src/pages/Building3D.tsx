import { useCallback, useEffect, useRef, useState } from "react";
import { api, FLOOR_NAMES } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Badge, Spinner } from "../components/ui";
import type {
  Building,
  PopularPlace,
  QueuePosition,
  QueueStatus,
  RouteResponse,
  TourSession,
  TourSummary,
} from "../types";

// ─── Which tabs use the 3D graph vs the architectural model ──────────────────
const GRAPH_TABS = new Set(["routes", "navigation"]);

// ─── postMessage helpers ──────────────────────────────────────────────────────
function sendMsg(iframe: HTMLIFrameElement | null, msg: object) {
  try { iframe?.contentWindow?.postMessage(msg, "*"); } catch { /* cross-origin guard */ }
}

// ─── Space directory data (from DWG plans, nov. 2018) ────────────────────────
interface SpaceEntry {
  label: string;
  count: string;
  floors: number[];
  detail?: string;
  rooms?: string[];
}
const SPACE_DIRECTORY: { category: string; color: string; items: SpaceEntry[] }[] = [
  {
    category: "Académicos",
    color: "bg-blue-100 text-blue-700",
    items: [
      {
        label: "Aulas", count: "48", floors: [1, 2, 3, 4, 5],
        detail: "P1: 3 · P2: 9 · P3: 9 · P4: 13 · P5: 14",
        rooms: [
          "P1: 101, 112, 113",
          "P2: 201–207, 219, 220",
          "P3: 303, 307–312, 316, 318",
          "P4: 401–404, 406, 407, 414, 415, 420–424",
          "P5: 501–505, 509–515, 517, 518",
        ],
      },
      { label: "Auditorios", count: "2", floors: [0, 5], detail: "Auditorio (P0) · Auditorio Urcunina (P5)" },
      { label: "Laboratorios", count: "≈14", floors: [3], detail: "Informática ×5 (P3) · Multifuncionales ×4 · Morfología, Biología molecular, Simulación clínica, Operaciones, Estudio sensorial" },
    ],
  },
  {
    category: "Salas", color: "bg-purple-100 text-purple-700",
    items: [{ label: "Salas (todas)", count: "≈17", floors: [0, 1, 2, 3, 4, 5], detail: "Profesores ×5 · Juntas ×3 · Consultas ×2 · Espera ×2 · Lectura ×1-2 · Debriefing, Audiencia, Biblioteca ×1 c/u" }],
  },
  {
    category: "Servicios", color: "bg-green-100 text-green-700",
    items: [
      { label: "Cafeterías / cafetines", count: "3", floors: [0, 1, 4], detail: "Cafetería (P1) · Cafetín (P0) · Cafetín (P4)" },
      { label: "Baños hombres", count: "14", floors: [0, 1, 2, 3, 4, 5] },
      { label: "Baños mujeres", count: "7", floors: [0, 1, 2, 3, 4, 5] },
      { label: "Ascensores", count: "12 rótulos", floors: [0, 1, 2, 3, 4, 5], detail: "Se repiten entre pisos" },
      { label: "Bodegas", count: "≈11", floors: [0], detail: "Principalmente en piso cero" },
    ],
  },
  {
    category: "Bienestar y recreación", color: "bg-amber-100 text-amber-700",
    items: [
      { label: "Zonas de estar", count: "2", floors: [2, 4], detail: "P2 y P4 · Área multifuncional en P0 · 14 plazoletas exteriores" },
      { label: "Gimnasio", count: "1", floors: [0] },
      { label: "Canchas sintéticas", count: "2", floors: [6], detail: "Azotea" },
      { label: "Salón de música", count: "1", floors: [6], detail: "Azotea" },
      { label: "Terrazas", count: "5", floors: [2, 3, 4, 5, 6] },
    ],
  },
  {
    category: "Administrativo", color: "bg-slate-100 text-slate-700",
    items: [
      { label: "Decanaturas", count: "4 rótulos", floors: [0, 1, 2, 3] },
      { label: "Oficinas", count: "≈8", floors: [0, 1, 2, 3, 4] },
      { label: "Recepción", count: "1", floors: [0] },
      { label: "Bienestar", count: "1", floors: [0] },
      { label: "Consultorio", count: "1", floors: [0, 1] },
    ],
  },
];

type Tab = "buildings" | "routes" | "navigation" | "tours";

// ─────────────────────────────────────────────────────────────────────────────
export default function Building3D() {
  const { user } = useAuth();

  // two iframes: architectural model and 3D graph
  const modelRef = useRef<HTMLIFrameElement>(null);
  const graphRef  = useRef<HTMLIFrameElement>(null);
  const [modelReady, setModelReady] = useState(false);
  const [graphReady, setGraphReady] = useState(false);

  const [tab, setTab] = useState<Tab>("buildings");
  const [activeFloor, setActiveFloor] = useState<number | null>(null);

  // data
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState("");

  // routes
  const [originId, setOriginId] = useState<number | "">("");
  const [destId,   setDestId]   = useState<number | "">("");
  const [routeResult,  setRouteResult]  = useState<RouteResponse | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError,   setRouteError]   = useState("");

  // navigation
  const [navSearch,  setNavSearch]  = useState("");
  const [navLoading, setNavLoading] = useState(false);
  const [navMsg,     setNavMsg]     = useState("");
  const [navTrail,   setNavTrail]   = useState<string[]>([]);
  const [currentNav, setCurrentNav] = useState<string>("");
  const [navRouteResult,  setNavRouteResult]  = useState<RouteResponse | null>(null);
  const [prevNavBuildingId, setPrevNavBuildingId] = useState<number | null>(null);

  // tours
  const [tours,           setTours]           = useState<TourSummary[]>([]);
  const [session,         setSession]         = useState<TourSession | null>(null);
  const [tourLoading,     setTourLoading]     = useState(false);
  const [tourRouteResult, setTourRouteResult] = useState<RouteResponse | null>(null);
  const [prevTourBuildingId, setPrevTourBuildingId] = useState<number | null>(null);

  // queues
  const [queueStatuses, setQueueStatuses] = useState<Record<number, QueueStatus>>({});
  const [myPositions,   setMyPositions]   = useState<Record<number, QueuePosition>>({});
  const [queueMsg,      setQueueMsg]      = useState("");

  // rankings
  const [popularPlaces, setPopularPlaces] = useState<PopularPlace[]>([]);

  // graph nodes received from iframe
  const [graphNodes, setGraphNodes] = useState<Array<{id: number; name: string; floor: number; category: string}>>([]);
  const [nodeSearch, setNodeSearch] = useState("");

  // ── active journey (step-by-step navigation through a route) ─────────────
  const [journeyPath,    setJourneyPath]    = useState<string[]>([]);   // node names
  const [journeyStep,    setJourneyStep]    = useState(0);              // current index
  const [journeyActive,  setJourneyActive]  = useState(false);
  const [journeyDist,    setJourneyDist]    = useState(0);
  const [journeySaved,   setJourneySaved]   = useState(false);
  const [journeySaveMsg, setJourneySaveMsg] = useState("");
  const [routePickStep,       setRoutePickStep]       = useState<"idle" | "destination" | "done">("idle");
  const [routePickOriginName, setRoutePickOriginName] = useState("");

  // keep a ref to buildings so async callbacks always see latest value
  const buildingsRef = useRef<Building[]>([]);
  useEffect(() => { buildingsRef.current = buildings; }, [buildings]);

  // core route calc — always uses a_star, no avoid
  const triggerRouteCalc = useCallback(async (oId: number, dId: number) => {
    if (!oId || !dId || oId === dId) return;
    setRouteLoading(true);
    setRouteError("");
    setRouteResult(null);
    try {
      const result = await api.calculateRoute({
        origin_id: oId,
        destination_id: dId,
        algorithm: "a_star",
        avoid: [],
      });
      setRouteResult(result);
      sendMsg(graphRef.current, { type: "HIGHLIGHT_ROUTE", path: result.path });
      const origin = buildingsRef.current.find((b) => b.id === oId);
      if (origin) sendMsg(graphRef.current, { type: "SHOW_FLOOR", floor: origin.floor });
    } catch {
      setRouteError("No se pudo calcular la ruta. Verifica que los edificios estén conectados.");
    } finally {
      setRouteLoading(false);
    }
  }, []);

  // ── listen to messages from both iframes ──────────────────────────────────
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!e.data?.type) return;
      const d = e.data;

      if (d.type === "FLOOR_CLICKED") setActiveFloor(d.floor as number);

      if (d.type === "NODE_CLICKED") setNavMsg(`Seleccionado: ${d.name} (P${d.floor})`);

      // Graph sent its node list on load
      if (d.type === "GRAPH_READY") {
        setGraphNodes(d.nodes as Array<{id: number; name: string; floor: number; category: string}>);
      }

      // Route pick — 1st click (origin selected in graph)
      if (d.type === "ORIGIN_SELECTED") {
        setRoutePickStep("destination");
        setRoutePickOriginName(d.name as string);
        setRouteResult(null);
        setRouteError("");
      }

      // Route pick — graph calculated internally, show result
      if (d.type === "ROUTE_CALCULATED") {
        setRoutePickStep("done");
        setRoutePickOriginName("");
        const realDist = typeof d.distanceM === "number" ? d.distanceM : (d.hops as number) * 10;
        setRouteResult({
          origin_name:      (d.origin as { name: string }).name,
          destination_name: (d.destination as { name: string }).name,
          path:             d.path as string[],
          distance:         realDist,
          steps: [],
        } as RouteResponse);
        setRouteError("");
      }

      // Route not found
      if (d.type === "ROUTE_NOT_FOUND") {
        setRoutePickStep("idle");
        setRoutePickOriginName("");
        setRouteError(`No hay camino entre "${d.origin}" y "${d.destination}" en el grafo.`);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [triggerRouteCalc]);

  // activate / deactivate route-pick mode when tab changes or graph loads
  useEffect(() => {
    if (!graphReady) return;
    const isRouteTab = tab === "routes";
    sendMsg(graphRef.current, { type: "SET_ROUTE_MODE", enabled: isRouteTab });
    if (!isRouteTab) {
      setRoutePickStep("idle");
      setRoutePickOriginName("");
    }
  }, [tab, graphReady]);
  const loadAll = useCallback(async () => {
    try {
      const [b, t, s, pp] = await Promise.all([
        api.listBuildings().catch(()   => [] as Building[]),
        api.listTours().catch(()       => [] as TourSummary[]),
        api.getTourSession().catch(()  => null),
        api.popularPlaces(10).catch(() => [] as PopularPlace[]),
      ]);
      setBuildings(b);
      setTours(t);
      setSession(s);
      setPopularPlaces(pp);
      const statuses: Record<number, QueueStatus> = {};
      await Promise.all(b.slice(0, 20).map(async (bld) => {
        try { statuses[bld.id] = await api.getQueue(bld.id); } catch { /* ok */ }
      }));
      setQueueStatuses(statuses);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── sync floor to architectural model ─────────────────────────────────────
  const showFloor = (floor: number) => {
    setActiveFloor(floor);
    sendMsg(modelRef.current, { type: "SHOW_FLOOR", floor });
    sendMsg(graphRef.current,  { type: "SHOW_FLOOR", floor });
  };

  const showAll = () => {
    setActiveFloor(null);
    sendMsg(modelRef.current, { type: "SHOW_ALL" });
    sendMsg(graphRef.current,  { type: "SHOW_ALL" });
  };

  // ── route calculation (manual button) ───────────────────────────────────
  const handleRoute = () => {
    if (!originId || !destId) return;
    triggerRouteCalc(originId as number, destId as number);
  };

  // ── journey (step-by-step walk through a route) ───────────────────────────
  const startJourney = (path: string[], distM: number) => {
    setJourneyPath(path);
    setJourneyStep(0);
    setJourneyActive(true);
    setJourneyDist(distM);
    setJourneySaved(false);
    setJourneySaveMsg("");
    setTab("navigation");
    // highlight first node
    sendMsg(graphRef.current, { type: "HIGHLIGHT_NODE", name: path[0] });
    // find floor of first node
    const firstNode = graphNodes.find(n => n.name === path[0]);
    if (firstNode) showFloor(firstNode.floor);
  };

  const journeyNext = () => {
    const next = journeyStep + 1;
    if (next >= journeyPath.length) return;
    setJourneyStep(next);
    const nodeName = journeyPath[next];
    sendMsg(graphRef.current, { type: "HIGHLIGHT_NODE", name: nodeName });
    const node = graphNodes.find(n => n.name === nodeName);
    if (node) showFloor(node.floor);
    // register visit in navigation history if it matches a building
    const building = buildingsRef.current.find(b => b.name.toLowerCase() === nodeName.toLowerCase());
    if (building) api.visitPlace(building.id).catch(() => {});
  };

  const journeyPrev = () => {
    const prev = journeyStep - 1;
    if (prev < 0) return;
    setJourneyStep(prev);
    const nodeName = journeyPath[prev];
    sendMsg(graphRef.current, { type: "HIGHLIGHT_NODE", name: nodeName });
    const node = graphNodes.find(n => n.name === nodeName);
    if (node) showFloor(node.floor);
  };

  const journeyFinish = async () => {
    setJourneyActive(false);
    sendMsg(graphRef.current, { type: "CLEAR_HIGHLIGHT" });

    // Match every node in the path to a building ID (in order, deduplicated)
    const ids: number[] = [];
    for (const name of journeyPath) {
      const b = buildingsRef.current.find(
        bld => bld.name.toLowerCase() === name.toLowerCase()
      );
      if (b && !ids.includes(b.id)) ids.push(b.id);
    }

    const origin = journeyPath[0];
    const dest   = journeyPath[journeyPath.length - 1];
    const tourName = `Viaje: ${origin} → ${dest}`;
    const tourDesc = `${journeyPath.length} paradas · ${journeyDist.toFixed(1)} m · ~${Math.round(journeyDist / 1.4)} s`;

    if (ids.length >= 2) {
      try {
        await api.createTour({ name: tourName, description: tourDesc, building_ids: ids });
        setJourneySaved(true);
        setJourneySaveMsg(`✅ Viaje guardado en Tours con ${ids.length} paradas`);
        const t = await api.listTours();
        setTours(t);
      } catch {
        setJourneySaveMsg("⚠️ Viaje completado — no se pudo guardar (edificios no registrados en el sistema)");
      }
    } else {
      // Still save as tour with just origin+dest if we have at least 1 building
      if (ids.length === 1) {
        setJourneySaveMsg(`⚠️ Solo se encontró 1 edificio registrado. Viaje completado: ${origin} → ${dest}`);
      } else {
        setJourneySaveMsg(`Viaje completado: ${origin} → ${dest} (${journeyPath.length} paradas)`);
      }
    }
    setJourneyPath([]);
    setJourneyStep(0);
  };

  // Send a PICK_NODE to the graph (triggers selectNode inside iframe)
  const pickGraphNode = (name: string) => {
    sendMsg(graphRef.current, { type: "PICK_NODE", name });
  };

  // reset graph when changing origin/dest manually
  const handleOriginChange = (id: number) => {
    setOriginId(id);
    setRouteResult(null);
    setRoutePickStep("idle");
    sendMsg(graphRef.current, { type: "CLEAR_HIGHLIGHT" });
    // auto-calculate if dest already set
    if (id && destId) triggerRouteCalc(id, destId as number);
  };
  const handleDestChange = (id: number) => {
    setDestId(id);
    setRouteResult(null);
    setRoutePickStep("idle");
    sendMsg(graphRef.current, { type: "CLEAR_HIGHLIGHT" });
    // auto-calculate if origin already set
    if (id && originId) triggerRouteCalc(originId as number, id);
  };

  // ── navigation ────────────────────────────────────────────────────────────
  const handleVisit = async (b: Building) => {
    setNavLoading(true);
    setNavMsg("");
    setNavRouteResult(null);
    try {
      // if there's already a current position, calculate route first
      if (prevNavBuildingId && prevNavBuildingId !== b.id) {
        try {
          const route = await api.calculateRoute({
            origin_id: prevNavBuildingId,
            destination_id: b.id,
            algorithm: "a_star",
            avoid: [],
          });
          setNavRouteResult(route);
          sendMsg(graphRef.current, { type: "HIGHLIGHT_ROUTE", path: route.path });
        } catch { /* route not found, just navigate */ }
      }
      await api.visitPlace(b.id);
      setNavMsg(`Visitaste: ${b.name}`);
      setCurrentNav(b.name);
      setPrevNavBuildingId(b.id);
      setNavTrail((prev) => [...prev.slice(-9), b.name]);
      sendMsg(graphRef.current, { type: "SHOW_FLOOR", floor: b.floor });
      sendMsg(graphRef.current, { type: "HIGHLIGHT_NODE", name: b.name });
      showFloor(b.floor);
    } catch {
      setNavMsg("Error al registrar visita.");
    } finally {
      setNavLoading(false);
    }
  };

  const handleNavBack = async () => {
    try {
      await api.goBack();
      const trail = await api.getNavigation();
      const cur = trail.trail.find((t) => t.is_current);
      if (cur) {
        setCurrentNav(cur.building_name);
        setPrevNavBuildingId(cur.building_id);
        setNavRouteResult(null);
        sendMsg(graphRef.current, { type: "HIGHLIGHT_NODE", name: cur.building_name });
        showFloor(cur.floor);
      }
    } catch { /* ignore */ }
  };

  const handleNavForward = async () => {
    try {
      await api.goForward();
      const trail = await api.getNavigation();
      const cur = trail.trail.find((t) => t.is_current);
      if (cur) {
        setCurrentNav(cur.building_name);
        setPrevNavBuildingId(cur.building_id);
        setNavRouteResult(null);
        sendMsg(graphRef.current, { type: "HIGHLIGHT_NODE", name: cur.building_name });
        showFloor(cur.floor);
      }
    } catch { /* ignore */ }
  };

  // ── save nav trail as tour ────────────────────────────────────────────────
  const [savingTour,    setSavingTour]    = useState(false);
  const [tourSaveMsg,   setTourSaveMsg]   = useState("");
  const [showSaveTour,  setShowSaveTour]  = useState(false);
  const [newTourName,   setNewTourName]   = useState("");

  const handleSaveNavAsTour = async () => {
    if (!newTourName.trim() || navTrail.length < 2) return;
    setSavingTour(true);
    setTourSaveMsg("");
    try {
      // Match trail names to building IDs
      const ids: number[] = [];
      for (const name of navTrail) {
        const match = buildingsRef.current.find(
          (b) => b.name.toLowerCase() === name.toLowerCase()
        );
        if (match && !ids.includes(match.id)) ids.push(match.id);
      }
      if (ids.length < 2) {
        setTourSaveMsg("Se necesitan al menos 2 edificios registrados en el rastro.");
        return;
      }
      await api.createTour({
        name: newTourName.trim(),
        description: `Guardado desde navegación — ${ids.length} paradas`,
        building_ids: ids,
      });
      setTourSaveMsg(`✅ Tour "${newTourName.trim()}" guardado con ${ids.length} paradas.`);
      setNewTourName("");
      setShowSaveTour(false);
      // Refresh tours list
      const t = await api.listTours();
      setTours(t);
    } catch {
      setTourSaveMsg("No se pudo guardar el tour.");
    } finally {
      setSavingTour(false);
    }
  };

  const handleClearNav = async () => {
    await api.clearNavigation();
    setNavTrail([]);
    setCurrentNav("");
    setNavMsg("");
    setNavRouteResult(null);
    setPrevNavBuildingId(null);
    sendMsg(graphRef.current, { type: "CLEAR_HIGHLIGHT" });
    showAll();
  };

  // ── tours ─────────────────────────────────────────────────────────────────
  const calcTourRoute = useCallback(async (fromId: number | null, toName: string, toFloor: number) => {
    if (!fromId) return;
    const dest = buildings.find((b) => b.name === toName);
    if (!dest || dest.id === fromId) return;
    try {
      const route = await api.calculateRoute({
        origin_id: fromId,
        destination_id: dest.id,
        algorithm: "a_star",
        avoid: [],
      });
      setTourRouteResult(route);
      sendMsg(graphRef.current, { type: "HIGHLIGHT_ROUTE", path: route.path });
      sendMsg(graphRef.current, { type: "SHOW_FLOOR", floor: toFloor });
    } catch { setTourRouteResult(null); }
  }, [buildings]);

  const handleStartTour = async (id: number) => {
    setTourLoading(true);
    setTourRouteResult(null);
    setPrevTourBuildingId(null);
    try {
      const s = await api.startTour(id);
      setSession(s);
      showFloor(s.current_stop.floor);
      sendMsg(graphRef.current, { type: "HIGHLIGHT_NODE", name: s.current_stop.building_name });
      const bld = buildings.find((b) => b.name === s.current_stop.building_name);
      if (bld) setPrevTourBuildingId(bld.id);
    } catch { /* ignore */ } finally { setTourLoading(false); }
  };

  const handleTourNext = async () => {
    if (!session) return;
    const prevId = prevTourBuildingId;
    try {
      const s = await api.tourNext();
      setSession(s);
      showFloor(s.current_stop.floor);
      sendMsg(graphRef.current, { type: "HIGHLIGHT_NODE", name: s.current_stop.building_name });
      const bld = buildings.find((b) => b.name === s.current_stop.building_name);
      if (bld) {
        setPrevTourBuildingId(bld.id);
        await calcTourRoute(prevId, s.current_stop.building_name, s.current_stop.floor);
      }
    } catch { /* ignore */ }
  };

  const handleTourPrev = async () => {
    if (!session) return;
    try {
      const s = await api.tourPrevious();
      setSession(s);
      setTourRouteResult(null);
      showFloor(s.current_stop.floor);
      sendMsg(graphRef.current, { type: "HIGHLIGHT_NODE", name: s.current_stop.building_name });
      const bld = buildings.find((b) => b.name === s.current_stop.building_name);
      if (bld) setPrevTourBuildingId(bld.id);
    } catch { /* ignore */ }
  };

  const handleEndTour = async () => {
    await api.endTour();
    setSession(null);
    setTourRouteResult(null);
    setPrevTourBuildingId(null);
    showAll();
    sendMsg(graphRef.current, { type: "CLEAR_HIGHLIGHT" });
  };

  // ── queues ────────────────────────────────────────────────────────────────
  const joinQueue = async (bld: Building) => {
    setQueueMsg("");
    try {
      const pos = await api.joinQueue(bld.id);
      setMyPositions((p) => ({ ...p, [bld.id]: pos }));
      const status = await api.getQueue(bld.id);
      setQueueStatuses((s) => ({ ...s, [bld.id]: status }));
      setQueueMsg(`Unido a la cola de ${bld.name} — posición #${pos.position}`);
      showFloor(bld.floor);
    } catch { setQueueMsg("No se pudo unir a la cola."); }
  };

  const leaveQueue = async (bld: Building) => {
    try {
      await api.leaveQueue(bld.id);
      setMyPositions((p) => { const c = { ...p }; delete c[bld.id]; return c; });
      const status = await api.getQueue(bld.id);
      setQueueStatuses((s) => ({ ...s, [bld.id]: status }));
      setQueueMsg(`Saliste de la cola de ${bld.name}`);
    } catch { /* ignore */ }
  };

  // ── filters ───────────────────────────────────────────────────────────────
  const filtered    = buildings.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()));
  const navFiltered = buildings.filter((b) => b.name.toLowerCase().includes(navSearch.toLowerCase()));

  // current iframe src
  const useGraph = GRAPH_TABS.has(tab);

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="building3d-fullheight flex h-[calc(100vh-4rem)] gap-0 overflow-hidden rounded-xl border border-slate-200 shadow-sm">

      {/* ── Left: 3D viewers ─────────────────────────────────────────────── */}
      <div className="relative flex-1 overflow-hidden bg-[#eef1f4]">

        {/* Architectural model — visible on non-graph tabs */}
        <div className={`absolute inset-0 transition-opacity duration-200 ${useGraph ? "pointer-events-none opacity-0" : "opacity-100"}`}>
          {!modelReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
              <Spinner label="Cargando modelo 3D..." />
            </div>
          )}
          <iframe
            ref={modelRef}
            src="/edificio_ucc_3d.html"
            title="Modelo 3D UCC"
            className="h-full w-full border-0"
            onLoad={() => setModelReady(true)}
            allowFullScreen
          />
        </div>

        {/* 3D Graph — visible on Routes & Navigation */}
        <div className={`absolute inset-0 transition-opacity duration-200 ${useGraph ? "opacity-100" : "pointer-events-none opacity-0"}`}>
          {!graphReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
              <Spinner label="Cargando grafo 3D..." />
            </div>
          )}
          <iframe
            ref={graphRef}
            src="/grafo_3d_edificio.html"
            title="Grafo 3D UCC"
            className="h-full w-full border-0"
            onLoad={() => setGraphReady(true)}
            allowFullScreen
          />
        </div>

        {/* Legend badge */}
        {useGraph && (
          <div className="absolute top-3 right-3 flex flex-col gap-1 rounded-lg bg-white/90 px-3 py-2 text-[11px] shadow backdrop-blur-sm">
            <span className="font-semibold text-slate-600">
              {tab === "routes" && routePickStep === "idle"      && "🖱️ Clic = origen"}
              {tab === "routes" && routePickStep === "destination" && "🖱️ Clic = destino"}
              {tab === "routes" && routePickStep === "done"        && "✅ Ruta activa"}
              {tab === "navigation" && "Navegación 3D"}
            </span>
            <div className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full bg-[#22c55e]" />Origen (A)</div>
            <div className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full bg-[#fb923c]" />Intermedio</div>
            <div className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full bg-[#ef4444]" />Destino (B)</div>
            {tab === "navigation" && (
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-full bg-[#22c55e] ring-2 ring-green-300" />Posición actual
              </div>
            )}
          </div>
        )}

        {/* Floor quick-filter bar — only on architectural model */}
        {!useGraph && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-white/90 px-3 py-1.5 shadow-md backdrop-blur-sm">
            <button
              onClick={showAll}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${activeFloor === null ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >Todos</button>
            {Object.entries(FLOOR_NAMES)
              .filter(([lvl]) => Number(lvl) <= 5)
              .map(([lvl, name]) => (
                <button
                  key={lvl}
                  onClick={() => showFloor(Number(lvl))}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${activeFloor === Number(lvl) ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                >
                  {name.replace(" floor", "").replace("Ground", "P0")}
                </button>
              ))}
          </div>
        )}
      </div>

      {/* ── Right panel ──────────────────────────────────────────────────── */}
      <div className="flex w-80 flex-shrink-0 flex-col overflow-hidden border-l border-slate-200 bg-white xl:w-96">

        {/* Header */}
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-800">Campus UCC Pasto</h2>
          <p className="text-xs text-slate-400">Edificio en T · 6 pisos · ~16 400 m²</p>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-slate-100 px-2 pt-1">
          {([ ["buildings","Edificios"], ["routes","Rutas"], ["navigation","Navegar"], ["tours","Tours"] ] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`mr-1 whitespace-nowrap rounded-t-md px-3 py-2 text-xs font-medium transition-colors ${tab === key ? "border-b-2 border-brand-500 text-brand-600" : "text-slate-500 hover:text-slate-700"}`}
            >{label}</button>
          ))}
        </div>

        {/* Tab body */}
        <div className="flex-1 overflow-y-auto p-3">
          {loadingData ? (
            <div className="flex h-32 items-center justify-center"><Spinner label="Cargando..." /></div>
          ) : (
            <>
              {/* ── EDIFICIOS ──────────────────────────────────────────── */}
              {tab === "buildings" && (
                <div className="space-y-2">
                  <input type="text" placeholder="Buscar edificio..." value={search} onChange={(e) => setSearch(e.target.value)} className="input w-full text-sm" />
                  <p className="text-xs text-slate-400">Clic para resaltar el piso en el modelo</p>
                  {filtered.slice(0, 40).map((b) => (
                    <button key={b.id} onClick={() => showFloor(b.floor)}
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-brand-50 ${activeFloor === b.floor ? "border-brand-400 bg-brand-50" : "border-slate-100"}`}
                    >
                      <div>
                        <p className="font-medium text-slate-700">{b.name}</p>
                        {b.faculty && <p className="text-xs text-slate-400">{b.faculty}</p>}
                      </div>
                      <Badge color={activeFloor === b.floor ? "brand" : "slate"}>
                        {FLOOR_NAMES[b.floor]?.replace(" floor", "") ?? `P${b.floor}`}
                      </Badge>
                    </button>
                  ))}
                  {filtered.length === 0 && <p className="py-4 text-center text-xs text-slate-400">Sin resultados</p>}

                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <p className="mb-2 text-xs font-semibold text-slate-600">Directorio de espacios</p>
                    <p className="mb-3 text-[11px] leading-tight text-slate-400">Solo espacios rotulados en los planos DWG (nov. 2018). Clic en un espacio → resalta el piso.</p>
                    <SpaceDirectory showFloor={showFloor} activeFloor={activeFloor} />
                  </div>
                </div>
              )}

              {/* ── RUTAS ──────────────────────────────────────────────── */}
              {tab === "routes" && (
                <div className="space-y-3">

                  {/* ── Estado del modo clic ─────────────────────────── */}
                  <div className={`rounded-lg border px-3 py-2 text-xs transition-colors ${
                    routePickStep === "idle"        ? "border-blue-100 bg-blue-50 text-blue-700"
                    : routePickStep === "destination" ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-green-200 bg-green-50 text-green-700"
                  }`}>
                    {routePickStep === "idle" && <>🖱️ <strong>Clic en el grafo</strong> o busca abajo para seleccionar el <strong>origen</strong></>}
                    {routePickStep === "destination" && <>✅ Origen: <strong>{routePickOriginName}</strong> — ahora selecciona el <strong>destino</strong></>}
                    {routePickStep === "done" && !routeLoading && routeResult && <>✅ <strong>{routeResult.distance.toFixed(1)} m</strong> · ~{Math.round(routeResult.distance / 1.4)} s · Clic para nueva ruta</>}
                    {routePickStep === "done" && routeLoading && <>⏳ Calculando...</>}
                  </div>

                  {/* ── Reset ────────────────────────────────────────── */}
                  {routePickStep !== "idle" && (
                    <button onClick={() => {
                      setRoutePickStep("idle"); setRoutePickOriginName("");
                      setRouteResult(null); setRouteError("");
                      sendMsg(graphRef.current, { type: "CLEAR_HIGHLIGHT" });
                      sendMsg(graphRef.current, { type: "SET_ROUTE_MODE", enabled: true });
                    }} className="btn-secondary w-full text-xs">↺ Nueva selección</button>
                  )}

                  {/* ── Buscador de nodos del grafo ───────────────────── */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50">
                    <div className="border-b border-slate-200 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {routePickStep === "destination" ? "🔴 Selecciona el DESTINO" : "🟢 Selecciona el ORIGEN"}
                      </p>
                      <input
                        type="text"
                        placeholder="Buscar espacio en el grafo..."
                        value={nodeSearch}
                        onChange={(e) => setNodeSearch(e.target.value)}
                        className="mt-1.5 w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-brand-400"
                      />
                    </div>
                    <div className="max-h-44 overflow-y-auto p-2">
                      {graphNodes.length === 0 ? (
                        <p className="py-2 text-center text-[11px] text-slate-400">Cargando nodos del grafo...</p>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {graphNodes
                            .filter(n => !nodeSearch || n.name.toLowerCase().includes(nodeSearch.toLowerCase()))
                            .slice(0, 60)
                            .map((n) => {
                              const catColors: Record<string, string> = {
                                aula: "bg-amber-50 border-amber-300 text-amber-800",
                                laboratorio: "bg-red-50 border-red-300 text-red-800",
                                sala: "bg-green-50 border-green-300 text-green-800",
                                oficina: "bg-purple-50 border-purple-300 text-purple-800",
                                bano: "bg-slate-50 border-slate-300 text-slate-700",
                                ascensor: "bg-blue-50 border-blue-300 text-blue-800",
                                cafeteria: "bg-pink-50 border-pink-300 text-pink-800",
                                auditorio: "bg-rose-50 border-rose-300 text-rose-800",
                                bodega: "bg-stone-50 border-stone-300 text-stone-700",
                                estar: "bg-teal-50 border-teal-300 text-teal-800",
                                deporte: "bg-lime-50 border-lime-300 text-lime-800",
                              };
                              const cls = catColors[n.category] ?? "bg-white border-slate-200 text-slate-700";
                              return (
                                <button
                                  key={n.id}
                                  onClick={() => pickGraphNode(n.name)}
                                  className={`rounded border px-2 py-0.5 text-[11px] transition-opacity hover:opacity-80 ${cls}`}
                                  title={`${n.name} — Piso ${n.floor}`}
                                >
                                  {n.name} <span className="opacity-60">P{n.floor}</span>
                                </button>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </div>

                  {routeError && <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-600">{routeError}</p>}

                  {/* ── Result ────────────────────────────────────────── */}
                  {routeResult && (
                    <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-xs">
                      <p className="font-semibold text-brand-700">
                        {routeResult.origin_name} → {routeResult.destination_name}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <span className="rounded bg-brand-100 px-2 py-0.5 font-bold text-brand-700">
                          {routeResult.distance.toFixed(1)} m
                        </span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600">
                          ~{Math.round(routeResult.distance / 1.4)} s caminando
                        </span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600">
                          {routeResult.path.length} nodos
                        </span>
                      </div>

                      {/* Start journey button */}
                      <button
                        onClick={() => startJourney(routeResult.path, routeResult.distance)}
                        className="mt-2 w-full rounded-lg bg-emerald-600 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                      >
                        🚶 Iniciar viaje paso a paso
                      </button>

                      <div className="mt-3">
                        <p className="mb-1 font-medium text-slate-600">Camino:</p>
                        <div className="flex flex-wrap items-center gap-1">
                          {routeResult.path.map((node, i) => (
                            <span key={i} className="flex items-center gap-0.5">
                              <span className={`rounded px-1.5 py-0.5 text-slate-700 shadow-sm ${
                                i === 0 ? "bg-green-100 font-bold" :
                                i === routeResult.path.length - 1 ? "bg-red-100 font-bold" : "bg-white"
                              }`}>{node}</span>
                              {i < routeResult.path.length - 1 && <span className="text-slate-300">›</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── NAVEGACIÓN ─────────────────────────────────────────── */}
              {tab === "navigation" && (
                <div className="space-y-2">
                  <div className="rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-xs text-green-700">
                    Selecciona un sitio para visitarlo — se calcula la ruta desde tu posición actual y el grafo resalta el camino.
                  </div>

                  {/* ── Active journey panel ──────────────────────────── */}
                  {journeyActive && (
                    <div className="rounded-lg border-2 border-emerald-400 bg-emerald-50 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-emerald-700">🚶 Viaje en curso</p>
                        <span className="text-[11px] text-emerald-600">{journeyStep + 1} / {journeyPath.length}</span>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-emerald-100">
                        <div
                          className="h-1.5 rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${((journeyStep + 1) / journeyPath.length) * 100}%` }}
                        />
                      </div>

                      {/* Current node */}
                      <div className="mt-2 rounded-lg bg-white p-2 text-xs">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Estás en</p>
                        <p className="font-semibold text-slate-800">{journeyPath[journeyStep]}</p>
                        {journeyStep < journeyPath.length - 1 && (
                          <p className="mt-0.5 text-slate-400">
                            Siguiente: <span className="font-medium text-slate-600">{journeyPath[journeyStep + 1]}</span>
                          </p>
                        )}
                      </div>

                      {/* Navigation controls */}
                      <div className="mt-2 flex gap-1.5">
                        <button onClick={journeyPrev} disabled={journeyStep === 0}
                          className="btn-secondary flex-1 py-1 text-xs disabled:opacity-40">← Atrás</button>
                        {journeyStep < journeyPath.length - 1 ? (
                          <button onClick={journeyNext} className="btn-primary flex-1 py-1 text-xs">Avanzar →</button>
                        ) : (
                          <button onClick={journeyFinish} className="flex-1 rounded-lg bg-emerald-600 py-1 text-xs font-semibold text-white hover:bg-emerald-700">
                            ✅ Terminar viaje
                          </button>
                        )}
                      </div>

                      {/* Path overview */}
                      <div className="mt-2 flex flex-wrap items-center gap-0.5">
                        {journeyPath.map((node, i) => (
                          <span key={i} className="flex items-center gap-0.5">
                            <span className={`rounded px-1 py-0.5 text-[10px] ${
                              i === journeyStep ? "bg-emerald-500 font-bold text-white" :
                              i < journeyStep ? "bg-emerald-100 text-emerald-700 line-through" :
                              "bg-white text-slate-500 shadow-sm"
                            }`}>{node}</span>
                            {i < journeyPath.length - 1 && <span className="text-slate-200">›</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Journey finished message */}
                  {!journeyActive && journeySaveMsg && (
                    <div className={`rounded-lg px-3 py-2 text-xs font-medium ${journeySaved ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-50 text-slate-600"}`}>
                      {journeySaveMsg}
                    </div>
                  )}

                  {/* Trail + nav controls */}
                  {navTrail.length > 0 && (
                    <div className="rounded-lg border border-slate-100 p-2">
                      <p className="mb-1 text-xs font-semibold text-slate-600">Rastro de navegación</p>
                      <div className="flex flex-wrap gap-1">
                        {navTrail.map((name, i) => (
                          <span key={i} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${name === currentNav ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                            {name}
                          </span>
                        ))}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button onClick={handleNavBack}    className="btn-secondary flex-1 text-xs py-1">← Atrás</button>
                        <button onClick={handleNavForward} className="btn-secondary flex-1 text-xs py-1">Adelante →</button>
                        <button onClick={handleClearNav}   className="btn-secondary text-xs py-1 px-2">✕ Limpiar</button>
                      </div>

                      {/* Save as Tour */}
                      {navTrail.length >= 2 && (
                        <div className="mt-2 border-t border-slate-100 pt-2">
                          {!showSaveTour ? (
                            <button
                              onClick={() => { setShowSaveTour(true); setNewTourName(`Mi recorrido ${new Date().toLocaleDateString("es-ES")}`); }}
                              className="btn-secondary w-full text-xs py-1"
                            >
                              💾 Guardar recorrido como Tour
                            </button>
                          ) : (
                            <div className="space-y-1.5">
                              <input
                                type="text"
                                value={newTourName}
                                onChange={(e) => setNewTourName(e.target.value)}
                                placeholder="Nombre del tour..."
                                className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-brand-400"
                              />
                              <div className="flex gap-1.5">
                                <button
                                  onClick={handleSaveNavAsTour}
                                  disabled={savingTour || !newTourName.trim()}
                                  className="btn-primary flex-1 text-xs py-1"
                                >
                                  {savingTour ? "Guardando..." : "Guardar"}
                                </button>
                                <button
                                  onClick={() => { setShowSaveTour(false); setTourSaveMsg(""); }}
                                  className="btn-secondary text-xs py-1 px-2"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          )}
                          {tourSaveMsg && (
                            <p className={`mt-1 text-[11px] ${tourSaveMsg.startsWith("✅") ? "text-green-600" : "text-red-500"}`}>
                              {tourSaveMsg}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Route result */}
                  {navRouteResult && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-2 text-xs">
                      <p className="font-semibold text-green-700">
                        {navRouteResult.origin_name} → {navRouteResult.destination_name}
                      </p>
                      <p className="mt-0.5 text-slate-600">
                        {navRouteResult.distance.toFixed(1)} m · ~{Math.round(navRouteResult.distance / 1.4)} s · {navRouteResult.path.length} nodos
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-0.5">
                        {navRouteResult.path.map((node, i) => (
                          <span key={i} className="flex items-center gap-0.5">
                            <span className={`rounded px-1 py-0.5 ${i === 0 ? "bg-green-200 font-bold" : i === navRouteResult.path.length - 1 ? "bg-red-100 font-bold" : "bg-white"} text-slate-700 shadow-sm`}>
                              {node}
                            </span>
                            {i < navRouteResult.path.length - 1 && <span className="text-slate-300">›</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {navMsg && <div className="rounded bg-brand-50 px-3 py-2 text-xs text-brand-700">{navMsg}</div>}

                  {/* Search from API buildings */}
                  <div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Edificios del campus</p>
                    <input type="text" placeholder="Buscar edificio..." value={navSearch}
                      onChange={(e) => setNavSearch(e.target.value)} className="input w-full text-sm" />
                    <div className="mt-1.5 space-y-1">
                      {navFiltered.slice(0, 20).map((b) => (
                        <button key={b.id} onClick={() => handleVisit(b)} disabled={navLoading}
                          className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-brand-50 ${b.name === currentNav ? "border-brand-400 bg-brand-50" : "border-slate-100"}`}
                        >
                          <div>
                            <p className="font-medium text-slate-700">{b.name}</p>
                            <p className="text-xs text-slate-400">{FLOOR_NAMES[b.floor] ?? `Piso ${b.floor}`}</p>
                          </div>
                          {b.name === currentNav
                            ? <Badge color="brand">Actual</Badge>
                            : <span className="text-xs text-brand-400">Ir →</span>
                          }
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Floor accordion — all floors with their buildings */}
                  <div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Por piso</p>
                    <NavFloorAccordion
                      buildings={buildings}
                      graphNodes={graphNodes}
                      currentNav={currentNav}
                      activeFloor={activeFloor}
                      navLoading={navLoading}
                      onVisitBuilding={handleVisit}
                      onHighlightNode={(name, floor) => {
                        sendMsg(graphRef.current, { type: "HIGHLIGHT_NODE", name });
                        showFloor(floor);
                        setNavMsg(`Vista: ${name} (P${floor})`);
                      }}
                      onShowFloor={showFloor}
                    />
                  </div>

                  {/* Search from graph nodes */}
                  {graphNodes.length > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50">
                      <div className="border-b border-slate-200 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Espacios del grafo</p>
                        <input
                          type="text"
                          placeholder="Buscar espacio (aula, lab, sala...)..."
                          value={nodeSearch}
                          onChange={(e) => setNodeSearch(e.target.value)}
                          className="mt-1.5 w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-brand-400"
                        />
                      </div>
                      <div className="max-h-36 overflow-y-auto p-2">
                        <div className="flex flex-wrap gap-1">
                          {graphNodes
                            .filter(n => !nodeSearch || n.name.toLowerCase().includes(nodeSearch.toLowerCase()))
                            .slice(0, 48)
                            .map((n) => {
                              const catColors: Record<string, string> = {
                                aula: "bg-amber-50 border-amber-300 text-amber-800",
                                laboratorio: "bg-red-50 border-red-300 text-red-800",
                                sala: "bg-green-50 border-green-300 text-green-800",
                                oficina: "bg-purple-50 border-purple-300 text-purple-800",
                                bano: "bg-slate-50 border-slate-300 text-slate-700",
                                ascensor: "bg-blue-50 border-blue-300 text-blue-800",
                                cafeteria: "bg-pink-50 border-pink-300 text-pink-800",
                                auditorio: "bg-rose-50 border-rose-300 text-rose-800",
                                bodega: "bg-stone-50 border-stone-300 text-stone-700",
                                estar: "bg-teal-50 border-teal-300 text-teal-800",
                                deporte: "bg-lime-50 border-lime-300 text-lime-800",
                              };
                              const cls = catColors[n.category] ?? "bg-white border-slate-200 text-slate-700";
                              const isCurrent = n.name === currentNav;
                              return (
                                <button
                                  key={n.id}
                                  onClick={() => {
                                    sendMsg(graphRef.current, { type: "HIGHLIGHT_NODE", name: n.name });
                                    showFloor(n.floor);
                                    setNavMsg(`Vista: ${n.name} (P${n.floor})`);
                                  }}
                                  className={`rounded border px-2 py-0.5 text-[11px] transition-opacity hover:opacity-80 ${isCurrent ? "ring-2 ring-brand-400" : ""} ${cls}`}
                                  title={`${n.name} — Piso ${n.floor}`}
                                >
                                  {n.name} <span className="opacity-60">P{n.floor}</span>
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── TOURS ──────────────────────────────────────────────── */}
              {tab === "tours" && (
                <div className="space-y-3">
                  {session ? (
                    <div className="space-y-2">
                      {/* Active session card */}
                      <div className="rounded-lg border border-brand-200 bg-brand-50 p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-brand-700">Tour en curso: {session.tour_name}</p>
                          <Badge color="brand">{session.current_stop.position}/{session.total_stops}</Badge>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-2 h-1.5 w-full rounded-full bg-brand-100">
                          <div
                            className="h-1.5 rounded-full bg-brand-500 transition-all"
                            style={{ width: `${(session.current_stop.position / session.total_stops) * 100}%` }}
                          />
                        </div>

                        <div className="mt-2">
                          <p className="text-sm font-semibold text-slate-800">{session.current_stop.building_name}</p>
                          <p className="text-xs text-slate-400">{FLOOR_NAMES[session.current_stop.floor] ?? `Piso ${session.current_stop.floor}`}</p>
                        </div>

                        {/* Route to current stop */}
                        {tourRouteResult && (
                          <div className="mt-2 rounded border border-brand-100 bg-white p-2 text-xs">
                            <p className="font-medium text-brand-600">
                              {tourRouteResult.origin_name} → {tourRouteResult.destination_name}
                            </p>
                            <p className="text-slate-500">{tourRouteResult.distance.toFixed(1)} m · ~{Math.round(tourRouteResult.distance / 1.4)} s · {tourRouteResult.path.length} nodos</p>
                            <div className="mt-1 flex flex-wrap items-center gap-0.5">
                              {tourRouteResult.path.map((node, i) => (
                                <span key={i} className="flex items-center gap-0.5">
                                  <span className={`rounded px-1 py-0.5 text-slate-700 shadow-sm ${i === 0 ? "bg-green-100 font-bold" : i === tourRouteResult.path.length - 1 ? "bg-red-100 font-bold" : "bg-white"}`}>
                                    {node}
                                  </span>
                                  {i < tourRouteResult.path.length - 1 && <span className="text-slate-300">›</span>}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="mt-3 flex gap-2">
                          <button onClick={handleTourPrev} className="btn-secondary flex-1 text-xs">← Ant.</button>
                          <button onClick={handleTourNext} className="btn-primary flex-1 text-xs">Sig. →</button>
                          <button onClick={handleEndTour}  className="btn-danger text-xs px-2">Fin</button>
                        </div>
                      </div>

                      {/* Stop list of current tour */}
                      {tours.length > 0 && (() => {
                        const activeTour = tours.find(t => t.name === session.tour_name);
                        return activeTour ? (
                          <div className="rounded-lg border border-slate-100">
                            <p className="border-b border-slate-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Paradas del tour
                            </p>
                            <div className="p-2 space-y-1">
                              {Array.from({ length: session.total_stops }, (_, i) => i + 1).map((pos) => {
                                const isCurrent = pos === session.current_stop.position;
                                const isDone    = pos < session.current_stop.position;
                                return (
                                  <div key={pos} className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs ${isCurrent ? "bg-brand-50 ring-1 ring-brand-300" : isDone ? "opacity-50" : ""}`}>
                                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${isCurrent ? "bg-brand-600 text-white" : isDone ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                                      {isDone ? "✓" : pos}
                                    </span>
                                    <span className={`flex-1 ${isCurrent ? "font-semibold text-brand-700" : "text-slate-600"}`}>
                                      {isCurrent ? session.current_stop.building_name : `Parada ${pos}`}
                                    </span>
                                    {isCurrent && <Badge color="brand">Actual</Badge>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">Elige un tour para iniciar.</p>
                  )}

                  {/* Tour list */}
                  {tours.map((tour) => (
                    <div key={tour.id} className="rounded-lg border border-slate-100 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-700">{tour.name}</p>
                          {tour.description && <p className="mt-0.5 text-xs text-slate-400">{tour.description}</p>}
                        </div>
                        <Badge color="brand">{tour.stop_count} paradas</Badge>
                      </div>
                      {!session && (
                        <button
                          onClick={() => handleStartTour(tour.id)}
                          disabled={tourLoading}
                          className="btn-primary mt-2 w-full px-3 py-1 text-xs"
                        >
                          ▶ Iniciar tour
                        </button>
                      )}
                    </div>
                  ))}
                  {tours.length === 0 && (
                    <p className="py-4 text-center text-xs text-slate-400">No hay tours disponibles.</p>
                  )}
                </div>
              )}

              {/* ── COLAS ──────────────────────────────────────────────── */}
              {tab === "queues" && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">Únete a una fila — el modelo mostrará ese piso.</p>
                  {queueMsg && <div className="rounded bg-brand-50 px-3 py-2 text-xs text-brand-700">{queueMsg}</div>}
                  {buildings.slice(0, 20).map((b) => {
                    const status = queueStatuses[b.id];
                    const myPos  = myPositions[b.id];
                    return (
                      <div key={b.id} className="rounded-lg border border-slate-100 p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-700">{b.name}</p>
                            <p className="text-xs text-slate-400">{FLOOR_NAMES[b.floor] ?? `Piso ${b.floor}`}</p>
                          </div>
                          <Badge color={status && status.length > 0 ? "amber" : "green"}>
                            {status ? `${status.length} en fila` : "—"}
                          </Badge>
                        </div>
                        {myPos && <p className="mt-1 text-xs font-semibold text-brand-600">Tu posición: #{myPos.position}</p>}
                        <div className="mt-2">
                          {!myPos
                            ? <button onClick={() => joinQueue(b)}  className="btn-primary  w-full py-1 text-xs">Unirse</button>
                            : <button onClick={() => leaveQueue(b)} className="btn-secondary w-full py-1 text-xs">Salir de la cola</button>
                          }
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── RANKINGS ───────────────────────────────────────────── */}
              {tab === "rankings" && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-600 mb-1">Lugares más visitados</p>
                  {popularPlaces.map((place) => (
                    <button key={place.building_id} onClick={() => showFloor(place.floor)}
                      className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-brand-50 ${activeFloor === place.floor ? "border-brand-300 bg-brand-50" : "border-slate-100"}`}
                    >
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${place.rank === 1 ? "bg-amber-100 text-amber-700" : place.rank <= 3 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500"}`}>
                        {place.rank}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-slate-700">{place.building_name}</p>
                        <p className="text-xs text-slate-400">{FLOOR_NAMES[place.floor] ?? `Piso ${place.floor}`}</p>
                      </div>
                      <Badge color="brand">{place.visits}</Badge>
                    </button>
                  ))}
                  {popularPlaces.length === 0 && <p className="py-4 text-center text-xs text-slate-400">Sin datos todavía.</p>}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer — view controls */}
        <div className="border-t border-slate-100 px-3 py-2">
          <p className="mb-1.5 text-xs font-medium text-slate-500">
            {useGraph ? "Vista del grafo 3D" : "Vista del modelo 3D"}
          </p>
          {useGraph ? (
            <div className="flex gap-2">
              <button onClick={() => sendMsg(graphRef.current, { type: "SHOW_ALL" })}         className="btn-secondary flex-1 py-1 text-xs">Todos los pisos</button>
              <button onClick={() => sendMsg(graphRef.current, { type: "CLEAR_HIGHLIGHT" })}  className="btn-secondary flex-1 py-1 text-xs">Limpiar ruta</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => sendMsg(modelRef.current, { type: "VIEW_ISO" })}         className="btn-secondary flex-1 py-1 text-xs">Isométrica</button>
              <button onClick={() => sendMsg(modelRef.current, { type: "VIEW_TOP" })}         className="btn-secondary flex-1 py-1 text-xs">Superior</button>
              <button onClick={() => sendMsg(modelRef.current, { type: "EXPLODE", on: true })} className="btn-secondary flex-1 py-1 text-xs">Separar</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Space Directory component ────────────────────────────────────────────────
function SpaceDirectory({ showFloor, activeFloor }: { showFloor: (f: number) => void; activeFloor: number | null }) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [openItem,     setOpenItem]     = useState<string | null>(null);
  const lbl = (f: number) => f === 0 ? "P0" : f === 6 ? "Azotea" : `P${f}`;

  return (
    <div className="space-y-1.5">
      {SPACE_DIRECTORY.map((cat) => (
        <div key={cat.category} className="overflow-hidden rounded-lg border border-slate-100">
          <button
            onClick={() => setOpenCategory(openCategory === cat.category ? null : cat.category)}
            className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50"
          >
            <span className="text-xs font-semibold text-slate-700">{cat.category}</span>
            <div className="flex items-center gap-1.5">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cat.color}`}>{cat.items.length} tipos</span>
              <span className="text-xs text-slate-400">{openCategory === cat.category ? "▲" : "▼"}</span>
            </div>
          </button>

          {openCategory === cat.category && (
            <div className="border-t border-slate-100">
              {cat.items.map((item) => {
                const key       = `${cat.category}-${item.label}`;
                const isOpen    = openItem === key;
                const isActive  = item.floors.some((f) => f === activeFloor);
                return (
                  <div key={item.label} className={`border-b border-slate-50 last:border-0 ${isActive ? "bg-brand-50" : ""}`}>
                    <div className="flex items-center px-3 py-2">
                      <div className="flex flex-1 flex-wrap items-center gap-1">
                        <span className="mr-1 text-xs font-medium text-slate-700">{item.label}</span>
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${cat.color}`}>{item.count}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {item.floors.slice(0, 4).map((f) => (
                          <button key={f} onClick={() => showFloor(f)} title={`Ir a ${lbl(f)}`}
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${activeFloor === f ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-brand-100"}`}
                          >{lbl(f)}</button>
                        ))}
                        {item.floors.length > 4 && <span className="text-[10px] text-slate-400">+{item.floors.length - 4}</span>}
                        {(item.detail || item.rooms) && (
                          <button onClick={() => setOpenItem(isOpen ? null : key)} className="ml-1 text-[10px] text-slate-400 hover:text-slate-600">
                            {isOpen ? "▲" : "ℹ"}
                          </button>
                        )}
                      </div>
                    </div>
                    {isOpen && (item.detail || item.rooms) && (
                      <div className="px-3 pb-2 text-[11px] leading-relaxed text-slate-500">
                        {item.detail && <p>{item.detail}</p>}
                        {item.rooms && <ul className="mt-1 space-y-0.5">{item.rooms.map((r) => <li key={r} className="text-slate-400">· {r}</li>)}</ul>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── NavFloorAccordion ────────────────────────────────────────────────────────
const FLOOR_COLORS: Record<number, string> = {
  0: "bg-slate-100 text-slate-700 border-slate-300",
  1: "bg-blue-100 text-blue-700 border-blue-300",
  2: "bg-green-100 text-green-700 border-green-300",
  3: "bg-amber-100 text-amber-700 border-amber-300",
  4: "bg-purple-100 text-purple-700 border-purple-300",
  5: "bg-rose-100 text-rose-700 border-rose-300",
};

const FLOOR_LABELS: Record<number, string> = {
  0: "Piso cero",
  1: "Primer piso",
  2: "Segundo piso",
  3: "Tercer piso",
  4: "Cuarto piso",
  5: "Quinto piso",
};

function NavFloorAccordion({
  buildings,
  graphNodes,
  currentNav,
  activeFloor,
  navLoading,
  onVisitBuilding,
  onHighlightNode,
  onShowFloor,
}: {
  buildings: Building[];
  graphNodes: Array<{ id: number; name: string; floor: number; category: string }>;
  currentNav: string;
  activeFloor: number | null;
  navLoading: boolean;
  onVisitBuilding: (b: Building) => void;
  onHighlightNode: (name: string, floor: number) => void;
  onShowFloor: (floor: number) => void;
}) {
  const [openFloor, setOpenFloor] = useState<number | null>(null);

  const catColors: Record<string, string> = {
    aula:       "bg-amber-50  border-amber-300  text-amber-800",
    laboratorio:"bg-red-50    border-red-300    text-red-800",
    sala:       "bg-green-50  border-green-300  text-green-800",
    oficina:    "bg-purple-50 border-purple-300 text-purple-800",
    bano:       "bg-slate-50  border-slate-300  text-slate-700",
    ascensor:   "bg-blue-50   border-blue-300   text-blue-800",
    cafeteria:  "bg-pink-50   border-pink-300   text-pink-800",
    auditorio:  "bg-rose-50   border-rose-300   text-rose-800",
    bodega:     "bg-stone-50  border-stone-300  text-stone-700",
    estar:      "bg-teal-50   border-teal-300   text-teal-800",
    deporte:    "bg-lime-50   border-lime-300   text-lime-800",
  };

  return (
    <div className="space-y-1">
      {[0, 1, 2, 3, 4, 5].map((floor) => {
        const floorBuildings = buildings.filter((b) => b.floor === floor);
        const floorNodes     = graphNodes.filter((n) => n.floor === floor);
        const isOpen         = openFloor === floor;
        const isActive       = activeFloor === floor;
        const colorCls       = FLOOR_COLORS[floor] ?? "bg-slate-100 text-slate-700 border-slate-300";
        const totalItems     = floorBuildings.length + floorNodes.length;

        return (
          <div key={floor} className={`overflow-hidden rounded-lg border transition-all ${isActive ? "border-brand-400" : "border-slate-200"}`}>
            {/* Floor header */}
            <button
              onClick={() => {
                setOpenFloor(isOpen ? null : floor);
                onShowFloor(floor);
              }}
              className={`flex w-full items-center justify-between px-3 py-2.5 text-left ${isOpen ? "bg-slate-50" : "hover:bg-slate-50"}`}
            >
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${colorCls}`}>
                  P{floor}
                </span>
                <span className="text-xs font-semibold text-slate-700">{FLOOR_LABELS[floor]}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">{totalItems} espacios</span>
                <span className="text-xs text-slate-400">{isOpen ? "▲" : "▼"}</span>
              </div>
            </button>

            {/* Floor content */}
            {isOpen && (
              <div className="border-t border-slate-100 p-2 space-y-2">

                {/* API buildings on this floor */}
                {floorBuildings.length > 0 && (
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Edificios registrados</p>
                    <div className="space-y-1">
                      {floorBuildings.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => onVisitBuilding(b)}
                          disabled={navLoading}
                          className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-left text-xs transition-colors hover:bg-brand-50 ${b.name === currentNav ? "border-brand-400 bg-brand-50 font-semibold" : "border-slate-100"}`}
                        >
                          <span className="text-slate-700">{b.name}</span>
                          {b.name === currentNav
                            ? <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">Actual</span>
                            : <span className="text-[10px] text-brand-400">Ir →</span>
                          }
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Graph nodes on this floor */}
                {floorNodes.length > 0 && (
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Espacios del grafo</p>
                    <div className="flex flex-wrap gap-1">
                      {floorNodes.map((n) => {
                        const cls = catColors[n.category] ?? "bg-white border-slate-200 text-slate-700";
                        return (
                          <button
                            key={n.id}
                            onClick={() => onHighlightNode(n.name, n.floor)}
                            className={`rounded border px-1.5 py-0.5 text-[11px] transition-opacity hover:opacity-80 ${cls}`}
                            title={n.name}
                          >
                            {n.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {floorBuildings.length === 0 && floorNodes.length === 0 && (
                  <p className="py-1 text-center text-[11px] text-slate-400">Sin espacios registrados</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
