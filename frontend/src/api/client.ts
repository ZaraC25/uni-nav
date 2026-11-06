import axios from "axios";
import type {
  Building,
  BuildingCreate,
  BuildingUpdate,
  CampusPath,
  FloorResponse,
  GraphResponse,
  HealthStatus,
  HierarchyResponse,
  MultiStopRequest,
  MultiStopResponse,
  NearbyBuilding,
  NavigationState,
  NavigationTrail,
  PasswordChange,
  PathCreate,
  PathKind,
  PathUpdate,
  PopularPlace,
  PopularRoute,
  QueuePosition,
  QueueStatus,
  RouteComparisonResponse,
  RouteRequest,
  RouteResponse,
  RouteVisit,
  ServedResponse,
  Token,
  TourCreate,
  TourResponse,
  TourSession,
  TourSummary,
  UserLogin,
  UserRegister,
  UserResponse,
  UserStatsResponse,
} from "../types";

const http = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

// Attach token to every request
http.interceptors.request.use((config) => {
  const token = localStorage.getItem("uninav_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401 (only when we actually get a response, not on network errors)
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem("uninav_token")) {
      localStorage.removeItem("uninav_token");
      localStorage.removeItem("uninav_user");
      window.location.href = "/login";
    }
    // Annotate network errors so UI can show a friendly message
    if (!error.response && (error.code === "ERR_NETWORK" || error.code === "ECONNREFUSED")) {
      error.isNetworkError = true;
    }
    return Promise.reject(error);
  }
);

function extract<T>(promise: Promise<{ data: T }>): Promise<T> {
  return promise.then((res) => res.data);
}

// ── Auth ──────────────────────────────────────────────
export const api = {
  // auth
  register: (data: UserRegister) => extract(http.post<UserResponse>("/auth/register", data)),
  login: (data: UserLogin) => extract(http.post<Token>("/auth/login", data)),
  me: () => extract(http.get<UserResponse>("/auth/me")),

  // users
  myStats: () => extract(http.get<UserStatsResponse>("/users/me/stats")),
  changePassword: (data: PasswordChange) => extract(http.put("/users/me/password", data)),
  deleteAccount: () => extract(http.delete("/users/me")),

  // buildings
  listBuildings: (params?: {
    search?: string;
    faculty?: string;
    building_type?: string;
    floor?: number;
  }) => extract(http.get<Building[]>("/buildings", { params })),
  createBuilding: (data: BuildingCreate) => extract(http.post<Building>("/buildings", data)),
  importBuildings: (data: BuildingCreate[]) => extract(http.post<Building[]>("/buildings/import", data)),
  getBuilding: (id: number) => extract(http.get<Building>(`/buildings/${id}`)),
  updateBuilding: (id: number, data: BuildingUpdate) => extract(http.put<Building>(`/buildings/${id}`, data)),
  deleteBuilding: (id: number) => extract(http.delete(`/buildings/${id}`)),
  buildingNeighbors: (id: number, limit?: number) =>
    extract(http.get<NearbyBuilding[]>(`/buildings/${id}/neighbors`, { params: { limit } })),
  nearestBuildings: (x: number, y: number, limit?: number) =>
    extract(http.get<NearbyBuilding[]>("/buildings/nearest", { params: { x, y, limit } })),
  listFaculties: () => extract(http.get<string[]>("/buildings/faculties")),
  listBuildingTypes: () => extract(http.get<string[]>("/buildings/types")),

  // floors
  listFloors: () => extract(http.get<FloorResponse[]>("/floors")),

  // paths
  listPaths: (buildingId?: number) =>
    extract(http.get<CampusPath[]>("/paths", { params: { building_id: buildingId } })),
  createPath: (data: PathCreate) => extract(http.post<CampusPath>("/paths", data)),
  importPaths: (data: PathCreate[]) => extract(http.post<CampusPath[]>("/paths/import", data)),
  getPath: (id: number) => extract(http.get<CampusPath>(`/paths/${id}`)),
  updatePath: (id: number, data: PathUpdate) => extract(http.put<CampusPath>(`/paths/${id}`, data)),
  deletePath: (id: number) => extract(http.delete(`/paths/${id}`)),

  // graph
  getGraph: () => extract(http.get<GraphResponse>("/graph")),
  reloadGraph: () => extract(http.post("/graph/reload")),

  // routes
  calculateRoute: (data: RouteRequest) => extract(http.post<RouteResponse>("/routes/calculate", data)),
  compareRoutes: (data: RouteRequest) => extract(http.post<RouteComparisonResponse>("/routes/compare", data)),
  multiStopRoute: (data: MultiStopRequest) => extract(http.post<MultiStopResponse>("/routes/multi-stop", data)),
  popularRoutes: () => extract(http.get<PopularRoute[]>("/routes/popular")),

  // history
  routeHistory: (limit?: number) => extract(http.get<RouteVisit[]>("/routes/history", { params: { limit } })),
  lastRoute: () => extract(http.get<RouteVisit>("/routes/history/last")),
  deleteHistory: () => extract(http.delete("/routes/history")),
  deleteHistoryItem: (id: number) => extract(http.delete(`/routes/history/${id}`)),

  // navigation
  getNavigation: () => extract(http.get<NavigationTrail>("/navigation")),
  visitPlace: (buildingId: number) => extract(http.post<NavigationState>("/navigation/visit", { building_id: buildingId })),
  goBack: () => extract(http.post<NavigationState>("/navigation/back")),
  goForward: () => extract(http.post<NavigationState>("/navigation/forward")),
  clearNavigation: () => extract(http.delete("/navigation")),

  // tours
  listTours: () => extract(http.get<TourSummary[]>("/tours")),
  getTour: (id: number) => extract(http.get<TourResponse>(`/tours/${id}`)),
  createTour: (data: TourCreate) => extract(http.post<TourResponse>("/tours", data)),
  deleteTour: (id: number) => extract(http.delete(`/tours/${id}`)),
  startTour: (id: number) => extract(http.post<TourSession>(`/tours/${id}/start`)),
  getTourSession: () => extract(http.get<TourSession>("/tours/session")),
  tourNext: () => extract(http.post<TourSession>("/tours/session/next")),
  tourPrevious: () => extract(http.post<TourSession>("/tours/session/previous")),
  endTour: () => extract(http.delete("/tours/session")),

  // queues
  getQueue: (buildingId: number) => extract(http.get<QueueStatus>(`/queues/${buildingId}`)),
  joinQueue: (buildingId: number) => extract(http.post<QueuePosition>(`/queues/${buildingId}/join`)),
  getQueuePosition: (buildingId: number) => extract(http.get<QueuePosition>(`/queues/${buildingId}/position`)),
  leaveQueue: (buildingId: number) => extract(http.delete(`/queues/${buildingId}/leave`)),
  serveQueue: (buildingId: number) => extract(http.post<ServedResponse>(`/queues/${buildingId}/serve`)),

  // rankings
  popularPlaces: (limit?: number) => extract(http.get<PopularPlace[]>("/rankings/places", { params: { limit } })),

  // campus
  campusHierarchy: () => extract(http.get<HierarchyResponse>("/campus/hierarchy")),

  // health
  health: () => extract(http.get<HealthStatus>("/health")),
};

export const PATH_KINDS: PathKind[] = ["corridor", "stairs", "elevator", "ramp", "outdoor"];

export const FLOOR_NAMES: Record<number, string> = {
  0: "Ground floor",
  1: "First floor",
  2: "Second floor",
  3: "Third floor",
  4: "Fourth floor",
  5: "Fifth floor",
  6: "Terraces",
  7: "Roof",
};
