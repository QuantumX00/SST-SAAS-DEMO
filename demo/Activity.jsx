import { useEffect, useState } from "react";
import { Activity as ActivityIcon, CalendarClock, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, ErrorBanner, Spinner, StatusBadge, parseApiError } from "../src/components/ui.jsx";
import { useAuth } from "./session.jsx";
import client from "./client.js";

const statuses = [
  ["Vigente", "bg-emerald-500"],
  ["Por Vencer", "bg-amber-500"],
  ["Vencido", "bg-red-500"],
  ["Sin Vencimiento", "bg-slate-400"],
];
const operations = [
  ["SUBIR", "Cargas"],
  ["DESCARGAR", "Descargas"],
  ["ELIMINAR_ARCHIVO", "Eliminaciones"],
];

function Metric({ label, value, icon: Icon }) {
  return <div className="explorer-card flex items-center justify-between gap-3">
    <div>
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-3xl font-bold text-slate-800">{value}</p>
    </div>
    <span className="rounded-xl bg-brand-50 p-3 text-brand-600"><Icon size={21} aria-hidden="true" /></span>
  </div>;
}

export default function Activity() {
  const { activeCompany } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([client.get("/files"), client.get("/explorer/activity")])
      .then(([files, activity]) => {
        if (active) setData({ files: files.data, ...activity.data });
      })
      .catch((error) => { if (active) setError(parseApiError(error)); });
    return () => { active = false; };
  }, []);

  if (!data) return error ? <ErrorBanner message={error} /> : <Spinner label="Cargando informe..." />;
  const { files, session, example } = data;
  const totals = Object.fromEntries(statuses.map(([status]) => [
    status, files.filter((file) => file.status === status).length,
  ]));
  const sessions = Object.values(session).reduce((sum, count) => sum + count, 0);

  return <div className="buyer-activity space-y-5">
    <div className="explorer-heading">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Informe de actividad</h1>
        <p className="mt-1 text-sm text-slate-500">{activeCompany?.name} · Resumen documental con datos de ejemplo</p>
      </div>
      <Link className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-brand-700" to="/archivos">
        <FileText size={17} /> Abrir explorador
      </Link>
    </div>
    <div className="activity-metrics">
      <Metric label="Documentos" value={files.length} icon={FileText} />
      <Metric label="Vencen en 30 días" value={totals["Por Vencer"]} icon={CalendarClock} />
      <Metric label="Vencidos" value={totals.Vencido} icon={CalendarClock} />
      <Metric label="Operaciones en esta sesión" value={sessions} icon={ActivityIcon} />
    </div>
    <div className="activity-panels">
      <Card title="Estado de los documentos">
        <p className="mb-4 text-sm text-slate-500">Incluye los documentos de ejemplo del Dashboard y los que cargas en el explorador.</p>
        <ul className="space-y-4">
          {statuses.map(([status, color]) => <li key={status}>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <StatusBadge status={status} />
              <span className="text-sm font-semibold text-slate-800">{totals[status]}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
              <div className={`h-full rounded-full ${color}`} style={{ width: files.length ? `${totals[status] / files.length * 100}%` : 0 }} />
            </div>
          </li>)}
        </ul>
      </Card>
      <Card title="Actividad del explorador">
        <p className="mb-4 text-sm text-slate-500">Operaciones simuladas desde que abriste la demo.</p>
        <dl className="divide-y divide-slate-100">
          {operations.map(([action, label]) => <div key={action} className="flex justify-between gap-3 py-3 text-sm">
            <dt className="text-slate-600">{label}</dt>
            <dd className="font-semibold text-slate-800">{session[action]}</dd>
          </div>)}
        </dl>
        {example.SUBIR > 0 && <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          El portafolio de ejemplo incluye {example.SUBIR === 1 ? "una carga simulada previa" : `${example.SUBIR} cargas simuladas previas`}.
        </p>}
      </Card>
    </div>
  </div>;
}
