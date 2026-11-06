import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ErrorBanner } from "../components/ui";
import { validateUsername, validatePassword } from "../utils/validation";

export default function Register() {
  const { user, register, loading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({ username: "", password: "" });
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/");
  }, [user, loading, navigate]);

  // Validate on every keystroke so the user sees feedback in real time
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
      await register(username, password);
      navigate("/");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; code?: string; message?: string };
      if (e.code === "ERR_NETWORK" || e.message?.includes("Network Error")) {
        setServerError("No se puede conectar al servidor. Asegúrate de que el backend esté corriendo.");
      } else {
        setServerError(e.response?.data?.detail ?? "Error al crear la cuenta. Intenta de nuevo.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid =
    !validateUsername(username) && !validatePassword(password);

  return (
    <div className="relative flex min-h-screen flex-col-reverse py-16 lg:flex-col lg:pb-0 lg:pt-0">

      {/* Right side — photo with diagonal cut */}
      <div className="inset-y-0 right-0 top-0 z-0 mx-auto w-full max-w-xl px-4 md:px-0 lg:absolute lg:mx-0 lg:mb-0 lg:max-w-full lg:w-7/12 lg:pr-0 xl:px-0">
        <svg
          className="absolute left-0 hidden h-full -translate-x-1/2 transform text-white lg:block"
          viewBox="0 0 100 100"
          fill="currentColor"
          preserveAspectRatio="none slice"
        >
          <path d="M50 0H100L50 100H0L50 0Z" />
        </svg>
        <img
          className="h-56 w-full rounded object-cover shadow-lg md:h-96 lg:h-full lg:rounded-none lg:shadow-none"
          src="https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260"
          alt="Registro UniNav"
        />
      </div>

      {/* Left side — form */}
      <div className="relative mx-auto flex w-full max-w-xl flex-col items-start px-4 md:px-0 lg:max-w-screen-xl lg:px-8">
        <div className="mb-16 lg:my-40 lg:max-w-lg lg:pr-5">

          <span className="mb-4 inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-700">
            UniNav
          </span>

          <h2 className="mb-5 font-sans text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl sm:leading-none">
            Crea tu cuenta<br className="hidden md:block" />
            y empieza a{" "}
            <span className="inline-block text-brand-600">navegar</span>
          </h2>

          <p className="mb-8 pr-5 text-base text-gray-600 md:text-lg">
            Regístrate para calcular rutas, explorar el campus, unirte a tours guiados
            y llevar el registro de tus recorridos universitarios.
          </p>

          {serverError && (
            <div className="mb-6">
              <ErrorBanner message={serverError} />
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full space-y-4" noValidate>
            {/* Username */}
            <div>
              <label htmlFor="reg-username" className="mb-1 inline-block font-medium text-gray-700">
                Usuario
              </label>
              <input
                id="reg-username"
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
              <label htmlFor="reg-password" className="mb-1 inline-block font-medium text-gray-700">
                Contraseña
              </label>
              <input
                id="reg-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                maxLength={72}
                autoComplete="new-password"
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

            {/* Actions */}
            <div className="flex items-center gap-6 pt-2">
              <button
                type="submit"
                disabled={submitting || !isFormValid}
                className="inline-flex h-12 items-center justify-center rounded bg-brand-600 px-8 font-medium tracking-wide text-white shadow-md transition duration-200 hover:bg-brand-700 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Creando..." : "Crear cuenta"}
              </button>
              <Link
                to="/login"
                className="font-semibold text-gray-700 transition-colors duration-200 hover:text-brand-600"
              >
                Iniciar sesion
              </Link>
            </div>
          </form>

        </div>
      </div>

    </div>
  );
}
