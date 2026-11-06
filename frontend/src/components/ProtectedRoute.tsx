import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "./ui";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner label="Cargando..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return null;
}
