import { Link, NavLink, Outlet, useMatch, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  FolderTree,
  FileText,
  History,
  ShieldCheck,
  LogOut,
  BookOpen,
  ClipboardCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { Button, ErrorBanner, Spinner } from "./ui.jsx";

// 'manage: true' => la sección solo es visible para roles de gestión
// (Gestor / SuperAdmin), igual que la regla de permisos del backend.
const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/guia", label: "Guía de inicio", icon: BookOpen },
  { to: "/empresas", label: "Empresas", icon: Building2 },
  { to: "/carpetas", label: "Carpetas", icon: FolderTree },
  { to: "/archivos", label: "Archivos", icon: FileText },
  { to: "/auditorias-sst", label: "Auditorías SST", icon: ClipboardCheck, manage: true },
  { to: "/trazabilidad", label: "Trazabilidad", icon: History, manage: true },
];

export default function Layout() {
  const {
    companies,
    companyId,
    setCompanyId,
    loadingCompanies,
    companiesError,
    refreshCompanies,
    logout,
    canManage,
    user,
  } = useAuth();
  const navigate = useNavigate();
  const companiesRoute = useMatch("/empresas");
  const guideRoute = useMatch("/guia");
  const needsCompany = !companiesRoute && !guideRoute;
  const hasCompanies = companies.length > 0;

  // Oculta las secciones de gestión a los roles sin permiso (Vista_Auditoria).
  const visibleNav = navItems.filter((item) => !item.manage || canManage);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  // Cada empresa tiene su propio estado de pantalla y solicitudes pendientes.
  let content = <Outlet key={needsCompany ? companyId : undefined} />;
  if (needsCompany && !hasCompanies && loadingCompanies) {
    content = <Spinner label="Cargando empresas..." />;
  } else if (needsCompany && !hasCompanies && companiesError) {
    content = (
      <div>
        <ErrorBanner message="No se pudieron cargar las empresas." />
        <Button onClick={() => refreshCompanies()}>Reintentar</Button>
      </div>
    );
  } else if (needsCompany && !hasCompanies) {
    content = (
      <section className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <h2 className="text-lg font-semibold text-slate-800">Aún no tienes empresas</h2>
        <p className="mt-2 text-sm text-slate-500">
          {canManage
            ? "Registra tu primera empresa para empezar a organizar sus documentos SST."
            : "Tu cuenta aún no tiene empresas disponibles."}
        </p>
        {canManage && (
          <Link
            to="/empresas"
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            <Building2 aria-hidden="true" className="h-4 w-4" />
            Crear mi primera empresa
          </Link>
        )}
      </section>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-slate-900 text-slate-100 flex flex-col">
        <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-800">
          <ShieldCheck className="h-7 w-7 text-brand-500" />
          <div>
            <p className="font-semibold leading-tight">SST SaaS</p>
            <p className="text-xs text-slate-400">Gestión documental</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {visibleNav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-800">
          {user && (
            <div className="px-6 py-3">
              <p className="truncate text-sm font-medium text-slate-200">
                {user.email}
              </p>
              <span className="mt-0.5 inline-flex rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                {user.role}
              </span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-6 py-4 text-sm text-slate-300 hover:text-white"
          >
            <LogOut className="h-5 w-5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <h1 className="text-sm font-medium text-slate-500">
            Portafolio documental SST
          </h1>
          <div className="flex items-center gap-3">
            <label htmlFor="active-company" className="text-xs text-slate-400">
              Empresa activa
            </label>
            <select
              id="active-company"
              disabled={!hasCompanies}
              value={companyId || ""}
              onChange={(e) => setCompanyId(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              {!hasCompanies && (
                <option value="">
                  {loadingCompanies ? "Cargando..." : companiesError ? "No disponible" : "Sin empresas"}
                </option>
              )}
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {content}
        </main>
      </div>
    </div>
  );
}
