import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { Spinner } from "./components/ui";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Graph from "./pages/Graph";
import Paths from "./pages/Paths";
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
        <Route path="/building-3d" element={<Building3D />} />
        <Route path="/graph" element={<Graph />} />
        <Route path="/paths" element={<Paths />} />
        <Route path="/settings" element={<Settings />} />
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
