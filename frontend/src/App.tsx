import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { Spinner } from "./components/ui";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Buildings from "./pages/Buildings";
import RoutesPage from "./pages/Routes";
import Navigation from "./pages/Navigation";
import Tours from "./pages/Tours";
import Queues from "./pages/Queues";
import Rankings from "./pages/Rankings";
import Graph from "./pages/Graph";
import Campus from "./pages/Campus";
import Floors from "./pages/Floors";
import Paths from "./pages/Paths";
import History from "./pages/History";
import Settings from "./pages/Settings";
import Building3D from "./pages/Building3D";

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner label="Cargando UniNav..." />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={
          <>
            <ProtectedRoute />
            <Layout />
          </>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/buildings" element={<Buildings />} />
        <Route path="/routes" element={<RoutesPage />} />
        <Route path="/navigation" element={<Navigation />} />
        <Route path="/tours" element={<Tours />} />
        <Route path="/queues" element={<Queues />} />
        <Route path="/rankings" element={<Rankings />} />
        <Route path="/graph" element={<Graph />} />
        <Route path="/campus" element={<Campus />} />
        <Route path="/floors" element={<Floors />} />
        <Route path="/paths" element={<Paths />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/building-3d" element={<Building3D />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
