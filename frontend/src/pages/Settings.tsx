import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Badge, ErrorBanner, PageHeader, Spinner } from "../components/ui";
import type { UserStatsResponse } from "../types";

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<UserStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.myStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await api.changePassword({ current_password: currentPassword, new_password: newPassword });
      setSuccess("Contraseña actualizada correctamente.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || "No se pudo cambiar la contraseña.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("¿Eliminar tu cuenta permanentemente? Esta acción no se puede deshacer.")) return;
    try {
      await api.deleteAccount();
      logout();
      navigate("/login");
    } catch {
      setError("No se pudo eliminar la cuenta.");
    }
  };

  if (loading) return <Spinner label="Cargando..." />;

  return (
    <div>
      <PageHeader title="Ajustes" subtitle="Gestiona tu cuenta y preferencias" />

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}
      {success && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Profile info */}
        <div className="card">
          <h3 className="mb-4 text-lg font-semibold text-slate-700">Perfil</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <dt className="text-slate-500">Usuario</dt>
              <dd className="font-medium text-slate-800">{user?.username}</dd>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <dt className="text-slate-500">Rol</dt>
              <dd>
                <Badge color={user?.role === "admin" ? "purple" : "blue"}>
                  {user?.role === "admin" ? "Administrador" : "Usuario"}
                </Badge>
              </dd>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <dt className="text-slate-500">Miembro desde</dt>
              <dd className="text-slate-700">
                {user ? new Date(user.created_at).toLocaleDateString("es-ES") : "—"}
              </dd>
            </div>
          </dl>

          {stats && (
            <div className="mt-6">
              <h4 className="mb-2 text-sm font-semibold text-slate-600">Estadísticas</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-400">Rutas totales</p>
                  <p className="font-bold text-brand-600">{stats.total_routes}</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-400">Distancia total</p>
                  <p className="font-bold text-brand-600">{stats.total_distance.toFixed(1)} m</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-400">Promedio</p>
                  <p className="font-bold text-brand-600">{stats.average_distance.toFixed(1)} m</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-400">Más visitado</p>
                  <p className="truncate font-bold text-brand-600 text-xs">
                    {stats.most_visited_destination || "—"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Change password */}
        <div className="card">
          <h3 className="mb-4 text-lg font-semibold text-slate-700">Cambiar contraseña</h3>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="label">Contraseña actual</label>
              <input
                type="password"
                className="input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Nueva contraseña</label>
              <input
                type="password"
                className="input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
              <p className="mt-1 text-xs text-slate-400">Mínimo 6 caracteres</p>
            </div>
            <button type="submit" disabled={saving} className="btn-primary w-full">
              {saving ? "Actualizando..." : "Cambiar contraseña"}
            </button>
          </form>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <h4 className="mb-2 text-sm font-semibold text-red-600">Zona de peligro</h4>
            <button onClick={handleDeleteAccount} className="btn-danger w-full">
              Eliminar cuenta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
