// ── Auth ──────────────────────────────────────────────
export interface Token {
  access_token: string;
  token_type: string;
}

export interface UserRegister {
  username: string;
  password: string;
}

export interface UserLogin {
  username: string;
  password: string;
}

export interface UserResponse {
  id: number;
  username: string;
  role: string;
  created_at: string;
}

export interface UserStatsResponse {
  total_routes: number;
  total_distance: number;
  average_distance: number;
  most_visited_destination: string | null;
}

export interface PasswordChange {
  current_password: string;
  new_password: string;
}

// ── Buildings ─────────────────────────────────────────
export interface Building {
  id: number;
  name: string;
  x: number;
  y: number;
  floor: number;
  faculty: string | null;
  building_type: string | null;
}

export interface BuildingCreate {
  name: string;
  x: number;
  y: number;
  floor: number;
  faculty?: string | null;
  building_type?: string | null;
}

export interface BuildingUpdate {
  name?: string;
  x?: number;
  y?: number;
  floor?: number;
  faculty?: string | null;
  building_type?: string | null;
}

export interface NearbyBuilding {
  building: Building;
  distance: number;
}

// ── Floors ────────────────────────────────────────────
export interface FloorResponse {
  level: number;
  name: string;
  building_count: number;
}

// ── Paths ─────────────────────────────────────────────
export type PathKind = "corridor" | "stairs" | "elevator" | "ramp" | "outdoor";

export interface CampusPath {
  id: number;
  source_id: number;
  target_id: number;
  source_name: string;
  target_name: string;
  weight: number;
  bidirectional: boolean;
  kind: PathKind;
}

export interface PathCreate {
  source_id: number;
  target_id: number;
  weight?: number | null;
  bidirectional: boolean;
  kind: PathKind;
}

export interface PathUpdate {
  weight?: number | null;
  bidirectional?: boolean;
  kind?: PathKind;
}

// ── Graph ─────────────────────────────────────────────
export interface GraphNode {
  name: string;
  x: number;
  y: number;
  floor: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  bidirectional: boolean;
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ── Routes ────────────────────────────────────────────
export type PathAlgorithm = "a_star" | "dijkstra";

export interface RouteStep {
  origin_name: string;
  destination_name: string;
  kind: PathKind;
  distance: number;
}

export interface RouteRequest {
  origin_id: number;
  destination_id: number;
  algorithm: PathAlgorithm;
  avoid: PathKind[];
}

export interface RouteResponse {
  path: string[];
  steps: RouteStep[];
  distance: number;
  origin_name: string;
  destination_name: string;
}

export interface AlgorithmResult {
  algorithm: PathAlgorithm;
  path: string[];
  distance: number;
}

export interface RouteComparisonResponse {
  origin_name: string;
  destination_name: string;
  results: AlgorithmResult[];
}

export interface MultiStopRequest {
  building_ids: number[];
  algorithm: PathAlgorithm;
  avoid: PathKind[];
}

export interface RouteLeg {
  origin_name: string;
  destination_name: string;
  path: string[];
  steps: RouteStep[];
  distance: number;
}

export interface MultiStopResponse {
  legs: RouteLeg[];
  total_distance: number;
}

export interface PopularRoute {
  origin_name: string;
  destination_name: string;
  frequency: number;
}

export interface RouteVisit {
  id: number;
  origin_name: string;
  destination_name: string;
  distance: number;
  visited_at: string;
}

// ── Navigation ────────────────────────────────────────
export interface NavigationStop {
  building_id: number;
  building_name: string;
  floor: number;
}

export interface NavigationState {
  current: NavigationStop | null;
  can_go_back: boolean;
  can_go_forward: boolean;
}

export interface TrailEntry extends NavigationStop {
  is_current: boolean;
}

export interface NavigationTrail extends NavigationState {
  trail: TrailEntry[];
}

// ── Tours ────────────────────────────────────────────
export interface TourSummary {
  id: number;
  name: string;
  description: string | null;
  stop_count: number;
}

export interface TourStop {
  position: number;
  building_id: number;
  building_name: string;
  floor: number;
}

export interface TourResponse {
  id: number;
  name: string;
  description: string | null;
  stops: TourStop[];
}

export interface TourSession {
  tour_id: number;
  tour_name: string;
  current_stop: TourStop;
  total_stops: number;
}

export interface TourCreate {
  name: string;
  description?: string | null;
  building_ids: number[];
}

// ── Queues ───────────────────────────────────────────
export interface QueueStatus {
  building_id: number;
  building_name: string;
  length: number;
}

export interface QueuePosition extends QueueStatus {
  position: number;
}

export interface ServedResponse extends QueueStatus {
  served_username: string;
}

// ── Rankings ──────────────────────────────────────────
export interface PopularPlace {
  rank: number;
  building_id: number;
  building_name: string;
  floor: number;
  visits: number;
}

// ── Campus Hierarchy ──────────────────────────────────
export interface HierarchyNode {
  name: string;
  data: Record<string, unknown>;
  children: HierarchyNode[];
}

export interface HierarchyResponse {
  height: number;
  total_nodes: number;
  root: HierarchyNode;
}

// ── Health ────────────────────────────────────────────
export interface HealthStatus {
  status: string;
  buildings: number;
  edges: number;
}
