import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ErrorBanner } from "../components/ui";
import { validateUsername, validatePassword } from "../utils/validation";

export default function Login() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({ username: "", password: "" });
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/");
  }, [user, loading, navigate]);

  const handleUsernameChange = (val: string) => {
    setUsername(val);
    setErrors((prev) => ({ ...prev, username: validateUsername(val) ?? "" }));
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    setErrors((prev) => ({ ...prev, password: validatePassword(val) ?? "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");

    const usernameErr = validateUsername(username);
    const passwordErr = validatePassword(password);
    if (usernameErr || passwordErr) {
      setErrors({ username: usernameErr ?? "", password: passwordErr ?? "" });
      return; // block submit
    }

    setSubmitting(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; code?: string; message?: string };
      if (e.code === "ERR_NETWORK" || e.message?.includes("Network Error")) {
        setServerError("No se puede conectar al servidor. Asegúrate de que el backend esté corriendo en http://127.0.0.1:8000");
      } else {
        setServerError(e.response?.data?.detail ?? "Credenciales incorrectas o error del servidor.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid =
    !validateUsername(username) && !validatePassword(password);

  return (
    <div className="relative min-h-screen">
      {/* Background photo */}
      <img
        src="https://images.pexels.com/photos/3747463/pexels-photo-3747463.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260"
        className="absolute inset-0 h-full w-full object-cover"
        alt="Campus background"
      />

      {/* Dark overlay */}
      <div className="relative min-h-screen bg-gray-900 bg-opacity-75">

        {/* Layout */}
        <div className="mx-auto flex min-h-screen max-w-screen-xl flex-col items-center justify-center px-4 py-16 md:px-24 lg:flex-row lg:px-8 lg:py-20">

          {/* Left — branding */}
          <div className="mb-12 w-full max-w-xl lg:mb-0 lg:w-7/12 lg:pr-16 xl:w-7/12 xl:pr-16">
            <div className="mb-6">
              <span className="text-5xl font-extrabold tracking-tight text-white drop-shadow-lg">
                UniNav
              </span>
            </div>
            <h2 className="mb-6 max-w-lg font-sans text-3xl font-bold tracking-tight text-white sm:text-4xl sm:leading-none">
              Navega tu campus <br className="hidden md:block" />
              de forma{" "}
              <span className="text-cyan-400">inteligente</span>
            </h2>
            <p className="mb-4 max-w-xl text-base text-gray-400 md:text-lg">
              Encuentra la ruta más corta entre edificios, explora tours guiados,
              gestiona filas de espera y mantén un historial de tus recorridos.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center font-semibold tracking-wider transition-colors duration-200 text-cyan-400 hover:text-cyan-300"
            >
              Crear cuenta
              <svg className="ml-2 inline-block w-3" fill="currentColor" viewBox="0 0 12 12">
                <path d="M9.707,5.293l-5-5A1,1,0,0,0,3.293,1.707L7.586,6,3.293,10.293a1,1,0,1,0,1.414,1.414l5-5A1,1,0,0,0,9.707,5.293Z" />
              </svg>
            </Link>
          </div>

          {/* Right — login form */}
          <div className="w-full max-w-xl lg:w-5/12 xl:px-8 xl:w-5/12">
            <div className="rounded-xl bg-white p-7 shadow-2xl sm:p-10">
              <h3 className="mb-6 text-xl font-semibold text-slate-800 sm:text-center sm:text-2xl">
                Iniciar sesion
              </h3>

              {serverError && (
                <div className="mb-4">
                  <ErrorBanner message={serverError} />
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Username */}
                <div>
                  <label htmlFor="username" className="mb-1 inline-block font-medium text-slate-700">
                    Usuario
                  </label>
                  <input
                    id="username"
                    type="text"
                    placeholder="tu_usuario"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    maxLength={50}
                    autoComplete="username"
                    className={`h-12 w-full rounded border bg-white px-4 shadow-sm transition duration-200 focus:outline-none focus:ring-2 ${
                      errors.username
                        ? "border-red-400 focus:border-red-400 focus:ring-red-100"
                        : "border-gray-300 focus:border-brand-500 focus:ring-brand-100"
                    }`}
                  />
                  {errors.username && (
                    <p className="mt-1 text-xs text-red-500">{errors.username}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="mb-1 inline-block font-medium text-slate-700">
                    Contrasena
                  </label>
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    maxLength={72}
                    autoComplete="current-password"
                    className={`h-12 w-full rounded border bg-white px-4 shadow-sm transition duration-200 focus:outline-none focus:ring-2 ${
                      errors.password
                        ? "border-red-400 focus:border-red-400 focus:ring-red-100"
                        : "border-gray-300 focus:border-brand-500 focus:ring-brand-100"
                    }`}
                  />
                  {errors.password && (
                    <p className="mt-1 text-xs text-red-500">{errors.password}</p>
                  )}
                </div>

                <div className="mt-4 mb-2">
                  <button
                    type="submit"
                    disabled={submitting || !isFormValid}
                    className="inline-flex h-12 w-full items-center justify-center rounded bg-brand-600 px-6 font-medium tracking-wide text-white shadow-md transition duration-200 hover:bg-brand-700 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? "Entrando..." : "Entrar"}
                  </button>
                </div>

                <p className="text-center text-xs text-gray-500 sm:text-sm">
                  No tienes cuenta?{" "}
                  <Link to="/register" className="font-medium text-brand-600 hover:underline">
                    Registrate aqui
                  </Link>
                </p>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
