import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Simple SVG icon components (Heroicons outline style)
const Icons: Record<string, JSX.Element> = {
  dashboard: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  building3d: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0v10l-8 4m-8-4V7m16 10l-8-4m-8 4l8-4" />
    </svg>
  ),
  graph: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
  paths: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
  settings: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

interface NavItem {
  to: string;
  label: string;
  iconKey: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { to: "/", label: "Dashboard", iconKey: "dashboard" },
  { to: "/building-3d", label: "Modelo 3D", iconKey: "building3d" },
  { to: "/graph", label: "Grafo", iconKey: "graph" },
  { to: "/paths", label: "Senderos", iconKey: "paths", adminOnly: true },
  { to: "/settings", label: "Ajustes", iconKey: "settings" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const filteredNav = navItems.filter((item) => !item.adminOnly || user?.role === "admin");

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 transform border-r border-slate-200 bg-white transition-transform duration-200 md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-slate-200 px-6">
          <span className="text-lg font-bold text-brand-600 tracking-tight">UniNav</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {filteredNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                }`
              }
            >
              {Icons[item.iconKey]}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        {user && (
          <div className="border-t border-slate-200 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                {user.username[0].toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-slate-700">{user.username}</p>
                <p className="text-xs text-slate-400">
                  {user.role === "admin" ? "Administrador" : "Usuario"}
                </p>
              </div>
            </div>
            <button onClick={handleLogout} className="btn-secondary w-full text-xs">
              Cerrar Sesion
            </button>
          </div>
        )}
      </aside>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-16 items-center border-b border-slate-200 bg-white px-4 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="btn-secondary !p-2"
            aria-label="Abrir menu"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="ml-3 text-lg font-bold text-brand-600">UniNav</span>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6 [&:has(.building3d-fullheight)]:p-0 [&:has(.building3d-fullheight)]:overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
